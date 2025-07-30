import {DocumentNode} from "graphql";

export type ViolationLocation = {
    line?: number;
    column?: number;
    field?: string;
    type?: string;
    coordinate?: string;
}

export type Violation = {
    message: string;
    location: ViolationLocation;
}

export type ValidationResult = {
    rule: string,
    violations: Violation[]
    message: string
}

export interface Rule {
    name: string
    weight: number
    validate(ast: DocumentNode): ValidationResult
}

export type SchemaReport = {
    timestamp: string;
    subgraphName?: string;
    score: number;
    totalFields: number;
    totalWeightedViolations: number;
    ruleResults: ValidationResult[];
    metadata?: Record<string, any>;
}