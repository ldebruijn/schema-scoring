import {type DocumentNode, visit} from "graphql";
import type {Rule, ValidationResult, Violation} from "../model.ts";

export class BooleanPrefixRule implements Rule {
    name = "Boolean Prefix";
    weight = 5;

    validate(ast: DocumentNode): ValidationResult {
        const violations: Violation[] = [];

        visit(ast, {
            FieldDefinition(node, key, parent, path, ancestors) {
                if (node.type.kind === 'NamedType' && node.type.name.value === 'Boolean') {
                    if (node.name.value.startsWith('is')) {
                        const typeName = ancestors.find(ancestor => 
                            ancestor?.kind === 'ObjectTypeDefinition' || 
                            ancestor?.kind === 'InterfaceTypeDefinition'
                        )?.name?.value || 'Unknown';

                        violations.push({
                            message: `Field "${node.name.value}" is a boolean and should not be prefixed with 'is'`,
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
        });

        return {
            rule: this.name,
            violations: violations,
            message: violations.length > 0 
                ? `Found ${violations.length} boolean fields incorrectly prefixed with 'is'`
                : "All boolean fields are correctly named."
        };
    }
}
