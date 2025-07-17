# schema-score

A tool for scoring GraphQL schemas based on a set of rules. This tool helps to enforce best practices and maintain a healthy GraphQL schema.

## Installation

To install dependencies:

```bash
bun install
```

## Usage

To run the schema scorer, provide a path to a GraphQL schema file:

```bash
bun run index.ts <path-to-schema>.graphql
```

## Scoring

The final score is calculated using the following formula:

`score = 100 * (1 - (SUM(rule.weight * (violations ^ 1.5)) / total_fields))`

This formula ensures that a few violations will only slightly lower the score, but a larger number of violations will have a much more significant impact. The score is also normalized by the size of the schema, so that larger schemas are not unfairly penalized.

## Rules

The schema scorer uses a set of rules to evaluate the schema. Each rule has a weight, and the final score is calculated based on the number of violations and their respective weights. For more information on the rules, see [RULES.md](RULES.md).
