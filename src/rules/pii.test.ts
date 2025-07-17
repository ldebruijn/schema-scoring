import {PiiRule} from "./pii.ts";
import {describe, test, expect} from "bun:test"
import {parse} from "graphql/index";

describe('GraphQL PII Field Validator', () => {
    test('should identify correctly marked PII fields', () => {
        const schema = `
      directive @pii on FIELD_DEFINITION

      type User {
        id: ID!
        email: String! @pii
        ssn: String! @pii
        phoneNumber: String! @pii
      }
    `;

        const pii = new PiiRule()

        const ast = parse(schema)

        const result = pii.validate(ast)

        expect(result.violations).toBe(0);
    });

    test('should identify unmarked PII fields', () => {
        const schema = `
      directive @pii on FIELD_DEFINITION

      type User {
        id: ID!
        email: String! @pii
        phoneNumber: String!
        creditCardNumber: String!
        address: String!
      }
    `;

        const pii = new PiiRule()

        const ast = parse(schema)

        const result = pii.validate(ast);

        expect(result.violations).toBe(3);
    });
});