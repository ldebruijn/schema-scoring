# Schema Score

A comprehensive GraphQL schema quality monitoring system that analyzes your schemas against best practices and provides actionable insights to maintain healthy GraphQL APIs.

## 🎯 Overview

Schema Score helps teams get a grip on their GraphQL subgraph schema health by providing:
- **Objective measurement** of schema quality through weighted rule validation
- **Precise violation locations** with line numbers, field names, and coordinates
- **Historical tracking** to monitor improvements over time
- **Web dashboard** for visualization and team collaboration
- **Automated reporting** for CI/CD integration

## 🏗️ Architecture

The project consists of two main components:

### 📊 Schema Scorer (TypeScript)
A CLI tool that analyzes GraphQL schemas and generates detailed scoring reports.

### 🌐 Monitoring Server (Go)
A web application that collects, stores, and visualizes schema scoring data over time.

```
┌─────────────────┐    HTTP POST    ┌─────────────────┐
│   TypeScript    │ ──────────────→ │   Go Server     │
│   CLI Scorer    │    Reports      │   + Dashboard   │
└─────────────────┘                 └─────────────────┘
                                            │
                                            ▼
                                    ┌─────────────────┐
                                    │   PostgreSQL    │
                                    │    Database     │
                                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) runtime for the TypeScript scorer
- [Go 1.21+](https://golang.org/) for the server
- [PostgreSQL](https://postgresql.org/) for data storage

### 1. Schema Scoring CLI

Install dependencies and run the scorer:

```bash
# Install dependencies
bun install

# Score a GraphQL schema
bun run index.ts path/to/schema.graphql

# Score with reporting to server
bun run index.ts path/to/schema.graphql --report-endpoint http://localhost:8080/api/reports --subgraph-name my-service
```

### 2. Monitoring Server

Set up the monitoring server and dashboard:

```bash
# Navigate to server directory
cd server

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations (create the schema)
psql -d schema_score -f migrations/schema.sql

# Start the server
go run cmd/main.go
```

Visit `http://localhost:8080` to access the web dashboard.

## 📋 Scoring System

### Formula
```
For each rule with violations:
totalWeightedViolations += rule.weight × violations.length^1.5

Final score:
score = 100 × (1 - (totalWeightedViolations ÷ totalFields))
```

### Rule Categories

| Category | Weight | Rules | Impact |
|----------|--------|-------|---------|
| **Critical Issues** | 15-20 | Null Blast Radius, Cycle Counter, Nullable External | Runtime failures, performance issues |
| **Important Issues** | 10 | PII Detection, Problem Union | Security, type system integrity |
| **Style & Convention** | 5 | Boolean Prefix, Plural Collections, Composite Keys, Deprecation | Maintainability, consistency |

### Score Interpretation

- 🟢 **90-100**: Excellent quality
- 🔵 **70-89**: Good quality  
- 🟡 **50-69**: Needs improvement
- 🔴 **0-49**: Poor quality
- ⚫ **Negative**: Critical issues (violations exceed schema size)

## 🔧 Configuration

### Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgres://user:password@localhost:5432/schema_score
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=schema_score
DB_SSLMODE=disable

# Server Configuration
PORT=8080
```

### CLI Options

```bash
# Basic usage
bun run index.ts schema.graphql

# With reporting
bun run index.ts schema.graphql \
  --report-endpoint http://localhost:8080/api/reports \
  --subgraph-name my-service \
  --metadata '{"version": "1.0.0", "team": "platform"}'

# Silent mode (no console output)
bun run index.ts schema.graphql --silent
```

## 📊 Web Dashboard Features

### 🏠 Dashboard
- Overview of all monitored subgraphs
- Recent reports with score trends
- Color-coded health indicators

### 📈 Subgraph History
- Score evolution over time
- Trend analysis (improving/declining/stable)
- Historical report comparison

### 📄 Detailed Reports
- Comprehensive rule violation details
- Precise location information (line/column/field)
- Violation severity indicators

### ℹ️ About Page
- Complete scoring methodology explanation
- Rule weight categories and rationale
- Getting started guide

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Schema Quality Check
on: [push, pull_request]

jobs:
  schema-score:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
        
      - name: Score GraphQL Schema
        run: |
          bun run index.ts schema.graphql \
            --report-endpoint ${{ secrets.SCHEMA_SCORE_ENDPOINT }} \
            --subgraph-name ${{ github.repository }} \
            --metadata '{"commit": "${{ github.sha }}", "branch": "${{ github.ref_name }}"}'
```

## 🧪 Validation Rules

### Security & Privacy (Weight: 10-20)
- **PII Detection**: Identifies potentially sensitive fields
- **External Field Nullability**: Prevents federation issues

### Performance (Weight: 15-20)  
- **Null Blast Radius**: Analyzes cascading null impact
- **Cycle Counter**: Detects circular dependencies in schema

### Design Patterns (Weight: 5-10)
- **Boolean Prefix**: Enforces `is/has/can` naming conventions
- **Plural Collections**: Ensures consistent collection naming
- **Problem Union**: Validates union implementations
- **Composite Keys**: Checks key design patterns

### Lifecycle Management (Weight: 5)
- **Deprecation**: Validates proper deprecation directive usage

## 🔍 API Reference

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/reports` | Submit schema scoring report |
| `GET` | `/api/reports` | List reports (with optional filtering) |
| `GET` | `/api/report?id={id}` | Get detailed report |
| `GET` | `/api/health` | Health check |
| `GET` | `/` | Web dashboard |
| `GET` | `/about` | Scoring methodology guide |

### Report Payload Example

```json
{
  "timestamp": "2025-01-30T17:30:00Z",
  "subgraphName": "user-service",
  "score": 87.5,
  "totalFields": 42,
  "totalWeightedViolations": 5.2,
  "ruleResults": [
    {
      "rule": "Boolean Prefix",
      "message": "Boolean fields should use is/has/can prefix",
      "violations": [
        {
          "message": "Field 'active' should be prefixed with 'is'",
          "location": {
            "line": 15,
            "column": 3,
            "field": "active",
            "type": "User",
            "coordinate": "User.active"
          }
        }
      ]
    }
  ],
  "metadata": {
    "version": "1.2.0",
    "team": "platform"
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with descriptive messages: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- 📖 Check the [About page](http://localhost:8080/about) for detailed methodology
- 🐛 Report issues on [GitHub Issues](https://github.com/yourusername/schema-score/issues)
- 💬 Join discussions in [GitHub Discussions](https://github.com/yourusername/schema-score/discussions)

---

**Schema Score** - Keeping your GraphQL schemas healthy, one score at a time! 📊✨