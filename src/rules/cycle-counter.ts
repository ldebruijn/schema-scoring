import {type DocumentNode, visit} from "graphql";
import {Rule, ValidationResult} from "../model.ts";

export class CycleCounterRule implements Rule {
    name = "Cycle Counter";
    weight = 15;
    private readonly typeGraph: Map<any, any>;

    constructor() {
        this.typeGraph = new Map();
    }

    validate(ast: DocumentNode): ValidationResult {
        // Reset state
        this.typeGraph.clear();

        // Build the dependency graph
        this.buildGraph(ast);

        // Find all unique cycles
        const cycles = this.findUniqueCycles();

        return {
            rule: this.name,
            violations: cycles.length,
            message: `Found ${cycles.length} cycles in the schema.`
        };
    }

    buildGraph(ast: DocumentNode) {
        let currentType: string | null = null;

        visit(ast, {
            ObjectTypeDefinition: {
                enter: (node) => {
                    currentType = node.name.value;
                    if (!this.typeGraph.has(currentType)) {
                        this.typeGraph.set(currentType, new Set());
                    }
                },
                leave: () => {
                    currentType = null;
                }
            },
            FieldDefinition: (node) => {
                if (!currentType) return;

                let fieldType = this.getBaseType(node.type);
                if (this.isObjectType(fieldType)) {
                    this.typeGraph.get(currentType).add(fieldType);
                }
            }
        });
    }

    getBaseType(typeNode: any): string {
        while (typeNode.kind === 'NonNullType' || typeNode.kind === 'ListType') {
            typeNode = typeNode.type;
        }
        return typeNode.name.value;
    }

    isObjectType(typeName: string) {
        const scalarTypes = new Set([
            'String', 'Int', 'Float', 'Boolean', 'ID',
            'Date', 'DateTime', 'Time', 'JSON'
        ]);
        return !scalarTypes.has(typeName);
    }

    findUniqueCycles() {
        const cycles = new Set<string>();
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const visit = (type: string, path: string[] = []) => {
            visited.add(type);
            recursionStack.add(type);
            path.push(type);

            const dependencies = this.typeGraph.get(type) || new Set();
            for (const dependency of dependencies) {
                if (!visited.has(dependency)) {
                    visit(dependency, [...path]);
                } else if (recursionStack.has(dependency)) {
                    // Found a cycle
                    const cycleStart = path.indexOf(dependency);
                    const cycle = path.slice(cycleStart);
                    cycle.push(dependency); // Complete the cycle

                    // Normalize cycle to ensure unique representation
                    const normalizedCycle = this.normalizeCycle(cycle);
                    cycles.add(normalizedCycle);
                }
            }

            recursionStack.delete(type);
            path.pop();
        };

        // Start DFS from each node
        for (const [type] of this.typeGraph) {
            if (!visited.has(type)) {
                visit(type);
            }
        }

        return Array.from(cycles).map(cycle => cycle.split(','));
    }

    normalizeCycle(cycle: string[]) {
        // Rotate cycle to start with lexicographically smallest type
        let minIndex = 0;
        for (let i = 1; i < cycle.length - 1; i++) {
            if (cycle[i] < cycle[minIndex]) {
                minIndex = i;
            }
        }

        const normalized = [
            ...cycle.slice(minIndex, cycle.length - 1),
            ...cycle.slice(0, minIndex),
            cycle[minIndex]
        ];

        return normalized.join(',');
    }
}