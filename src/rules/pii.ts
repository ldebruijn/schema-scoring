import {type ConstDirectiveNode, type DocumentNode, visit} from "graphql";
import type {Rule, ValidationResult, Violation} from "../model.ts";

// Helper to identify potential PII field names
const piiPatterns = [
    /email/i,
    /phone/i,
    /address/i,
    /street/i,
    /ssn/i,
    /social.*security/i,
    /passport/i,
    /license/i,
    /birthday/i,
    /dob/i,
    /birth.*date/i,
    /name/i,
    /zip/i,
    /postal/i,
    /credit.*card/i,
    /card.*number/i,
    /tax.*id/i,
    /nationality/i,
    /citizenship/i,
];

export class PiiRule implements Rule {
    name = "PII";
    weight = 10;

    validate(ast: DocumentNode): ValidationResult {
        const violations: Violation[] = [];
        const self = this;

        // Visit all field definitions in the schema
        visit(ast, {
            FieldDefinition(node, key, parent, path, ancestors) {
                const fieldName = node.name.value;
                const hasPII = node.directives && self.hasPIIDirective(node.directives);

                if (self.isPotentialPIIField(fieldName) && !hasPII) {
                    const typeName = ancestors.find(ancestor => 
                        ancestor?.kind === 'ObjectTypeDefinition' || 
                        ancestor?.kind === 'InterfaceTypeDefinition'
                    )?.name?.value || 'Unknown';

                    violations.push({
                        message: `Field "${fieldName}" appears to contain PII but is not marked with @pii directive`,
                        location: {
                            line: node.loc?.startToken.line,
                            column: node.loc?.startToken.column,
                            field: fieldName,
                            type: typeName,
                            coordinate: `${typeName}.${fieldName}`
                        }
                    });
                }
            }
        });

        // Generate validation report
        return {
            rule: this.name,
            violations: violations,
            message: `Found ${violations.length} fields that are potentially PII but are not marked with the @pii directive.`
        };
    }

    // Helper to check if a field has @pii directive
    hasPIIDirective(directives: readonly ConstDirectiveNode[]) {
        return directives.some(directive => directive.name.value === 'pii');
    }

    isPotentialPIIField(fieldName: string) {
        return piiPatterns.some(pattern => pattern.test(fieldName));
    }
}