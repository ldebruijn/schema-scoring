-- Create schema_reports table
CREATE TABLE IF NOT EXISTS schema_reports (
    id SERIAL PRIMARY KEY,
    subgraph_name VARCHAR(255) not null,
    score DECIMAL(10,2) NOT NULL,
    total_fields INTEGER NOT NULL,
    total_weighted_violations DECIMAL(10,2) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rule_results table
CREATE TABLE IF NOT EXISTS rule_results (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES schema_reports(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    violation_count INTEGER NOT NULL,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create violations table
CREATE TABLE IF NOT EXISTS violations (
    id SERIAL PRIMARY KEY,
    rule_result_id INTEGER REFERENCES rule_results(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    location_line INTEGER,
    location_column INTEGER,
    location_field VARCHAR(255),
    location_type VARCHAR(255),
    location_coordinate VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schema_reports_subgraph_timestamp 
    ON schema_reports(subgraph_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_schema_reports_timestamp 
    ON schema_reports(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rule_results_report_id 
    ON rule_results(report_id);

CREATE INDEX IF NOT EXISTS idx_violations_rule_result_id 
    ON violations(rule_result_id);