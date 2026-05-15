"use client";

import React, { useState, useEffect } from 'react';
import { getAllResults, overrideTestResult } from './actions';

export default function ReviewView() {
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [overrideTarget, setOverrideTarget] = useState<any | null>(null);
    const [overrideVal, setOverrideVal] = useState('');
    const [overrideReason, setOverrideReason] = useState('');
    const [filter, setFilter] = useState('all');

    const load = () => { getAllResults().then(d => { setResults(d); setLoading(false); }); };
    useEffect(load, []);

    const handleOverride = async () => {
        if (!overrideReason.trim()) return alert('Override reason is mandatory');
        if (!overrideVal) return alert('Provide new value');
        const t = overrideTarget;
        await overrideTestResult({
            result_id: t.id, plan_id: t.plan_id, method_id: t.test_method_id,
            new_value: t.method_type === 'Numeric' ? parseFloat(overrideVal) : overrideVal,
            type: t.method_type, min: t.min_value, max: t.max_value,
            overrider: 'Lab Manager', reason: overrideReason
        });
        setOverrideTarget(null); setOverrideVal(''); setOverrideReason(''); load();
    };

    const filtered = filter === 'all' ? results : results.filter(r => r.result_status === filter);

    if (loading) return <div className="loading">Loading results...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Review All Test Results</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['all', 'Pass', 'Fail'].map(f => (
                        <button key={f} className={`action-btn-sm ${filter === f ? 'filter-active' : ''}`} onClick={() => setFilter(f)}>
                            {f === 'all' ? 'All' : f}
                        </button>
                    ))}
                </div>
            </div>

            {overrideTarget && (
                <div className="card" style={{ borderColor: 'var(--warning)', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>⚠️ Override Result — {overrideTarget.test_name} ({overrideTarget.lot_number})</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-field">
                            <label>Current Value</label>
                            <input disabled value={overrideTarget.numeric_result ?? overrideTarget.observation_result ?? ''} />
                        </div>
                        <div className="form-field">
                            <label>New Value *</label>
                            {overrideTarget.method_type === 'Numeric' ? (
                                <input type="number" value={overrideVal} onChange={e => setOverrideVal(e.target.value)} placeholder="New numeric value" />
                            ) : (
                                <select value={overrideVal} onChange={e => setOverrideVal(e.target.value)}>
                                    <option value="">Select...</option><option value="Pass">Pass</option><option value="Fail">Fail</option>
                                </select>
                            )}
                        </div>
                        <div className="form-field" style={{ gridColumn: 'span 2' }}>
                            <label>Justification (mandatory) *</label>
                            <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Explain why this override is required..." rows={3} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border)', background: '#fff', resize: 'vertical' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button className="save-btn" style={{ background: 'var(--warning)' }} onClick={handleOverride}>Confirm Override</button>
                        <button className="action-btn-sm" onClick={() => setOverrideTarget(null)}>Cancel</button>
                    </div>
                </div>
            )}

            <table className="lot-table card">
                <thead>
                    <tr><th>Lot</th><th>Quality</th><th>Test</th><th>Result</th><th>Status</th><th>Tested By</th><th>Comments</th><th>Override</th><th>Action</th></tr>
                </thead>
                <tbody>
                    {filtered.map((r, i) => (
                        <tr key={i}>
                            <td><strong>{r.lot_number}</strong></td>
                            <td>{r.quality_code}</td>
                            <td>{r.test_name} <span className="test-code" style={{ marginLeft: 4 }}>{r.test_code}</span></td>
                            <td style={{ fontWeight: 700, color: r.result_status === 'Fail' ? 'var(--danger)' : 'var(--success)' }}>
                                {r.numeric_result ?? r.observation_result}
                            </td>
                            <td><span className={`status-badge status-${r.result_status?.toLowerCase()}`}>{r.result_status}</span></td>
                            <td style={{ fontSize: '0.8rem' }}>{r.tested_by}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.comments || '—'}</td>
                            <td>{r.is_override ? <span style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 700 }}>OVERRIDDEN by {r.overridden_by}</span> : '—'}</td>
                            <td><button className="action-btn-sm" onClick={() => { setOverrideTarget(r); setOverrideVal(''); setOverrideReason(''); }}>Override</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
