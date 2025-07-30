import {type DocumentNode, visit} from "graphql";
import {Rule, ValidationResult, Violation} from "../model.ts";

export class NullableExternalRule implements Rule {
    name = "Nullable External";
    weight = 15;

    validate(ast: DocumentNode): ValidationResult {
        const violations: Violation[] = [];

        visit(ast, {
            FieldDefinition(node, key, parent, path, ancestors) {
                if (node.type.kind === 'NonNullType') {
                    if (node.directives) {
                        const isExternal = node.directives.some(d => d.name.value === 'external');
                        if (isExternal) {
                            const typeName = ancestors.find(ancestor => 
                                ancestor?.kind === 'ObjectTypeDefinition' || 
                                ancestor?.kind === 'InterfaceTypeDefinition'
                            )?.name?.value || 'Unknown';

                            violations.push({
                                message: `Field "${node.name.value}" is external but not nullable`,
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
        });

        return {
            rule: this.name,
            violations: violations,
            message: violations.length > 0 
                ? `Found ${violations.length} external fields that are not nullable`
                : "All external fields are nullable."
        };
    }
}
