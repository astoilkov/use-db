import "fake-indexeddb/auto";

import { describe, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useDb from "./index.js";
import { DbStorage } from "local-db-storage";

describe("use-db", () => {
    describe("optimistic", () => {
        test("defaultValue accepts lazy initializer (like useState)", () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() =>
                useDb(key, {
                    defaultValue: () => ["first", "second"],
                }),
            );

            const [todos] = result.current;
            expect(todos).toStrictEqual(["first", "second"]);
        });

        test("initial state is written into the state", () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() =>
                useDb(key, {
                    defaultValue: ["first", "second"],
                }),
            );

            const [todos] = result.current;
            expect(todos).toStrictEqual(["first", "second"]);
        });

        test("updates state", async () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() =>
                useDb(key, {
                    defaultValue: ["first", "second"],
                }),
            );

            await wait(5);

            act(() => {
                const setTodos = result.current[1];
                setTodos(["third", "forth"]);
            });

            const [todos] = result.current;
            expect(todos).toStrictEqual(["third", "forth"]);
        });

        test("updates state with callback function", async () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() =>
                useDb(key, {
                    defaultValue: ["first", "second"],
                }),
            );

            await wait(5);

            act(() => {
                const setTodos = result.current[1];

                setTodos((value) => [...value, "third", "forth"]);
            });

            const [todos] = result.current;
            expect(todos).toStrictEqual(["first", "second", "third", "forth"]);
        });

        test("removes item from state", async () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() =>
                useDb(key, {
                    defaultValue: ["first", "second"],
                }),
            );

            await wait(5);

            {
                act(() => {
                    const setTodos = result.current[1];
                    setTodos(["third", "forth"]);
                });
                const [todos] = result.current;
                expect(todos).toStrictEqual(["third", "forth"]);
            }

            {
                act(() => {
                    const removeItem = result.current[2];
                    removeItem();
                });
                const [todos] = result.current;
                expect(todos).toStrictEqual(["first", "second"]);
            }
        });

        test("persists state across hook re-renders", async () => {
            const key = crypto.randomUUID();
            const { result, rerender } = renderHook(() =>
                useDb(key, {
                    defaultValue: ["first", "second"],
                }),
            );

            await wait(5);

            act(() => {
                const setTodos = result.current[1];
                setTodos(["third", "fourth"]);
            });

            rerender();

            const [todos] = result.current;
            expect(todos).toStrictEqual(["third", "fourth"]);
        });

        test("handles complex objects", async () => {
            const complexObject = {
                nested: { array: [1, 2, 3], value: "test" },
            };
            const key = crypto.randomUUID();
            const { result } = renderHook(() =>
                useDb(key, { defaultValue: complexObject }),
            );

            await wait(5);

            const [storedObject] = result.current;
            expect(storedObject).toEqual(complexObject);

            act(() => {
                const setObject = result.current[1];
                setObject((prev) => ({
                    ...prev,
                    nested: { ...prev.nested, value: "updated" },
                }));
            });

            const [updatedObject] = result.current;
            expect(updatedObject).toEqual({
                nested: { array: [1, 2, 3], value: "updated" },
            });
        });

        test("handles undefined as a valid state", async () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() => useDb(key));

            await wait(5);

            const [initialState] = result.current;
            expect(initialState).toBeUndefined();

            act(() => {
                const setState = result.current[1];
                setState("defined");
            });

            const [definedState] = result.current;
            expect(definedState).toBe("defined");

            act(() => {
                const setState = result.current[1];
                setState(undefined);
            });

            const [finalState] = result.current;
            expect(finalState).toBeUndefined();
        });

        test("unmount", () => {
            const key = crypto.randomUUID();
            const { unmount } = renderHook(() => useDb(key));
            unmount();
        });

        test("set state throws an error", async () => {
            const key = crypto.randomUUID();
            const hook = renderHook(() => useDb(key));

            // no idea why this is needed.
            // otherwise, it throws "unhadled error -- Vitest caught 1 error during the test run."
            await wait(5);

            vi.spyOn(DbStorage.prototype, "setItem").mockReturnValue(
                Promise.reject("QuotaExceededError"),
            );

            await act(() => {
                const [, setState] = hook.result.current;
                return setState("defined");
            });
        });

        test("set state throws an error and reverts to previous state", async () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() => useDb(key));

            await act(() => {
                const setState = result.current[1];
                return setState(1);
            });

            vi.spyOn(DbStorage.prototype, "setItem").mockReturnValue(
                Promise.reject("QuotaExceededError"),
            );

            await act(() => {
                const setState = result.current[1];
                return setState(2);
            });

            const [number] = result.current;
            expect(number).toBe(1);
        });

        test("remove item throws an error and reverts to previous state", async () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() =>
                useDb(key, { defaultValue: 1 }),
            );

            await act(() => {
                const [, setNumber] = result.current;
                return setNumber(2);
            });

            vi.spyOn(DbStorage.prototype, "removeItem").mockReturnValue(
                Promise.reject("QuotaExceededError"),
            );

            await act(() => {
                const removeItem = result.current[2];
                return removeItem();
            });

            const [number] = result.current;
            expect(number).toBe(2);
        });

        // https://github.com/astoilkov/use-db/issues/1
        test("cannot read state from IndexDB after page refresh", async () => {
            const key = crypto.randomUUID();

            const dbStorage = new DbStorage({
                name: "node_modules/use-db",
            });
            await dbStorage.setItem(key, ["first", "second"]);

            const hook = renderHook(() => useDb(key));
            const todos = await vi.waitUntil(
                () => {
                    const [todos] = hook.result.current;
                    return todos;
                },
                {
                    timeout: 100,
                    interval: 10,
                },
            );
            expect(todos).toStrictEqual(["first", "second"]);
        });
    });

    describe("non-optimistic", () => {
        test("initial state is written into the state", () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() =>
                useDb(key, {
                    optimistic: false,
                    defaultValue: ["first", "second"],
                }),
            );

            const [todos] = result.current;
            expect(todos).toStrictEqual(["first", "second"]);
        });

        test("updates state", async () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() =>
                useDb(key, {
                    optimistic: false,
                    defaultValue: ["first", "second"],
                }),
            );

            await act(() => {
                const setTodos = result.current[1];
                return setTodos(["third", "forth"]);
            });

            const [todos] = result.current;
            expect(todos).toStrictEqual(["third", "forth"]);
        });

        test("removes item from state", async () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() =>
                useDb(key, {
                    optimistic: false,
                    defaultValue: ["first", "second"],
                }),
            );

            {
                await act(() => {
                    const setTodos = result.current[1];
                    return setTodos(["third", "forth"]);
                });
                const [todos] = result.current;
                expect(todos).toStrictEqual(["third", "forth"]);
            }

            {
                await act(() => {
                    const removeItem = result.current[2];
                    return removeItem();
                });
                const [todos] = result.current;
                expect(todos).toStrictEqual(["first", "second"]);
            }
        });
    });
});

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
