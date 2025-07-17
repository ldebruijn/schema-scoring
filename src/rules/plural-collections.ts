import {type DocumentNode, visit} from "graphql";
import {Rule, ValidationResult} from "../model.ts";
import pluralize from "pluralize";

export class PluralCollectionsRule implements Rule {
    name = "Plural Collections";
    weight = 5;

    validate(ast: DocumentNode): ValidationResult {
        let violations = 0;
        let message = "";

        visit(ast, {
            FieldDefinition(node) {
                if (node.type.kind === 'ListType') {
                    if (!pluralize.isPlural(node.name.value)) {
                        violations++;
                        message += `Field "${node.name.value}" returns a list but is not plural.`;
                    }
                }
            }
        });

        return {
            rule: this.name,
            violations: violations,
            message: message || "All collection fields are plural."
        };
    }
}
