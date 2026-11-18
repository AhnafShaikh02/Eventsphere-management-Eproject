const MAX_LATENCY_SAMPLES = 400;
const MAX_TRACES = 60;

export class ServerMonitor {
  startedAt = Date.now();
  totalRequests = 0;
  totalErrors = 0;
  totalDurationMs = 0;
  latencies = [];
  recentAlerts = [];

  record(method, path, status, durationMs) {
    this.totalRequests += 1;
    this.totalDurationMs += durationMs;

    this.latencies.push(durationMs);
    if (this.latencies.length > MAX_LATENCY_SAMPLES) {
      this.latencies.shift();
    }

    if (status >= 500) {
      this.totalErrors += 1;
    }

    if (status >= 500 || durationMs >= 1000) {
      this.recentAlerts.unshift({
        id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        method,
        path,
        status,
        durationMs: Number(durationMs.toFixed(2)),
      });
      if (this.recentAlerts.length > MAX_TRACES) {
        this.recentAlerts.pop();
      }
    }
  }

  getSummary() {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p95Index = sorted.length > 0 ? Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95)) : 0;
    const avgLatencyMs =
      this.totalRequests > 0 ? Number((this.totalDurationMs / this.totalRequests).toFixed(2)) : 0;
    const p95LatencyMs = sorted.length > 0 ? Number(sorted[p95Index].toFixed(2)) : 0;
    const errorRatePct =
      this.totalRequests > 0 ? Number(((this.totalErrors / this.totalRequests) * 100).toFixed(2)) : 0;
    const mem = process.memoryUsage();

    return {
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      totalApiRequests: this.totalRequests,
      totalApiErrors: this.totalErrors,
      errorRatePct,
      avgLatencyMs,
      p95LatencyMs,
      memoryRssMb: Math.round(mem.rss / (1024 * 1024)),
      heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
      recentAlerts: this.recentAlerts.slice(0, 20),
    };
  }
}
