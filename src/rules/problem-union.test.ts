import {ProblemUnionRule} from "./problem-union.ts";
import {describe, test, expect} from "bun:test";
import {parse} from "graphql/index";

describe("ProblemUnionRule", () => {
    const rule = new ProblemUnionRule();

    test("should pass for valid mutation", () => {
        const schema = `
            type Mutation {
                doSomething: DoSomethingResult
            }

            union DoSomethingResult = Success | Problem
        `;
        const ast = parse(schema);
        const result = rule.validate(ast);
        expect(result.violations.length).toBe(0);
    });

    test("should fail for invalid mutation", () => {
        const schema = `
            type Mutation {
                doSomething: String
            }
        `;
        const ast = parse(schema);
        const result = rule.validate(ast);
        expect(result.violations.length).toBe(1);
    });
});
