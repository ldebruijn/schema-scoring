import {GraphQLCycleCounter} from "./cycle-counter";
import { expect, test, describe, beforeEach } from "bun:test";

describe('GraphQLCycleCounter', () => {
    let counter: GraphQLCycleCounter;

    beforeEach(() => {
        counter = new GraphQLCycleCounter();
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

        const result = counter.countCycles(schema);
        expect(result.totalCycles).toBe(1);
        expect(result.cycles[0].length).toBe(2);
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

        const result = counter.countCycles(schema);
        expect(result.totalCycles).toBe(2);
        expect(result.summary.cyclesByLength[2]).toBe(2); // Two cycles of length 2
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

        const result = counter.countCycles(schema);

        expect(result.totalCycles).toBe(3);
        expect(result.summary.typeInvolvementCount['A']).toBe(4);
        expect(result.summary.typeInvolvementCount['B']).toBe(4);
        expect(result.summary.typeInvolvementCount['C']).toBe(2);
    });

    test('should count self-referential cycle', () => {
        const schema = `
      type Node {
        parent: Node
        children: [Node!]!
      }
    `;

        const result = counter.countCycles(schema);
        expect(result.totalCycles).toBe(1);
        expect(result.cycles[0].length).toBe(1);
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

        const result = counter.countCycles(schema);
        expect(result.totalCycles).toBe(1);
        expect(result.cycles[0].length).toBe(4);
        expect(result.summary.longestCycle.length).toBe(4);
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

        const result = counter.countCycles(schema);
        expect(result.totalCycles).toBe(0);
    });

    test('should generate comprehensive summary', () => {
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
        d: D!
      }
      type D {
        c: C!
      }
    `;

        const result = counter.countCycles(schema);
        expect(result.summary).toMatchObject({
            totalCycles: expect.any(Number),
            cyclesByLength: expect.any(Object),
            typeInvolvementCount: expect.any(Object),
            longestCycle: expect.any(Object),
            shortestCycle: expect.any(Object)
        });
    });

    test('should normalize cycles to avoid duplicates', () => {
        const schema = `
      type A {
        b: B!
      }
      type B {
        c: C!
      }
      type C {
        a: A!
      }
    `;

        const result = counter.countCycles(schema);
        expect(result.totalCycles).toBe(1); // Should only count one cycle even though it could be represented in different ways
    });
});