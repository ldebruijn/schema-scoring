import {parse, visit} from "graphql/index";
import type {DocumentNode} from "graphql";
import {PiiRule} from "./rules/pii.ts";
import type {Rule, SchemaReport, ValidationResult} from "./model.ts";
import {CompositeKeyRule} from "./rules/composite-keys.ts";
import {CycleCounterRule} from "./rules/cycle-counter.ts";
import {NullBlastRadiusRule} from "./rules/null-blast.ts";
import {DeprecationRule} from "./rules/deprecation.ts";
import {ProblemUnionRule} from "./rules/problem-union.ts";
import {NullableExternalRule} from "./rules/nullable-external.ts";
import {PluralCollectionsRule} from "./rules/plural-collections.ts";
import {BooleanPrefixRule} from "./rules/boolean-prefix.ts";
import * as util from "node:util";
import {Reporter, type ReporterConfig} from "./reporter.ts";

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

    validate(options?: {
        subgraphName?: string;
        reporterConfig?: ReporterConfig;
        metadata?: Record<string, any>;
        silent?: boolean;
    }) {
        const totalFields = this.getTotalFields();
        let totalWeightedViolations = 0;
        const ruleResults: ValidationResult[] = [];

        for (const rule of this.rules) {
            if (!options?.silent) {
                console.log(`Running validator [${rule.name}]`)
            }

            const result = rule.validate(this.ast)
            ruleResults.push(result);

            if (result.violations.length > 0) {
                totalWeightedViolations += rule.weight * Math.pow(result.violations.length, 1.5);
            }

            if (!options?.silent) {
                console.log(util.inspect(result, {showHidden: false, depth: null, colors: true}))
            }
        }

        const score = 100 * (1 - (totalWeightedViolations / totalFields));

        if (!options?.silent) {
            console.log(`Schema score: ${score}`)
        }

        // Send report if reporter config is provided
        if (options?.reporterConfig) {
            this.sendReport({
                timestamp: new Date().toISOString(),
                subgraphName: options.subgraphName,
                score,
                totalFields,
                totalWeightedViolations,
                ruleResults,
                metadata: options.metadata
            }, options.reporterConfig);
        }

        return {
            score,
            totalFields,
            totalWeightedViolations,
            ruleResults
        };
    }

    private async sendReport(report: SchemaReport, config: ReporterConfig) {
        try {
            const reporter = new Reporter(config);
            await reporter.sendReport(report);
        } catch (error) {
            console.error('Failed to send report:', error);
        }
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