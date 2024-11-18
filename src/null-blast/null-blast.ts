import {buildSchema, parse, visit} from "graphql";

export class NullBlastRadiusValidator {
    constructor(config = {}) {
        this.config = {
            maxBlastRadius: config.maxBlastRadius || 5, // Maximum acceptable number of affected fields
            criticalTypePaths: config.criticalTypePaths || [], // Paths that are considered business-critical
            warningThreshold: config.warningThreshold || 3, // Threshold for warning level blast radius
            ...config
        };
        this.typeMap = new Map();
        this.nullabilityGraph = new Map();
    }

    validate(schemaString) {
        const schema = buildSchema(schemaString);
        const ast = parse(schemaString);

        // Reset state
        this.typeMap.clear();
        this.nullabilityGraph.clear();

        // Build dependency graph
        this.buildNullabilityGraph(ast);

        // Analyze blast radius for each field
        const analysis = this.analyzeBlastRadius();

        return {
            violations: this.identifyViolations(analysis),
            analysis,
            summary: this.generateSummary(analysis)
        };
    }

    buildNullabilityGraph(ast) {
        let currentType = null;
        let currentField = null;

        visit(ast, {
            ObjectTypeDefinition: {
                enter: (node) => {
                    currentType = node.name.value;
                    this.typeMap.set(currentType, {
                        fields: new Map(),
                        nonNullFields: new Set()
                    });
                },
                leave: () => {
                    currentType = null;
                }
            },
            FieldDefinition: {
                enter: (node) => {
                    if (!currentType) return;

                    currentField = node.name.value;
                    const fieldInfo = this.analyzeFieldType(node.type);

                    this.typeMap.get(currentType).fields.set(currentField, fieldInfo);

                    if (fieldInfo.isNonNull) {
                        this.typeMap.get(currentType).nonNullFields.add(currentField);
                    }

                    // Track field dependencies
                    if (!this.nullabilityGraph.has(`${currentType}.${currentField}`)) {
                        this.nullabilityGraph.set(`${currentType}.${currentField}`, new Set());
                    }
                },
                leave: () => {
                    currentField = null;
                }
            }
        });

        // Build nullability propagation graph
        for (const [typeName, typeInfo] of this.typeMap) {
            for (const [fieldName, fieldInfo] of typeInfo.fields) {
                if (fieldInfo.dependentType && this.typeMap.has(fieldInfo.dependentType)) {
                    const dependentType = this.typeMap.get(fieldInfo.dependentType);
                    for (const nonNullField of dependentType.nonNullFields) {
                        this.nullabilityGraph.get(`${typeName}.${fieldName}`).add(
                            `${fieldInfo.dependentType}.${nonNullField}`
                        );
                    }
                }
            }
        }
    }

    analyzeFieldType(typeNode, isNonNull = false) {
        switch (typeNode.kind) {
            case 'NonNullType':
                return this.analyzeFieldType(typeNode.type, true);
            case 'ListType':
                return {
                    ...this.analyzeFieldType(typeNode.type, false),
                    isList: true
                };
            case 'NamedType':
                return {
                    typeName: typeNode.name.value,
                    isNonNull,
                    isList: false,
                    dependentType: this.isComplexType(typeNode.name.value) ? typeNode.name.value : null
                };
            default:
                return null;
        }
    }

    isComplexType(typeName) {
        const scalarTypes = new Set([
            'String', 'Int', 'Float', 'Boolean', 'ID',
            'Date', 'DateTime', 'Time', 'JSON'
        ]);
        return !scalarTypes.has(typeName);
    }

    analyzeBlastRadius() {
        const analysis = new Map();

        for (const [fieldPath] of this.nullabilityGraph) {
            const affectedFields = new Set();
            this.traverseNullabilityImpact(fieldPath, affectedFields, new Set());
            analysis.set(fieldPath, {
                blastRadius: affectedFields.size,
                affectedFields: Array.from(affectedFields),
                severity: this.calculateSeverity(affectedFields.size),
                isCriticalPath: this.isCriticalPath(fieldPath)
            });
        }

        return analysis;
    }

    traverseNullabilityImpact(fieldPath, affectedFields, visited) {
        if (visited.has(fieldPath)) return;
        visited.add(fieldPath);
        affectedFields.add(fieldPath);

        const dependencies = this.nullabilityGraph.get(fieldPath) || new Set();
        for (const dep of dependencies) {
            this.traverseNullabilityImpact(dep, affectedFields, visited);
        }
    }

    calculateSeverity(blastRadius) {
        if (blastRadius >= this.config.maxBlastRadius) return 'critical';
        if (blastRadius >= this.config.warningThreshold) return 'warning';
        return 'info';
    }

    isCriticalPath(fieldPath) {
        return this.config.criticalTypePaths.some(criticalPath =>
            fieldPath.startsWith(criticalPath)
        );
    }

    identifyViolations(analysis) {
        const violations = [];

        for (const [fieldPath, info] of analysis) {
            if (info.blastRadius >= this.config.maxBlastRadius) {
                violations.push({
                    fieldPath,
                    blastRadius: info.blastRadius,
                    severity: 'critical',
                    message: `Field ${fieldPath} has a null blast radius of ${info.blastRadius}, exceeding maximum of ${this.config.maxBlastRadius}`
                });
            } else if (info.blastRadius >= this.config.warningThreshold && this.isCriticalPath(fieldPath)) {
                violations.push({
                    fieldPath,
                    blastRadius: info.blastRadius,
                    severity: 'warning',
                    message: `Critical path field ${fieldPath} has a concerning null blast radius of ${info.blastRadius}`
                });
            }
        }

        return violations;
    }

    generateSummary(analysis) {
        const summary = {
            totalFields: analysis.size,
            violationsByType: {
                critical: 0,
                warning: 0,
                info: 0
            },
            averageBlastRadius: 0,
            maxBlastRadius: 0,
            criticalPathsAffected: 0
        };

        let totalBlastRadius = 0;
        for (const info of analysis.values()) {
            summary.violationsByType[info.severity]++;
            totalBlastRadius += info.blastRadius;
            summary.maxBlastRadius = Math.max(summary.maxBlastRadius, info.blastRadius);
            if (info.isCriticalPath) {
                summary.criticalPathsAffected++;
            }
        }

        summary.averageBlastRadius = totalBlastRadius / analysis.size;
        return summary;
    }
}