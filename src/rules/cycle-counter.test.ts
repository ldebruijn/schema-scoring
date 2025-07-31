import {CycleCounterRule} from "./cycle-counter.ts";
import { expect, test, describe, beforeEach } from "bun:test";
import {parse} from "graphql/index";

describe('GraphQLCycleCounter', () => {
    let counter: CycleCounterRule;

    beforeEach(() => {
        counter = new CycleCounterRule();
    });

    test('should count simple direct cycle', () => {
        const schema = `
      type A {
        b: B!
      }
      type B {
        a: A!
      }
    `;

        const result = counter.validate(parse(schema));
        expect(result.violations.length).toBe(1);
    });

    test('should count multiple distinct cycles', () => {
        const schema = `
      type A {
        b: B!
        c: C!
      }
      type B {
        a: A!
      }
      type C {
        a: A!
      }
    `;

        const result = counter.validate(parse(schema));
        expect(result.violations.length).toBe(2);
    });

    test('should identify complex interconnected cycles', () => {
        const schema = `
      type A {
        b: B!
        c: C!
      }
      type B {
        c: C!
        a: A!
      }
      type C {
        a: A!
        b: B!
      }
    `;

        const result = counter.validate(parse(schema));

        expect(result.violations.length).toBe(3);
    });

    test('should count self-referential cycle', () => {
        const schema = `
      type Node {
        parent: Node
        children: [Node!]!
      }
    `;

        const result = counter.validate(parse(schema));
        expect(result.violations.length).toBe(1);
    });

    test('should handle nested cycles', () => {
        const schema = `
      type A {
        b: B!
      }
      type B {
        c: C!
      }
      type C {
        d: D!
      }
      type D {
        a: A!
      }
    `;

        const result = counter.validate(parse(schema));
        expect(result.violations.length).toBe(1);
    });

    test('should return zero cycles for acyclic schema', () => {
        const schema = `
      type A {
        b: B!
      }
      type B {
        c: C!
      }
      type C {
        d: String!
      }
    `;

        const result = counter.validate(parse(schema));
        expect(result.violations.length).toBe(0);
    });
});