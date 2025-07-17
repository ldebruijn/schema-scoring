import {BooleanPrefixRule} from "./boolean-prefix.ts";
import {describe, test, expect} from "bun:test";
import {parse} from "graphql/index";

describe("BooleanPrefixRule", () => {
    const rule = new BooleanPrefixRule();

    test("should pass for correctly named boolean", () => {
        const schema = `
            type Query {
                active: Boolean
            }
        `;
        const ast = parse(schema);
        const result = rule.validate(ast);
        expect(result.violations).toBe(0);
    });

    test("should fail for incorrectly named boolean", () => {
        const schema = `
            type Query {
                isActive: Boolean
            }
        `;
        const ast = parse(schema);
        const result = rule.validate(ast);
        expect(result.violations).toBe(1);
    });
});
