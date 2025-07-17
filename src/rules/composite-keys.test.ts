import {CompositeKeyRule} from "./composite-keys.ts";
import {describe, expect, test} from "bun:test";
import {parse} from "graphql/index";

describe("composite keys", () => {
    const validator = new CompositeKeyRule(2); // Max 2 composite keys

    test("Valid schema with no composite keys", () => {
        const schema = `
        
        type User {
          id: ID!
          name: String!
          email: String!
        }
      `
        const result = validator.validate(parse(schema));
        console.log(result)
        expect(result.violations).toBe(0)
    })

    test("Valid schema with acceptable number of composite keys", () => {
        const schema = `
        
       type Product @key(fields: "sku vendor" ) {
          sku: String!
          vendor: String!
          category: String!
          name: String!
          barcode: String!
          location: String!
        }
      `

        const result = validator.validate(parse(schema));
        expect(result.violations).toBe(0)
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

        const result = validator.validate(parse(schema));
        expect(result.violations).toBe(1)
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

        const result = validator.validate(parse(schema));
        expect(result.violations).toBe(1)
    })
})