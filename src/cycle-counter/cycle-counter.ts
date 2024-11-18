import {buildSchema, type DocumentNode, parse, visit} from "graphql";

export class GraphQLCycleCounter {
    private readonly typeGraph: Map<any, any>;

    constructor() {
        this.typeGraph = new Map();
    }

    countCycles(schemaString: string) {
        const schema = buildSchema(schemaString);
        const ast = parse(schemaString);

        // Reset state
        this.typeGraph.clear();

        // Build the dependency graph
        this.buildGraph(ast);

        // Find all unique cycles
        const cycles = this.findUniqueCycles();

        return {
            totalCycles: cycles.length,
            cycles: cycles.map(cycle => ({
                path: cycle,
                length: cycle.length - 1, // Subtract 1 as last element is repeated
                types: new Set(cycle)
            })),
            summary: this.generateCycleSummary(cycles)
        };
    }

    buildGraph(ast: DocumentNode) {
        let currentType = null;

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

    getBaseType(typeNode) {
        while (typeNode.kind === 'NonNullType' || typeNode.kind === 'ListType') {
            typeNode = typeNode.type;
        }
        return typeNode.name.value;
    }

    isObjectType(typeName) {
        const scalarTypes = new Set([
            'String', 'Int', 'Float', 'Boolean', 'ID',
            'Date', 'DateTime', 'Time', 'JSON'
        ]);
        return !scalarTypes.has(typeName);
    }

    findUniqueCycles() {
        const cycles = new Set();
        const visited = new Set();
        const recursionStack = new Set();

        const visit = (type, path = []) => {
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

    normalizeCycle(cycle) {
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

    generateCycleSummary(cycles) {
        const summary = {
            totalCycles: cycles.length,
            cyclesByLength: {},
            typeInvolvementCount: {},
            longestCycle: null,
            shortestCycle: null
        };

        cycles.forEach(cycle => {
            const length = cycle.length - 1; // Subtract 1 as last element is repeated

            // Count cycles by length
            summary.cyclesByLength[length] = (summary.cyclesByLength[length] || 0) + 1;

            // Count type involvement
            cycle.forEach(type => {
                summary.typeInvolvementCount[type] = (summary.typeInvolvementCount[type] || 0) + 1;
            });

            // Track longest/shortest cycles
            if (!summary.longestCycle || length > summary.longestCycle.length) {
                summary.longestCycle = { path: cycle, length };
            }
            if (!summary.shortestCycle || length < summary.shortestCycle.length) {
                summary.shortestCycle = { path: cycle, length };
            }
        });

        return summary;
    }
}