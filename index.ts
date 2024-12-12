import {Validator} from "./src/validator/validator.ts";

console.log("Lets score some schemas!");

const contents = Bun.file('./schema.graphqls')

const schema = await contents.text()

const validator = new Validator(schema)

validator.validate()