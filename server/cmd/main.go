package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"schema-score-server/internal/domain"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	httpHandlers "schema-score-server/internal/adapters/http"
	"schema-score-server/internal/adapters/postgres"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Database connection
	db, err := initDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}
	log.Println("Database connection established")

	// Run database migrations
	migrator := postgres.NewMigrator(db)
	if err := migrator.RunMigrations("./migrations"); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}
	log.Println("Database migrations completed")

	// Initialize DDD layers
	// 1. Infrastructure layer - Database repository
	schemaReportRepo := postgres.NewPostgresSchemaReportRepository(db)

	// 2. Domain layer - Business logic services
	schemaReportService := domain.NewSchemaReportService(schemaReportRepo)

	// 3. Application layer - HTTP handlers
	apiHandler := httpHandlers.NewAPIHandler(schemaReportService)
	webHandler := httpHandlers.NewWebHandler(schemaReportService)

	// Setup routes
	router := mux.NewRouter()

	// API routes
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/health", apiHandler.HealthCheck).Methods("GET")
	api.HandleFunc("/reports", apiHandler.ReceiveReport).Methods("POST")
	api.HandleFunc("/reports", apiHandler.GetReports).Methods("GET")
	api.HandleFunc("/report", apiHandler.GetReport).Methods("GET")

	// Web routes
	router.HandleFunc("/", webHandler.Dashboard).Methods("GET")
	router.HandleFunc("/about", webHandler.About).Methods("GET")
	router.HandleFunc("/report", webHandler.ReportDetail).Methods("GET")
	router.HandleFunc("/subgraph", webHandler.SubgraphHistory).Methods("GET")

	// Static files (for any additional assets)
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./internal/static/"))))

	// Add CORS middleware for API endpoints
	router.Use(corsMiddleware)

	// Add logging middleware
	router.Use(loggingMiddleware)

	port := getEnv("PORT", "8080")
	log.Printf("Server starting on port %s", port)
	log.Printf("Dashboard: http://localhost:%s", port)
	log.Printf("API Health: http://localhost:%s/api/health", port)
	log.Printf("Reports endpoint: http://localhost:%s/api/reports", port)

	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

func initDB() (*sql.DB, error) {
	dbURL := getEnv("DATABASE_URL", "")
	if dbURL == "" {
		// Build connection string from individual components
		host := getEnv("DB_HOST", "localhost")
		port := getEnv("DB_PORT", "5432")
		user := getEnv("DB_USER", "postgres")
		password := getEnv("DB_PASSWORD", "postgres")
		dbname := getEnv("DB_NAME", "schema_score")
		sslmode := getEnv("DB_SSLMODE", "disable")

		dbURL = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			host, port, user, password, dbname, sslmode)
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, err
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)                 // Maximum number of open connections
	db.SetMaxIdleConns(5)                  // Maximum number of idle connections
	db.SetConnMaxLifetime(5 * time.Minute) // Maximum lifetime of a connection

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	log.Printf("Database connection pool configured: max_open=%d, max_idle=%d, max_lifetime=%v",
		25, 5, 5*time.Minute)

	return db, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// CORS middleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if r.Method == "OPTIONS" {
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Logging middleware
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s %s", r.Method, r.RequestURI, r.RemoteAddr)
		next.ServeHTTP(w, r)
	})
}
