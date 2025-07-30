package postgres

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"schema-score-server/internal/domain"
)

// PostgresSchemaReportRepository implements the SchemaReportRepository interface using PostgreSQL
type PostgresSchemaReportRepository struct {
	db *sql.DB
}

// NewPostgresSchemaReportRepository creates a new PostgreSQL implementation of SchemaReportRepository
func NewPostgresSchemaReportRepository(db *sql.DB) domain.SchemaReportRepository {
	return &PostgresSchemaReportRepository{
		db: db,
	}
}

// Store saves a new schema report to the database
func (r *PostgresSchemaReportRepository) Store(report *domain.SchemaReport) error {
	// Start transaction
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert schema report
	metadataJSON, _ := json.Marshal(report.Metadata)

	err = tx.QueryRow(`
		INSERT INTO schema_reports (subgraph_name, score, total_fields, total_weighted_violations, timestamp, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at`,
		report.SubgraphName, report.Score, report.TotalFields,
		report.TotalWeightedViolations, report.Timestamp, metadataJSON,
	).Scan(&report.ID, &report.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to insert schema report: %w", err)
	}

	// Insert rule results and violations
	for i := range report.RuleResults {
		ruleResult := &report.RuleResults[i]
		ruleResult.ReportID = report.ID

		err = tx.QueryRow(`
			INSERT INTO rule_results (report_id, rule_name, violation_count, message)
			VALUES ($1, $2, $3, $4)
			RETURNING id, created_at`,
			ruleResult.ReportID, ruleResult.RuleName, len(ruleResult.Violations), ruleResult.Message,
		).Scan(&ruleResult.ID, &ruleResult.CreatedAt)

		if err != nil {
			return fmt.Errorf("failed to insert rule result: %w", err)
		}

		// Insert violations
		for j := range ruleResult.Violations {
			violation := &ruleResult.Violations[j]
			violation.RuleResultID = ruleResult.ID

			err = tx.QueryRow(`
				INSERT INTO violations (rule_result_id, message, location_line, location_column, 
					location_field, location_type, location_coordinate)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
				RETURNING id, created_at`,
				violation.RuleResultID, violation.Message, violation.LocationLine, violation.LocationColumn,
				violation.LocationField, violation.LocationType, violation.LocationCoordinate,
			).Scan(&violation.ID, &violation.CreatedAt)

			if err != nil {
				return fmt.Errorf("failed to insert violation: %w", err)
			}
		}
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetByID retrieves a schema report by its ID
func (r *PostgresSchemaReportRepository) GetByID(id string) (*domain.SchemaReport, error) {
	// Get the report
	var report domain.SchemaReport
	var metadataBytes []byte

	err := r.db.QueryRow(`
		SELECT id, subgraph_name, score, total_fields, total_weighted_violations, 
			   timestamp, metadata, created_at
		FROM schema_reports WHERE id = $1`, id).Scan(
		&report.ID, &report.SubgraphName, &report.Score,
		&report.TotalFields, &report.TotalWeightedViolations,
		&report.Timestamp, &metadataBytes, &report.CreatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("report with ID %s not found", id)
		}
		return nil, fmt.Errorf("failed to query report: %w", err)
	}

	if len(metadataBytes) > 0 {
		json.Unmarshal(metadataBytes, &report.Metadata)
	}

	// Get rule results with violations
	ruleRows, err := r.db.Query(`
		SELECT id, rule_name, violation_count, message, created_at
		FROM rule_results WHERE report_id = $1
		ORDER BY violation_count DESC, rule_name`, id)

	if err != nil {
		return nil, fmt.Errorf("failed to query rule results: %w", err)
	}
	defer ruleRows.Close()

	for ruleRows.Next() {
		var ruleResult domain.RuleResult
		err := ruleRows.Scan(&ruleResult.ID, &ruleResult.RuleName,
			&ruleResult.ViolationCount, &ruleResult.Message, &ruleResult.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan rule result: %w", err)
		}
		ruleResult.ReportID = report.ID

		// Get violations for this rule result
		violationRows, err := r.db.Query(`
			SELECT id, message, location_line, location_column, 
				   location_field, location_type, location_coordinate, created_at
			FROM violations WHERE rule_result_id = $1 
			ORDER BY location_line, location_column`, ruleResult.ID)

		if err != nil {
			return nil, fmt.Errorf("failed to query violations: %w", err)
		}

		for violationRows.Next() {
			var violation domain.Violation
			err := violationRows.Scan(&violation.ID, &violation.Message,
				&violation.LocationLine, &violation.LocationColumn,
				&violation.LocationField, &violation.LocationType,
				&violation.LocationCoordinate, &violation.CreatedAt)
			if err != nil {
				return nil, fmt.Errorf("failed to scan violation: %w", err)
			}
			violation.RuleResultID = ruleResult.ID

			ruleResult.Violations = append(ruleResult.Violations, violation)
		}
		violationRows.Close()

		report.RuleResults = append(report.RuleResults, ruleResult)
	}

	return &report, nil
}

// GetRecentReports retrieves the most recent reports
func (r *PostgresSchemaReportRepository) GetRecentReports(limit int) ([]domain.SchemaReport, error) {
	rows, err := r.db.Query(`
		SELECT id, subgraph_name, score, total_fields, total_weighted_violations, 
			   timestamp, created_at
		FROM schema_reports 
		ORDER BY timestamp DESC 
		LIMIT $1`, limit)

	if err != nil {
		return nil, fmt.Errorf("failed to query recent reports: %w", err)
	}
	defer rows.Close()

	var reports []domain.SchemaReport
	for rows.Next() {
		var report domain.SchemaReport
		err := rows.Scan(&report.ID, &report.SubgraphName, &report.Score,
			&report.TotalFields, &report.TotalWeightedViolations,
			&report.Timestamp, &report.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan report: %w", err)
		}

		reports = append(reports, report)
	}

	return reports, nil
}

// GetReportsBySubgraph retrieves reports for a specific subgraph
func (r *PostgresSchemaReportRepository) GetReportsBySubgraph(subgraphName string, limit int) ([]domain.SchemaReport, error) {
	var rows *sql.Rows
	var err error

	if subgraphName == "Unknown" {
		rows, err = r.db.Query(`
			SELECT id, subgraph_name, score, total_fields, total_weighted_violations, 
				   timestamp, created_at
			FROM schema_reports 
			WHERE subgraph_name IS NULL
			ORDER BY timestamp DESC 
			LIMIT $1`, limit)
	} else {
		rows, err = r.db.Query(`
			SELECT id, subgraph_name, score, total_fields, total_weighted_violations, 
				   timestamp, created_at
			FROM schema_reports 
			WHERE subgraph_name = $1 
			ORDER BY timestamp DESC 
			LIMIT $2`, subgraphName, limit)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to query subgraph reports: %w", err)
	}
	defer rows.Close()

	var reports []domain.SchemaReport
	for rows.Next() {
		var report domain.SchemaReport
		err := rows.Scan(&report.ID, &report.SubgraphName, &report.Score,
			&report.TotalFields, &report.TotalWeightedViolations,
			&report.Timestamp, &report.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan report: %w", err)
		}

		reports = append(reports, report)
	}

	return reports, nil
}

// GetSubgraphSummaries retrieves aggregated data for all subgraphs
func (r *PostgresSchemaReportRepository) GetSubgraphSummaries() ([]domain.SubgraphSummary, error) {
	rows, err := r.db.Query(`
		SELECT 
			COALESCE(subgraph_name, 'Unknown') as name,
			COUNT(*) as report_count,
			MAX(score) as latest_score,
			MAX(timestamp) as latest_report
		FROM schema_reports 
		GROUP BY subgraph_name 
		ORDER BY latest_report DESC NULLS LAST`)

	if err != nil {
		return nil, fmt.Errorf("failed to query subgraph summaries: %w", err)
	}
	defer rows.Close()

	var summaries []domain.SubgraphSummary
	for rows.Next() {
		var summary domain.SubgraphSummary

		err := rows.Scan(&summary.Name, &summary.ReportCount,
			&summary.LatestScore, &summary.LatestReport)
		if err != nil {
			return nil, fmt.Errorf("failed to scan subgraph summary: %w", err)
		}

		// Calculate trend (simplified - just compare with previous report)
		var prevScore sql.NullFloat64
		err = r.db.QueryRow(`
			SELECT score FROM schema_reports 
			WHERE COALESCE(subgraph_name, 'Unknown') = $1 
			ORDER BY timestamp DESC 
			LIMIT 1 OFFSET 1`, summary.Name).Scan(&prevScore)

		if err == nil && prevScore.Valid {
			if summary.LatestScore > prevScore.Float64 {
				summary.Trend = "up"
			} else if summary.LatestScore < prevScore.Float64 {
				summary.Trend = "down"
			} else {
				summary.Trend = "stable"
			}
		} else {
			summary.Trend = "stable"
		}

		summaries = append(summaries, summary)
	}

	return summaries, nil
}

// GetTotalReportCount returns the total number of reports
func (r *PostgresSchemaReportRepository) GetTotalReportCount() (int, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM schema_reports").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get total report count: %w", err)
	}
	return count, nil
}

// HealthCheck verifies the repository is accessible
func (r *PostgresSchemaReportRepository) HealthCheck() error {
	return r.db.Ping()
}
