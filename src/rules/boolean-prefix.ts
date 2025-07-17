import {type DocumentNode, visit} from "graphql";
import type {Rule, ValidationResult} from "../model.ts";

export class BooleanPrefixRule implements Rule {
    name = "Boolean Prefix";
    weight = 5;

    validate(ast: DocumentNode): ValidationResult {
        let violations = 0;
        let message = "";

        visit(ast, {
            FieldDefinition(node) {
                if (node.type.kind === 'NamedType' && node.type.name.value === 'Boolean') {
                    if (node.name.value.startsWith('is')) {
                        violations++;
                        message += `Field "${node.name.value}" is a boolean and should not be prefixed with 'is'.`;
                    }
                }
            }
        });

        return {
            rule: this.name,
            violations: violations,
            message: message || "All boolean fields are correctly named."
        };
    }
}
