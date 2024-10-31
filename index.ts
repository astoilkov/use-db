import type { SetStateAction } from "react";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { DbStorage } from "local-db-storage";

const dbStorage = new DbStorage({
    name: "node_modules/use-db",
});
const syncData = new Map<string, unknown>();

export type UseDbOptions<T> = {
    defaultValue?: T | (() => T);
    optimistic?: boolean;
};

// - `useDb()` return type
// - first two values are the same as `useState`
export type DbState<T> = [
    state: T,
    setState: (value: SetStateAction<T>) => Promise<void>,
    removeItem: () => Promise<void>,
];

export default function useDb(
    key: string,
    options?: UseDbOptions<undefined>,
): DbState<unknown>;
export default function useDb<T>(
    key: string,
    options?: Omit<UseDbOptions<T | undefined>, "defaultValue">,
): DbState<T | undefined>;
export default function useDb<T>(
    key: string,
    options?: UseDbOptions<T>,
): DbState<T>;
export default function useDb<T = undefined>(
    key: string,
    options?: UseDbOptions<T | undefined>,
): DbState<T | undefined> {
    const [defaultValue] = useState(options?.defaultValue);
    return useStorage(key, defaultValue, options?.optimistic ?? true);
}

function useStorage<T>(
    key: string,
    defaultValue: T | undefined,
    optimistic: boolean,
): DbState<T | undefined> {
    const value = useSyncExternalStore(
        // useSyncExternalStore.subscribe
        useCallback(
            (onStoreChange) => {
                const onChange = (localKey: string): void => {
                    if (key === localKey) {
                        onStoreChange();
                    }
                };
                callbacks.add(onChange);
                return (): void => {
                    callbacks.delete(onChange);
                };
            },
            [key],
        ),

        // useSyncExternalStore.getSnapshot
        () => {
            return syncData.has(key)
                ? (syncData.get(key) as T | undefined)
                : defaultValue;
        },

        // useSyncExternalStore.getServerSnapshot
        () => defaultValue,
    );

    const setState = useCallback(
        (newValue: SetStateAction<T | undefined>): Promise<void> => {
            const hasPrev = syncData.has(key);
            const prev = syncData.has(key)
                ? (syncData.get(key) as T | undefined)
                : defaultValue;
            const next =
                newValue instanceof Function ? newValue(prev) : newValue;
            if (optimistic) {
                syncData.set(key, next);
                triggerCallbacks(key);
                return dbStorage.setItem(key, next).catch(() => {
                    if (hasPrev) {
                        syncData.set(key, prev);
                    } else {
                        syncData.delete(key);
                    }
                    triggerCallbacks(key);
                });
            } else {
                return dbStorage.setItem(key, next).then(() => {
                    syncData.set(key, next);
                    triggerCallbacks(key);
                });
            }
        },
        [key],
    );

    const removeItem = useCallback(() => {
        const prev = syncData.get(key);
        const hasPrev = syncData.has(key);
        if (optimistic) {
            syncData.delete(key);
            triggerCallbacks(key);
            return dbStorage.removeItem(key).catch(() => {
                if (hasPrev) {
                    syncData.set(key, prev);
                    triggerCallbacks(key);
                }
            });
        } else {
            return dbStorage.removeItem(key).then(() => {
                syncData.delete(key);
                triggerCallbacks(key);
            });
        }
    }, [key]);

    return useMemo(
        () => [value, setState, removeItem],
        [value, setState, removeItem],
    );
}

// notifies all instances using the same `key` to update
const callbacks = new Set<(key: string) => void>();
function triggerCallbacks(key: string): void {
    for (const callback of [...callbacks]) {
        callback(key);
    }
}
