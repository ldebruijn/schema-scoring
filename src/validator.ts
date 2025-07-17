import {parse} from "graphql/index";
import type {DocumentNode} from "graphql";
import {PiiRule} from "./rules/pii.ts";
import {Rule} from "./model.ts";
import {CompositeKeyRule} from "./rules/composite-keys.ts";
import {CycleCounterRule} from "./rules/cycle-counter.ts";
import {NullBlastRadiusRule} from "./rules/null-blast.ts";

export class Validator {
    private readonly ast: DocumentNode
    private readonly rules: Rule[]

    constructor(schemaString: string) {
        this.ast = parse(schemaString)
        this.rules = [
            new PiiRule(),
            new CompositeKeyRule(),
            new CycleCounterRule(),
            new NullBlastRadiusRule(),
        ]
    }

    validate() {
        let score = 100;

        for (let i = this.rules.length - 1; i >= 0; i--) {
            const rule = this.rules[i]

            console.log(`Running validator [${rule.constructor.name}]`)

            const result = rule.validate(this.ast)

            if (result.violations > 0) {
                score -= result.violations * rule.weight;
            }

            console.log(result)
        }

        console.log(`Schema score: ${score}`)
    }
}