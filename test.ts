import { describe, expect, test } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useDb from "./index.js";

describe("use-db", () => {
    test('defaultValue accepts lazy initializer (like useState)', () => {
        const { result } = renderHook(() =>
            useDb('todos', {
                defaultValue: () => ['first', 'second'],
            }),
        )

        const [todos] = result.current
        expect(todos).toStrictEqual(['first', 'second'])
    })

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
});
