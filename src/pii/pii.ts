import {buildSchema, type ConstDirectiveNode, type DocumentNode, parse, visit} from "graphql";
import type {ValidationResult, ValidationRule} from "../validator/validator"
import type {DirectiveNode} from "graphql/language/ast";

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

export class PiiValidator implements ValidationRule {

    validate(ast: DocumentNode): ValidationResult {
        const piiFields: {field: string, status: string}[] = [];
        const nonPiiFields: {field: string, status: string}[] = [];
        let fields: number = 0;

        const details = [];

        const self = this;

        // Visit all field definitions in the schema
        visit(ast, {
            FieldDefinition(node) {
                fields++

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
            isValid: nonPiiFields.length === 0,
            evaluated: fields,
            violations: nonPiiFields.length,
            summary: {
                totalPIIFieldsMarked: piiFields.length,
                potentialPIIMissing: nonPiiFields.length,
            },
            details: nonPiiFields,
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