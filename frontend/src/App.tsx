import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { fetchMonitorStatus, fetchOpenIncidents } from './services/monitorApi'
import type { Incident, MonitorResponse, MonitorStatus, ServiceStatus } from './types/monitor'

const statusLabels: Record<MonitorStatus, string> = { OPERATIONAL: 'Operativo', DEGRADED: 'Degradado', DOWN: 'Caído', UNKNOWN: 'Desconocido' }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <article className={`summary-card ${tone}`}><span>{label}</span><strong>{value}</strong></article>
}

function ServiceCard({ service }: { service: ServiceStatus }) {
  return <article className="service-card">
    <div className="service-card__header"><div><p className="eyebrow">Servicio monitoreado</p><h2>{service.name}</h2></div><span className={`status-badge status-${service.status.toLowerCase()}`}><span className="status-dot" />{statusLabels[service.status]}</span></div>
    <div className="service-metrics"><div><span>Respuesta</span><strong>{service.responseTimeMs === null ? '—' : `${service.responseTimeMs} ms`}</strong></div><div><span>HTTP</span><strong>{service.httpStatus ?? '—'}</strong></div><div><span>Verificado</span><strong>{formatDate(service.checkedAt)}</strong></div></div>
    {service.error && <p className="service-error">{service.error}</p>}
  </article>
}

function App() {
  const [data, setData] = useState<MonitorResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const loadStatus = useCallback(async () => { try { setError(null); const [status, openIncidents] = await Promise.all([fetchMonitorStatus(), fetchOpenIncidents()]); setData(status); setIncidents(openIncidents) } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible consultar el monitor') } finally { setLoading(false) } }, [])

  useEffect(() => { void loadStatus(); const interval = window.setInterval(() => void loadStatus(), 60000); return () => window.clearInterval(interval) }, [loadStatus])

  return <main className="dashboard">
    <header className="dashboard-header"><div><p className="brand-kicker">CHANGE&amp;CODE · NOC</p><h1>Presupuesto Participativo</h1><p className="subtitle">Monitoreo centralizado de servicios tecnológicos</p></div><button className="refresh-button" type="button" onClick={() => void loadStatus()} disabled={loading}>{loading ? 'Consultando…' : 'Actualizar ahora'}</button></header>
    {error && <div className="error-banner">{error}. Revisa la configuración de la API y la base de datos del monitor.</div>}
    <section className="summary-grid"><SummaryCard label="Servicios" value={data?.total ?? 0} tone="neutral" /><SummaryCard label="Operativos" value={data?.summary.operational ?? 0} tone="operational" /><SummaryCard label="Degradados" value={data?.summary.degraded ?? 0} tone="degraded" /><SummaryCard label="Caídos" value={data?.summary.down ?? 0} tone="down" /></section>
    <section><div className="section-heading"><div><p className="eyebrow">Estado en tiempo real</p><h2>Servicios monitoreados</h2></div><span className="last-check">{data ? `Última consulta: ${formatDate(data.checkedAt)}` : 'Esperando datos'}</span></div>{data?.services.length ? <div className="services-grid">{data.services.map((service) => <ServiceCard key={service.id} service={service} />)}</div> : <div className="empty-state">{loading ? 'Consultando servicios…' : 'No hay servicios configurados.'}</div>}</section>
    <section className="incidents-section"><div className="section-heading"><div><p className="eyebrow">Atención requerida</p><h2>Incidentes activos</h2></div><span className="last-check">{incidents.length} abiertos</span></div>{incidents.length ? <div className="incident-list">{incidents.map((incident) => <article className="incident-card" key={incident._id}><strong>{incident.name}</strong><span>{incident.status}</span><small>Desde {formatDate(incident.startedAt)}{incident.lastError ? ` · ${incident.lastError}` : ''}</small></article>)}</div> : <div className="empty-state success-state">No hay incidentes activos.</div>}</section>
  </main>
}

export default App
