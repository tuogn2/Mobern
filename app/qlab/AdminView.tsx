"use client";

import React, { useState, useEffect } from 'react';
import { getAuditLog } from './actions';

export default function AdminView() {
    const [log, setLog] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showOverridesOnly, setShowOverridesOnly] = useState(false);

    useEffect(() => { getAuditLog().then(d => { setLog(d); setLoading(false); }); }, []);

    const filtered = showOverridesOnly ? log.filter(l => l.is_override) : log;

    if (loading) return <div className="loading">Loading audit data...</div>;

    return (
        <div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2 className="card-title">System Configuration & Oversight</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="stat-card"><span className="stat-label">Total Records</span><span className="stat-value">{log.length}</span></div>
                    <div className="stat-card"><span className="stat-label">Overrides</span><span className="stat-value" style={{ color: 'var(--warning)' }}>{log.filter(l => l.is_override).length}</span></div>
                    <div className="stat-card"><span className="stat-label">Unique Operators</span><span className="stat-value">{new Set(log.map(l => l.tested_by)).size}</span></div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Full Audit Trail</h2>
                <button className={`action-btn-sm ${showOverridesOnly ? 'filter-active' : ''}`} onClick={() => setShowOverridesOnly(!showOverridesOnly)}>
                    {showOverridesOnly ? 'Show All' : 'Overrides Only'}
                </button>
            </div>

            <table className="lot-table card">
                <thead>
                    <tr><th>Timestamp</th><th>Lot</th><th>Quality</th><th>Test</th><th>Result</th><th>Status</th><th>User</th><th>Override Info</th></tr>
                </thead>
                <tbody>
                    {filtered.map((r, i) => (
                        <tr key={i} style={{ background: r.is_override ? '#fffbeb' : undefined }}>
                            <td style={{ fontSize: '0.8rem' }}>{new Date(r.tested_at).toLocaleString()}</td>
                            <td><strong>{r.lot_number}</strong></td>
                            <td>{r.quality_code}</td>
                            <td>{r.test_name}</td>
                            <td style={{ fontWeight: 700 }}>{r.numeric_result ?? r.observation_result}</td>
                            <td><span className={`status-badge status-${r.result_status?.toLowerCase()}`}>{r.result_status}</span></td>
                            <td style={{ fontSize: '0.8rem' }}>{r.tested_by}</td>
                            <td style={{ fontSize: '0.75rem' }}>
                                {r.is_override ? (
                                    <div><strong style={{ color: 'var(--warning)' }}>By: {r.overridden_by}</strong><br/>Reason: {r.override_reason}<br/>{new Date(r.overridden_at).toLocaleString()}</div>
                                ) : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
