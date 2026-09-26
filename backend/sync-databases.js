const { Pool } = require('pg');
require('dotenv').config();

// ═══════════════════════════════════════════════════════════════════════════════
//  DATABASE SYNCHRONIZATION SCRIPT
//  Copies critical data from primary DB to replica DBs
//  Run this manually when you need to sync databases
// ═══════════════════════════════════════════════════════════════════════════════

const RAW_URLS = [
  process.env.DATABASE_URL_1,
  process.env.DATABASE_URL_2,
  process.env.DATABASE_URL_3,
].filter(Boolean);

function cleanUrl(raw) {
  return raw
    .replace(/[?&]sslmode=[^&]*/g, '')
    .replace(/[?&]channel_binding=[^&]*/g, '')
    .replace(/\?&/, '?')
    .replace(/[?&]+$/, '');
}

function makePool(url) {
  return new Pool({
    connectionString: cleanUrl(url),
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });
}

// Tables to sync (in order of dependencies)
const SYNC_TABLES = [
  // Core tables (no dependencies)
  'src_settings',
  'src_businesses',
  
  // User-related tables
  'src_stores',
  'src_warehouses',
  'src_users',
  'src_password_resets',
  'src_recovery_keys',
  'src_admin_recovery_queries',
  'src_login_sessions',
  
  // Business data
  'src_categories',
  'src_addresses',
  'src_coupons',
  'src_domains',
  'src_permissions',
  'src_role_permissions',
  
  // Product data (depends on categories, users)
  'src_products',
  'src_product_images',
  'src_product_variants',
  
  // Customer interaction data
  'src_cart',
  'src_wishlist',
  'src_queries',
  'src_reviews',
  'src_notifications',
  'src_push_subscriptions',
  
  // Order data
  'src_orders',
  'src_order_items',
  'src_payments',
  'src_tracking_logs',
  
  // ERP data
  'src_erp_brands',
  'src_erp_customers',
  'src_erp_suppliers',
  'src_erp_inventory_items',
  'src_erp_inventory_movements',
  'src_erp_sales',
  'src_erp_sale_items',
  'src_erp_pos_holds',
  'src_erp_pos_sessions',
  'src_erp_expenses',
  'src_erp_attendance',
  'src_erp_payroll',
  'src_erp_purchase_orders',
  'src_erp_purchase_items',
  'src_erp_returns',
  'src_erp_return_items',
  
  // Admin/content data
  'src_banners',
  'src_homepage_sections',
  'src_homepage_settings',
  'src_reels',
  'src_admin_cloud_folders',
  'src_admin_cloud_files',
  'src_admin_cloud_history',
  'src_activity_logs',
  'src_footer_settings',
  'src_newsletter_subscribers',
  'src_utm_links',
  'src_utm_clicks',
  
  // Communication data
  'src_internal_chat_messages',
  'src_private_chat_threads',
  'src_private_chat_messages',
  'src_internal_meetings',
  'src_notification_campaigns',
  'src_cart_reminders',
  'src_social_media_blobs'
];

async function getTableColumns(client, tableName) {
  const result = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

async function tableExists(client, tableName) {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = $1
    )
  `, [tableName]);
  return result.rows[0].exists;
}

async function syncTable(sourcePool, targetPool, tableName) {
  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();
  
  try {
    // Check if table exists in both databases
    const sourceExists = await tableExists(sourceClient, tableName);
    const targetExists = await tableExists(targetClient, tableName);
    
    if (!sourceExists) {
      console.log(`⏭️  Skipping ${tableName} (not in source)`);
      return { synced: false, reason: 'not_in_source' };
    }
    
    if (!targetExists) {
      console.log(`⏭️  Skipping ${tableName} (not in target)`);
      return { synced: false, reason: 'not_in_target' };
    }
    
    // Get row counts
    const sourceCount = await sourceClient.query(`SELECT COUNT(*) FROM ${tableName}`);
    const targetCount = await targetClient.query(`SELECT COUNT(*) FROM ${tableName}`);
    
    const sourceRows = parseInt(sourceCount.rows[0].count);
    const targetRows = parseInt(targetCount.rows[0].count);
    
    console.log(`📊 ${tableName}: Source=${sourceRows}, Target=${targetRows}`);
    
    if (sourceRows === 0) {
      console.log(`⏭️  Skipping ${tableName} (empty source)`);
      return { synced: false, reason: 'empty_source' };
    }
    
    // Get all columns
    const columns = await getTableColumns(sourceClient, tableName);
    const columnNames = columns.map(col => col.column_name);
    
    // Fetch all data from source
    const sourceData = await sourceClient.query(`SELECT * FROM ${tableName}`);
    
    if (sourceData.rows.length === 0) {
      return { synced: true, rowsCopied: 0 };
    }
    
    // Begin transaction on target
    await targetClient.query('BEGIN');
    
    try {
      // Clear target table
      await targetClient.query(`TRUNCATE ${tableName} RESTART IDENTITY CASCADE`);
      console.log(`🗑️  Cleared ${tableName} in target`);
      
      // Insert data in batches
      const batchSize = 100;
      let copiedRows = 0;
      
      for (let i = 0; i < sourceData.rows.length; i += batchSize) {
        const batch = sourceData.rows.slice(i, i + batchSize);
        
        for (const row of batch) {
          const values = columnNames.map(col => row[col]);
          const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
          
          await targetClient.query(
            `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${placeholders})`,
            values
          );
          copiedRows++;
        }
        
        console.log(`   Copied ${Math.min(i + batchSize, sourceData.rows.length)}/${sourceData.rows.length} rows...`);
      }
      
      await targetClient.query('COMMIT');
      console.log(`✅ ${tableName}: Copied ${copiedRows} rows`);
      
      return { synced: true, rowsCopied: copiedRows };
    } catch (err) {
      await targetClient.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(`❌ Error syncing ${tableName}:`, err.message);
    return { synced: false, error: err.message };
  } finally {
    sourceClient.release();
    targetClient.release();
  }
}

async function syncDatabases(sourceIndex = 0, targetIndices = [1, 2]) {
  console.log('\n🔄 Starting Full Database Synchronization\n');
  console.log(`Source: DB${sourceIndex + 1}`);
  console.log(`Targets: ${targetIndices.map(i => `DB${i + 1}`).join(', ')}\n`);
  
  if (!RAW_URLS[sourceIndex]) {
    console.error(`❌ Source database DB${sourceIndex + 1} not configured`);
    return;
  }
  
  const sourcePool = makePool(RAW_URLS[sourceIndex]);
  
  for (const targetIndex of targetIndices) {
    if (!RAW_URLS[targetIndex]) {
      console.warn(`⚠️  Target database DB${targetIndex + 1} not configured, skipping`);
      continue;
    }
    
    console.log(`\n═══════════════════════════════════════════════════════`);
    console.log(`   Syncing DB${sourceIndex + 1} → DB${targetIndex + 1}`);
    console.log(`═══════════════════════════════════════════════════════\n`);
    
    const targetPool = makePool(RAW_URLS[targetIndex]);
    
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      totalRows: 0
    };
    
    for (const tableName of SYNC_TABLES) {
      const result = await syncTable(sourcePool, targetPool, tableName);
      
      if (result.synced) {
        results.success++;
        results.totalRows += result.rowsCopied || 0;
      } else if (result.error) {
        results.failed++;
      } else {
        results.skipped++;
      }
    }
    
    await targetPool.end();
    
    console.log(`\n✅ Sync DB${sourceIndex + 1} → DB${targetIndex + 1} completed:`);
    console.log(`   Success: ${results.success} tables`);
    console.log(`   Failed: ${results.failed} tables`);
    console.log(`   Skipped: ${results.skipped} tables`);
    console.log(`   Total rows copied: ${results.totalRows}`);
  }
  
  await sourcePool.end();
  console.log('\n✅ All database synchronization completed!\n');
}

// Run sync if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Database Synchronization Script
Usage: node sync-databases.js [options]

Options:
  --source <1|2|3>     Source database (default: 1)
  --targets <1,2,3>    Target databases (default: 2,3)
  --help, -h           Show this help

Examples:
  node sync-databases.js                    # Sync DB1 → DB2, DB3
  node sync-databases.js --source 1         # Same as above
  node sync-databases.js --targets 2        # Sync DB1 → DB2 only
  node sync-databases.js --source 2 --targets 1,3  # Sync DB2 → DB1, DB3
    `);
    process.exit(0);
  }
  
  let sourceIndex = 0;
  let targetIndices = [1, 2];
  
  const sourceArg = args.indexOf('--source');
  if (sourceArg !== -1 && args[sourceArg + 1]) {
    sourceIndex = parseInt(args[sourceArg + 1]) - 1;
  }
  
  const targetsArg = args.indexOf('--targets');
  if (targetsArg !== -1 && args[targetsArg + 1]) {
    targetIndices = args[targetsArg + 1].split(',').map(i => parseInt(i.trim()) - 1);
  }
  
  syncDatabases(sourceIndex, targetIndices)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { syncDatabases };
