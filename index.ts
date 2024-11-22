import type { SetStateAction } from "react";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from "react";
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
    return useDbStorage(key, defaultValue, options?.optimistic ?? true);
}

function useDbStorage<T>(
    key: string,
    defaultValue: T | undefined,
    optimistic: boolean,
): DbState<T | undefined> {
    const [ready] = useState(() => createReady());
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
            const set = (): Promise<void> => {
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
                    });
                } else {
                    return dbStorage
                        .setItem(key, next)
                        .then(() => {
                            syncData.set(key, next);
                            triggerCallbacks(key);
                        })
                        .catch(() => {});
                }
            };
            if (!ready.is) {
                return ready.promise.then(() => set())
            }
            return set();
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
            return dbStorage
                .removeItem(key)
                .then(() => {
                    syncData.delete(key);
                    triggerCallbacks(key);
                })
                .catch(() => {});
        }
    }, [key]);

    const [, forceRender] = useState(0);
    useEffect(() => {
        if (ready.is) return;
        let disposed = false;
        dbStorage
            .getItem(key)
            .then((value) => {
                ready.resolve();
                if (!disposed && syncData.get(key) !== value) {
                    syncData.set(key, value);
                    forceRender((prev) => prev + 1);
                }
            })
            .catch(() => {})
            .finally(() => ready.resolve());
        return () => {
            disposed = true;
        };
    });

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

function createReady(): {
    promise: Promise<void>;
    resolve: () => void;
    is: boolean;
} {
    let resolveFn: () => void;
    let completed = false;
    const promise = new Promise<void>((resolve) => {
        resolveFn = () => {
            completed = true;
            resolve();
        };
    });
    return {
        promise,
        resolve: resolveFn!,
        get is() {
            return completed;
        },
    };
}
