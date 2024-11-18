import {buildSchema, parse, visit} from "graphql";

export function validatePIIFields(schemaString) {
    // Build the schema
    const schema = buildSchema(schemaString);
    const ast = parse(schemaString);

    const piiFields = [];
    const nonPiiFields = [];

    // Helper to check if a field has @pii directive
    function hasPIIDirective(directives) {
        return directives.some(directive => directive.name.value === 'pii');
    }

    // Helper to identify potential PII field names
    const piiPatterns = [
        /email/i,
        /phone/i,
        /address/i,
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

    function isPotentialPIIField(fieldName) {
        return piiPatterns.some(pattern => pattern.test(fieldName));
    }

    // Visit all field definitions in the schema
    visit(ast, {
        FieldDefinition(node) {
            const fieldName = node.name.value;
            const hasPII = node.directives && hasPIIDirective(node.directives);

            if (isPotentialPIIField(fieldName)) {
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
    const report = {
        summary: {
            totalPIIFieldsMarked: piiFields.length,
            potentialPIIMissing: nonPiiFields.length,
        },
        markedPIIFields: piiFields,
        potentialUnmarkedPIIFields: nonPiiFields,
        isValid: nonPiiFields.length === 0,
    };

    return report;
}