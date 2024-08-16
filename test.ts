import { describe, expect, test } from "vitest";
import { renderHook } from "@testing-library/react";
import useDbStorage from "./index.js";

describe("use-db-storage", () => {
    test('defaultValue accepts lazy initializer (like useState)', () => {
        const { result } = renderHook(() =>
            useDbStorage('todos', {
                defaultValue: () => ['first', 'second'],
            }),
        )

        const [todos] = result.current
        expect(todos).toStrictEqual(['first', 'second'])
    })
});
