import {NullBlastRadiusValidator} from "./null-blast";
import {describe, test, beforeEach, expect} from "bun:test"

describe('NullBlastRadiusValidator', () => {
    let validator: NullBlastRadiusValidator;

    beforeEach(() => {
        validator = new NullBlastRadiusValidator({
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

        const result = validator.validate(schema);
        expect(result.violations).toHaveLength(1);
        expect(result.analysis.get('Query.user').blastRadius).toBeGreaterThan(3);
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

        const result = validator.validate(schema);
        expect(result.violations).toHaveLength(0);
    });

    test('should identify critical paths with high blast radius', () => {
        const schema = `
      type Query {
        user: User!
      }

      type User {
        profile: Profile!
      }

      type Profile {
        settings: Settings!
        preferences: Preferences!
        notifications: [Notification!]!
      }
    `;

        const result = validator.validate(schema);
        const userViolation = result.violations.find(v => v.fieldPath === 'Query.user');
        const profileViolation = result.violations.find(v => v.fieldPath === 'User.profile');

        expect(userViolation).toBeDefined();
        expect(profileViolation).toBeDefined();
        expect(userViolation.severity).toBe('critical');
    });

    test('should calculate correct blast radius for nested types', () => {
        const schema = `
      type Query {
        nested: Level1!
      }

      type Level1 {
        field1: String!
        next: Level2!
      }

      type Level2 {
        field2: String!
        next: Level3!
      }

      type Level3 {
        field3: String!
      }
    `;

        const result = validator.validate(schema);
        expect(result.analysis.get('Query.nested').blastRadius).toBe(5);
    });

    test('should handle lists correctly', () => {
        const schema = `
      type Query {
        users: [User!]!
      }

      type User {
        id: ID!
        posts: [Post!]!
      }

      type Post {
        title: String!
        comments: [Comment!]!
      }

      type Comment {
        text: String!
      }
    `;

        const result = validator.validate(schema);
        expect(result.analysis.get('Query.users').blastRadius).toBeGreaterThan(1);
    });

    test('should generate accurate summary', () => {
        const schema = `
      type Query {
        user: User!
        post: Post
      }

      type User {
        id: ID!
        name: String!
        profile: Profile!
      }

      type Profile {
        email: String!
      }

      type Post {
        title: String
        author: User
      }
    `;

        const result = validator.validate(schema);
        expect(result.summary).toMatchObject({
            totalFields: expect.any(Number),
            violationsByType: expect.any(Object),
            averageBlastRadius: expect.any(Number),
            maxBlastRadius: expect.any(Number),
            criticalPathsAffected: expect.any(Number)
        });
    });

    test('should handle circular dependencies', () => {
        const schema = `
      type User {
        id: ID!
        friends: [User!]!
        posts: [Post!]!
      }

      type Post {
        author: User!
        comments: [Comment!]!
      }

      type Comment {
        author: User!
        post: Post!
      }
    `;

        const result = validator.validate(schema);
        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.summary.maxBlastRadius).toBeGreaterThan(5);
    });

    test('should respect custom configuration', () => {
        const customValidator = new NullBlastRadiusValidator({
            maxBlastRadius: 3,
            warningThreshold: 2,
            criticalTypePaths: ['Query.critical']
        });

        const schema = `
      type Query {
        critical: CriticalType!
        normal: NormalType!
      }

      type CriticalType {
        field1: String!
        field2: String!
      }

      type NormalType {
        field1: String!
        field2: String!
      }
    `;

        const result = customValidator.validate(schema);
        expect(result.violations.some(v =>
            v.fieldPath === 'Query.critical' && v.severity === 'warning'
        )).toBe(true);
    });

    test('should handle empty or invalid schema', () => {
        expect(() => {
            validator.validate('type Empty { field: String }');
        }).not.toThrow();

        expect(() => {
            validator.validate('invalid schema');
        }).toThrow();
    });
});