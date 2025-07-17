import {DocumentNode} from "graphql";

export type ValidationResult = {
    rule: string,
    violations: number
    message: string
}

export interface Rule {
    name: string
    weight: number
    validate(ast: DocumentNode): ValidationResult
}