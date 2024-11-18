import {buildSchema, parse} from "graphql/index";


function processSchema(definition: string) {
    const schema = buildSchema(definition);
    const ast = parse(definition);
}