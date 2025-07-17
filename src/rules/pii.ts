import {type ConstDirectiveNode, type DocumentNode, visit} from "graphql";
import type {Rule, ValidationResult} from "../model.ts";

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
        const piiFields: { field: string, status: string }[] = [];
        const nonPiiFields: { field: string, status: string }[] = [];

        const self = this;

        // Visit all field definitions in the schema
        visit(ast, {
            FieldDefinition(node) {

                const fieldName = node.name.value;
                const hasPII = node.directives && self.hasPIIDirective(node.directives);

                if (self.isPotentialPIIField(fieldName)) {
                    if (hasPII) {
                        piiFields.push({
                            field: fieldName,
                            status: 'correctly_marked'
                        });
                    } else {
                        nonPiiFields.push({
                            field: fieldName,
                            status: 'potentially_missing_pii_directive'
                        });
                    }
                } else if (hasPII) {
                    piiFields.push({
                        field: fieldName,
                        status: 'marked_as_pii'
                    });
                }
            }
        });

        // Generate validation report
        return {
            rule: this.name,
            violations: nonPiiFields.length,
            message: `Found ${nonPiiFields.length} fields that are potentially PII but are not marked with the @pii directive.`
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