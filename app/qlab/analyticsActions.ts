"use server";

import { query } from '../lib/db';

// ─── Trend Analysis ──────────────────────────────────────────

export async function getTrendData(quality_code: string, test_method_id: number, dateFrom?: string, dateTo?: string) {
    let sql = `
        SELECT tr.tested_at, tr.numeric_result, tr.observation_result, tr.result_status,
               st.min_value, st.max_value, tl.lot_number,
               tm.name as test_name, tm.unit
        FROM test_results tr
        JOIN test_plans tp ON tr.test_plan_id = tp.id
        JOIN tp_lots tl ON tp.tp_skid = tl.tp_skid
        JOIN spec_tests st ON st.spec_id = tp.spec_id AND st.test_method_id = tr.test_method_id
        JOIN test_methods tm ON tr.test_method_id = tm.id
        WHERE tl.quality_code = $1 AND tr.test_method_id = $2
    `;
    const params: any[] = [quality_code, test_method_id];
    
    if (dateFrom) { params.push(dateFrom); sql += ` AND tr.tested_at >= $${params.length}::timestamp`; }
    if (dateTo) { params.push(dateTo); sql += ` AND tr.tested_at <= $${params.length}::timestamp + interval '1 day'`; }
    
    sql += ' ORDER BY tr.tested_at ASC';
    const res = await query(sql, params);
    
    return res.rows.map(r => ({
        date: new Date(r.tested_at).toLocaleDateString(),
        lot: r.lot_number,
        value: r.numeric_result,
        observation: r.observation_result,
        status: r.result_status,
        min: r.min_value,
        max: r.max_value,
        test_name: r.test_name,
        unit: r.unit
    }));
}

export async function getQualityMetrics() {
    const res = await query(`
        SELECT tl.quality_code, 
               COUNT(*) as total_lots,
               COUNT(CASE WHEN tp.status = 'Pass' THEN 1 END) as pass_count,
               COUNT(CASE WHEN tp.status = 'Failed' THEN 1 END) as fail_count
        FROM tp_lots tl
        JOIN test_plans tp ON tl.tp_skid = tp.tp_skid
        GROUP BY tl.quality_code
    `);
    return res.rows;
}

export async function getAvailableQualities() {
    const res = await query('SELECT DISTINCT quality_code FROM tp_lots ORDER BY quality_code');
    return res.rows.map(r => r.quality_code);
}

export async function getTestMethodsForQuality(quality_code: string) {
    const res = await query(`
        SELECT DISTINCT tm.id, tm.name, tm.test_code, tm.method_type, tm.unit
        FROM test_methods tm
        JOIN spec_tests st ON st.test_method_id = tm.id
        JOIN specifications s ON st.spec_id = s.id
        WHERE s.quality_code = $1 AND s.is_active = TRUE
        ORDER BY tm.name
    `, [quality_code]);
    return res.rows;
}

// ─── Failed Results Report ───────────────────────────────────

export async function getFailedResults(filters?: {
    dateFrom?: string;
    dateTo?: string;
    quality_code?: string;
    lot_number?: string;
    test_method_id?: number;
}) {
    let sql = `
        SELECT tr.id, tr.tested_at, tr.numeric_result, tr.observation_result, tr.result_status,
               tr.tested_by, tr.comments, tr.is_override, tr.override_reason,
               tl.lot_number, tl.quality_code,
               tm.id as method_id, tm.name as test_name, tm.test_code, tm.unit, tm.method_type,
               st.min_value, st.max_value,
               tp.status as lot_status
        FROM test_results tr
        JOIN test_plans tp ON tr.test_plan_id = tp.id
        JOIN tp_lots tl ON tp.tp_skid = tl.tp_skid
        JOIN test_methods tm ON tr.test_method_id = tm.id
        JOIN spec_tests st ON st.spec_id = tp.spec_id AND st.test_method_id = tm.id
        WHERE tr.result_status = 'Fail'
    `;
    const params: any[] = [];
    
    if (filters?.dateFrom) { params.push(filters.dateFrom); sql += ` AND tr.tested_at >= $${params.length}::timestamp`; }
    if (filters?.dateTo) { params.push(filters.dateTo); sql += ` AND tr.tested_at <= $${params.length}::timestamp + interval '1 day'`; }
    if (filters?.quality_code) { params.push(filters.quality_code); sql += ` AND tl.quality_code = $${params.length}`; }
    if (filters?.lot_number) { params.push(`%${filters.lot_number}%`); sql += ` AND tl.lot_number ILIKE $${params.length}`; }
    if (filters?.test_method_id) { params.push(filters.test_method_id); sql += ` AND tr.test_method_id = $${params.length}`; }
    
    sql += ' ORDER BY tr.tested_at DESC';
    const res = await query(sql, params);
    return res.rows;
}

export async function getAllTestMethods() {
    const res = await query('SELECT id, name, test_code FROM test_methods WHERE is_active = TRUE ORDER BY name');
    return res.rows;
}
