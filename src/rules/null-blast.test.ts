import {NullBlastRadiusRule} from "./null-blast.ts";
import {describe, test, beforeEach, expect} from "bun:test"
import {parse} from "graphql/index";

describe('NullBlastRadiusValidator', () => {
    let validator: NullBlastRadiusRule;

    beforeEach(() => {
        validator = new NullBlastRadiusRule({
            maxBlastRadius: 5,
            warningThreshold: 3,
            criticalTypePaths: ['Query.user', 'User.profile']
        });
    });

    test('should identify simple null blast radius', () => {
        const schema = `
      type Query {
        user: User!
      }

      type User {
        id: ID!
        name: String!
        profile: Profile!
      }

      type Profile {
        email: String!
        address: Address!
      }

      type Address {
        street: String!
        city: String!
        country: String!
      }
    `;

        const result = validator.validate(parse(schema));

        expect(result.violations).toBe(2);
    });

    test('should handle optional fields correctly', () => {
        const schema = `
      type Query {
        user: User
      }

      type User {
        id: ID!
        name: String
        profile: Profile
      }

      type Profile {
        email: String
        address: Address
      }
    `;

        const result = validator.validate(parse(schema));
        expect(result.violations).toBe(0);
    });
});