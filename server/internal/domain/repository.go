package domain

import "errors"

var (
	ErrStoreReport        = errors.New("store report error")
	ErrReportNotFound     = errors.New("report not found")
	ErrGetDashboardData   = errors.New("get dashboard data error")
	ErrGetSubgraphHistory = errors.New("get subgraph history error")
	ErrHealthCheck        = errors.New("health check error")
)

// SchemaReportRepository defines the interface for schema report persistence
type SchemaReportRepository interface {
	// Store saves a new schema report
	Store(report *SchemaReport) error

	// GetByID retrieves a schema report by its ID
	GetByID(id string) (*SchemaReport, error)

	// GetRecentReports retrieves the most recent reports
	GetRecentReports(limit int) ([]SchemaReport, error)

	// GetReportsBySubgraph retrieves reports for a specific subgraph
	GetReportsBySubgraph(subgraphName string, limit int) ([]SchemaReport, error)

	// GetSubgraphSummaries retrieves aggregated data for all subgraphs
	GetSubgraphSummaries() ([]SubgraphSummary, error)

	// GetTotalReportCount returns the total number of reports
	GetTotalReportCount() (int, error)

	// HealthCheck verifies the repository is accessible
	HealthCheck() error
}
