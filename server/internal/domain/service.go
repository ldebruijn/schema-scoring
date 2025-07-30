package domain

import (
	"fmt"
	"github.com/google/uuid"
	"time"
)

// SchemaReportService contains the business logic for schema reports
type SchemaReportService struct {
	repo SchemaReportRepository
}

// NewSchemaReportService creates a new schema report service
func NewSchemaReportService(repo SchemaReportRepository) *SchemaReportService {
	return &SchemaReportService{
		repo: repo,
	}
}

// StoreReport processes and stores a new schema report
func (s *SchemaReportService) StoreReport(
	subgraphName *string,
	score float64,
	totalFields int,
	totalWeightedViolations float64,
	timestamp time.Time,
	metadata map[string]interface{},
	ruleResults []RuleResult,
) (*SchemaReport, error) {

	id := uuid.NewString()

	// Create the report entity
	report := NewSchemaReport(
		id,
		subgraphName,
		score,
		totalFields,
		totalWeightedViolations,
		timestamp,
		metadata,
	)

	// Add rule results
	for _, ruleResult := range ruleResults {
		report.AddRuleResult(ruleResult)
	}

	// Store the report
	if err := s.repo.Store(report); err != nil {
		return nil, fmt.Errorf("failed to store schema report: %w", err)
	}

	return report, nil
}

// GetReportByID retrieves a specific report with all details
func (s *SchemaReportService) GetReportByID(id string) (*SchemaReport, error) {
	report, err := s.repo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get report by ID: %w", err)
	}
	return report, nil
}

// GetDashboardData retrieves all data needed for the dashboard
func (s *SchemaReportService) GetDashboardData() (*DashboardData, error) {
	// Get subgraph summaries
	subgraphs, err := s.repo.GetSubgraphSummaries()
	if err != nil {
		return nil, fmt.Errorf("failed to get subgraph summaries: %w", err)
	}

	// Get recent reports
	recentReports, err := s.repo.GetRecentReports(10)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent reports: %w", err)
	}

	// Get total report count
	totalReports, err := s.repo.GetTotalReportCount()
	if err != nil {
		return nil, fmt.Errorf("failed to get total report count: %w", err)
	}

	return &DashboardData{
		Subgraphs:     subgraphs,
		RecentReports: recentReports,
		TotalReports:  totalReports,
	}, nil
}

// GetSubgraphHistory retrieves the history for a specific subgraph
func (s *SchemaReportService) GetSubgraphHistory(subgraphName string, limit int) ([]SchemaReport, error) {
	reports, err := s.repo.GetReportsBySubgraph(subgraphName, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get subgraph history: %w", err)
	}
	return reports, nil
}

// HealthCheck verifies the service is working
func (s *SchemaReportService) HealthCheck() error {
	return s.repo.HealthCheck()
}

// DashboardData contains all data needed for the dashboard view
type DashboardData struct {
	Subgraphs     []SubgraphSummary
	RecentReports []SchemaReport
	TotalReports  int
}
