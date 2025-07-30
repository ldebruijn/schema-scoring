import type { SchemaReport } from "./model.ts";

export type ReporterConfig = {
    endpoint: string;
    headers?: Record<string, string>;
    timeout?: number;
}

export class Reporter {
    private config: ReporterConfig;

    constructor(config: ReporterConfig) {
        this.config = {
            timeout: 10000,
            ...config
        };
    }

    async sendReport(report: SchemaReport): Promise<void> {
        try {
            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.config.headers
                },
                body: JSON.stringify(report),
                signal: AbortSignal.timeout(this.config.timeout!)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log(`✅ Report sent successfully to ${this.config.endpoint}`);
        } catch (error) {
            console.error(`❌ Failed to send report to ${this.config.endpoint}:`, error);
            throw error;
        }
    }
}