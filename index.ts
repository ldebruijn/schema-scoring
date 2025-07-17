import {Validator} from "./src/validator.ts";

const filePath = process.argv[2];

if (!filePath) {
    console.error("Please provide a path to a GraphQL schema file.");
    process.exit(1);
}

console.log(`Loading schema from ${filePath}...`);

const contents = await Bun.file(filePath).text()

const validator = new Validator(contents)

validator.validate()