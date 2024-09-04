import { describe, expect, test } from "vitest";
import { renderHook } from "@testing-library/react";
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
});
