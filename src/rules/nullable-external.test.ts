import {NullableExternalRule} from "./nullable-external.ts";
import {describe, test, expect} from "bun:test";
import {parse} from "graphql/index";

describe("NullableExternalRule", () => {
    const rule = new NullableExternalRule();

    test("should pass for nullable external field", () => {
        const schema = `
            type Query {
                field: String @external
            }
        `;
        const ast = parse(schema);
        const result = rule.validate(ast);
        expect(result.violations.length).toBe(0);
    });

    test("should fail for non-nullable external field", () => {
        const schema = `
            type Query {
                field: String! @external
            }
        `;
        const ast = parse(schema);
        const result = rule.validate(ast);
        expect(result.violations.length).toBe(1);
    });
});
