export type MonitorStatus = 'OPERATIONAL' | 'DEGRADED' | 'DOWN' | 'UNKNOWN'

export interface ServiceStatus {
  id: string
  name: string
  url: string
  status: MonitorStatus
  responseTimeMs: number | null
  httpStatus: number | null
  checkedAt: string
  error: string | null
}

export interface MonitorResponse {
  checkedAt: string
  total: number
  summary: { operational: number; degraded: number; down: number; unknown: number }
  services: ServiceStatus[]
}

export interface Incident {
  _id: string
  serviceId: string
  name: string
  status: string
  startedAt: string
  recoveredAt: string | null
  durationSeconds: number | null
  lastError: string | null
}
