import {DeprecationRule} from "./deprecation.ts";
import {describe, test, expect} from "bun:test";
import {parse} from "graphql/index";

describe("DeprecationRule", () => {
    const rule = new DeprecationRule();

    test("should pass for valid deprecation", () => {
        const schema = `
            type Query {
                field: String @deprecated(reason: "17-07-2025 please migrate to newField")
            }
        `;
        const ast = parse(schema);
        const result = rule.validate(ast);
        expect(result.violations.length).toBe(0);
    });

    test("should fail for missing date", () => {
        const schema = `
            type Query {
                field: String @deprecated(reason: "please migrate to newField")
            }
        `;
        const ast = parse(schema);
        const result = rule.validate(ast);
        expect(result.violations.length).toBe(1);
    });

    test("should fail for missing migration path", () => {
        const schema = `
            type Query {
                field: String @deprecated(reason: "17-07-2025")
            }
        `;
        const ast = parse(schema);
        const result = rule.validate(ast);
        expect(result.violations.length).toBe(1);
    });

    test("should fail for missing reason", () => {
        const schema = `
            type Query {
                field: String @deprecated
            }
        `;
        const ast = parse(schema);
        const result = rule.validate(ast);
        expect(result.violations.length).toBe(1);
    });
});
