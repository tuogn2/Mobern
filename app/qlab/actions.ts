"use server";

import { query } from '../lib/db';
import { revalidatePath } from 'next/cache';

type Status = 'Pending' | 'In Progress' | 'Pass' | 'Failed';

// ─── SYNC & LOTS ─────────────────────────────────────────────

export async function syncTestPlans() {
    const missingLots = await query(`
        SELECT ps.lot_number, ps.quality_number, ps.schedule_id
        FROM production_schedule ps
        LEFT JOIN tp_lots tl ON ps.lot_number = tl.lot_number
        LEFT JOIN test_plans tp ON tl.tp_skid = tp.tp_skid
        WHERE tp.id IS NULL
    `);
    for (const lot of missingLots.rows) {
        let tp_skid;
        const existingLot = await query('SELECT tp_skid FROM tp_lots WHERE lot_number = $1', [lot.lot_number]);
        if (existingLot.rows.length === 0) {
            const newLot = await query('INSERT INTO tp_lots (quality_code, lot_number) VALUES ($1, $2) RETURNING tp_skid', [lot.quality_number, lot.lot_number]);
            tp_skid = newLot.rows[0].tp_skid;
        } else {
            tp_skid = existingLot.rows[0].tp_skid;
        }
        const spec = await query('SELECT id FROM specifications WHERE quality_code = $1 AND is_active = TRUE ORDER BY version DESC LIMIT 1', [lot.quality_number]);
        if (spec.rows.length > 0) {
            await query('INSERT INTO test_plans (tp_skid, spec_id, status) VALUES ($1, $2, $3)', [tp_skid, spec.rows[0].id, 'Pending']);
        }
    }
}

export async function getLots() {
    await syncTestPlans();
    const res = await query(`
        SELECT tp.id as plan_id, tl.tp_skid, tl.lot_number, tl.quality_code, tp.status, tp.created_at
        FROM test_plans tp
        JOIN tp_lots tl ON tp.tp_skid = tl.tp_skid
        ORDER BY tp.created_at DESC
    `);
    return res.rows;
}

export async function getProductDescription(quality_code: string) {
    const res = await query('SELECT description FROM product_qualities WHERE quality_number = $1', [quality_code]);
    return res.rows[0]?.description || '';
}

export async function getLotTests(plan_id: number) {

    const res = await query(`
        SELECT st.id as spec_test_id, st.min_value, st.max_value,
               tm.id as test_method_id, tm.name, tm.test_code, tm.unit, tm.method_type, tm.reference_standard,
               tr.id as result_id, tr.numeric_result, tr.observation_result, tr.result_status,
               tr.tested_by, tr.tested_at, tr.comments,
               tr.is_override, tr.overridden_by, tr.overridden_at, tr.override_reason
        FROM spec_tests st
        JOIN test_methods tm ON st.test_method_id = tm.id
        JOIN test_plans tp ON st.spec_id = tp.spec_id
        LEFT JOIN test_results tr ON tr.test_plan_id = tp.id AND tr.test_method_id = tm.id
        WHERE tp.id = $1
    `, [plan_id]);
    return res.rows;
}

// ─── SAVE / OVERRIDE RESULTS ─────────────────────────────────

export async function saveTestResult(data: {
    plan_id: number;
    method_id: number;
    value: number | string;
    type: 'Numeric' | 'Observation';
    min?: number;
    max?: number;
    tester: string;
    comment?: string;
}) {
    let status: 'Pass' | 'Fail' = 'Pass';
    if (data.type === 'Numeric') {
        const val = Number(data.value);
        if (data.min !== undefined && val < data.min) status = 'Fail';
        if (data.max !== undefined && val > data.max) status = 'Fail';
    } else {
        status = data.value === 'Pass' ? 'Pass' : 'Fail';
    }

    await query(`
        INSERT INTO test_results (test_plan_id, test_method_id, numeric_result, observation_result, result_status, test_status, tested_by, tested_at, comments)
        VALUES ($1, $2, $3, $4, $5, 'Completed', $6, CURRENT_TIMESTAMP, $7)
        ON CONFLICT (test_plan_id, test_method_id) DO UPDATE SET
            numeric_result = EXCLUDED.numeric_result,
            observation_result = EXCLUDED.observation_result,
            result_status = EXCLUDED.result_status,
            tested_by = EXCLUDED.tested_by,
            tested_at = EXCLUDED.tested_at,
            comments = EXCLUDED.comments
    `, [
        data.plan_id, data.method_id,
        data.type === 'Numeric' ? data.value : null,
        data.type === 'Observation' ? data.value : null,
        status, data.tester, data.comment || null
    ]);

    await updateLotStatus(data.plan_id);
    revalidatePath('/qlab');
    return { success: true, status };
}

export async function overrideTestResult(data: {
    result_id: number;
    plan_id: number;
    method_id: number;
    new_value: number | string;
    type: 'Numeric' | 'Observation';
    min?: number;
    max?: number;
    overrider: string;
    reason: string;
}) {
    let status: 'Pass' | 'Fail' = 'Pass';
    if (data.type === 'Numeric') {
        const val = Number(data.new_value);
        if (data.min !== undefined && val < data.min) status = 'Fail';
        if (data.max !== undefined && val > data.max) status = 'Fail';
    } else {
        status = data.new_value === 'Pass' ? 'Pass' : 'Fail';
    }

    await query(`
        UPDATE test_results SET
            numeric_result = $1, observation_result = $2, result_status = $3,
            is_override = TRUE, overridden_by = $4, overridden_at = CURRENT_TIMESTAMP, override_reason = $5
        WHERE id = $6
    `, [
        data.type === 'Numeric' ? data.new_value : null,
        data.type === 'Observation' ? data.new_value : null,
        status, data.overrider, data.reason, data.result_id
    ]);

    await updateLotStatus(data.plan_id);
    revalidatePath('/qlab');
    return { success: true, status };
}

async function updateLotStatus(plan_id: number) {
    const results = await query('SELECT result_status FROM test_results WHERE test_plan_id = $1', [plan_id]);
    const totalRequired = await query('SELECT COUNT(*) FROM spec_tests st JOIN test_plans tp ON st.spec_id = tp.spec_id WHERE tp.id = $1', [plan_id]);
    const reqCount = parseInt(totalRequired.rows[0].count);
    const resCount = results.rows.length;
    let newStatus: Status = 'In Progress';
    if (results.rows.some(r => r.result_status === 'Fail')) newStatus = 'Failed';
    else if (resCount === reqCount && reqCount > 0) newStatus = 'Pass';
    else if (resCount === 0) newStatus = 'Pending';
    await query('UPDATE test_plans SET status = $1 WHERE id = $2', [newStatus, plan_id]);
}

// ─── TEST METHODS CRUD ───────────────────────────────────────

export async function getTestMethods() {
    const res = await query('SELECT * FROM test_methods ORDER BY id ASC');
    return res.rows;
}

export async function createTestMethod(data: { name: string; test_code: string; unit: string; method_type: string; reference_standard: string }) {
    await query(
        'INSERT INTO test_methods (name, test_code, unit, method_type, reference_standard, is_active) VALUES ($1, $2, $3, $4, $5, TRUE)',
        [data.name, data.test_code, data.unit, data.method_type, data.reference_standard]
    );
    revalidatePath('/qlab');
    return { success: true };
}

export async function updateTestMethod(id: number, data: { name: string; test_code: string; unit: string; method_type: string; reference_standard: string }) {
    await query(
        'UPDATE test_methods SET name=$1, test_code=$2, unit=$3, method_type=$4, reference_standard=$5 WHERE id=$6',
        [data.name, data.test_code, data.unit, data.method_type, data.reference_standard, id]
    );
    revalidatePath('/qlab');
    return { success: true };
}

export async function toggleTestMethodActive(id: number, is_active: boolean) {
    await query('UPDATE test_methods SET is_active = $1 WHERE id = $2', [is_active, id]);
    revalidatePath('/qlab');
    return { success: true };
}

// ─── SPECIFICATIONS CRUD ─────────────────────────────────────

export async function getSpecifications() {
    const res = await query(`
        SELECT s.*, 
            (SELECT json_agg(json_build_object('st_id', st.id, 'method_id', tm.id, 'method_name', tm.name, 'test_code', tm.test_code, 'unit', tm.unit, 'method_type', tm.method_type, 'min_value', st.min_value, 'max_value', st.max_value))
             FROM spec_tests st JOIN test_methods tm ON st.test_method_id = tm.id WHERE st.spec_id = s.id) as tests
        FROM specifications s ORDER BY s.quality_code, s.version DESC
    `);
    return res.rows;
}

export async function createSpecification(data: { quality_code: string; tests: { method_id: number; min_value: number | null; max_value: number | null }[] }) {
    // Get next version
    const verRes = await query('SELECT COALESCE(MAX(version), 0) + 1 as next FROM specifications WHERE quality_code = $1', [data.quality_code]);
    const nextVer = verRes.rows[0].next;
    // Deactivate old specs for this quality
    await query('UPDATE specifications SET is_active = FALSE WHERE quality_code = $1', [data.quality_code]);
    // Create new
    const specRes = await query('INSERT INTO specifications (quality_code, version, is_active) VALUES ($1, $2, TRUE) RETURNING id', [data.quality_code, nextVer]);
    const specId = specRes.rows[0].id;
    for (const t of data.tests) {
        await query('INSERT INTO spec_tests (spec_id, test_method_id, min_value, max_value) VALUES ($1, $2, $3, $4)', [specId, t.method_id, t.min_value, t.max_value]);
    }
    revalidatePath('/qlab');
    return { success: true };
}

// ─── REVIEW RESULTS (ALL) ────────────────────────────────────

export async function getAllResults() {
    const res = await query(`
        SELECT tr.*, tl.lot_number, tl.quality_code, tm.name as test_name, tm.test_code, tm.unit, tm.method_type,
               tp.status as lot_status, tp.id as plan_id,
               st.min_value, st.max_value
        FROM test_results tr
        JOIN test_plans tp ON tr.test_plan_id = tp.id
        JOIN tp_lots tl ON tp.tp_skid = tl.tp_skid
        JOIN test_methods tm ON tr.test_method_id = tm.id
        JOIN spec_tests st ON st.spec_id = tp.spec_id AND st.test_method_id = tm.id
        ORDER BY tr.tested_at DESC
    `);
    return res.rows;
}

// ─── AUDIT LOG ───────────────────────────────────────────────

export async function getAuditLog() {
    const res = await query(`
        SELECT tr.tested_at, tr.tested_by, tr.result_status, tr.is_override, tr.overridden_by, tr.overridden_at, tr.override_reason,
               tr.numeric_result, tr.observation_result,
               tl.lot_number, tl.quality_code, tm.name as test_name
        FROM test_results tr
        JOIN test_plans tp ON tr.test_plan_id = tp.id
        JOIN tp_lots tl ON tp.tp_skid = tl.tp_skid
        JOIN test_methods tm ON tr.test_method_id = tm.id
        ORDER BY COALESCE(tr.overridden_at, tr.tested_at) DESC
    `);
    return res.rows;
}
