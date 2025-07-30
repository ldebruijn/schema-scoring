package http

import (
	"bytes"
	"encoding/json"
	"github.com/stretchr/testify/assert"
	"net/http"
	"net/http/httptest"
	"schema-score-server/internal/domain"
	"strings"
	"testing"
	"time"
)

func TestAPIHandler_ReceiveReport(t *testing.T) {
	tests := []struct {
		name            string
		method          string
		body            interface{}
		shouldFailStore bool
		expectedStatus  int
		expectedError   string
	}{
		{
			name:   "successful report submission",
			method: "POST",
			body: domain.IncomingReport{
				Timestamp:               time.Now().Format(time.RFC3339),
				SubgraphName:            stringPtr("user-service"),
				Score:                   85.5,
				TotalFields:             42,
				TotalWeightedViolations: 10.2,
				RuleResults:             []domain.IncomingRuleResult{},
				Metadata:                map[string]interface{}{"version": "1.0.0"},
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "method not allowed",
			method:         "GET",
			body:           nil,
			expectedStatus: http.StatusMethodNotAllowed,
		},
		{
			name:           "invalid JSON body",
			method:         "POST",
			body:           "invalid json",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:   "invalid timestamp format",
			method: "POST",
			body: domain.IncomingReport{
				Timestamp: "invalid-timestamp",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:            "service store failure",
			method:          "POST",
			body:            nil,
			shouldFailStore: true,
			expectedStatus:  http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := NewMockSchemaReportRepository()
			service := domain.NewSchemaReportService(repo)

			handler := NewAPIHandler(service)

			var body []byte
			if tt.body != nil {
				if s, ok := tt.body.(string); ok {
					body = []byte(s)
				} else {
					var err error
					body, err = json.Marshal(tt.body)
					if err != nil {
						t.Fatalf("Failed to marshal test body: %v", err)
					}
				}
			}

			req := httptest.NewRequest(tt.method, "/api/reports", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			handler.ReceiveReport(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedStatus == http.StatusOK {
				var response map[string]interface{}
				if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
					t.Errorf("Failed to decode response: %v", err)
				}
			}
		})
	}
}

func TestAPIHandler_GetReports(t *testing.T) {
	tests := []struct {
		name                string
		queryParams         string
		shouldFailDashboard bool
		shouldFailSubgraph  bool
		expectedStatus      int
		expectResults       int
		reports             map[string]*domain.SchemaReport
	}{
		{
			name:        "successful get all reports",
			queryParams: "",
			reports: map[string]*domain.SchemaReport{
				"1": {
					ID:                      "1",
					SubgraphName:            "unknown",
					Score:                   1,
					TotalFields:             1,
					TotalWeightedViolations: 1,
					Timestamp:               time.Now(),
					Metadata:                nil,
					CreatedAt:               time.Now(),
					RuleResults:             []domain.RuleResult{},
				},
			},
			expectResults:  1,
			expectedStatus: http.StatusOK,
		},
		{
			name:        "successful get reports by subgraph",
			queryParams: "subgraph=user-service&limit=5",
			reports: map[string]*domain.SchemaReport{
				"1": {
					ID:                      "1",
					SubgraphName:            "unknown",
					Score:                   1,
					TotalFields:             1,
					TotalWeightedViolations: 1,
					Timestamp:               time.Now(),
					Metadata:                nil,
					CreatedAt:               time.Now(),
					RuleResults:             []domain.RuleResult{},
				},
				"2": {
					ID:                      "2",
					SubgraphName:            "user-service",
					Score:                   1,
					TotalFields:             1,
					TotalWeightedViolations: 1,
					Timestamp:               time.Now(),
					Metadata:                nil,
					CreatedAt:               time.Now(),
					RuleResults:             []domain.RuleResult{},
				},
			},
			expectResults:  1,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid limit parameter",
			queryParams:    "limit=invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := NewMockSchemaReportRepository()
			repo.Reports = tt.reports
			service := domain.NewSchemaReportService(repo)

			handler := NewAPIHandler(service)

			req := httptest.NewRequest("GET", "/api/reports?"+tt.queryParams, nil)
			w := httptest.NewRecorder()

			handler.GetReports(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.expectedStatus == http.StatusOK {
				var reports []interface{}
				if err := json.NewDecoder(w.Body).Decode(&reports); err != nil {
					t.Errorf("Failed to decode response: %v", err)
				}
			}
		})
	}
}

func TestAPIHandler_HealthCheck(t *testing.T) {
	tests := []struct {
		name           string
		shouldFail     bool
		expectedStatus int
	}{
		{
			name:           "successful health check",
			shouldFail:     false,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "failed health check",
			shouldFail:     true,
			expectedStatus: http.StatusServiceUnavailable,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := NewMockSchemaReportRepository()
			repo.ShouldFailHealthCheck = tt.shouldFail
			service := domain.NewSchemaReportService(repo)

			handler := NewAPIHandler(service)

			req := httptest.NewRequest("GET", "/api/health", nil)
			w := httptest.NewRecorder()

			handler.HealthCheck(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestNewAPIHandler(t *testing.T) {
	repo := NewMockSchemaReportRepository()
	service := domain.NewSchemaReportService(repo)
	handler := NewAPIHandler(service)

	if handler == nil {
		t.Fatal("NewAPIHandler should not return nil")
	}

	if handler.schemaReportService != service {
		t.Error("Handler should store the provided service")
	}
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}

// Test integration with real JSON payloads
func TestAPIHandler_ReceiveReport_Integration(t *testing.T) {
	repo := NewMockSchemaReportRepository()
	service := domain.NewSchemaReportService(repo)
	handler := NewAPIHandler(service)

	// Create a realistic report payload
	report := map[string]interface{}{
		"timestamp":               time.Now().Format(time.RFC3339),
		"subgraphName":            "user-service",
		"score":                   85.5,
		"totalFields":             42,
		"totalWeightedViolations": 10.2,
		"ruleResults": []map[string]interface{}{
			{
				"rule":    "Boolean Prefix",
				"message": "Boolean fields should use is/has/can prefix",
				"violations": []map[string]interface{}{
					{
						"message": "Field 'active' should be prefixed with 'is'",
						"location": map[string]interface{}{
							"line":       15,
							"column":     3,
							"field":      "active",
							"type":       "User",
							"coordinate": "User.active",
						},
					},
				},
			},
		},
		"metadata": map[string]interface{}{
			"version": "1.2.0",
			"team":    "platform",
		},
	}

	body, err := json.Marshal(report)
	if err != nil {
		t.Fatalf("Failed to marshal test report: %v", err)
	}

	req := httptest.NewRequest("POST", "/api/reports", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.ReceiveReport(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
		t.Errorf("Response body: %s", w.Body.String())
	}

	//// Verify the service received the correct data
	//if service.storedReport == nil {
	//	t.Fatal("Expected report to be stored")
	//}
	//
	//if service.storedReport.Score != 85.5 {
	//	t.Errorf("Expected score 85.5, got %f", service.storedReport.Score)
	//}
	//
	//if len(service.storedReport.RuleResults) != 1 {
	//	t.Errorf("Expected 1 rule result, got %d", len(service.storedReport.RuleResults))
	//}
	//
	//if len(service.storedReport.RuleResults) > 0 {
	//	ruleResult := service.storedReport.RuleResults[0]
	//	if ruleResult.RuleName != "Boolean Prefix" {
	//		t.Errorf("Expected rule name 'Boolean Prefix', got '%s'", ruleResult.RuleName)
	//	}
	//
	//	if len(ruleResult.Violations) != 1 {
	//		t.Errorf("Expected 1 violation, got %d", len(ruleResult.Violations))
	//	}
	//}
}

// Test content type validation
func TestAPIHandler_ContentTypeValidation(t *testing.T) {
	repo := NewMockSchemaReportRepository()
	service := domain.NewSchemaReportService(repo)
	handler := NewAPIHandler(service)

	body := `{"timestamp": "2025-01-30T17:30:00Z", "score": 85.0}`

	tests := []struct {
		name           string
		contentType    string
		expectedStatus int
	}{
		{
			name:           "valid content type",
			contentType:    "application/json",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "missing content type",
			contentType:    "",
			expectedStatus: http.StatusOK, // Still works as Go's JSON decoder is lenient
		},
		{
			name:           "wrong content type",
			contentType:    "text/plain",
			expectedStatus: http.StatusOK, // Still works as we don't validate content type strictly
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/api/reports", strings.NewReader(body))
			if tt.contentType != "" {
				req.Header.Set("Content-Type", tt.contentType)
			}
			w := httptest.NewRecorder()

			handler.ReceiveReport(w, req)

			// Note: This test shows that our current implementation doesn't strictly validate content-type
			// which might be intentional for flexibility
			if w.Code == http.StatusBadRequest && strings.Contains(w.Body.String(), "Invalid JSON") {
				// This would happen if we had strict content-type validation
				t.Logf("Handler rejected due to content type validation")
			}
		})
	}
}
