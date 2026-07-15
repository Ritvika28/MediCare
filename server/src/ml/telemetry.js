import fs from 'fs';
import path from 'path';
import os from 'os';

const LOGS_DIR = path.resolve(process.cwd(), 'server', 'logs');
const TELEMETRY_LOG = path.join(LOGS_DIR, 'ml-telemetry.log');

// Ensure log folder exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

class MLTelemetry {
  constructor() {
    this.uptimeStart = Date.now();
    this.predictionCounts = {
      disease: 0,
      biological_age: 0,
      health_score: 0,
      recommend: 0,
      forecast: 0
    };
    this.failureCounts = {
      disease: 0,
      biological_age: 0,
      health_score: 0,
      recommend: 0,
      forecast: 0
    };
    this.latencies = []; // keep recent 100 latencies
  }

  logRequest({ task, target, latencyMs, success, error = null }) {
    // Increment rolling counters
    const key = task || 'disease';
    if (success) {
      this.predictionCounts[key] = (this.predictionCounts[key] || 0) + 1;
    } else {
      this.failureCounts[key] = (this.failureCounts[key] || 0) + 1;
    }

    if (latencyMs !== undefined) {
      this.latencies.push(latencyMs);
      if (this.latencies.length > 100) {
        this.latencies.shift();
      }
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      task,
      target,
      latencyMs,
      success,
      error: error ? error.message || String(error) : null
    };

    try {
      fs.appendFileSync(TELEMETRY_LOG, JSON.stringify(logEntry) + '\n', 'utf8');
    } catch (err) {
      console.error("Failed to write to telemetry log:", err);
    }
  }

  getMetrics() {
    const memory = process.memoryUsage();
    const cpuLoad = os.loadavg();
    const avgLatency = this.latencies.length 
      ? parseFloat((this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length).toFixed(2))
      : 0;

    return {
      uptimeSeconds: Math.floor((Date.now() - this.uptimeStart) / 1000),
      memoryUsage: {
        rss: parseFloat((memory.rss / (1024 * 1024)).toFixed(2)), // MB
        heapTotal: parseFloat((memory.heapTotal / (1024 * 1024)).toFixed(2)),
        heapUsed: parseFloat((memory.heapUsed / (1024 * 1024)).toFixed(2))
      },
      cpu: {
        load1m: parseFloat(cpuLoad[0].toFixed(2)),
        load5m: parseFloat(cpuLoad[1].toFixed(2)),
        freeMemGb: parseFloat((os.freemem() / (1024 * 1024 * 1024)).toFixed(2)),
        totalMemGb: parseFloat((os.totalmem() / (1024 * 1024 * 1024)).toFixed(2))
      },
      predictionCounts: this.predictionCounts,
      failureCounts: this.failureCounts,
      averageLatencyMs: avgLatency
    };
  }
}

export const telemetry = new MLTelemetry();
export default telemetry;
