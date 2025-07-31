import {PluralCollectionsRule} from "./plural-collections.ts";
import {describe, test, expect} from "bun:test";
import {parse} from "graphql/index";

describe("PluralCollectionsRule", () => {
    const rule = new PluralCollectionsRule();

    test("should pass for plural collection", () => {
        const schema = `
            type Query {
                users: [String]
            }
        `;
        const ast = parse(schema);
        const result = rule.validate(ast);
        expect(result.violations.length).toBe(0);
    });

    test("should fail for singular collection", () => {
        const schema = `
            type Query {
                user: [String]
            }
        `;
        const ast = parse(schema);
        const result = rule.validate(ast);
        expect(result.violations.length).toBe(1);
    });
});
