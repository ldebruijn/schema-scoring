import {type DocumentNode, visit} from "graphql";
import {Rule, ValidationResult} from "../model.ts";

export class NullBlastRadiusRule implements Rule {
    name = "Null Blast Radius";
    weight = 20;
    private config: { maxBlastRadius: number; criticalTypePaths: string[]; warningThreshold: number };
    private typeMap: Map<any, any>;
    private nullabilityGraph: Map<any, any>;

    constructor(config = {
        maxBlastRadius: 5, // Maximum acceptable number of affected fields
        criticalTypePaths: [], // Paths that are considered business-critical
        warningThreshold: 3 // Threshold for warning level blast radius
    }) {
        this.config = config;
        this.typeMap = new Map();
        this.nullabilityGraph = new Map();
    }

    validate(ast: DocumentNode): ValidationResult {
        // Reset state
        this.typeMap.clear();
        this.nullabilityGraph.clear();

        // Build dependency graph
        this.buildNullabilityGraph(ast);

        // Analyze blast radius for each field
        const analysis = this.analyzeBlastRadius();

        const violations = this.identifyViolations(analysis)

        return {
            rule: this.name,
            violations: violations.length,
            message: `Found ${violations.length} fields with a null blast radius greater than ${this.config.maxBlastRadius}.`
        }
    }

    buildNullabilityGraph(ast: DocumentNode) {
        let currentType: string | null = null;

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

                    const currentField = node.name.value;
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

    analyzeFieldType(typeNode: any, isNonNull = false): any {
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

    isComplexType(typeName: string) {
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

    traverseNullabilityImpact(fieldPath: string, affectedFields: Set<string>, visited: Set<string>) {
        if (visited.has(fieldPath)) return;
        visited.add(fieldPath);
        affectedFields.add(fieldPath);

        const dependencies = this.nullabilityGraph.get(fieldPath) || new Set();
        for (const dep of dependencies) {
            this.traverseNullabilityImpact(dep, affectedFields, visited);
        }
    }

    calculateSeverity(blastRadius: number) {
        if (blastRadius >= this.config.maxBlastRadius) return 'critical';
        if (blastRadius >= this.config.warningThreshold) return 'warning';
        return 'info';
    }

    isCriticalPath(fieldPath: string) {
        return this.config.criticalTypePaths.some(criticalPath =>
            fieldPath.startsWith(criticalPath)
        );
    }

    identifyViolations(analysis: Map<string, any>) {
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
}