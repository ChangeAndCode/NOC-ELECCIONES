import "dotenv/config";
import type { MonitoredService } from "./types.js";

const timeoutMs = Number.parseInt(process.env.MONITOR_DEFAULT_TIMEOUT_MS ?? "10000", 10);

const configured: Array<[string, string, string | undefined]> = [
  ["cms-admin", "CMS Administrativo", process.env.CMS_ADMIN_HEALTH_URL],
  ["app-backend", "Backend de AppElecciones", process.env.PP_BACKEND_HEALTH_URL],
  ["app-frontend", "Frontend de AppElecciones", process.env.PP_FRONTEND_URL],
  ["app-ocr", "OCR de AppElecciones", process.env.PP_OCR_HEALTH_URL],
  ["render", "Render", process.env.RENDER_HEALTH_URL],
  ["railway", "Railway", process.env.RAILWAY_HEALTH_URL],
];

export function getConfiguredServices(): MonitoredService[] {
  return configured
    .filter(([, , url]) => Boolean(url?.trim()))
    .map(([id, name, url]) => ({
      id,
      name,
      url: url!.trim(),
      timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 10000,
    }));
}
