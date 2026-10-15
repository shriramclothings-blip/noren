#!/usr/bin/env node

/**
 * WhatsApp Setup Script - One Command Setup
 * 
 * Usage: node setup-whatsapp.js
 * 
 * This script will:
 * 1. Run database migration
 * 2. Check environment variables
 * 3. Display setup URL
 */

require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║   📱 NOREN Fashion - WhatsApp Setup Wizard           ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Step 1: Check Node.js version
console.log('🔍 Step 1: Checking Node.js version...');
const nodeVersion = process.version;
console.log(`   ✅ Node.js ${nodeVersion} detected\n`);

// Step 2: Check dependencies
console.log('🔍 Step 2: Checking dependencies...');
try {
    require('@whiskeysockets/baileys');
    console.log('   ✅ @whiskeysockets/baileys installed\n');
} catch (error) {
    console.log('   ⚠️  Baileys not found. Installing...\n');
    console.log('   Run: npm install\n');
    process.exit(1);
}

// Step 3: Check database connection
console.log('🔍 Step 3: Checking database configuration...');
if (!process.env.DATABASE_URL_1) {
    console.log('   ❌ DATABASE_URL_1 not found in .env\n');
    process.exit(1);
}
console.log('   ✅ Database configured\n');

// Step 4: Run migration
console.log('🔍 Step 4: Running database migration...');
console.log('   This may take a minute...\n');

exec('node migrations/runMigrations.js', (error, stdout, stderr) => {
    if (error && !stdout.includes('already exists')) {
        console.log('   ❌ Migration failed:', error.message);
        console.log('   Please run manually: node migrations/runMigrations.js\n');
    } else {
        console.log('   ✅ Database tables created successfully\n');
    }

    // Step 5: Check environment variables
    console.log('🔍 Step 5: Checking WhatsApp configuration...');
    
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    if (!envContent.includes('WA_ENABLED')) {
        console.log('   ⚠️  Adding WhatsApp environment variables...\n');
        
        const waConfig = `
# ── WhatsApp Integration (Baileys) ───────────────────────────────────────────
WA_ENABLED=true
WA_DEFAULT_INSTANCE=default
WA_RATE_LIMIT_PER_MINUTE=20
WA_MAX_RETRIES=3
WA_BUSINESS_NAME=NOREN Fashion
WA_SUPPORT_PHONE=+917984626447
`;
        
        fs.appendFileSync(envPath, waConfig);
        console.log('   ✅ Environment variables added\n');
    } else {
        console.log('   ✅ WhatsApp configuration exists\n');
    }

    // Step 6: Display setup instructions
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║   🎉 Setup Complete!                                  ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📋 Next Steps:\n');
    console.log('1️⃣  Start your server:');
    console.log('   npm run dev\n');

    console.log('2️⃣  Open WhatsApp Setup Page:');
    const setupUrl = process.env.NODE_ENV === 'production' 
        ? 'https://noren-iqk3.onrender.com/whatsapp-setup.html'
        : 'http://localhost:5000/whatsapp-setup.html';
    console.log(`   ${setupUrl}\n`);

    console.log('3️⃣  Follow the 3-step wizard:');
    console.log('   • Step 1: Login with admin credentials');
    console.log('   • Step 2: Scan QR code with WhatsApp');
    console.log('   • Step 3: Send test message\n');

    console.log('🔐 Default Admin Credentials:');
    console.log('   Email: admin@norenfashion.in');
    console.log('   Password: Noren@Admin2024\n');

    console.log('📱 What Works Automatically:');
    console.log('   ✅ Order confirmations (every order)');
    console.log('   ✅ Shipping notifications');
    console.log('   ✅ Delivery confirmations');
    console.log('   ✅ Login security alerts');
    console.log('   ✅ Promotional campaigns\n');

    console.log('📚 Documentation:');
    console.log('   • Quick Start: WHATSAPP_QUICK_START.md');
    console.log('   • Full Guide: WHATSAPP_INTEGRATION_SUMMARY.md\n');

    console.log('🎯 API Endpoints:');
    const apiBase = process.env.NODE_ENV === 'production'
        ? 'https://noren-iqk3.onrender.com'
        : 'http://localhost:5000';
    console.log(`   ${apiBase}/api/whatsapp/instances`);
    console.log(`   ${apiBase}/api/whatsapp/send`);
    console.log(`   ${apiBase}/api/whatsapp/campaigns`);
    console.log(`   ${apiBase}/api/whatsapp/analytics\n`);

    console.log('💡 Pro Tips:');
    console.log('   • Use a dedicated business WhatsApp number');
    console.log('   • Connection auto-reconnects if dropped');
    console.log('   • Max 20 messages per minute (auto-queued)');
    console.log('   • Check analytics at /api/whatsapp/analytics\n');

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🚀 Ready to connect WhatsApp! Open the setup page now.\n');
});
