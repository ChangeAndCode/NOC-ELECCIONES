import type { Incident, MonitorResponse } from '../types/monitor'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function fetchMonitorStatus(): Promise<MonitorResponse> {
  const response = await fetch(`${apiUrl}/api/monitor/status`)
  if (!response.ok) throw new Error(`La API respondió HTTP ${response.status}`)
  return response.json() as Promise<MonitorResponse>
}

export async function fetchOpenIncidents(): Promise<Incident[]> {
  const response = await fetch(`${apiUrl}/api/incidents?open=true`)
  if (!response.ok) throw new Error(`No se pudieron consultar los incidentes (HTTP ${response.status})`)
  const result = (await response.json()) as { incidents: Incident[] }
  return result.incidents
}
