"use server";

import { query } from '../lib/db';

export async function getFailedResults() {
    const res = await query(`
        SELECT tr.tested_at, tl.lot_number, tl.quality_code, tm.name as test_name, tr.numeric_result, tr.observation_result, tr.result_status, tr.tested_by
        FROM test_results tr
        JOIN test_plans tp ON tr.test_plan_id = tp.id
        JOIN tp_lots tl ON tp.tp_skid = tl.tp_skid
        JOIN test_methods tm ON tr.test_method_id = tm.id
        WHERE tr.result_status = 'Fail'
        ORDER BY tr.tested_at DESC
    `);
    return res.rows;
}
