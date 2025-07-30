package http

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"schema-score-server/internal/domain"
)

// WebHandler handles HTTP web requests
type WebHandler struct {
	schemaReportService *domain.SchemaReportService
}

// NewWebHandler creates a new web handler
func NewWebHandler(schemaReportService *domain.SchemaReportService) *WebHandler {
	// Check if template directory exists
	if _, err := os.Stat("internal/templates"); os.IsNotExist(err) {
		log.Printf("Template directory 'internal/templates' does not exist")
		log.Printf("Current working directory: %s", getCurrentDir())
		log.Fatal("Template directory not found")
	}

	return &WebHandler{
		schemaReportService: schemaReportService,
	}
}

func getCurrentDir() string {
	if wd, err := os.Getwd(); err == nil {
		return wd
	}
	return "unknown"
}

func (h *WebHandler) loadTemplates(templateNames ...string) (*template.Template, error) {
	// Build full paths
	var templatePaths []string
	for _, name := range templateNames {
		templatePaths = append(templatePaths, "internal/templates/"+name)
	}

	// Parse all templates together
	templates, err := template.ParseFiles(templatePaths...)
	if err != nil {
		return nil, fmt.Errorf("failed to parse templates %v: %w", templatePaths, err)
	}

	return templates, nil
}

// Dashboard renders the main dashboard page
func (h *WebHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	dashboardData, err := h.schemaReportService.GetDashboardData()
	if err != nil {
		log.Printf("Error getting dashboard data: %v", err)
		http.Error(w, "Failed to load dashboard data", http.StatusInternalServerError)
		return
	}

	log.Printf("Dashboard data: %d subgraphs, %d recent reports, %d total reports",
		len(dashboardData.Subgraphs), len(dashboardData.RecentReports), dashboardData.TotalReports)

	// Load only dashboard-specific templates
	templates, err := h.loadTemplates("base.html", "dashboard.html")
	if err != nil {
		log.Printf("Error loading dashboard templates: %v", err)
		http.Error(w, "Template loading error", http.StatusInternalServerError)
		return
	}

	if err := templates.ExecuteTemplate(w, "base.html", dashboardData); err != nil {
		log.Printf("Error executing dashboard template: %v", err)
		http.Error(w, "Template execution error", http.StatusInternalServerError)
		return
	}
}

// About renders the about page explaining the project
func (h *WebHandler) About(w http.ResponseWriter, r *http.Request) {
	// Load only about-specific templates
	templates, err := h.loadTemplates("base.html", "about.html")
	if err != nil {
		log.Printf("Error loading about templates: %v", err)
		http.Error(w, "Template loading error", http.StatusInternalServerError)
		return
	}

	if err := templates.ExecuteTemplate(w, "base.html", nil); err != nil {
		log.Printf("Error executing about template: %v", err)
		http.Error(w, "Template execution error", http.StatusInternalServerError)
		return
	}
}

// ReportDetail renders a detailed view of a specific report
func (h *WebHandler) ReportDetail(w http.ResponseWriter, r *http.Request) {
	reportID := r.URL.Query().Get("id")
	if reportID == "" {
		http.Error(w, "Report ID required", http.StatusBadRequest)
		return
	}

	// Get the report with all details
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

	// Get dashboard data for subgraph list in navigation
	dashboardData, err := h.schemaReportService.GetDashboardData()
	if err != nil {
		log.Printf("Error getting dashboard data for navigation: %v", err)
		// Continue without navigation data rather than failing
		dashboardData = &domain.DashboardData{}
	}

	// Extract subgraph names for navigation
	var subgraphs []string
	for _, summary := range dashboardData.Subgraphs {
		subgraphs = append(subgraphs, summary.Name)
	}

	data := struct {
		Report    interface{} `json:"report"`
		Subgraphs []string    `json:"subgraphs"`
	}{
		Report:    report,
		Subgraphs: subgraphs,
	}

	// Load only report-specific templates
	templates, err := h.loadTemplates("base.html", "report.html")
	if err != nil {
		log.Printf("Error loading report templates: %v", err)
		http.Error(w, "Template loading error", http.StatusInternalServerError)
		return
	}

	if err := templates.ExecuteTemplate(w, "base.html", data); err != nil {
		log.Printf("Error executing report template: %v", err)
		http.Error(w, "Template execution error", http.StatusInternalServerError)
		return
	}
}

// SubgraphHistory shows the score history for a specific subgraph
func (h *WebHandler) SubgraphHistory(w http.ResponseWriter, r *http.Request) {
	subgraph := r.URL.Query().Get("name")
	if subgraph == "" {
		http.Error(w, "Subgraph name required", http.StatusBadRequest)
		return
	}

	reports, err := h.schemaReportService.GetSubgraphHistory(subgraph, 100)
	if err != nil {
		log.Printf("Error getting subgraph history: %v", err)
		http.Error(w, "Failed to get subgraph history", http.StatusInternalServerError)
		return
	}

	// Get dashboard data for subgraph list in navigation
	dashboardData, err := h.schemaReportService.GetDashboardData()
	if err != nil {
		log.Printf("Error getting dashboard data for navigation: %v", err)
		// Continue without navigation data rather than failing
		dashboardData = &domain.DashboardData{}
	}

	// Extract subgraph names for navigation
	var subgraphs []string
	for _, summary := range dashboardData.Subgraphs {
		subgraphs = append(subgraphs, summary.Name)
	}

	data := struct {
		SubgraphName string      `json:"subgraph_name"`
		Reports      interface{} `json:"reports"`
		Subgraphs    []string    `json:"subgraphs"`
	}{
		SubgraphName: subgraph,
		Reports:      reports,
		Subgraphs:    subgraphs,
	}

	// Load only history-specific templates
	templates, err := h.loadTemplates("base.html", "history.html")
	if err != nil {
		log.Printf("Error loading history templates: %v", err)
		http.Error(w, "Template loading error", http.StatusInternalServerError)
		return
	}

	if err := templates.ExecuteTemplate(w, "base.html", data); err != nil {
		log.Printf("Error executing history template: %v", err)
		http.Error(w, "Template execution error", http.StatusInternalServerError)
		return
	}
}
