import {validatePIIFields} from "./pii";
import {describe, test, expect } from "bun:test"

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

        const result = validatePIIFields(schema);

        expect(result.isValid).toBe(true);
        expect(result.markedPIIFields).toHaveLength(3);
        expect(result.potentialUnmarkedPIIFields).toHaveLength(0);
        expect(result.markedPIIFields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ field: 'email', status: 'correctly_marked' }),
                expect.objectContaining({ field: 'ssn', status: 'correctly_marked' }),
                expect.objectContaining({ field: 'phoneNumber', status: 'correctly_marked' })
            ])
        );
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

        const result = validatePIIFields(schema);

        expect(result.isValid).toBe(false);
        expect(result.potentialUnmarkedPIIFields).toHaveLength(3);
        expect(result.potentialUnmarkedPIIFields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    field: 'phoneNumber',
                    status: 'potentially_missing_pii_directive'
                }),
                expect.objectContaining({
                    field: 'creditCardNumber',
                    status: 'potentially_missing_pii_directive'
                }),
                expect.objectContaining({
                    field: 'address',
                    status: 'potentially_missing_pii_directive'
                })
            ])
        );
    });

    test('should handle nested types', () => {
        const schema = `
      directive @pii on FIELD_DEFINITION

      type User {
        id: ID!
        email: String! @pii
        contact: ContactInfo
      }

      type ContactInfo {
        phoneNumber: String! @pii
        address: Address
      }

      type Address {
        street: String @pii
        city: String
        zipCode: String @pii
      }
    `;

        const result = validatePIIFields(schema);

        expect(result.markedPIIFields).toHaveLength(4);
        expect(result.potentialUnmarkedPIIFields).toHaveLength(0);
        expect(result.markedPIIFields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ field: 'email', status: 'correctly_marked' }),
                expect.objectContaining({ field: 'phoneNumber', status: 'correctly_marked' }),
                expect.objectContaining({ field: 'street', status: 'correctly_marked' }),
                expect.objectContaining({ field: 'zipCode', status: 'correctly_marked' })
            ])
        );
    });

    test('should handle edge cases and non-PII fields', () => {
        const schema = `
      directive @pii on FIELD_DEFINITION

      type User {
        id: ID!
        createdAt: String!
        status: String!
        preferences: UserPreferences @pii
      }

      type UserPreferences {
        theme: String!
        language: String!
      }
    `;

        const result = validatePIIFields(schema);

        expect(result.isValid).toBe(true);
        expect(result.markedPIIFields).toHaveLength(1);
        expect(result.potentialUnmarkedPIIFields).toHaveLength(0);
        expect(result.markedPIIFields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    field: 'preferences',
                    status: 'marked_as_pii'
                })
            ])
        );
    });

    test('should handle empty schema', () => {
        const schema = `
      directive @pii on FIELD_DEFINITION

      type Empty {
        id: ID!
      }
    `;

        const result = validatePIIFields(schema);

        expect(result.isValid).toBe(true);
        expect(result.markedPIIFields).toHaveLength(0);
        expect(result.potentialUnmarkedPIIFields).toHaveLength(0);
        expect(result.summary.totalPIIFieldsMarked).toBe(0);
        expect(result.summary.potentialPIIMissing).toBe(0);
    });

    test('should handle invalid schema', () => {
        const invalidSchema = `
      directive @pii on FIELD_DEFINITION

      type Invalid {
        id: ID!
        email: String! @pii @invalidDirective
      }
    `;

        expect(() => {
            validatePIIFields(invalidSchema);
        }).toThrow();
    });
});