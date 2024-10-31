import { describe, expect, test } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useDb from "./index.js";

describe("use-db", () => {
    test("defaultValue accepts lazy initializer (like useState)", () => {
        const { result } = renderHook(() =>
            useDb("todos", {
                defaultValue: () => ["first", "second"],
            }),
        );

        const [todos] = result.current;
        expect(todos).toStrictEqual(["first", "second"]);
    });

    test("initial state is written into the state", () => {
        const { result } = renderHook(() =>
            useDb("todos", { defaultValue: ["first", "second"] }),
        );

        const [todos] = result.current;
        expect(todos).toStrictEqual(["first", "second"]);
    });

    test("updates state", () => {
        const { result } = renderHook(() =>
            useDb("todos", { defaultValue: ["first", "second"] }),
        );

        act(() => {
            const setTodos = result.current[1];

            setTodos(["third", "forth"]);
        });

        const [todos] = result.current;
        expect(todos).toStrictEqual(["third", "forth"]);
    });

    test("updates state with callback function", () => {
        const { result } = renderHook(() =>
            useDb("todos", { defaultValue: ["first", "second"] }),
        );

        act(() => {
            const setTodos = result.current[1];

            setTodos((value) => [...value, "third", "forth"]);
        });

        const [todos] = result.current;
        expect(todos).toStrictEqual(["first", "second", "third", "forth"]);
    });

    test("removes item from state", () => {
        const { result } = renderHook(() =>
            useDb("todos", { defaultValue: ["first", "second"] }),
        );

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

    test("persists state across hook re-renders", () => {
        const { result, rerender } = renderHook(() =>
            useDb("persistentTodos", { defaultValue: ["first", "second"] }),
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
        const complexObject = { nested: { array: [1, 2, 3], value: "test" } };
        const { result } = renderHook(() =>
            useDb("complexObject", { defaultValue: complexObject }),
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
        const { result } = renderHook(() => useDb("undefinedState"));

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
});
