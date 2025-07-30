package http

import (
	"encoding/json"
	"log"
	"net/http"
	"schema-score-server/internal/domain"
	"strconv"
	"time"
)

// APIHandler handles HTTP API requests
type APIHandler struct {
	schemaReportService *domain.SchemaReportService
}

// NewAPIHandler creates a new API handler
func NewAPIHandler(schemaReportService *domain.SchemaReportService) *APIHandler {
	return &APIHandler{
		schemaReportService: schemaReportService,
	}
}

// ReceiveReport handles incoming schema reports
func (h *APIHandler) ReceiveReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var incoming domain.IncomingReport
	if err := json.NewDecoder(r.Body).Decode(&incoming); err != nil {
		log.Printf("Error decoding request: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Convert DTO to domain entities
	report, ruleResults, err := incoming.ToDomainEntity()
	if err != nil {
		log.Printf("Error converting to domain entity: %v", err)
		http.Error(w, "Invalid data format", http.StatusBadRequest)
		return
	}

	// Store the report using the domain service
	storedReport, err := h.schemaReportService.StoreReport(
		&report.SubgraphName,
		report.Score,
		report.TotalFields,
		report.TotalWeightedViolations,
		report.Timestamp,
		report.Metadata,
		ruleResults,
	)
	if err != nil {
		log.Printf("Error storing report: %v", err)
		http.Error(w, "Failed to store report", http.StatusInternalServerError)
		return
	}

	log.Printf("Stored report for subgraph: %v, score: %.2f",
		report.SubgraphName, report.Score)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"report_id": storedReport.ID,
		"message":   "Report stored successfully",
	})
}

// GetReports returns a list of reports with optional filtering
func (h *APIHandler) GetReports(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	subgraph := query.Get("subgraph")
	limitStr := query.Get("limit")
	if limitStr == "" {
		limitStr = "50"
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		http.Error(w, "Invalid limit parameter", http.StatusBadRequest)
		return
	}

	var reports []interface{}

	if subgraph != "" {
		// Get reports for specific subgraph
		subgraphReports, err := h.schemaReportService.GetSubgraphHistory(subgraph, limit)
		if err != nil {
			log.Printf("Error getting subgraph reports: %v", err)
			http.Error(w, "Failed to get reports", http.StatusInternalServerError)
			return
		}
		for _, report := range subgraphReports {
			reports = append(reports, report)
		}
	} else {
		// Get recent reports
		recentReports, err := h.schemaReportService.GetDashboardData()
		if err != nil {
			log.Printf("Error getting recent reports: %v", err)
			http.Error(w, "Failed to get reports", http.StatusInternalServerError)
			return
		}
		for _, report := range recentReports.RecentReports {
			reports = append(reports, report)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(reports)
}

// GetReport returns a single report with all details
func (h *APIHandler) GetReport(w http.ResponseWriter, r *http.Request) {
	reportID := r.URL.Query().Get("id")
	if reportID == "" {
		http.Error(w, "Report ID required", http.StatusBadRequest)
		return
	}

	report, err := h.schemaReportService.GetReportByID(reportID)
	if err != nil {
		log.Printf("Error getting report: %v", err)
		if err.Error() == "report with ID "+reportID+" not found" {
			http.Error(w, "Report not found", http.StatusNotFound)
		} else {
			http.Error(w, "Failed to get report", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(report)
}

// HealthCheck provides a simple health check endpoint
func (h *APIHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	err := h.schemaReportService.HealthCheck()
	if err != nil {
		log.Printf("Health check failed: %v", err)
		http.Error(w, "Service unavailable", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"time":   time.Now().Format(time.RFC3339),
	})
}
