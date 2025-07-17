import {visit} from "graphql";
import {Rule, ValidationResult} from "../model.ts";
import {DocumentNode} from "graphql/index";

export class CompositeKeyRule implements Rule {
    name = "Composite Keys";
    weight = 5;
    private maxCompositeKeys: number;

    constructor(maxCompositeKeys = 2) {
        this.maxCompositeKeys = maxCompositeKeys;
    }

    validate(ast: DocumentNode): ValidationResult {
        const violations: any[] = [];

        visit(ast, {
            ObjectTypeDefinition: {
                enter: (node) => {
                    const directives = node.directives || [];
                    const compositeKeyDirectives = directives.filter(
                        d => d.name.value === 'key'
                    );

                    if (compositeKeyDirectives.length > this.maxCompositeKeys) {
                        violations.push({
                            type: node.name.value,
                            compositeKeyCount: compositeKeyDirectives.length,
                            message: `Type "${node.name.value}" has ${compositeKeyDirectives.length} composite keys, which exceeds the maximum of ${this.maxCompositeKeys}`
                        });
                    }
                }
            }
        });

        return {
            rule: this.name,
            violations: violations.length,
            message: `Found ${violations.length} types with more than ${this.maxCompositeKeys} composite keys.`
        };
    }
}