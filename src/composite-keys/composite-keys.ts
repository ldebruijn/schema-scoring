import {buildSchema, parse, visit} from "graphql";

export class CompositeKeyValidator {
    constructor(maxCompositeKeys = 3) {
        this.maxCompositeKeys = maxCompositeKeys;
    }

    validateSchema(schemaString) {
        const schema = buildSchema(schemaString);
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