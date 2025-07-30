package domain

import (
	"time"
)

var ()

// SchemaReport represents a schema scoring report in the domain
type SchemaReport struct {
	ID                      string
	SubgraphName            string
	Score                   float64
	TotalFields             int
	TotalWeightedViolations float64
	Timestamp               time.Time
	Metadata                map[string]interface{}
	CreatedAt               time.Time
	RuleResults             []RuleResult
}

// RuleResult represents the result of a single rule validation
type RuleResult struct {
	ID             string
	ReportID       string
	RuleName       string
	ViolationCount int
	Message        string
	CreatedAt      time.Time
	Violations     []Violation
}

// Violation represents a single rule violation
type Violation struct {
	ID                 string
	RuleResultID       string
	Message            string
	LocationLine       *int
	LocationColumn     *int
	LocationField      *string
	LocationType       *string
	LocationCoordinate *string
	CreatedAt          time.Time
}

// SubgraphSummary provides aggregated information about a subgraph
type SubgraphSummary struct {
	Name         string
	LatestScore  float64
	LatestReport time.Time
	ReportCount  int
	Trend        string // "up", "down", "stable"
}

// NewSchemaReport creates a new schema report
func NewSchemaReport(
	id string,
	subgraphName *string,
	score float64,
	totalFields int,
	totalWeightedViolations float64,
	timestamp time.Time,
	metadata map[string]interface{},
) *SchemaReport {
	sName := "Unknown"
	if subgraphName != nil {
		sName = *subgraphName
	}

	return &SchemaReport{
		ID:                      id,
		SubgraphName:            sName,
		Score:                   score,
		TotalFields:             totalFields,
		TotalWeightedViolations: totalWeightedViolations,
		Timestamp:               timestamp,
		Metadata:                metadata,
		CreatedAt:               time.Now(),
		RuleResults:             make([]RuleResult, 0),
	}
}

// AddRuleResult adds a rule result to the schema report
func (sr *SchemaReport) AddRuleResult(ruleResult RuleResult) {
	sr.RuleResults = append(sr.RuleResults, ruleResult)
}

// GetDisplayName returns the subgraph name or "Unknown" if nil
func (sr *SchemaReport) GetDisplayName() string {
	return sr.SubgraphName
}
