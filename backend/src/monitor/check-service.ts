import type { MonitoredService, ServiceStatus } from "./types.js";

export async function checkService(service: MonitoredService): Promise<ServiceStatus> {
  const checkedAt = new Date().toISOString();
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), service.timeoutMs);

  try {
    const response = await fetch(service.url, {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json, text/plain, */*" },
    });
    const responseTimeMs = Math.round(performance.now() - startedAt);

    return {
      ...service,
      status: response.ok ? (responseTimeMs > 3000 ? "DEGRADED" : "OPERATIONAL") : "DOWN",
      responseTimeMs,
      httpStatus: response.status,
      checkedAt,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ...service,
      status: "DOWN",
      responseTimeMs: null,
      httpStatus: null,
      checkedAt,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  } finally {
    clearTimeout(timeout);
  }
}
