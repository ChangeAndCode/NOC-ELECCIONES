export type MonitorStatus = "OPERATIONAL" | "DEGRADED" | "DOWN" | "UNKNOWN";

export interface MonitoredService {
  id: string;
  name: string;
  url: string;
  timeoutMs: number;
}

export interface ServiceStatus extends MonitoredService {
  status: MonitorStatus;
  responseTimeMs: number | null;
  httpStatus: number | null;
  checkedAt: string;
  error: string | null;
}

export interface MonitorResponse {
  checkedAt: string;
  total: number;
  summary: {
    operational: number;
    degraded: number;
    down: number;
    unknown: number;
  };
  services: ServiceStatus[];
}
