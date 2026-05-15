"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Scatter, ScatterChart, ZAxis } from 'recharts';
import { getTrendData, getQualityMetrics, getAvailableQualities, getTestMethodsForQuality, getFailedResults, getAllTestMethods } from './analyticsActions';

type ReportTab = 'trends' | 'failures';

export default function ReportsView() {
    const [tab, setTab] = useState<ReportTab>('trends');
    return (
        <div>
            <div className="report-tabs">
                <button className={`report-tab ${tab === 'trends' ? 'active' : ''}`} onClick={() => setTab('trends')}>
                    📈 Trend Analysis
                </button>
                <button className={`report-tab ${tab === 'failures' ? 'active' : ''}`} onClick={() => setTab('failures')}>
                    ⚠️ Failed Results Report
                </button>
            </div>
            {tab === 'trends' ? <TrendAnalysis /> : <FailedResultsReport />}
        </div>
    );
}

// ─── 8.1 Trend Analysis ──────────────────────────────────────

function TrendAnalysis() {
    const [qualities, setQualities] = useState<string[]>([]);
    const [methods, setMethods] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(false);

    // Filters
    const [selQuality, setSelQuality] = useState('');
    const [selMethod, setSelMethod] = useState<number>(0);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Load initial data
    useEffect(() => {
        Promise.all([getAvailableQualities(), getQualityMetrics()]).then(([q, m]) => {
            setQualities(q);
            setMetrics(m);
            if (q.length > 0) setSelQuality(q[0]);
            setLoading(false);
        });
    }, []);

    // Load methods when quality changes
    useEffect(() => {
        if (selQuality) {
            getTestMethodsForQuality(selQuality).then(m => {
                setMethods(m);
                if (m.length > 0) setSelMethod(m[0].id);
            });
        }
    }, [selQuality]);

    // Load trend data when filters change
    const loadTrend = useCallback(() => {
        if (selQuality && selMethod) {
            setChartLoading(true);
            getTrendData(selQuality, selMethod, dateFrom || undefined, dateTo || undefined).then(d => {
                setTrendData(d);
                setChartLoading(false);
            });
        }
    }, [selQuality, selMethod, dateFrom, dateTo]);

    useEffect(() => { loadTrend(); }, [loadTrend]);

    if (loading) return <div className="loading">Loading analytics...</div>;

    const selMethodInfo = methods.find(m => m.id === selMethod);
    const oosCount = trendData.filter(d => d.status === 'Fail').length;

    return (
        <div>
            {/* Quality Metrics Summary */}
            <div className="stats-row">
                {metrics.map((m: any) => {
                    const rate = m.total_lots > 0 ? Math.round((m.pass_count / m.total_lots) * 100) : 0;
                    return (
                        <div key={m.quality_code} className="stat-card" style={{ cursor: 'pointer', border: selQuality === m.quality_code ? '2px solid var(--primary)' : undefined }}
                            onClick={() => setSelQuality(m.quality_code)}>
                            <span className="stat-label">{m.quality_code}</span>
                            <span className="stat-value" style={{ color: rate >= 90 ? 'var(--success)' : rate >= 70 ? 'var(--warning)' : 'var(--danger)' }}>{rate}%</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{m.total_lots} lots ({m.fail_count} failed)</span>
                        </div>
                    );
                })}
            </div>

            {/* Filter Controls */}
            <div className="card filter-bar">
                <div className="filter-row">
                    <div className="form-field">
                        <label>Quality Number</label>
                        <select value={selQuality} onChange={e => setSelQuality(e.target.value)}>
                            {qualities.map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                    </div>
                    <div className="form-field">
                        <label>Test Method</label>
                        <select value={selMethod} onChange={e => setSelMethod(+e.target.value)}>
                            {methods.map(m => <option key={m.id} value={m.id}>{m.name} ({m.test_code})</option>)}
                        </select>
                    </div>
                    <div className="form-field">
                        <label>Date From</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label>Date To</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Trend Chart */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 className="card-title" style={{ marginBottom: 0 }}>
                        {selQuality} — {selMethodInfo?.name || 'Select Test'} ({selMethodInfo?.unit || ''})
                    </h2>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                            {trendData.length} data points
                        </span>
                        {oosCount > 0 && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', background: '#fef2f2', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                                {oosCount} Out-of-Spec
                            </span>
                        )}
                    </div>
                </div>

                {chartLoading ? (
                    <div className="loading" style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading chart...</div>
                ) : trendData.length === 0 ? (
                    <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                        No data available for this selection. Try adjusting filters.
                    </div>
                ) : selMethodInfo?.method_type === 'Numeric' ? (
                    <div style={{ height: 350, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (!active || !payload?.length) return null;
                                        const d = payload[0].payload;
                                        return (
                                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                                <p style={{ fontWeight: 700, margin: 0 }}>{d.lot}</p>
                                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>Result: <strong style={{ color: d.status === 'Fail' ? '#ef4444' : '#0B77AA' }}>{d.value}</strong></p>
                                                <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>Spec: {d.min} – {d.max}</p>
                                                <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>Date: {d.date}</p>
                                                {d.status === 'Fail' && <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>⚠ OUT OF SPEC</p>}
                                            </div>
                                        );
                                    }}
                                />
                                <Legend />
                                {/* Spec Limit Lines */}
                                {trendData[0]?.min != null && (
                                    <ReferenceLine y={trendData[0].min} stroke="#ef4444" strokeDasharray="8 4" strokeWidth={1.5} label={{ value: `Min: ${trendData[0].min}`, position: 'insideBottomLeft', fill: '#ef4444', fontSize: 11 }} />
                                )}
                                {trendData[0]?.max != null && (
                                    <ReferenceLine y={trendData[0].max} stroke="#ef4444" strokeDasharray="8 4" strokeWidth={1.5} label={{ value: `Max: ${trendData[0].max}`, position: 'insideTopLeft', fill: '#ef4444', fontSize: 11 }} />
                                )}
                                {/* Result Line */}
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    name="Actual Result"
                                    stroke="#0B77AA"
                                    strokeWidth={2}
                                    dot={({ cx, cy, payload }: any) => (
                                        <circle
                                            key={`${cx}-${cy}`}
                                            cx={cx} cy={cy} r={payload.status === 'Fail' ? 6 : 4}
                                            fill={payload.status === 'Fail' ? '#ef4444' : '#0B77AA'}
                                            stroke={payload.status === 'Fail' ? '#fca5a5' : '#fff'}
                                            strokeWidth={payload.status === 'Fail' ? 3 : 2}
                                        />
                                    )}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    /* Observation Test - show pass/fail timeline */
                    <div style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {trendData.map((d, i) => (
                                <div key={i} title={`${d.lot} — ${d.date}`} style={{
                                    width: 40, height: 40, borderRadius: 8,
                                    background: d.observation === 'Pass' ? '#ecfdf5' : '#fef2f2',
                                    border: `2px solid ${d.observation === 'Pass' ? '#10b981' : '#ef4444'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.7rem', fontWeight: 700, color: d.observation === 'Pass' ? '#047857' : '#b91c1c'
                                }}>
                                    {d.observation === 'Pass' ? '✓' : '✗'}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Data Table */}
            {trendData.length > 0 && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <h2 className="card-title">Raw Data</h2>
                    <table className="lot-table">
                        <thead>
                            <tr><th>Date</th><th>Lot</th><th>Result</th><th>Min</th><th>Max</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            {trendData.map((d, i) => (
                                <tr key={i} style={{ background: d.status === 'Fail' ? '#fef2f2' : undefined }}>
                                    <td>{d.date}</td>
                                    <td><strong>{d.lot}</strong></td>
                                    <td style={{ fontWeight: 700, color: d.status === 'Fail' ? 'var(--danger)' : undefined }}>
                                        {d.value ?? d.observation}
                                    </td>
                                    <td>{d.min ?? '—'}</td>
                                    <td>{d.max ?? '—'}</td>
                                    <td><span className={`status-badge status-${d.status?.toLowerCase()}`}>{d.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── 8.2 Failed Results Report ───────────────────────────────

function FailedResultsReport() {
    const [results, setResults] = useState<any[]>([]);
    const [allMethods, setAllMethods] = useState<any[]>([]);
    const [qualities, setQualities] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selQuality, setSelQuality] = useState('');
    const [lotSearch, setLotSearch] = useState('');
    const [selMethodId, setSelMethodId] = useState<number>(0);

    const loadData = useCallback(() => {
        setLoading(true);
        getFailedResults({
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            quality_code: selQuality || undefined,
            lot_number: lotSearch || undefined,
            test_method_id: selMethodId || undefined,
        }).then(d => {
            setResults(d);
            setLoading(false);
        });
    }, [dateFrom, dateTo, selQuality, lotSearch, selMethodId]);

    useEffect(() => {
        Promise.all([getAvailableQualities(), getAllTestMethods()]).then(([q, m]) => {
            setQualities(q);
            setAllMethods(m);
        });
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const exportCSV = () => {
        if (results.length === 0) return alert('No data to export');
        const headers = ['Date', 'Lot Number', 'Quality Code', 'Test Method', 'Test Code', 'Unit', 'Spec Min', 'Spec Max', 'Actual Result', 'Status', 'Tested By', 'Comments', 'Override', 'Override Reason'];
        const rows = results.map(r => [
            r.tested_at ? new Date(r.tested_at).toLocaleDateString() : '',
            r.lot_number, r.quality_code, r.test_name, r.test_code, r.unit || '',
            r.min_value ?? '', r.max_value ?? '',
            r.numeric_result ?? r.observation_result ?? '', r.result_status,
            r.tested_by || '', r.comments || '',
            r.is_override ? 'Yes' : 'No', r.override_reason || ''
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `failed_results_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            {/* Summary Stats */}
            <div className="stats-row">
                <div className="stat-card">
                    <span className="stat-label">Total Failures</span>
                    <span className="stat-value" style={{ color: 'var(--danger)' }}>{results.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Unique Lots</span>
                    <span className="stat-value">{new Set(results.map(r => r.lot_number)).size}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Qualities Affected</span>
                    <span className="stat-value" style={{ color: 'var(--warning)' }}>{new Set(results.map(r => r.quality_code)).size}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Overrides Applied</span>
                    <span className="stat-value">{results.filter(r => r.is_override).length}</span>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="card filter-bar">
                <div className="filter-row">
                    <div className="form-field">
                        <label>Date From</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label>Date To</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label>Quality Number</label>
                        <select value={selQuality} onChange={e => setSelQuality(e.target.value)}>
                            <option value="">All Qualities</option>
                            {qualities.map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                    </div>
                    <div className="form-field">
                        <label>Search Lot</label>
                        <input value={lotSearch} onChange={e => setLotSearch(e.target.value)} placeholder="e.g. LOT-2026" />
                    </div>
                    <div className="form-field">
                        <label>Test Method</label>
                        <select value={selMethodId} onChange={e => setSelMethodId(+e.target.value)}>
                            <option value={0}>All Methods</option>
                            {allMethods.map(m => <option key={m.id} value={m.id}>{m.name} ({m.test_code})</option>)}
                        </select>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem', gap: '0.75rem' }}>
                    <button className="action-btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); setSelQuality(''); setLotSearch(''); setSelMethodId(0); }}>
                        Clear Filters
                    </button>
                    <button className="save-btn" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem' }} onClick={exportCSV}>
                        📥 Export CSV
                    </button>
                </div>
            </div>

            {/* Results Table */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <h2 className="card-title">Failed Test Results ({results.length})</h2>
                {loading ? (
                    <div className="loading">Loading...</div>
                ) : results.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                        No failed results match the current filters. ✨
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="lot-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Lot Number</th>
                                    <th>Quality</th>
                                    <th>Test Method</th>
                                    <th>Spec Limits</th>
                                    <th>Actual Result</th>
                                    <th>Tested By</th>
                                    <th>Comments</th>
                                    <th>Override</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((r, i) => (
                                    <tr key={i} style={{ background: r.is_override ? '#fffbeb' : undefined }}>
                                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                            {r.tested_at ? new Date(r.tested_at).toLocaleDateString() : '—'}
                                        </td>
                                        <td><strong>{r.lot_number}</strong></td>
                                        <td>{r.quality_code}</td>
                                        <td>
                                            {r.test_name}
                                            <span className="test-code" style={{ marginLeft: 4 }}>{r.test_code}</span>
                                        </td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                            {r.method_type === 'Numeric' ? `${r.min_value ?? '—'} – ${r.max_value ?? '—'} ${r.unit || ''}` : 'Pass/Fail'}
                                        </td>
                                        <td style={{ fontWeight: 700, color: 'var(--danger)' }}>
                                            {r.numeric_result ?? r.observation_result}
                                        </td>
                                        <td style={{ fontSize: '0.8rem' }}>{r.tested_by || '—'}</td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {r.comments || '—'}
                                        </td>
                                        <td>
                                            {r.is_override ? (
                                                <span style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 700 }}>
                                                    ⚠ Overridden
                                                </span>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
