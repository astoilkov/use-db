import "fake-indexeddb/auto";

import { describe, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useDb, { type UseDbOptions } from "./index.js";
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

        test("updates state", () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() =>
                useDb(key, {
                    defaultValue: ["first", "second"],
                }),
            );

            act(() => {
                const setTodos = result.current[1];
                setTodos(["third", "forth"]);
            });

            const [todos] = result.current;
            expect(todos).toStrictEqual(["third", "forth"]);
        });

        test("updates state with callback function", () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() =>
                useDb(key, {
                    defaultValue: ["first", "second"],
                }),
            );

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

            {
                await act(() => {
                    const setTodos = result.current[1];
                    return setTodos(["third", "forth"]);
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

        test("persists state across hook re-renders", () => {
            const key = crypto.randomUUID();
            const { result, rerender } = renderHook(() =>
                useDb(key, {
                    defaultValue: ["first", "second"],
                }),
            );

            act(() => {
                const setTodos = result.current[1];
                setTodos(["third", "fourth"]);
            });

            rerender();

            const [todos] = result.current;
            expect(todos).toStrictEqual(["third", "fourth"]);
        });

        test("handles complex objects", () => {
            const complexObject = {
                nested: { array: [1, 2, 3], value: "test" },
            };
            const key = crypto.randomUUID();
            const { result } = renderHook(() =>
                useDb(key, { defaultValue: complexObject }),
            );

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

        test("handles undefined as a valid state", () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() => useDb(key));

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

        test("set state throws an error", () => {
            const key = crypto.randomUUID();
            const { result } = renderHook(() => useDb(key));

            vi.spyOn(DbStorage.prototype, "setItem").mockReturnValue(
                Promise.reject("QuotaExceededError"),
            );

            act(() => {
                const setState = result.current[1];
                setState("defined");
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
