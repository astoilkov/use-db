import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { DbStorage } from 'local-db-storage'

const dbStorage = new DbStorage({
    name: 'node_modules/use-db-storage'
})
const syncData = new Map<string, unknown>();

export type StorageStateOptions<T> = {
    defaultValue?: T | (() => T)
    optimistic?: boolean
}

// - `useDbStorage()` return type
// - first two values are the same as `useState`
export type StorageState<T> = [
    state: T,
    setState: Dispatch<SetStateAction<T>>,
    removeItem: () => void,
]

export default function useDbStorage(
    key: string,
    options?: StorageStateOptions<undefined>,
): StorageState<unknown>
export default function useDbStorage<T>(
    key: string,
    options?: Omit<StorageStateOptions<T | undefined>, 'defaultValue'>,
): StorageState<T | undefined>
export default function useDbStorage<T>(
    key: string,
    options?: StorageStateOptions<T>,
): StorageState<T>
export default function useDbStorage<T = undefined>(
    key: string,
    options?: StorageStateOptions<T | undefined>,
): StorageState<T | undefined> {
    const [defaultValue] = useState(options?.defaultValue)
    return useStorage(
        key,
        defaultValue,
        options?.optimistic
    )
}

function useStorage<T>(
    key: string,
    defaultValue: T | undefined,
    optimistic: boolean = true,
): StorageState<T | undefined> {
    const value = useSyncExternalStore(
        // useSyncExternalStore.subscribe
        useCallback(
            (onStoreChange) => {
                const onChange = (localKey: string): void => {
                    if (key === localKey) {
                        onStoreChange()
                    }
                }
                callbacks.add(onChange)
                return (): void => {
                    callbacks.delete(onChange)
                }
            },
            [key],
        ),

        // useSyncExternalStore.getSnapshot
        () => {
            return syncData.get(key) as T | undefined
        },

        // useSyncExternalStore.getServerSnapshot
        () => defaultValue,
    )

    const setState = useCallback(
        (newValue: SetStateAction<T | undefined>): void => {
            const value =
                newValue instanceof Function ? newValue(syncData.get(key) as T | undefined) : newValue
            const prev = syncData.get(key)
            const hasPrev = syncData.has(key)
            if (optimistic) {
                syncData.set(key, value)
                triggerCallbacks(key)
                dbStorage.setItem(key, value).catch(() => {
                    if (hasPrev) {
                        syncData.set(key, prev)
                    } else {
                        syncData.delete(key)
                    }
                    triggerCallbacks(key)
                })
            } else {
                dbStorage.setItem(key, value).then(() => {
                    syncData.set(key, value)
                    triggerCallbacks(key)
                })
            }
        },
        [key],
    )

    const removeItem = useCallback(() => {
        const prev = syncData.get(key)
        const hasPrev = syncData.has(key)
        if (optimistic) {
            syncData.delete(key)
            triggerCallbacks(key)
            dbStorage.removeItem(key).catch(() => {
                if (hasPrev) {
                    syncData.set(key, prev)
                   triggerCallbacks(key)
                }
            })
        } else {
            dbStorage.removeItem(key).then(() => {
                syncData.delete(key)
                triggerCallbacks(key)
            })
        }
    }, [key])

    return useMemo(
        () => [
            value,
            setState,
            removeItem,
        ],
        [value, setState, removeItem],
    )
}

// notifies all instances using the same `key` to update
const callbacks = new Set<(key: string) => void>()
function triggerCallbacks(key: string): void {
    for (const callback of [...callbacks]) {
        callback(key)
    }
}
