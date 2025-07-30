import {type DocumentNode, visit} from "graphql";
import {Rule, ValidationResult, Violation} from "../model.ts";

export class ProblemUnionRule implements Rule {
    name = "Problem Union";
    weight = 10;

    validate(ast: DocumentNode): ValidationResult {
        const violations: Violation[] = [];

        visit(ast, {
            ObjectTypeDefinition(node) {
                if (node.name.value === 'Mutation') {
                    for (const field of node.fields) {
                        if (field.type.kind === 'NamedType') {
                            const typeName = field.type.name.value;
                            if (!typeName.endsWith('Result')) {
                                violations.push({
                                    message: `Mutation "${field.name.value}" does not return a union type ending in 'Result'`,
                                    location: {
                                        line: field.loc?.startToken.line,
                                        column: field.loc?.startToken.column,
                                        field: field.name.value,
                                        type: 'Mutation',
                                        coordinate: `Mutation.${field.name.value}`
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
                ? `Found ${violations.length} mutations not returning proper union types`
                : "All mutations return a valid union type."
        };
    }
}
