import "dotenv/config";
import { getMonitorStatus } from "./monitor.controller.js";
import { persistMonitoringResult } from "./monitor-db.js";

const intervalSeconds = Number.parseInt(
  process.env.MONITOR_DEFAULT_INTERVAL_SECONDS ?? "60",
  10,
);
const intervalMs = (Number.isFinite(intervalSeconds) && intervalSeconds > 0
  ? intervalSeconds
  : 60) * 1000;
let cycleNumber = 0;
const previousStatuses = new Map<string, string>();

async function runMonitoringCycle() {
  cycleNumber += 1;
  const startedAt = performance.now();

  try {
    const result = await getMonitorStatus();
    const persisted = await persistMonitoringResult(result);
    const { operational, degraded, down, unknown } = result.summary;
    const durationMs = Math.round(performance.now() - startedAt);

    console.log(
      `[monitor] ciclo=${cycleNumber} actualizado=${result.checkedAt} ` +
        `duracion=${durationMs}ms | total=${result.total} ` +
        `operativos=${operational} degradados=${degraded} ` +
        `caidos=${down} desconocidos=${unknown}`,
    );

    if (persisted) console.log("[monitor] persistencia=OK base=noc_monitor");

    for (const service of result.services) {
      const previousStatus = previousStatuses.get(service.id);
      const changed = previousStatus !== undefined && previousStatus !== service.status;
      const needsAttention = service.status !== "OPERATIONAL";

      if (changed || needsAttention || previousStatus === undefined) {
        console.log(
          `[monitor] servicio=${service.name} estado=${service.status} ` +
            `http=${service.httpStatus ?? "-"} respuesta=${service.responseTimeMs ?? "-"}ms` +
            (changed ? ` cambio=${previousStatus}->${service.status}` : "") +
            (service.error ? ` error="${service.error}"` : ""),
        );
      }

      previousStatuses.set(service.id, service.status);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[monitor] ciclo=${cycleNumber} error="${message}"`);
  }
}

console.log(
  `[monitor] worker=iniciado intervalo=${intervalMs / 1000}s ` +
    `proxima_actualizacion=${new Date(Date.now() + intervalMs).toISOString()}`,
);
void runMonitoringCycle();
setInterval(() => void runMonitoringCycle(), intervalMs);
