"use client"
import React, { useEffect, useState } from 'react'

export default function AuditLog() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/events')
        if (res.ok) {
          setEvents(await res.json())
        }
      } catch (err) {
        console.error("Failed to load events", err)
      } finally {
        setLoading(false)
      }
    }
    loadEvents()
  }, [])

  if (loading) return <div>Loading audit log...</div>

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 600 }}>Audit Log</h1>

      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Category</th>
              <th>Status</th>
              <th>Risk Score</th>
              <th>Rule</th>
            </tr>
          </thead>
          <tbody>
            {events.map((evt) => (
              <React.Fragment key={evt.id}>
                <tr 
                  onClick={() => setExpandedRow(expandedRow === evt.id ? null : evt.id)}
                  style={{ cursor: 'pointer', background: expandedRow === evt.id ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                >
                  <td style={{ fontSize: '0.875rem' }}>{new Date(evt.timestamp).toLocaleString()}</td>
                  <td>{evt.category}</td>
                  <td>
                    <span className={`badge ${evt.status === 'BLOCKED' ? 'badge-blocked' : 'badge-allowed'}`}>
                      {evt.status}
                    </span>
                  </td>
                  <td>{evt.regexRiskScore.toFixed(2)}</td>
                  <td>{evt.matchedRule || '-'}</td>
                </tr>
                {expandedRow === evt.id && (
                  <tr>
                    <td colSpan={5} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                          <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Prompt</h4>
                          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
                            {evt.promptText}
                          </pre>
                        </div>
                        <div>
                          <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Analysis Details</h4>
                          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div><strong>Declared Intent:</strong> {evt.declaredIntent}</div>
                            <div><strong>Detected Intent:</strong> {evt.detectedIntent}</div>
                            <div><strong>Event Hash:</strong> <span style={{ fontFamily: 'monospace' }}>{evt.eventHash.substring(0, 16)}...</span></div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
