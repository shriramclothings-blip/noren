/**
 * POS Daily Sales Summary Job
 * 
 * Scheduled job that sends daily sales summary emails to admins.
 * Runs every day at 8 PM to summarize the day's POS sales.
 * 
 * Usage:
 * - Automatic: Runs via cron scheduler in server.js
 * - Manual: node jobs/posDailySummaryJob.js
 */

const cron = require('node-cron');
const { generateDailySalesSummary } = require('../services/posServiceIntegration');

/**
 * Execute the daily summary job
 */
async function executeDailySummary() {
  const startTime = Date.now();
  console.log('[POS Daily Summary] Job started at', new Date().toISOString());

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = await generateDailySalesSummary(yesterday);

    if (result.success) {
      console.log(`[POS Daily Summary] ✓ Summary sent to ${result.recipientCount} admins`);
      console.log(`[POS Daily Summary] Completed in ${Date.now() - startTime}ms`);
    } else {
      console.log(`[POS Daily Summary] Skipped: ${result.reason}`);
    }

    return result;
  } catch (error) {
    console.error('[POS Daily Summary] Job failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Schedule the job to run daily at 8 PM
 */
function scheduleDailySummary() {
  // Cron expression: "0 20 * * *" = Every day at 8:00 PM
  const schedule = '0 20 * * *';

  const job = cron.schedule(schedule, async () => {
    console.log('[POS Daily Summary] Cron trigger');
    await executeDailySummary();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata' // IST timezone
  });

  console.log(`[POS Daily Summary] Scheduled to run daily at 8:00 PM IST`);

  return job;
}

/**
 * Stop the scheduled job
 */
function stopDailySummary(job) {
  if (job) {
    job.stop();
    console.log('[POS Daily Summary] Job stopped');
  }
}

// If running directly (node jobs/posDailySummaryJob.js), execute immediately
if (require.main === module) {
  console.log('[POS Daily Summary] Running in direct mode...');
  executeDailySummary()
    .then(result => {
      console.log('[POS Daily Summary] Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('[POS Daily Summary] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = {
  executeDailySummary,
  scheduleDailySummary,
  stopDailySummary
};
