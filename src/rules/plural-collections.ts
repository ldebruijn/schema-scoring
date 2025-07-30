import {type DocumentNode, visit} from "graphql";
import {Rule, ValidationResult, Violation} from "../model.ts";
import pluralize from "pluralize";

export class PluralCollectionsRule implements Rule {
    name = "Plural Collections";
    weight = 5;

    validate(ast: DocumentNode): ValidationResult {
        const violations: Violation[] = [];

        visit(ast, {
            FieldDefinition(node, key, parent, path, ancestors) {
                if (node.type.kind === 'ListType') {
                    if (!pluralize.isPlural(node.name.value)) {
                        const typeName = ancestors.find(ancestor => 
                            ancestor?.kind === 'ObjectTypeDefinition' || 
                            ancestor?.kind === 'InterfaceTypeDefinition'
                        )?.name?.value || 'Unknown';

                        violations.push({
                            message: `Field "${node.name.value}" returns a list but is not plural`,
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
                ? `Found ${violations.length} collection fields that are not plural`
                : "All collection fields are plural."
        };
    }
}
