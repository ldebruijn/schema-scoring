import {type DocumentNode, visit} from "graphql";
import {Rule, ValidationResult} from "../model.ts";

export class DeprecationRule implements Rule {
    name = "Deprecation";
    weight = 5;

    validate(ast: DocumentNode): ValidationResult {
        let violations = 0;
        let message = "";

        visit(ast, {
            FieldDefinition(node) {
                if (node.directives) {
                    for (const directive of node.directives) {
                        if (directive.name.value === 'deprecated') {
                            if (directive.arguments) {
                                const reasonArg = directive.arguments.find(arg => arg.name.value === 'reason');
                                if (reasonArg && reasonArg.value.kind === 'StringValue') {
                                    const reason = reasonArg.value.value;
                                    const dateRegex = /\d{2}-\d{2}-\d{4}/;
                                    const hasDate = dateRegex.test(reason);
                                    const hasMigrationPath = reason.toLowerCase().includes('please migrate to');

                                    if (!hasDate || !hasMigrationPath) {
                                        violations++;
                                        message += `Field "${node.name.value}" has an invalid deprecation reason.`;
                                    }
                                } else {
                                    violations++;
                                    message += `Field "${node.name.value}" is deprecated without a reason.`;
                                }
                            } else {
                                violations++;
                                message += `Field "${node.name.value}" is deprecated without a reason.`;
                            }
                        }
                    }
                }
            }
        });

        return {
            rule: this.name,
            violations: violations,
            message: message || "All deprecations are valid."
        };
    }
}
