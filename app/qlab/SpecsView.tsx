"use client";

import React, { useState, useEffect } from 'react';
import { getSpecifications, createSpecification, getTestMethods } from './actions';

export default function SpecsView() {
    const [specs, setSpecs] = useState<any[]>([]);
    const [methods, setMethods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [expandedSpec, setExpandedSpec] = useState<number | null>(null);
    const [newQuality, setNewQuality] = useState('');
    const [newTests, setNewTests] = useState<{ method_id: number; min_value: string; max_value: string }[]>([]);

    const load = () => {
        Promise.all([getSpecifications(), getTestMethods()]).then(([s, m]) => {
            setSpecs(s); setMethods(m.filter((x: any) => x.is_active)); setLoading(false);
        });
    };
    useEffect(load, []);

    const addTestRow = () => setNewTests([...newTests, { method_id: methods[0]?.id || 0, min_value: '', max_value: '' }]);
    const removeTestRow = (i: number) => setNewTests(newTests.filter((_, idx) => idx !== i));

    const handleCreate = async () => {
        if (!newQuality) return alert('Quality Code is required');
        if (newTests.length === 0) return alert('Add at least one test');
        await createSpecification({
            quality_code: newQuality,
            tests: newTests.map(t => ({
                method_id: t.method_id,
                min_value: t.min_value ? parseFloat(t.min_value) : null,
                max_value: t.max_value ? parseFloat(t.max_value) : null,
            }))
        });
        setShowForm(false); setNewQuality(''); setNewTests([]); load();
    };

    if (loading) return <div className="loading">Loading specifications...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Specification Management</h2>
                <button className="save-btn" onClick={() => { setShowForm(true); setNewTests([]); }}>+ New Specification</button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Create New Specification Version</h3>
                    <div className="form-field" style={{ marginBottom: '1rem' }}>
                        <label>Quality Code *</label>
                        <input value={newQuality} onChange={e => setNewQuality(e.target.value)} placeholder="e.g. Q100" />
                    </div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>Test Requirements</h4>
                    {newTests.map((t, i) => {
                        const selMethod = methods.find(m => m.id === t.method_id);
                        return (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.75rem', marginBottom: '0.5rem', alignItems: 'end' }}>
                                <div className="form-field">
                                    <label>Test Method</label>
                                    <select value={t.method_id} onChange={e => { const u = [...newTests]; u[i].method_id = +e.target.value; setNewTests(u); }}>
                                        {methods.map(m => <option key={m.id} value={m.id}>{m.name} ({m.test_code})</option>)}
                                    </select>
                                </div>
                                {selMethod?.method_type === 'Numeric' ? (<>
                                    <div className="form-field"><label>Min</label><input type="number" value={t.min_value} onChange={e => { const u = [...newTests]; u[i].min_value = e.target.value; setNewTests(u); }} /></div>
                                    <div className="form-field"><label>Max</label><input type="number" value={t.max_value} onChange={e => { const u = [...newTests]; u[i].max_value = e.target.value; setNewTests(u); }} /></div>
                                </>) : (<>
                                    <div className="form-field"><label>Min</label><input disabled placeholder="N/A" /></div>
                                    <div className="form-field"><label>Max</label><input disabled placeholder="N/A" /></div>
                                </>)}
                                <button className="action-btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeTestRow(i)}>✕</button>
                            </div>
                        );
                    })}
                    <button className="action-btn-sm" style={{ marginTop: '0.5rem' }} onClick={addTestRow}>+ Add Test</button>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                        <button className="save-btn" onClick={handleCreate}>Save Specification</button>
                        <button className="action-btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {specs.map(s => (
                <div key={s.id} className="card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandedSpec(expandedSpec === s.id ? null : s.id)}>
                        <div>
                            <strong>{s.quality_code}</strong> — Version {s.version}
                            <span className={`status-badge ${s.is_active ? 'status-pass' : 'status-failed'}`} style={{ marginLeft: '0.75rem' }}>{s.is_active ? 'Active' : 'Superseded'}</span>
                        </div>
                        <span style={{ color: 'var(--text-dim)' }}>{expandedSpec === s.id ? '▲' : '▼'}</span>
                    </div>
                    {expandedSpec === s.id && s.tests && (
                        <table className="lot-table" style={{ marginTop: '1rem' }}>
                            <thead><tr><th>Test</th><th>Code</th><th>Type</th><th>Min</th><th>Max</th><th>Unit</th></tr></thead>
                            <tbody>
                                {s.tests.map((t: any, i: number) => (
                                    <tr key={i}>
                                        <td>{t.method_name}</td><td><span className="test-code">{t.test_code}</span></td>
                                        <td>{t.method_type}</td><td>{t.min_value ?? '—'}</td><td>{t.max_value ?? '—'}</td><td>{t.unit || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            ))}
        </div>
    );
}
