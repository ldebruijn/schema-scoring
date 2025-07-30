package domain

import (
	"github.com/google/uuid"
	"time"
)

// IncomingReport represents the JSON structure we expect from the schema scorer
type IncomingReport struct {
	Timestamp               string                 `json:"timestamp"`
	SubgraphName            *string                `json:"subgraphName"`
	Score                   float64                `json:"score"`
	TotalFields             int                    `json:"totalFields"`
	TotalWeightedViolations float64                `json:"totalWeightedViolations"`
	RuleResults             []IncomingRuleResult   `json:"ruleResults"`
	Metadata                map[string]interface{} `json:"metadata"`
}

// IncomingRuleResult represents a rule result from the schema scorer
type IncomingRuleResult struct {
	Rule       string              `json:"rule"`
	Violations []IncomingViolation `json:"violations"`
	Message    string              `json:"message"`
}

// IncomingViolation represents a violation from the schema scorer
type IncomingViolation struct {
	Message  string           `json:"message"`
	Location IncomingLocation `json:"location"`
}

// IncomingLocation represents location data from the schema scorer
type IncomingLocation struct {
	Line       *int    `json:"line"`
	Column     *int    `json:"column"`
	Field      *string `json:"field"`
	Type       *string `json:"type"`
	Coordinate *string `json:"coordinate"`
}

// ToDomainEntity converts the incoming DTO to domain entities
func (ir *IncomingReport) ToDomainEntity() (*SchemaReport, []RuleResult, error) {
	// Parse timestamp
	timestamp, err := time.Parse(time.RFC3339, ir.Timestamp)
	if err != nil {
		return nil, nil, err
	}

	id := uuid.NewString()

	// Create schema report
	report := NewSchemaReport(
		id,
		ir.SubgraphName,
		ir.Score,
		ir.TotalFields,
		ir.TotalWeightedViolations,
		timestamp,
		ir.Metadata,
	)

	// Convert rule results
	var ruleResults []RuleResult
	for _, incomingRuleResult := range ir.RuleResults {
		ruleResult := RuleResult{
			RuleName:       incomingRuleResult.Rule,
			ViolationCount: len(incomingRuleResult.Violations),
			Message:        incomingRuleResult.Message,
			Violations:     make([]Violation, 0),
		}

		// Convert violations
		for _, incomingViolation := range incomingRuleResult.Violations {
			violation := Violation{
				Message:            incomingViolation.Message,
				LocationLine:       incomingViolation.Location.Line,
				LocationColumn:     incomingViolation.Location.Column,
				LocationField:      incomingViolation.Location.Field,
				LocationType:       incomingViolation.Location.Type,
				LocationCoordinate: incomingViolation.Location.Coordinate,
			}
			ruleResult.Violations = append(ruleResult.Violations, violation)
		}

		ruleResults = append(ruleResults, ruleResult)
	}

	return report, ruleResults, nil
}
