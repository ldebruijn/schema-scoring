package domain

import (
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"testing"
	"time"
)

func TestNewSchemaReport(t *testing.T) {
	tests := []struct {
		name                    string
		subgraphName            *string
		score                   float64
		totalFields             int
		totalWeightedViolations float64
		timestamp               time.Time
		metadata                map[string]interface{}
	}{
		{
			name:                    "create report with subgraph name",
			subgraphName:            stringPtr("user-service"),
			score:                   85.5,
			totalFields:             42,
			totalWeightedViolations: 10.2,
			timestamp:               time.Now(),
			metadata:                map[string]interface{}{"version": "1.0.0"},
		},
		{
			name:                    "create report without subgraph name",
			subgraphName:            nil,
			score:                   92.0,
			totalFields:             30,
			totalWeightedViolations: 5.1,
			timestamp:               time.Now(),
			metadata:                map[string]interface{}{},
		},
		{
			name:                    "create report with zero score",
			subgraphName:            stringPtr("test-service"),
			score:                   0.0,
			totalFields:             10,
			totalWeightedViolations: 25.5,
			timestamp:               time.Now(),
			metadata:                nil,
		},
		{
			name:                    "create report with perfect score",
			subgraphName:            stringPtr("perfect-service"),
			score:                   100.0,
			totalFields:             50,
			totalWeightedViolations: 0.0,
			timestamp:               time.Now(),
			metadata:                map[string]interface{}{"team": "platform"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			beforeCreation := time.Now()

			report := NewSchemaReport(
				uuid.NewString(),
				tt.subgraphName,
				tt.score,
				tt.totalFields,
				tt.totalWeightedViolations,
				tt.timestamp,
				tt.metadata,
			)

			if report == nil {
				t.Fatal("NewSchemaReport should not return nil")
			}

			// Verify basic fields
			if tt.subgraphName == nil {
				assert.Equal(t, "Unknown", report.SubgraphName)
			} else {
				assert.Equal(t, *tt.subgraphName, report.SubgraphName)
			}

			if report.Score != tt.score {
				t.Errorf("Expected Score %f, got %f", tt.score, report.Score)
			}

			if report.TotalFields != tt.totalFields {
				t.Errorf("Expected TotalFields %d, got %d", tt.totalFields, report.TotalFields)
			}

			if report.TotalWeightedViolations != tt.totalWeightedViolations {
				t.Errorf("Expected TotalWeightedViolations %f, got %f", tt.totalWeightedViolations, report.TotalWeightedViolations)
			}

			if !report.Timestamp.Equal(tt.timestamp) {
				t.Errorf("Expected Timestamp %v, got %v", tt.timestamp, report.Timestamp)
			}

			// Verify metadata
			if tt.metadata == nil {
				if report.Metadata != nil {
					t.Error("Expected Metadata to be nil")
				}
			} else {
				if len(report.Metadata) != len(tt.metadata) {
					t.Errorf("Expected Metadata length %d, got %d", len(tt.metadata), len(report.Metadata))
				}
				for key, expectedValue := range tt.metadata {
					if actualValue, exists := report.Metadata[key]; !exists {
						t.Errorf("Expected metadata key '%s' to exist", key)
					} else if actualValue != expectedValue {
						t.Errorf("Expected metadata value for '%s' to be %v, got %v", key, expectedValue, actualValue)
					}
				}
			}

			// Verify CreatedAt is set to a recent time
			if report.CreatedAt.Before(beforeCreation) || report.CreatedAt.After(time.Now()) {
				t.Error("CreatedAt should be set to current time")
			}

			// Verify RuleResults is initialized as empty slice
			if report.RuleResults == nil {
				t.Error("RuleResults should be initialized")
			}
			if len(report.RuleResults) != 0 {
				t.Error("RuleResults should be empty initially")
			}
		})
	}
}

func TestSchemaReport_AddRuleResult(t *testing.T) {
	report := NewSchemaReport(
		uuid.NewString(),
		stringPtr("test-service"),
		85.0,
		20,
		10.0,
		time.Now(),
		map[string]interface{}{},
	)

	// Test adding first rule result
	ruleResult1 := RuleResult{
		RuleName:       "Boolean Prefix",
		ViolationCount: 2,
		Message:        "Boolean fields should use is/has/can prefix",
		Violations:     []Violation{},
	}

	report.AddRuleResult(ruleResult1)

	if len(report.RuleResults) != 1 {
		t.Errorf("Expected 1 rule result, got %d", len(report.RuleResults))
	}

	if report.RuleResults[0].RuleName != ruleResult1.RuleName {
		t.Errorf("Expected rule name '%s', got '%s'", ruleResult1.RuleName, report.RuleResults[0].RuleName)
	}

	// Test adding second rule result
	ruleResult2 := RuleResult{
		RuleName:       "Field Naming",
		ViolationCount: 1,
		Message:        "Field names should be camelCase",
		Violations: []Violation{
			{
				Message:            "Field 'user_id' should be 'userId'",
				LocationField:      stringPtr("user_id"),
				LocationType:       stringPtr("User"),
				LocationCoordinate: stringPtr("User.user_id"),
			},
		},
	}

	report.AddRuleResult(ruleResult2)

	if len(report.RuleResults) != 2 {
		t.Errorf("Expected 2 rule results, got %d", len(report.RuleResults))
	}

	if report.RuleResults[1].RuleName != ruleResult2.RuleName {
		t.Errorf("Expected rule name '%s', got '%s'", ruleResult2.RuleName, report.RuleResults[1].RuleName)
	}

	if len(report.RuleResults[1].Violations) != 1 {
		t.Errorf("Expected 1 violation in second rule result, got %d", len(report.RuleResults[1].Violations))
	}

	// Test adding multiple rule results
	for i := 0; i < 5; i++ {
		ruleResult := RuleResult{
			RuleName:       "Test Rule " + string(rune('A'+i)),
			ViolationCount: i + 1,
			Message:        "Test message",
			Violations:     []Violation{},
		}
		report.AddRuleResult(ruleResult)
	}

	expectedCount := 2 + 5 // initial 2 + 5 more
	if len(report.RuleResults) != expectedCount {
		t.Errorf("Expected %d rule results, got %d", expectedCount, len(report.RuleResults))
	}
}

func TestSchemaReport_GetDisplayName(t *testing.T) {
	tests := []struct {
		name         string
		subgraphName *string
		expected     string
	}{
		{
			name:         "with subgraph name",
			subgraphName: stringPtr("user-service"),
			expected:     "user-service",
		},
		{
			name:         "with empty subgraph name",
			subgraphName: stringPtr(""),
			expected:     "",
		},
		{
			name:         "with nil subgraph name",
			subgraphName: nil,
			expected:     "Unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			report := NewSchemaReport(
				uuid.NewString(),
				tt.subgraphName,
				85.0,
				20,
				10.0,
				time.Now(),
				map[string]interface{}{},
			)

			result := report.GetDisplayName()
			if result != tt.expected {
				t.Errorf("Expected display name '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestRuleResult_StructureAndValidation(t *testing.T) {
	// Test RuleResult structure creation
	violations := []Violation{
		{
			Message:            "Field 'active' should be prefixed with 'is'",
			LocationLine:       intPtr(15),
			LocationColumn:     intPtr(3),
			LocationField:      stringPtr("active"),
			LocationType:       stringPtr("User"),
			LocationCoordinate: stringPtr("User.active"),
		},
		{
			Message:            "Field 'enabled' should be prefixed with 'is'",
			LocationLine:       intPtr(22),
			LocationColumn:     intPtr(3),
			LocationField:      stringPtr("enabled"),
			LocationType:       stringPtr("User"),
			LocationCoordinate: stringPtr("User.enabled"),
		},
	}

	ruleResult := RuleResult{
		RuleName:       "Boolean Prefix",
		ViolationCount: len(violations),
		Message:        "Boolean fields should use is/has/can prefix",
		Violations:     violations,
	}

	// Verify structure
	if ruleResult.RuleName != "Boolean Prefix" {
		t.Errorf("Expected RuleName 'Boolean Prefix', got '%s'", ruleResult.RuleName)
	}

	if ruleResult.ViolationCount != 2 {
		t.Errorf("Expected ViolationCount 2, got %d", ruleResult.ViolationCount)
	}

	if len(ruleResult.Violations) != 2 {
		t.Errorf("Expected 2 violations, got %d", len(ruleResult.Violations))
	}

	// Verify first violation
	violation1 := ruleResult.Violations[0]
	if violation1.Message != "Field 'active' should be prefixed with 'is'" {
		t.Errorf("Expected specific violation message, got '%s'", violation1.Message)
	}

	if violation1.LocationField == nil || *violation1.LocationField != "active" {
		t.Error("Expected LocationField to be 'active'")
	}

	if violation1.LocationLine == nil || *violation1.LocationLine != 15 {
		t.Error("Expected LocationLine to be 15")
	}
}

func TestSubgraphSummary_Structure(t *testing.T) {
	now := time.Now()
	summary := SubgraphSummary{
		Name:         "user-service",
		LatestScore:  85.5,
		LatestReport: now,
		ReportCount:  42,
		Trend:        "up",
	}

	if summary.Name != "user-service" {
		t.Errorf("Expected Name 'user-service', got '%s'", summary.Name)
	}

	if summary.LatestScore != 85.5 {
		t.Errorf("Expected LatestScore 85.5, got %f", summary.LatestScore)
	}

	if !summary.LatestReport.Equal(now) {
		t.Error("Expected LatestReport to match set time")
	}

	if summary.ReportCount != 42 {
		t.Errorf("Expected ReportCount 42, got %d", summary.ReportCount)
	}

	if summary.Trend != "up" {
		t.Errorf("Expected Trend 'up', got '%s'", summary.Trend)
	}
}

// Helper functions
func intPtr(i int) *int {
	return &i
}
