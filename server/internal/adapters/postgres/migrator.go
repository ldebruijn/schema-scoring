package postgres

import (
	"database/sql"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Migrator handles database migrations
type Migrator struct {
	db *sql.DB
}

// NewMigrator creates a new migrator instance
func NewMigrator(db *sql.DB) *Migrator {
	return &Migrator{db: db}
}

// RunMigrations executes all pending migrations from the migrations directory
func (m *Migrator) RunMigrations(migrationsPath string) error {
	// Create migrations table if it doesn't exist
	if err := m.createMigrationsTable(); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Get list of applied migrations
	applied, err := m.getAppliedMigrations()
	if err != nil {
		return fmt.Errorf("failed to get applied migrations: %w", err)
	}

	// Get migration files
	files, err := m.getMigrationFiles(migrationsPath)
	if err != nil {
		return fmt.Errorf("failed to get migration files: %w", err)
	}

	// Run pending migrations
	for _, file := range files {
		migrationName := m.getMigrationName(file)
		if _, exists := applied[migrationName]; exists {
			log.Printf("Migration %s already applied, skipping", migrationName)
			continue
		}

		log.Printf("Running migration: %s", migrationName)
		if err := m.runMigration(file, migrationName); err != nil {
			return fmt.Errorf("failed to run migration %s: %w", migrationName, err)
		}
		log.Printf("Migration %s completed successfully", migrationName)
	}

	return nil
}

// createMigrationsTable creates the migrations tracking table
func (m *Migrator) createMigrationsTable() error {
	query := `
	CREATE TABLE IF NOT EXISTS schema_migrations (
		id SERIAL PRIMARY KEY,
		migration_name VARCHAR(255) UNIQUE NOT NULL,
		applied_at TIMESTAMPTZ DEFAULT NOW()
	)`

	_, err := m.db.Exec(query)
	return err
}

// getAppliedMigrations returns a map of applied migration names
func (m *Migrator) getAppliedMigrations() (map[string]bool, error) {
	rows, err := m.db.Query("SELECT migration_name FROM schema_migrations")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		applied[name] = true
	}

	return applied, rows.Err()
}

// getMigrationFiles returns sorted list of migration files
func (m *Migrator) getMigrationFiles(migrationsPath string) ([]string, error) {
	var files []string

	err := filepath.WalkDir(migrationsPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if !d.IsDir() && strings.HasSuffix(path, ".sql") {
			files = append(files, path)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	// Sort files to ensure consistent execution order
	sort.Strings(files)
	return files, nil
}

// getMigrationName extracts migration name from file path
func (m *Migrator) getMigrationName(filePath string) string {
	base := filepath.Base(filePath)
	return strings.TrimSuffix(base, ".sql")
}

// runMigration executes a single migration file
func (m *Migrator) runMigration(filePath, migrationName string) error {
	// Read migration file
	content, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read migration file: %w", err)
	}

	// Start transaction
	tx, err := m.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Execute migration SQL
	if _, err := tx.Exec(string(content)); err != nil {
		return fmt.Errorf("failed to execute migration SQL: %w", err)
	}

	// Record migration as applied
	if _, err := tx.Exec("INSERT INTO schema_migrations (migration_name) VALUES ($1)", migrationName); err != nil {
		return fmt.Errorf("failed to record migration: %w", err)
	}

	// Commit transaction
	return tx.Commit()
}
