"use client";

import React, { useState, useEffect } from 'react';
import './qlab.css';
import { getLots, getLotTests, saveTestResult } from './actions';
import MethodsView from './MethodsView';
import SpecsView from './SpecsView';
import ReviewView from './ReviewView';
import ReportsView from './ReportsView';
import AdminView from './AdminView';

type Status = 'Pending' | 'In Progress' | 'Pass' | 'Failed';

interface Lot { plan_id: number; tp_skid: number; lot_number: string; quality_code: string; status: Status; }
interface TestItem { test_method_id: number; test_code: string; name: string; unit: string; method_type: 'Numeric' | 'Observation'; min_value?: number; max_value?: number; numeric_result?: number; observation_result?: string; result_status?: string; result_id?: number; tested_by?: string; tested_at?: string; comments?: string; is_override?: boolean; overridden_by?: string; override_reason?: string; reference_standard?: string; }

export default function QLabApp() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [role, setRole] = useState<'Operator' | 'Manager' | 'Admin'>('Manager');
    const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
    const [viewingCoA, setViewingCoA] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: ['Operator', 'Manager', 'Admin'] },
        { id: 'entry', label: 'Test Entry', icon: '🧪', roles: ['Operator', 'Manager', 'Admin'] },
        { id: 'review', label: 'Review', icon: '🔍', roles: ['Manager', 'Admin'] },
        { id: 'methods', label: 'Methods', icon: '⚙️', roles: ['Manager', 'Admin'] },
        { id: 'specs', label: 'Specifications', icon: '📝', roles: ['Manager', 'Admin'] },
        { id: 'reports', label: 'Reporting', icon: '📈', roles: ['Manager', 'Admin'] },
        { id: 'admin', label: 'Admin', icon: '🛡️', roles: ['Admin'] },
    ];
    const filteredNav = navItems.filter(item => item.roles.includes(role));

    if (viewingCoA && selectedLot) return <CoAView lot={selectedLot} onBack={() => setViewingCoA(false)} />;

    return (
        <div className="qlab-container">
            <aside className="qlab-sidebar">
                <div className="sidebar-brand"><div className="brand-logo">QL</div><span className="brand-name">QLab Pro</span></div>
                <nav className="sidebar-nav">
                    {filteredNav.map(item => (
                        <button key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
                            <span className="nav-icon">{item.icon}</span><span className="nav-label">{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className="role-selector">
                        <label>View As:</label>
                        <select value={role} onChange={(e) => setRole(e.target.value as any)}>
                            <option value="Operator">Lab Operator</option>
                            <option value="Manager">Lab Manager</option>
                            <option value="Admin">Quality Manager</option>
                        </select>
                    </div>
                </div>
            </aside>
            <main className="qlab-main">
                <header className="main-header">
                    <div className="header-info">
                        <h1 className="current-view-title">{navItems.find(i => i.id === activeTab)?.label}</h1>
                        <p className="header-subtitle">Logged in as: {role}</p>
                    </div>
                    <div className="header-actions"><button className="icon-btn">🔔</button><div className="user-avatar">{role[0]}</div></div>
                </header>
                <div className="view-content">
                    {activeTab === 'dashboard' && <DashboardView onLotSelect={(lot) => { setSelectedLot(lot); setActiveTab('entry'); }} />}
                    {activeTab === 'entry' && <TestEntryView selectedLot={selectedLot} tester={role} onBack={() => setActiveTab('dashboard')} onViewCoA={() => setViewingCoA(true)} role={role} />}
                    {activeTab === 'review' && <ReviewView />}
                    {activeTab === 'methods' && <MethodsView />}
                    {activeTab === 'specs' && <SpecsView />}
                    {activeTab === 'reports' && <ReportsView />}
                    {activeTab === 'admin' && <AdminView />}
                </div>
            </main>
        </div>
    );
}

// ─── Dashboard ───────────────────────────────────────────────
function DashboardView({ onLotSelect }: { onLotSelect: (lot: Lot) => void }) {
    const [lots, setLots] = useState<Lot[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { getLots().then(d => { setLots(d as Lot[]); setLoading(false); }); }, []);
    if (loading) return <div className="loading">Initializing Dashboard...</div>;
    const stats = { pending: lots.filter(l => l.status === 'Pending').length, inProgress: lots.filter(l => l.status === 'In Progress').length, failed: lots.filter(l => l.status === 'Failed').length, passRate: lots.length > 0 ? Math.round((lots.filter(l => l.status === 'Pass').length / lots.length) * 100) : 0 };
    return (
        <div>
            <div className="stats-row">
                <StatCard label="Pending" value={stats.pending} color="var(--warning)" />
                <StatCard label="In Progress" value={stats.inProgress} color="var(--primary)" />
                <StatCard label="Failures" value={stats.failed} color="var(--danger)" />
                <StatCard label="Pass Rate" value={`${stats.passRate}%`} color="var(--success)" />
            </div>
            <section className="card full-width">
                <h2 className="card-title">Production Lots</h2>
                <table className="lot-table">
                    <thead><tr><th>Lot Number</th><th>Quality Code</th><th>Lab Status</th><th>Action</th></tr></thead>
                    <tbody>
                        {lots.map(lot => (
                            <tr key={lot.tp_skid}>
                                <td><strong>{lot.lot_number}</strong></td>
                                <td>{lot.quality_code}</td>
                                <td><span className={`status-badge status-${lot.status.toLowerCase().replace(' ', '-')}`}>{lot.status}</span></td>
                                <td><button className="action-btn-sm" onClick={() => onLotSelect(lot)}>Manage Tests</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}

// ─── Test Entry with Comments ────────────────────────────────
function TestEntryView({ selectedLot, tester, onBack, onViewCoA, role }: { selectedLot: Lot | null; tester: string; onBack: () => void; onViewCoA: () => void; role: string }) {
    const [tests, setTests] = useState<TestItem[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { if (selectedLot) { getLotTests(selectedLot.plan_id).then(d => { setTests(d as TestItem[]); setLoading(false); }); } }, [selectedLot]);

    const handleSave = async (testId: number, value: any, type: string, min?: number, max?: number, comment?: string) => {
        if (!selectedLot) return;
        const res = await saveTestResult({ plan_id: selectedLot.plan_id, method_id: testId, value, type: type as any, min, max, tester, comment });
        setTests(prev => prev.map(t => t.test_method_id === testId ? { ...t, numeric_result: type === 'Numeric' ? value : t.numeric_result, observation_result: type === 'Observation' ? value : t.observation_result, result_status: res.status } : t));
    };

    if (!selectedLot) return <div className="empty-state">Select a production lot from the Dashboard to begin.</div>;
    if (loading) return <div className="loading">Loading tests...</div>;

    return (
        <div className="entry-view">
            <button className="back-btn" onClick={onBack}>← Return to Dashboard</button>
            <div className="lot-info-banner">
                <div className="info-item"><span className="label">Production Lot</span><span className="value">{selectedLot.lot_number}</span></div>
                <div className="info-item"><span className="label">Quality Standard</span><span className="value">{selectedLot.quality_code}</span></div>
                <div className="info-item"><span className="label">Lab Verdict</span><span className={`status-badge status-${selectedLot.status.toLowerCase().replace(' ', '-')}`}>{selectedLot.status}</span></div>
            </div>
            <div className="test-grid">
                {tests.map(test => <TestCard key={test.test_method_id} test={test} onSave={(val, comment) => handleSave(test.test_method_id, val, test.method_type, test.min_value, test.max_value, comment)} />)}
            </div>
            {(selectedLot.status === 'Pass' && (role === 'Manager' || role === 'Admin')) && (
                <div className="coa-section"><button className="coa-btn" onClick={onViewCoA}>📄 Generate Certificate of Analysis (CoA)</button></div>
            )}
        </div>
    );
}


// ─── CoA View ────────────────────────────────────────────────
function CoAView({ lot, onBack }: { lot: Lot; onBack: () => void }) {
    const [tests, setTests] = useState<TestItem[]>([]);
    const [productDesc, setProductDesc] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            getLotTests(lot.plan_id),
            import('./actions').then(m => m.getProductDescription(lot.quality_code))
        ]).then(([t, desc]) => {
            setTests(t as TestItem[]);
            setProductDesc(desc);
            setLoading(false);
        });
    }, [lot]);

    if (loading) return <div className="coa-preview-page"><div className="loading">Generating Certificate...</div></div>;

    const allPass = tests.every(t => t.result_status === 'Pass');
    const overallStatus = allPass ? 'PASSED' : 'FAILED';
    const testDates = tests.filter(t => t.tested_at).map(t => new Date(t.tested_at!));
    const earliestDate = testDates.length > 0 ? new Date(Math.min(...testDates.map(d => d.getTime()))).toLocaleDateString() : '—';
    const latestDate = testDates.length > 0 ? new Date(Math.max(...testDates.map(d => d.getTime()))).toLocaleDateString() : '—';
    const personnel = [...new Set(tests.filter(t => t.tested_by).map(t => t.tested_by))];
    const testsWithComments = tests.filter(t => t.comments);

    return (
        <div className="coa-preview-page">
            <div className="coa-actions no-print">
                <button className="back-btn" onClick={onBack}>← Back to App</button>
                <button className="save-btn" onClick={() => window.print()}>🖨️ Print / Export PDF</button>
            </div>

            <div className="coa-document">
                {/* ── HEADER ────────────────────────────── */}
                <header className="coa-header">
                    <div className="company-info">
                        <div className="coa-logo">QL</div>
                        <div>
                            <h1>QLab Industries Ltd.</h1>
                            <p style={{ margin: 0, color: '#64748b' }}>Quality Assurance Department</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>ISO 9001:2015 Certified</p>
                        </div>
                    </div>
                    <div className="document-title">
                        <h2>CERTIFICATE OF ANALYSIS</h2>
                        <p style={{ margin: 0 }}>Document No: <strong>CoA-{lot.lot_number}</strong></p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Rev. 1.0</p>
                    </div>
                </header>

                {/* ── LOT SUMMARY ───────────────────────── */}
                <section className="coa-lot-summary">
                    <div className="summary-grid">
                        <div className="summary-item"><strong>Lot Number:</strong> {lot.lot_number}</div>
                        <div className="summary-item"><strong>Quality Number:</strong> {lot.quality_code}</div>
                        <div className="summary-item"><strong>Product Description:</strong> {productDesc || lot.quality_code}</div>
                        <div className="summary-item">
                            <strong>Overall Status:</strong>{' '}
                            <span className={allPass ? 'coa-pass-badge' : 'coa-fail-badge'}>{overallStatus}</span>
                        </div>
                        <div className="summary-item"><strong>Testing Period:</strong> {earliestDate} — {latestDate}</div>
                        <div className="summary-item"><strong>Date Issued:</strong> {new Date().toLocaleDateString()}</div>
                    </div>
                </section>

                {/* ── TEST RESULTS TABLE ─────────────────── */}
                <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                    Test Results
                </h3>
                <table className="coa-table">
                    <thead>
                        <tr>
                            <th>Test Method</th>
                            <th>Ref. Standard</th>
                            <th>Unit</th>
                            <th>Spec Limits</th>
                            <th>Actual Result</th>
                            <th>Verdict</th>
                            <th>Date</th>
                            <th>Tested By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tests.map(test => (
                            <tr key={test.test_method_id}>
                                <td><strong>{test.name}</strong><br/><span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{test.test_code}</span></td>
                                <td style={{ fontSize: '0.85rem' }}>{test.reference_standard || '—'}</td>
                                <td>{test.unit || '—'}</td>
                                <td>{test.method_type === 'Numeric' ? `${test.min_value ?? '—'} – ${test.max_value ?? '—'}` : 'Pass / Fail'}</td>
                                <td style={{ fontWeight: 700 }}>{test.numeric_result ?? test.observation_result ?? '—'}</td>
                                <td style={{ fontWeight: 700, color: test.result_status === 'Pass' ? '#059669' : '#dc2626' }}>
                                    {test.result_status?.toUpperCase() || 'PENDING'}
                                </td>
                                <td style={{ fontSize: '0.8rem' }}>{test.tested_at ? new Date(test.tested_at).toLocaleDateString() : '—'}</td>
                                <td style={{ fontSize: '0.8rem' }}>{test.tested_by || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ── PERSONNEL ──────────────────────────── */}
                <section style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                        Test Personnel
                    </h3>
                    <p style={{ fontSize: '0.9rem' }}>{personnel.length > 0 ? personnel.join(', ') : 'No personnel recorded'}</p>
                </section>

                {/* ── COMMENTS ───────────────────────────── */}
                {testsWithComments.length > 0 && (
                    <section style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                            Comments &amp; Remarks
                        </h3>
                        {testsWithComments.map(t => (
                            <p key={t.test_method_id} style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                <strong>{t.name}:</strong> {t.comments}
                            </p>
                        ))}
                    </section>
                )}

                {/* ── APPROVAL SIGNATURES ────────────────── */}
                <footer className="coa-footer">
                    <div className="signature-area">
                        <div className="signature-line">
                            <div style={{ height: 50 }}></div>
                            <p>Lab Manager</p>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Name / Signature / Date</p>
                        </div>
                        <div className="signature-line">
                            <div style={{ height: 50 }}></div>
                            <p>Quality Manager</p>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Approval Signature / Date</p>
                        </div>
                    </div>
                    <p className="coa-disclaimer">
                        This Certificate of Analysis is issued in accordance with recorded laboratory test data.
                        All tests performed under applicable ISO/ASTM standards. This document is electronically
                        generated and is valid without a physical signature unless otherwise required by customer agreement.
                    </p>
                </footer>
            </div>
        </div>
    );
}


// ─── Shared Components ───────────────────────────────────────
function StatCard({ label, value, color }: any) {
    return <div className="stat-card"><span className="stat-label">{label}</span><span className="stat-value" style={{ color }}>{value}</span></div>;
}

function TestCard({ test, onSave }: { test: TestItem; onSave: (val: any, comment?: string) => void }) {
    const [val, setVal] = useState(test.method_type === 'Numeric' ? test.numeric_result || '' : test.observation_result || '');
    const [comment, setComment] = useState(test.comments || '');
    const [showComment, setShowComment] = useState(false);
    return (
        <div className={`card test-entry-card ${test.result_status === 'Fail' ? 'test-fail' : ''}`}>
            <div className="test-card-header">
                <div><span className="test-code">{test.test_code}</span><h3 className="test-name">{test.name}</h3></div>
                {test.result_status && <span className={`status-badge status-${test.result_status.toLowerCase()}`}>{test.result_status}</span>}
            </div>
            <div className="test-spec-info">{test.method_type === 'Numeric' ? <>Spec: {test.min_value} – {test.max_value} {test.unit}</> : <>Spec: Pass/Fail</>}</div>
            <div className="test-input-area">
                {test.method_type === 'Numeric' ? (
                    <div className="input-group"><input type="number" value={val} onChange={e => setVal(e.target.value)} onBlur={() => val !== '' && onSave(Number(val), comment)} placeholder="Input Result" /><span className="unit">{test.unit}</span></div>
                ) : (
                    <div className="toggle-group">
                        <button className={`toggle-btn pass ${val === 'Pass' ? 'active' : ''}`} onClick={() => { setVal('Pass'); onSave('Pass', comment); }}>PASS</button>
                        <button className={`toggle-btn fail ${val === 'Fail' ? 'active' : ''}`} onClick={() => { setVal('Fail'); onSave('Fail', comment); }}>FAIL</button>
                    </div>
                )}
            </div>
            <div>
                <button className="comment-toggle" onClick={() => setShowComment(!showComment)}>{showComment ? '▲ Hide Comment' : '▼ Add Comment'}</button>
                {showComment && <textarea className="comment-box" value={comment} onChange={e => setComment(e.target.value)} placeholder="Optional notes..." rows={2} />}
            </div>
            {test.is_override && <div className="override-badge">⚠️ Overridden by {test.overridden_by}: {test.override_reason}</div>}
        </div>
    );
}
