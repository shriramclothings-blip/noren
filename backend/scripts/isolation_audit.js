'use strict';

/**
 * Data Isolation Audit Script
 *
 * Connects to the database and checks each major ERP table for rows
 * where business_id IS NULL — which indicates a data isolation breach.
 *
 * Usage:
 *   node backend/scripts/isolation_audit.js
 *
 * Exit codes:
 *   0 — all rows are properly scoped (no unscoped rows found)
 *   1 — one or more tables have rows with business_id IS NULL
 */

const { pool } = require('../config/db');

const TABLES = [
  'src_erp_inventory_items',
  'src_erp_sales',
  'src_erp_customers',
  'src_erp_suppliers',
  'src_erp_purchase_orders',
  'src_erp_returns',
  'src_erp_expenses',
  'src_erp_attendance',
  'src_erp_payroll',
];

const COL_WIDTH_TABLE  = 36;
const COL_WIDTH_COUNT  = 16;
const COL_WIDTH_STATUS = 12;

const pad = (str, width) => String(str).padEnd(width);
const lpad = (str, width) => String(str).padStart(width);

const divider = () =>
  `+-${'-'.repeat(COL_WIDTH_TABLE)}-+-${'-'.repeat(COL_WIDTH_COUNT)}-+-${'-'.repeat(COL_WIDTH_STATUS)}-+`;

const row = (table, count, status) =>
  `| ${pad(table, COL_WIDTH_TABLE)} | ${lpad(count, COL_WIDTH_COUNT)} | ${pad(status, COL_WIDTH_STATUS)} |`;

async function runAudit() {
  console.log('\n=== ERP Data Isolation Audit ===\n');

  const results = [];
  let hasUnscoped = false;

  for (const table of TABLES) {
    try {
      const res = await pool.query(
        `SELECT COUNT(*) AS cnt FROM ${table} WHERE business_id IS NULL`
      );
      const count = parseInt(res.rows[0].cnt, 10);
      const status = count === 0 ? 'OK' : 'UNSCOPED';
      if (count > 0) hasUnscoped = true;
      results.push({ table, count, status });
    } catch (err) {
      // Table may not exist yet (e.g. migration not run); treat as a warning
      const status = 'TABLE N/A';
      results.push({ table, count: 'N/A', status });
      console.warn(`  [WARN] Could not query ${table}: ${err.message}`);
    }
  }

  // Print summary table
  console.log(divider());
  console.log(row('Table', 'Unscoped Rows', 'Status'));
  console.log(divider());
  for (const r of results) {
    const statusLabel = r.status === 'OK' ? 'OK ✓' : r.status === 'TABLE N/A' ? 'N/A' : '⚠ UNSCOPED';
    console.log(row(r.table, r.count, statusLabel));
  }
  console.log(divider());

  const totalUnscoped = results
    .filter((r) => typeof r.count === 'number')
    .reduce((sum, r) => sum + r.count, 0);

  console.log();
  if (hasUnscoped) {
    console.log(`❌  Audit FAILED — ${totalUnscoped} unscoped row(s) found across the above tables.`);
    console.log('    Fix: populate the business_id column for the flagged rows.\n');
  } else {
    console.log('✅  Audit PASSED — all rows are properly scoped by business_id.\n');
  }

  await pool.end();
  process.exit(hasUnscoped ? 1 : 0);
}

runAudit().catch((err) => {
  console.error('Audit script error:', err.message);
  pool.end().catch(() => {});
  process.exit(1);
});
