package domain

import (
	"github.com/stretchr/testify/assert"
	"testing"
	"time"
)

func TestNewSchemaReportService(t *testing.T) {
	repo := NewMockSchemaReportRepository()
	service := NewSchemaReportService(repo)

	if service == nil {
		t.Fatal("NewSchemaReportService should not return nil")
	}

	if service.repo != repo {
		t.Error("Service should store the provided repository")
	}
}

func TestSchemaReportService_StoreReport(t *testing.T) {
	tests := []struct {
		name          string
		subgraphName  *string
		score         float64
		totalFields   int
		violations    float64
		ruleResults   []RuleResult
		shouldFail    bool
		expectedError string
	}{
		{
			name:         "successful store with subgraph name",
			subgraphName: stringPtr("user-service"),
			score:        85.5,
			totalFields:  42,
			violations:   10.2,
			ruleResults:  []RuleResult{},
			shouldFail:   false,
		},
		{
			name:         "successful store without subgraph name",
			subgraphName: nil,
			score:        92.0,
			totalFields:  30,
			violations:   5.1,
			ruleResults: []RuleResult{
				{
					RuleName:       "TestRule",
					ViolationCount: 1,
					Message:        "Test violation",
					Violations:     []Violation{},
				},
			},
			shouldFail: false,
		},
		{
			name:          "repository failure",
			subgraphName:  stringPtr("test-service"),
			score:         75.0,
			totalFields:   20,
			violations:    8.0,
			ruleResults:   []RuleResult{},
			shouldFail:    true,
			expectedError: "failed to store schema report",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := NewMockSchemaReportRepository()
			if tt.shouldFail {
				repo.WithStoreFailure()
			}

			service := NewSchemaReportService(repo)
			timestamp := time.Now()
			metadata := map[string]interface{}{"version": "1.0.0"}

			result, err := service.StoreReport(
				tt.subgraphName,
				tt.score,
				tt.totalFields,
				tt.violations,
				timestamp,
				metadata,
				tt.ruleResults,
			)

			if tt.shouldFail {
				assert.Error(t, err)
				assert.ErrorContains(t, err, tt.expectedError)
				assert.Nil(t, result)
			} else {
				assert.Nil(t, err)
				assert.NotNil(t, result)

				// Verify report was stored correctly
				assert.NotNil(t, repo.LastStore, "Expected report to be stored in mock")

				stored := repo.LastStore
				assert.Equal(t, tt.score, stored.Score)
				assert.Equal(t, tt.totalFields, stored.TotalFields)
				assert.Equal(t, len(tt.ruleResults), len(stored.RuleResults))
			}
		})
	}
}

func TestSchemaReportService_GetReportByID(t *testing.T) {
	tests := []struct {
		name          string
		reportID      string
		shouldFail    bool
		expectedError string
	}{
		{
			name:       "successful retrieval",
			reportID:   "1",
			shouldFail: false,
		},
		{
			name:          "repository failure",
			reportID:      "1",
			shouldFail:    true,
			expectedError: "failed to get report by ID",
		},
		{
			name:          "report not found",
			reportID:      "999",
			shouldFail:    true,
			expectedError: "failed to get report by ID",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := NewMockSchemaReportRepository()

			// Set up test data
			if !tt.shouldFail && tt.reportID != "999" {
				testReport := &SchemaReport{
					ID:          tt.reportID,
					Score:       85.0,
					TotalFields: 20,
				}
				repo.Reports[tt.reportID] = testReport
			}

			if tt.shouldFail && tt.reportID != "999" {
				repo.WithGetByIDFailure()
			}

			service := NewSchemaReportService(repo)
			result, err := service.GetReportByID(tt.reportID)

			if tt.shouldFail {
				assert.Error(t, err)
				assert.ErrorContains(t, err, tt.expectedError)
				assert.Nil(t, result)
			} else {
				assert.Nil(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tt.reportID, result.ID)
			}
		})
	}
}

func TestSchemaReportService_GetDashboardData(t *testing.T) {
	tests := []struct {
		name              string
		subgraphSummaries []SubgraphSummary
		recentReports     []SchemaReport
		totalReportCount  int
		failSubgraphs     bool
		failRecentReports bool
		failTotalCount    bool
		expectedError     string
	}{
		{
			name: "successful dashboard data retrieval",
			subgraphSummaries: []SubgraphSummary{
				{Name: "user-service", LatestScore: 85.0, ReportCount: 5},
				{Name: "order-service", LatestScore: 92.0, ReportCount: 3},
			},
			recentReports: []SchemaReport{
				{ID: "1", Score: 85.0, TotalFields: 20},
				{ID: "2", Score: 92.0, TotalFields: 15},
			},
			totalReportCount: 10,
		},
		{
			name:          "subgraph summaries failure",
			failSubgraphs: true,
			expectedError: "failed to get subgraph summaries",
		},
		{
			name:              "recent reports failure",
			failRecentReports: true,
			expectedError:     "failed to get recent reports",
		},
		{
			name:           "total count failure",
			failTotalCount: true,
			expectedError:  "failed to get total report count",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := NewMockSchemaReportRepository().
				WithSubgraphSummaries(tt.subgraphSummaries).
				WithRecentReports(tt.recentReports).
				WithTotalReportCount(tt.totalReportCount)

			if tt.failSubgraphs {
				repo.ShouldFailGetSubgraphSummaries = true
			}
			if tt.failRecentReports {
				repo.ShouldFailGetRecentReports = true
			}
			if tt.failTotalCount {
				repo.ShouldFailGetTotalReportCount = true
			}

			service := NewSchemaReportService(repo)
			result, err := service.GetDashboardData()

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.ErrorContains(t, err, tt.expectedError)
				assert.Nil(t, result)
			} else {
				assert.Nil(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, len(tt.subgraphSummaries), len(result.Subgraphs))
				assert.Equal(t, len(tt.recentReports), len(result.RecentReports))
				assert.Equal(t, tt.totalReportCount, result.TotalReports)
			}
		})
	}
}

func TestSchemaReportService_GetSubgraphHistory(t *testing.T) {
	tests := []struct {
		name          string
		subgraphName  string
		limit         int
		reports       []SchemaReport
		shouldFail    bool
		expectedError string
	}{
		{
			name:         "successful subgraph history retrieval",
			subgraphName: "user-service",
			limit:        10,
			reports: []SchemaReport{
				{ID: "1", Score: 85.0, TotalFields: 20},
				{ID: "2", Score: 87.0, TotalFields: 22},
			},
		},
		{
			name:          "repository failure",
			subgraphName:  "user-service",
			limit:         10,
			shouldFail:    true,
			expectedError: "failed to get subgraph history",
		},
		{
			name:         "empty results",
			subgraphName: "nonexistent-service",
			limit:        10,
			reports:      []SchemaReport{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := NewMockSchemaReportRepository().
				WithSubgraphReports(tt.reports)

			if tt.shouldFail {
				repo.ShouldFailGetReportsBySubgraph = true
			}

			service := NewSchemaReportService(repo)
			result, err := service.GetSubgraphHistory(tt.subgraphName, tt.limit)

			if tt.shouldFail {
				assert.Error(t, err)
				assert.ErrorContains(t, err, tt.expectedError)
				assert.Nil(t, result)
			} else {
				assert.Nil(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, len(tt.reports), len(result))
			}
		})
	}
}

func TestSchemaReportService_HealthCheck(t *testing.T) {
	tests := []struct {
		name       string
		shouldFail bool
	}{
		{
			name:       "successful health check",
			shouldFail: false,
		},
		{
			name:       "failed health check",
			shouldFail: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := NewMockSchemaReportRepository()
			if tt.shouldFail {
				repo.WithHealthCheckFailure()
			}

			service := NewSchemaReportService(repo)
			err := service.HealthCheck()

			if tt.shouldFail {
				if err == nil {
					t.Error("Expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
			}
		})
	}
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}
