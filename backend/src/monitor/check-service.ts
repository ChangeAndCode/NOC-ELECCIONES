import type { MonitoredService, ServiceStatus } from "./types.js";

function buildCheckHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json, text/plain, */*",
    "user-agent": "NOC-ELECCIONES-Monitor/1.0",
  };

  // Solo se envía si está definido. Cloudflare puede saltar el challenge
  // de /health cuando ve este header; el resto del tráfico no cambia.
  const monitorToken = process.env.MONITOR_HEALTH_TOKEN?.trim();
  if (monitorToken) {
    headers["x-noc-token"] = monitorToken;
  }

  return headers;
}

export async function checkService(service: MonitoredService): Promise<ServiceStatus> {
  const checkedAt = new Date().toISOString();
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), service.timeoutMs);

  try {
    const response = await fetch(service.url, {
      method: "GET",
      signal: controller.signal,
      headers: buildCheckHeaders(),
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
