"use server";

import { query } from '../lib/db';

export async function getTrendData(quality_code: string, test_method_id: number) {
    const res = await query(`
        SELECT tr.tested_at, tr.numeric_result, st.min_value, st.max_value
        FROM test_results tr
        JOIN test_plans tp ON tr.test_plan_id = tp.id
        JOIN spec_tests st ON tp.spec_id = st.spec_id AND tr.test_method_id = st.test_method_id
        JOIN tp_lots tl ON tp.tp_skid = tl.tp_skid
        WHERE tl.quality_code = $1 AND tr.test_method_id = $2
        ORDER BY tr.tested_at ASC
    `, [quality_code, test_method_id]);
    
    return res.rows.map(r => ({
        date: new Date(r.tested_at).toLocaleDateString(),
        value: r.numeric_result,
        min: r.min_value,
        max: r.max_value
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
