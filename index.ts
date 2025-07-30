import {Validator} from "./src/validator.ts";

function parseArgs() {
    const args = process.argv.slice(2);
    const options: {
        filePath?: string;
        reportEndpoint?: string;
        subgraphName?: string;
        headers?: Record<string, string>;
        silent?: boolean;
    } = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--report-endpoint' && i + 1 < args.length) {
            options.reportEndpoint = args[++i];
        } else if (arg === '--subgraph-name' && i + 1 < args.length) {
            options.subgraphName = args[++i];
        } else if (arg === '--header' && i + 1 < args.length) {
            const headerPair = args[++i];
            const [key, value] = headerPair.split('=', 2);
            if (key && value) {
                options.headers = options.headers || {};
                options.headers[key] = value;
            }
        } else if (arg === '--silent') {
            options.silent = true;
        } else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        } else if (!arg.startsWith('--') && !options.filePath) {
            options.filePath = arg;
        }
    }

    return options;
}

function printHelp() {
    console.log(`
GraphQL Schema Scorer

Usage: bun run index.ts <schema-file> [options]

Options:
  --report-endpoint <url>     Send results to this HTTP endpoint
  --subgraph-name <name>      Name of the subgraph for reporting
  --header <key=value>        Add custom header for reporting (can be used multiple times)
  --silent                    Suppress console output
  --help, -h                  Show this help message

Examples:
  bun run index.ts schema.graphql
  bun run index.ts schema.graphql --report-endpoint https://api.example.com/schema-reports
  bun run index.ts schema.graphql --report-endpoint https://api.example.com/reports --subgraph-name user-service
  bun run index.ts schema.graphql --report-endpoint https://api.example.com/reports --header Authorization="Bearer token123"
`);
}

async function main() {
    const options = parseArgs();

    if (!options.filePath) {
        console.error("Please provide a path to a GraphQL schema file.");
        printHelp();
        process.exit(1);
    }

    if (!options.silent) {
        console.log(`Loading schema from ${options.filePath}...`);
    }

    const contents = await Bun.file(options.filePath).text();
    const validator = new Validator(contents);

    const validateOptions: any = {
        silent: options.silent
    };

    if (options.reportEndpoint) {
        validateOptions.reporterConfig = {
            endpoint: options.reportEndpoint,
            headers: options.headers
        };
        validateOptions.subgraphName = options.subgraphName;
        validateOptions.metadata = {
            filePath: options.filePath,
            timestamp: new Date().toISOString()
        };
    }

    const result = await validator.validate(validateOptions);

    if (!options.silent && options.reportEndpoint) {
        console.log(`\n📊 Results sent to: ${options.reportEndpoint}`);
    }
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});