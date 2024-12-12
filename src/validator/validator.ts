import {parse} from "graphql/index";
import type {DocumentNode} from "graphql";
import {PiiValidator} from "../pii/pii.ts";

export type ValidationResult = {
    isValid: boolean
    details: any
    evaluated: number
    violations: number
}

export interface ValidationRule {
    validate(ast: DocumentNode): ValidationResult | any
}

export class Validator {
    private readonly ast: DocumentNode
    private readonly rules: ValidationRule[]

    constructor(schemaString: string) {
        this.ast = parse(schemaString)
        this.rules = [
            new PiiValidator()
        ]
    }

    validate() {
        for (let i = this.rules.length - 1; i >= 0; i--) {
            const rule = this.rules[i]

            console.log(`Running validator [${rule.constructor.name}]`)

            const result = rule.validate(this.ast)
            console.log(result)
        }
    }
}