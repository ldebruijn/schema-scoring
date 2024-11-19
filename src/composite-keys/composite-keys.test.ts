// Test cases
import {CompositeKeyValidator} from "./composite-keys.ts";
import {describe, expect, test} from "bun:test";

describe("composite keys", () => {
    const validator = new CompositeKeyValidator(2); // Max 2 composite keys

    test("Valid schema with no composite keys", () => {
        const schema = `
        
        type User {
          id: ID!
          name: String!
          email: String!
        }
      `
        const result = validator.validateSchema(schema);
        console.log(result)
        expect(result.isValid).toBe(true)
    })

    test("Valid schema with acceptable number of composite keys", () => {
        const schema = `
        
       type Product @key(fields: "sku vendor" )
                    @key(fields: "category name" ) {
          sku: String!
          vendor: String!
          category: String!
          name: String!
          barcode: String!
          location: String!
        }
      `
        const expectedValid = true

        const result = validator.validateSchema(schema);
        expect(result.isValid).toBe(expectedValid)
    })

    test("Invalid schema with too many composite keys", () => {
        const schema = `
        
       type Product @key(fields: "sku vendor" )
                    @key(fields: "category name" )
                    @key(fields: "barcode location" ) {
          sku: String!
          vendor: String!
          category: String!
          name: String!
          barcode: String!
          location: String!
        }
      `
        const expectedValid = false

        const result = validator.validateSchema(schema);
        expect(result.isValid).toBe(expectedValid)
    })

    test("Mixed schema with valid and invalid types", () => {
        const schema = `
       
       type Valid {
          id: ID!
          name: String!
        }

        type Invalid @key(fields: "f1 f2")
                    @key(fields: "f3 f4")
                    @key(fields: "f5 f6") {
          f1: String!
          f2: String!
          f3: String!
          f4: String!
          f5: String!
          f6: String!
        }
      `
        const expectedValid = false

        const result = validator.validateSchema(schema);
        expect(result.isValid).toBe(expectedValid)
    })
})