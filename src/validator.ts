import {parse, visit} from "graphql/index";
import type {DocumentNode} from "graphql";
import {PiiRule} from "./rules/pii.ts";
import {Rule} from "./model.ts";
import {CompositeKeyRule} from "./rules/composite-keys.ts";
import {CycleCounterRule} from "./rules/cycle-counter.ts";
import {NullBlastRadiusRule} from "./rules/null-blast.ts";
import {DeprecationRule} from "./rules/deprecation.ts";
import {ProblemUnionRule} from "./rules/problem-union.ts";
import {NullableExternalRule} from "./rules/nullable-external.ts";
import {PluralCollectionsRule} from "./rules/plural-collections.ts";
import {BooleanPrefixRule} from "./rules/boolean-prefix.ts";

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
            new DeprecationRule(),
            new ProblemUnionRule(),
            new NullableExternalRule(),
            new PluralCollectionsRule(),
            new BooleanPrefixRule(),
        ]
    }

    validate() {
        const totalFields = this.getTotalFields();
        let totalWeightedViolations = 0;

        for (const rule of this.rules) {
            console.log(`Running validator [${rule.constructor.name}]`)

            const result = rule.validate(this.ast)

            if (result.violations > 0) {
                totalWeightedViolations += rule.weight * Math.pow(result.violations, 1.5);
            }

            console.log(result)
        }

        const score = 100 * (1 - (totalWeightedViolations / totalFields));

        console.log(`Schema score: ${score}`)
    }

    private getTotalFields(): number {
        let totalFields = 0;
        visit(this.ast, {
            FieldDefinition() {
                totalFields++;
            }
        });
        return totalFields;
    }
}