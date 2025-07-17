import {type DocumentNode, visit} from "graphql";
import {Rule, ValidationResult} from "../model.ts";

export class ProblemUnionRule implements Rule {
    name = "Problem Union";
    weight = 10;

    validate(ast: DocumentNode): ValidationResult {
        let violations = 0;
        let message = "";

        visit(ast, {
            ObjectTypeDefinition(node) {
                if (node.name.value === 'Mutation') {
                    for (const field of node.fields) {
                        if (field.type.kind === 'NamedType') {
                            const typeName = field.type.name.value;
                            if (!typeName.endsWith('Result')) {
                                violations++;
                                message += `Mutation "${field.name.value}" does not return a union type ending in 'Result'.`;
                            }
                        }
                    }
                }
            }
        });

        return {
            rule: this.name,
            violations: violations,
            message: message || "All mutations return a valid union type."
        };
    }
}
