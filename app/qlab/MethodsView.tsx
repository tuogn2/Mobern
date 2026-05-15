"use client";

import React, { useState, useEffect } from 'react';
import { getTestMethods, createTestMethod, updateTestMethod, toggleTestMethodActive } from './actions';

export default function MethodsView() {
    const [methods, setMethods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', test_code: '', unit: '', method_type: 'Numeric', reference_standard: '' });

    const load = () => { getTestMethods().then(d => { setMethods(d); setLoading(false); }); };
    useEffect(load, []);

    const resetForm = () => { setForm({ name: '', test_code: '', unit: '', method_type: 'Numeric', reference_standard: '' }); setEditingId(null); setShowForm(false); };

    const handleSubmit = async () => {
        if (!form.name || !form.test_code) return alert('Name and Code are required');
        if (editingId) await updateTestMethod(editingId, form);
        else await createTestMethod(form);
        resetForm(); load();
    };

    const startEdit = (m: any) => {
        setForm({ name: m.name, test_code: m.test_code || '', unit: m.unit || '', method_type: m.method_type, reference_standard: m.reference_standard || '' });
        setEditingId(m.id); setShowForm(true);
    };

    const handleToggle = async (id: number, current: boolean) => { await toggleTestMethodActive(id, !current); load(); };

    if (loading) return <div className="loading">Loading methods...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Test Methods Registry</h2>
                <button className="save-btn" onClick={() => { resetForm(); setShowForm(true); }}>+ New Method</button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>{editingId ? 'Edit Method' : 'Create New Method'}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-field">
                            <label>Test Name *</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tensile Strength" />
                        </div>
                        <div className="form-field">
                            <label>Test Code *</label>
                            <input value={form.test_code} onChange={e => setForm({ ...form, test_code: e.target.value })} placeholder="e.g. TS-01" />
                        </div>
                        <div className="form-field">
                            <label>Unit</label>
                            <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="e.g. kg/cm2" />
                        </div>
                        <div className="form-field">
                            <label>Type</label>
                            <select value={form.method_type} onChange={e => setForm({ ...form, method_type: e.target.value })}>
                                <option value="Numeric">Numeric</option>
                                <option value="Observation">Observation</option>
                            </select>
                        </div>
                        <div className="form-field" style={{ gridColumn: 'span 2' }}>
                            <label>Reference Standard</label>
                            <input value={form.reference_standard} onChange={e => setForm({ ...form, reference_standard: e.target.value })} placeholder="e.g. ASTM D5034" />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button className="save-btn" onClick={handleSubmit}>{editingId ? 'Update' : 'Create'}</button>
                        <button className="action-btn-sm" onClick={resetForm}>Cancel</button>
                    </div>
                </div>
            )}

            <table className="lot-table card">
                <thead>
                    <tr>
                        <th>Code</th><th>Name</th><th>Unit</th><th>Type</th><th>Standard</th><th>Status</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {methods.map(m => (
                        <tr key={m.id} style={{ opacity: m.is_active ? 1 : 0.5 }}>
                            <td><span className="test-code">{m.test_code}</span></td>
                            <td><strong>{m.name}</strong></td>
                            <td>{m.unit || '—'}</td>
                            <td>{m.method_type}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{m.reference_standard || '—'}</td>
                            <td><span className={`status-badge ${m.is_active ? 'status-pass' : 'status-failed'}`}>{m.is_active ? 'Active' : 'Inactive'}</span></td>
                            <td style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="action-btn-sm" onClick={() => startEdit(m)}>Edit</button>
                                <button className="action-btn-sm" onClick={() => handleToggle(m.id, m.is_active)}>{m.is_active ? 'Deactivate' : 'Activate'}</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
