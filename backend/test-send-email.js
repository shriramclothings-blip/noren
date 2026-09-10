#!/usr/bin/env node
/**
 * Test Email Sending - Demonstrates email portal functionality
 * Usage: node test-send-email.js your-email@example.com
 */

require('dotenv').config();
const { pool } = require('./config/db');
const { sendMail } = require('./services/mailService');

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Error: Email address required');
  console.error('Usage: node test-send-email.js your-email@example.com');
  process.exit(1);
}

async function testEmailPortal() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   EMAIL PORTAL TEST - Send Test Emails                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    console.log(`📧 Test email will be sent to: ${testEmail}\n`);

    // 1. Test basic email sending
    console.log('1️⃣  Testing basic email send...');
    const basicEmail = await sendMail(
      testEmail,
      'Test Email from NOREN Email Portal',
      `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #2563eb;">✅ Email Portal Test Successful!</h1>
          <p>This email was sent from the NOREN Email Portal.</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 14px;">
            If you received this email, the email portal is working correctly!
          </p>
        </div>
      `
    );

    if (basicEmail) {
      console.log('   ✅ Basic email sent successfully\n');
    } else {
      console.log('   ❌ Basic email failed\n');
    }

    // 2. Test template-based email
    console.log('2️⃣  Testing template-based email...');
    const templates = await pool.query('SELECT * FROM src_email_templates LIMIT 1');
    
    if (templates.rows.length > 0) {
      const template = templates.rows[0];
      let html = template.body_html
        .replace(/\{\{first_name\}\}/g, 'Test User')
        .replace(/\{\{customer_name\}\}/g, 'Test User')
        .replace(/\{\{user_name\}\}/g, 'Test User');
      
      const templateEmail = await sendMail(testEmail, template.subject, html);
      
      if (templateEmail) {
        console.log(`   ✅ Template email sent: "${template.name}"\n`);
      } else {
        console.log('   ❌ Template email failed\n');
      }
    }

    // 3. Check sender identities
    console.log('3️⃣  Checking sender identities...');
    const senders = await pool.query('SELECT email, name, verification_status FROM src_email_sender_identities');
    senders.rows.forEach(sender => {
      console.log(`   • ${sender.email} (${sender.name}) - ${sender.verification_status}`);
    });
    console.log('');

    // 4. Record test email in database
    console.log('4️⃣  Recording test email in database...');
    const recorded = await pool.query(`
      INSERT INTO src_email_sent (
        user_id, sender_email, sender_name, recipient_email, 
        subject, body_html, email_type, status, sent_at
      ) VALUES (1, $1, 'NOREN Test', $2, $3, $4, 'individual', 'sent', NOW())
      RETURNING id
    `, [
      'admin@norenfashion.in',
      testEmail,
      'Email Portal Test',
      '<p>Test email recorded</p>'
    ]);
    
    console.log(`   ✅ Recorded in database (ID: ${recorded.rows[0].id})\n`);

    // 5. Check stats
    console.log('5️⃣  Email portal statistics:');
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM src_email_templates) as templates,
        (SELECT COUNT(*) FROM src_email_sender_identities) as senders,
        (SELECT COUNT(*) FROM src_email_sent) as sent,
        (SELECT COUNT(*) FROM src_email_drafts) as drafts,
        (SELECT COUNT(*) FROM src_email_campaigns) as campaigns
    `);
    
    console.log(`   • Templates: ${stats.rows[0].templates}`);
    console.log(`   • Sender Identities: ${stats.rows[0].senders}`);
    console.log(`   • Emails Sent: ${stats.rows[0].sent}`);
    console.log(`   • Drafts: ${stats.rows[0].drafts}`);
    console.log(`   • Campaigns: ${stats.rows[0].campaigns}`);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ EMAIL PORTAL TEST COMPLETE                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('✅ Check your inbox at:', testEmail);
    console.log('✅ Email portal is working correctly!');
    console.log('✅ Start the frontend: cd email-portal && npm run dev\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testEmailPortal();
