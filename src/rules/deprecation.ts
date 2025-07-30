import {type DocumentNode, visit} from "graphql";
import {Rule, ValidationResult, Violation} from "../model.ts";

export class DeprecationRule implements Rule {
    name = "Deprecation";
    weight = 5;

    validate(ast: DocumentNode): ValidationResult {
        const violations: Violation[] = [];

        visit(ast, {
            FieldDefinition(node, key, parent, path, ancestors) {
                if (node.directives) {
                    for (const directive of node.directives) {
                        if (directive.name.value === 'deprecated') {
                            const typeName = ancestors.find(ancestor => 
                                ancestor?.kind === 'ObjectTypeDefinition' || 
                                ancestor?.kind === 'InterfaceTypeDefinition'
                            )?.name?.value || 'Unknown';

                            let violationMessage = '';

                            if (directive.arguments) {
                                const reasonArg = directive.arguments.find(arg => arg.name.value === 'reason');
                                if (reasonArg && reasonArg.value.kind === 'StringValue') {
                                    const reason = reasonArg.value.value;
                                    const dateRegex = /\d{2}-\d{2}-\d{4}/;
                                    const hasDate = dateRegex.test(reason);
                                    const hasMigrationPath = reason.toLowerCase().includes('please migrate to');

                                    if (!hasDate || !hasMigrationPath) {
                                        violationMessage = `Field "${node.name.value}" has an invalid deprecation reason`;
                                    }
                                } else {
                                    violationMessage = `Field "${node.name.value}" is deprecated without a reason`;
                                }
                            } else {
                                violationMessage = `Field "${node.name.value}" is deprecated without a reason`;
                            }

                            if (violationMessage) {
                                violations.push({
                                    message: violationMessage,
                                    location: {
                                        line: node.loc?.startToken.line,
                                        column: node.loc?.startToken.column,
                                        field: node.name.value,
                                        type: typeName,
                                        coordinate: `${typeName}.${node.name.value}`
                                    }
                                });
                            }
                        }
                    }
                }
            }
        });

        return {
            rule: this.name,
            violations: violations,
            message: violations.length > 0 
                ? `Found ${violations.length} invalid deprecations`
                : "All deprecations are valid."
        };
    }
}
