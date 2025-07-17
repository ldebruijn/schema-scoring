import {type DocumentNode, visit} from "graphql";
import {Rule, ValidationResult} from "../model.ts";

export class NullableExternalRule implements Rule {
    name = "Nullable External";
    weight = 15;

    validate(ast: DocumentNode): ValidationResult {
        let violations = 0;
        let message = "";

        visit(ast, {
            FieldDefinition(node) {
                if (node.type.kind === 'NonNullType') {
                    if (node.directives) {
                        const isExternal = node.directives.some(d => d.name.value === 'external');
                        if (isExternal) {
                            violations++;
                            message += `Field "${node.name.value}" is external but not nullable.`;
                        }
                    }
                }
            }
        });

        return {
            rule: this.name,
            violations: violations,
            message: message || "All external fields are nullable."
        };
    }
}
