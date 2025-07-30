.PHONY: help install build test clean docker run dev lint format check all

# Variables
CLI_NAME := schema-score
SERVER_NAME := schema-score-server
VERSION := $(shell git describe --tags --always --dirty)
BUILD_DATE := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT := $(shell git rev-parse HEAD)

# Go variables
GOOS := $(shell go env GOOS)
GOARCH := $(shell go env GOARCH)
GO_LDFLAGS := -ldflags="-X main.version=$(VERSION) -X main.buildDate=$(BUILD_DATE) -X main.gitCommit=$(GIT_COMMIT) -w -s"

# Docker variables
DOCKER_IMAGE := ghcr.io/$(shell git config --get remote.origin.url | sed 's/.*github\.com[:/]\([^/]*\/[^/]*\)\.git/\1/' | tr '[:upper:]' '[:lower:]')/server
DOCKER_TAG := $(VERSION)

##@ General

help: ## Display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

all: clean install build test ## Run clean, install, build, and test

##@ Development

install: ## Install dependencies for both CLI and server
	@echo "Installing CLI dependencies..."
	bun install
	@echo "Installing server dependencies..."
	cd server && go mod download

dev-cli: ## Run CLI in development mode with example schema
	@echo "Running CLI in development mode..."
	@echo 'type Query { hello: String }' > example-schema.graphql
	bun run index.ts example-schema.graphql
	@rm -f example-schema.graphql

dev-server: ## Run server in development mode
	@echo "Starting development server..."
	cd server && go run cmd/main.go

dev: ## Start both CLI and server in development mode
	@echo "Starting development environment..."
	$(MAKE) dev-server &
	sleep 2
	$(MAKE) dev-cli

##@ Building

build: build-cli build-server ## Build both CLI and server

build-cli: ## Build CLI for current platform
	@echo "Building CLI for $(GOOS)/$(GOARCH)..."
	bun build index.ts --compile --outfile $(CLI_NAME)-$(GOOS)-$(GOARCH)

build-cli-all: ## Build CLI for all platforms
	@echo "Building CLI for all platforms..."
	bun build index.ts --compile --outfile $(CLI_NAME)-linux-x64
	bun build index.ts --compile --target bun-linux-arm64 --outfile $(CLI_NAME)-linux-arm64
	bun build index.ts --compile --target bun-darwin-x64 --outfile $(CLI_NAME)-darwin-x64
	bun build index.ts --compile --target bun-darwin-arm64 --outfile $(CLI_NAME)-darwin-arm64
	bun build index.ts --compile --target bun-windows-x64 --outfile $(CLI_NAME)-windows-x64.exe

build-server: ## Build server binary
	@echo "Building server for $(GOOS)/$(GOARCH)..."
	cd server && CGO_ENABLED=0 go build $(GO_LDFLAGS) -o ../$(SERVER_NAME)-$(GOOS)-$(GOARCH) ./cmd/main.go

build-server-linux: ## Build server for Linux
	@echo "Building server for Linux..."
	cd server && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build $(GO_LDFLAGS) -o ../$(SERVER_NAME)-linux-amd64 ./cmd/main.go

##@ Testing

test: test-cli test-server ## Run tests for both CLI and server

test-cli: ## Run CLI tests
	@echo "Running CLI tests..."
	bun test

test-server: ## Run server tests
	@echo "Running server tests..."
	cd server && go test -v -race -coverprofile=coverage.out ./...

test-integration: ## Run integration tests
	@echo "Running integration tests..."
	cd server && go test -v -tags=integration ./...

coverage: ## Generate test coverage report
	@echo "Generating coverage report..."
	cd server && go test -coverprofile=coverage.out ./...
	cd server && go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: server/coverage.html"

##@ Docker

docker-build: ## Build Docker image
	@echo "Building Docker image..."
	cd server && docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) -t $(DOCKER_IMAGE):latest .

docker-run: ## Run Docker container
	@echo "Running Docker container..."
	docker run --rm -p 8080:8080 $(DOCKER_IMAGE):latest

docker-push: ## Push Docker image to registry
	@echo "Pushing Docker image..."
	docker push $(DOCKER_IMAGE):$(DOCKER_TAG)
	docker push $(DOCKER_IMAGE):latest

docker-compose-up: ## Start services with docker-compose
	@echo "Starting services with docker-compose..."
	cd server && docker-compose up -d

docker-compose-down: ## Stop services with docker-compose
	@echo "Stopping services with docker-compose..."
	cd server && docker-compose down

docker-compose-logs: ## View docker-compose logs
	cd server && docker-compose logs -f

##@ Database

db-setup: ## Set up database (requires PostgreSQL)
	@echo "Setting up database..."
	createdb schema_score || echo "Database may already exist"
	cd server && psql -d schema_score -f migrations/001_initial.sql

db-reset: ## Reset database
	@echo "Resetting database..."
	dropdb schema_score || echo "Database may not exist"
	$(MAKE) db-setup

db-migrate: ## Run database migrations
	@echo "Running database migrations..."
	cd server && psql -d schema_score -f migrations/001_initial.sql

##@ Utilities

clean: ## Clean build artifacts
	@echo "Cleaning build artifacts..."
	rm -f $(CLI_NAME)-*
	rm -f $(SERVER_NAME)-*
	rm -f example-schema.graphql
	cd server && rm -f coverage.out coverage.html

install-tools: ## Install development tools
	@echo "Installing development tools..."
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install golang.org/x/tools/cmd/goimports@latest

release-prep: clean build-cli-all build-server-linux ## Prepare release artifacts
	@echo "Preparing release artifacts..."
	@echo "Built CLI binaries:"
	@ls -la $(CLI_NAME)-*
	@echo "Built server binary:"
	@ls -la $(SERVER_NAME)-*

version: ## Show version information
	@echo "Version: $(VERSION)"
	@echo "Build Date: $(BUILD_DATE)"
	@echo "Git Commit: $(GIT_COMMIT)"
	@echo "Docker Image: $(DOCKER_IMAGE):$(DOCKER_TAG)"
