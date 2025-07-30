# Schema Score Server

A Go web server that receives GraphQL schema scoring reports and provides a web interface for viewing schema health over time.

## Features

- **REST API** to receive schema reports from the GraphQL schema scorer
- **Web Dashboard** showing subgraph overview and score trends
- **Report Details** with violation information and location data
- **Score History** with interactive charts
- **PostgreSQL** storage for persistence
- **Docker** support for easy deployment

## Quick Start

### Using Docker Compose (Recommended)

1. Start the services:
```bash
cd server
docker-compose up -d
```

2. The server will be available at:
   - Dashboard: http://localhost:8080
   - API Health: http://localhost:8080/api/health
   - Reports endpoint: http://localhost:8080/api/reports

3. Send a test report:
```bash
cd .. # Back to schema scorer directory
bun run index.ts schema.graphql --report-endpoint http://localhost:8080/api/reports --subgraph-name test-subgraph
```

### Manual Setup

1. Install dependencies:
```bash
go mod tidy
```

2. Set up PostgreSQL and run migrations:
```sql
psql -U postgres -c "CREATE DATABASE schema_score;"
psql -U postgres -d schema_score -f migrations/001_initial.sql
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run the server:
```bash
go run cmd/main.go
```

## API Endpoints

### POST /api/reports
Receive schema reports from the GraphQL schema scorer.

Example payload:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "subgraph_name": "user-service",
  "score": 85.5,
  "total_fields": 42,
  "total_weighted_violations": 12.3,
  "rule_results": [
    {
      "rule": "PII",
      "violations": [
        {
          "message": "Field 'email' appears to contain PII but is not marked with @pii directive",
          "location": {
            "line": 15,
            "column": 3,
            "field": "email",
            "type": "User",
            "coordinate": "User.email"
          }
        }
      ],
      "message": "Found 1 fields that are potentially PII but are not marked with the @pii directive."
    }
  ],
  "metadata": {
    "filePath": "schema.graphql"
  }
}
```

### GET /api/reports
Get a list of reports with optional filtering:
- `?subgraph=name` - Filter by subgraph name
- `?limit=50` - Limit number of results (default: 50)

### GET /api/report?id=123
Get detailed information about a specific report including all violations.

### GET /api/health
Health check endpoint.

## Web Interface

### Dashboard (/)
- Overview of all subgraphs
- Recent reports
- Score trends

### Report Detail (/report?id=123)
- Detailed view of a specific report
- All rule violations with location information
- Metadata display

### Subgraph History (/subgraph?name=service-name)
- Score history over time
- Interactive chart
- Complete report list for the subgraph

## Database Schema

The server uses PostgreSQL with three main tables:

- `schema_reports` - Main report data
- `rule_results` - Individual rule validation results
- `violations` - Specific violations with location data

See `migrations/001_initial.sql` for the complete schema.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_USER` | postgres | Database user |
| `DB_PASSWORD` | postgres | Database password |
| `DB_NAME` | schema_score | Database name |
| `DB_SSLMODE` | disable | SSL mode for database connection |
| `DATABASE_URL` | - | Full database URL (overrides individual DB_* vars) |
| `PORT` | 8080 | Server port |

### Using with Schema Scorer

Configure your schema scorer to send reports:

```bash
# Single report
bun run index.ts schema.graphql --report-endpoint http://localhost:8080/api/reports --subgraph-name my-service

# In CI/CD
bun run index.ts schema.graphql \
  --report-endpoint https://your-server.com/api/reports \
  --subgraph-name $SERVICE_NAME \
  --header Authorization="Bearer $API_TOKEN" \
  --silent
```

## Development

### Project Structure
```
server/
├── cmd/main.go              # Main application entry point
├── internal/
│   ├── handlers/
│   │   ├── api.go           # REST API handlers
│   │   └── web.go           # Web UI handlers
│   ├── models/models.go     # Data models
│   ├── templates/           # HTML templates
│   │   ├── base.html
│   │   ├── dashboard.html
│   │   ├── report.html
│   │   └── history.html
│   └── static/              # Static assets (CSS, JS)
├── migrations/              # Database migrations
│   └── 001_initial.sql
├── docker-compose.yml       # Development setup
├── Dockerfile              # Production container
└── README.md
```

### Running Tests
```bash
go test ./...
```

### Building
```bash
# Local build
go build -o schema-score-server cmd/main.go

# Docker build
docker build -t schema-score-server .
```

## Deployment

### Docker
```bash
docker run -d \
  -p 8080:8080 \
  -e DATABASE_URL="postgres://user:pass@host:5432/db?sslmode=disable" \
  schema-score-server
```

### Kubernetes
Create appropriate ConfigMaps and Secrets for database credentials, then deploy with your preferred method.

### Cloud Platforms
The server works on any platform that supports Go applications and PostgreSQL:
- Railway
- Render
- Heroku
- DigitalOcean App Platform
- AWS ECS/EKS
- Google Cloud Run

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Add tests
5. Submit a pull request