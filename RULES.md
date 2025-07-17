# Rules

This document outlines the rules used by the schema scorer to evaluate GraphQL schemas.

## Scoring

The final score is calculated using the following formula:

`score = 100 * (1 - (SUM(rule.weight * (violations ^ 1.5)) / total_fields))`

This formula ensures that a few violations will only slightly lower the score, but a larger number of violations will have a much more significant impact. The score is also normalized by the size of the schema, so that larger schemas are not unfairly penalized.

## Deprecation

- **Description**: Enforces that deprecated fields have a valid reason, including a deprecation date and a migration path.
- **Weight**: 5

## Problem Union

- **Description**: Enforces that mutations return a union type ending in `Result`.
- **Weight**: 10

## Nullable External

- **Description**: Enforces that fields marked with `@external` are nullable.
- **Weight**: 15

## Plural Collections

- **Description**: Enforces that fields that return a list are plural.
- **Weight**: 5

## Boolean Prefix

- **Description**: Enforces that boolean fields are not prefixed with `is`.
- **Weight**: 5

## PII

- **Description**: Enforces that fields that are potentially PII are marked with the `@pii` directive.
- **Weight**: 10

## Composite Keys

- **Description**: Enforces that types do not have more than a specified number of composite keys.
- **Weight**: 5

## Cycle Counter

- **Description**: Enforces that the schema does not contain any cycles.
- **Weight**: 15

## Null Blast Radius

- **Description**: Enforces that the schema does not have a large null blast radius.
- **Weight**: 20
