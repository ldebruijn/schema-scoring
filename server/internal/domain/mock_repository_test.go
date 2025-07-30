package domain

import (
	"errors"
	"github.com/google/uuid"
	"time"
)

// MockSchemaReportRepository is a mock implementation for testing
type MockSchemaReportRepository struct {
	// Control behavior
	ShouldFailStore                bool
	ShouldFailGetByID              bool
	ShouldFailGetRecentReports     bool
	ShouldFailGetReportsBySubgraph bool
	ShouldFailGetSubgraphSummaries bool
	ShouldFailGetTotalReportCount  bool
	ShouldFailHealthCheck          bool

	// Storage for test data
	Reports   map[string]*SchemaReport
	LastStore *SchemaReport

	// Return values
	RecentReports     []SchemaReport
	SubgraphReports   []SchemaReport
	SubgraphSummaries []SubgraphSummary
	TotalReportCount  int
}

// NewMockSchemaReportRepository creates a new mock repository
func NewMockSchemaReportRepository() *MockSchemaReportRepository {
	return &MockSchemaReportRepository{
		Reports: make(map[string]*SchemaReport),
	}
}

// Store saves a schema report (mock implementation)
func (m *MockSchemaReportRepository) Store(report *SchemaReport) error {
	if m.ShouldFailStore {
		return errors.New("mock store error")
	}

	// Simulate setting ID and created time
	report.ID = uuid.NewString()
	report.CreatedAt = time.Now()

	// Store copy
	m.Reports[report.ID] = report
	m.LastStore = report

	return nil
}

// GetByID retrieves a schema report by ID (mock implementation)
func (m *MockSchemaReportRepository) GetByID(id string) (*SchemaReport, error) {
	if m.ShouldFailGetByID {
		return nil, errors.New("mock get by id error")
	}

	report, exists := m.Reports[id]
	if !exists {
		return nil, errors.New("report not found")
	}

	return report, nil
}

// GetRecentReports retrieves recent reports (mock implementation)
func (m *MockSchemaReportRepository) GetRecentReports(limit int) ([]SchemaReport, error) {
	if m.ShouldFailGetRecentReports {
		return nil, errors.New("mock get recent reports error")
	}

	// Return configured test data or empty slice
	if m.RecentReports != nil {
		if len(m.RecentReports) > limit {
			return m.RecentReports[:limit], nil
		}
		return m.RecentReports, nil
	}

	return []SchemaReport{}, nil
}

// GetReportsBySubgraph retrieves reports for a subgraph (mock implementation)
func (m *MockSchemaReportRepository) GetReportsBySubgraph(subgraphName string, limit int) ([]SchemaReport, error) {
	if m.ShouldFailGetReportsBySubgraph {
		return nil, errors.New("mock get reports by subgraph error")
	}

	// Return configured test data or empty slice
	if m.SubgraphReports != nil {
		if len(m.SubgraphReports) > limit {
			return m.SubgraphReports[:limit], nil
		}
		return m.SubgraphReports, nil
	}

	return []SchemaReport{}, nil
}

// GetSubgraphSummaries retrieves subgraph summaries (mock implementation)
func (m *MockSchemaReportRepository) GetSubgraphSummaries() ([]SubgraphSummary, error) {
	if m.ShouldFailGetSubgraphSummaries {
		return nil, errors.New("mock get subgraph summaries error")
	}

	// Return configured test data or empty slice
	if m.SubgraphSummaries != nil {
		return m.SubgraphSummaries, nil
	}

	return []SubgraphSummary{}, nil
}

// GetTotalReportCount returns total report count (mock implementation)
func (m *MockSchemaReportRepository) GetTotalReportCount() (int, error) {
	if m.ShouldFailGetTotalReportCount {
		return 0, errors.New("mock get total report count error")
	}

	return m.TotalReportCount, nil
}

// HealthCheck performs health check (mock implementation)
func (m *MockSchemaReportRepository) HealthCheck() error {
	if m.ShouldFailHealthCheck {
		return errors.New("mock health check error")
	}

	return nil
}

// Helper methods for setting up test scenarios

// WithRecentReports configures the mock to return specific recent reports
func (m *MockSchemaReportRepository) WithRecentReports(reports []SchemaReport) *MockSchemaReportRepository {
	m.RecentReports = reports
	return m
}

// WithSubgraphReports configures the mock to return specific subgraph reports
func (m *MockSchemaReportRepository) WithSubgraphReports(reports []SchemaReport) *MockSchemaReportRepository {
	m.SubgraphReports = reports
	return m
}

// WithSubgraphSummaries configures the mock to return specific subgraph summaries
func (m *MockSchemaReportRepository) WithSubgraphSummaries(summaries []SubgraphSummary) *MockSchemaReportRepository {
	m.SubgraphSummaries = summaries
	return m
}

// WithTotalReportCount configures the mock to return a specific total count
func (m *MockSchemaReportRepository) WithTotalReportCount(count int) *MockSchemaReportRepository {
	m.TotalReportCount = count
	return m
}

// WithStoreFailure configures the mock to fail Store operations
func (m *MockSchemaReportRepository) WithStoreFailure() *MockSchemaReportRepository {
	m.ShouldFailStore = true
	return m
}

// WithGetByIDFailure configures the mock to fail GetByID operations
func (m *MockSchemaReportRepository) WithGetByIDFailure() *MockSchemaReportRepository {
	m.ShouldFailGetByID = true
	return m
}

// WithHealthCheckFailure configures the mock to fail health checks
func (m *MockSchemaReportRepository) WithHealthCheckFailure() *MockSchemaReportRepository {
	m.ShouldFailHealthCheck = true
	return m
}
