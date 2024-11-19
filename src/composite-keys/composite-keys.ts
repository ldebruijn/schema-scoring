import {parse, visit} from "graphql";

export class CompositeKeyValidator {
    private maxCompositeKeys: number;

    constructor(maxCompositeKeys = 3) {
        this.maxCompositeKeys = maxCompositeKeys;
    }

    validateSchema(schemaString: string) {
        const ast = parse(schemaString);
        const violations = [];

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
            isValid: violations.length === 0,
            violations
        };
    }
}