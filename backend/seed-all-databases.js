#!/usr/bin/env node
/**
 * Seed ALL production databases with email portal data
 */

require('dotenv').config();
const { Client } = require('pg');

const TEMPLATES = [
  {
    name: 'Welcome Email',
    slug: 'welcome-email',
    subject: 'Welcome to {{company_name}}!',
    body_html: '<h1>Welcome {{name}}!</h1><p>Thank you for joining us.</p>',
    category: 'transactional'
  },
  {
    name: 'Order Confirmation',
    slug: 'order-confirmation',
    subject: 'Order #{{order_id}} Confirmed',
    body_html: '<h2>Order Confirmed</h2><p>Your order #{{order_id}} has been confirmed.</p>',
    category: 'transactional'
  },
  {
    name: 'Newsletter',
    slug: 'newsletter',
    subject: 'Latest Updates from {{company_name}}',
    body_html: '<h1>Newsletter</h1><p>Check out our latest updates...</p>',
    category: 'marketing'
  },
  {
    name: 'Password Reset',
    slug: 'password-reset',
    subject: 'Reset Your Password',
    body_html: '<h2>Password Reset</h2><p>Click the link below to reset your password.</p>',
    category: 'transactional'
  }
];

const SENDER_IDENTITIES = [
  {
    email: 'noreply@norenfashion.in',
    name: 'NOREN Fashion',
    reply_to: 'support@norenfashion.in'
  },
  {
    email: 'support@norenfashion.in',
    name: 'NOREN Support',
    reply_to: 'support@norenfashion.in'
  },
  {
    email: 'hello@norenfashion.in',
    name: 'NOREN Team',
    reply_to: 'hello@norenfashion.in'
  },
  {
    email: 'marketing@norenfashion.in',
    name: 'NOREN Marketing',
    reply_to: 'marketing@norenfashion.in'
  }
];

async function seedDatabase(url, name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🌱 Seeding ${name}...`);
  console.log('='.repeat(60));
  
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`✅ Connected to ${name}\n`);

    // Seed templates
    console.log('📧 Seeding email templates...');
    for (const template of TEMPLATES) {
      const exists = await client.query(
        `SELECT id FROM src_email_templates WHERE name = $1`,
        [template.name]
      );
      
      if (exists.rows.length === 0) {
        await client.query(`
          INSERT INTO src_email_templates (name, slug, subject, body_html, category, is_active, created_by)
          VALUES ($1, $2, $3, $4, $5, true, 1)
        `, [template.name, template.slug, template.subject, template.body_html, template.category]);
        console.log(`   ✓ ${template.name} (created)`);
      } else {
        console.log(`   ⊘ ${template.name} (exists)`);
      }
    }

    // Seed sender identities
    console.log('\n📤 Seeding sender identities...');
    for (const sender of SENDER_IDENTITIES) {
      const exists = await client.query(
        `SELECT id FROM src_email_sender_identities WHERE email = $1`,
        [sender.email]
      );
      
      if (exists.rows.length === 0) {
        await client.query(`
          INSERT INTO src_email_sender_identities (email, name, reply_to, created_by)
          VALUES ($1, $2, $3, 1)
        `, [sender.email, sender.name, sender.reply_to]);
        console.log(`   ✓ ${sender.email} (created)`);
      } else {
        console.log(`   ⊘ ${sender.email} (exists)`);
      }
    }

    console.log(`\n✅ ${name} seeded successfully!\n`);

    await client.end();
    return true;

  } catch (error) {
    console.error(`❌ ${name} seeding failed:`, error.message);
    await client.end();
    return false;
  }
}

async function seedAll() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   SEED ALL PRODUCTION DATABASES                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results = [];
  
  if (process.env.DATABASE_URL_1) {
    results.push(await seedDatabase(process.env.DATABASE_URL_1, 'DATABASE_URL_1'));
  }
  
  if (process.env.DATABASE_URL_2) {
    results.push(await seedDatabase(process.env.DATABASE_URL_2, 'DATABASE_URL_2'));
  }
  
  if (process.env.DATABASE_URL_3) {
    results.push(await seedDatabase(process.env.DATABASE_URL_3, 'DATABASE_URL_3'));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SEEDING SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  console.log('\n✅ ALL DATABASES SEEDED!');
  console.log(`   • ${TEMPLATES.length} Email Templates`);
  console.log(`   • ${SENDER_IDENTITIES.length} Sender Identities\n`);
  
  console.log('🎉 Production backend is now fully ready!');
  console.log('   Test: https://noren-iqk3.onrender.com/api/email/analytics/overview\n');

  process.exit(failed > 0 ? 1 : 0);
}

seedAll();
