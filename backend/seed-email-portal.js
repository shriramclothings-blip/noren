#!/usr/bin/env node
/**
 * Seed Email Portal with Default Data
 * Creates templates, sender identities, and sample data
 */

require('dotenv').config();
const { pool } = require('./config/db');

async function seedEmailPortal() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   SEED EMAIL PORTAL - Default Data                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. CREATE DEFAULT SENDER IDENTITIES
    console.log('📧 Creating sender identities...');
    
    const senders = [
      { email: 'admin@norenfashion.in', name: 'NOREN Admin', reply_to: 'admin@norenfashion.in', is_default: true },
      { email: 'support@norenfashion.in', name: 'NOREN Support', reply_to: 'support@norenfashion.in', is_default: false },
      { email: 'marketing@norenfashion.in', name: 'NOREN Marketing', reply_to: 'marketing@norenfashion.in', is_default: false },
      { email: 'noreply@norenfashion.in', name: 'NOREN', reply_to: null, is_default: false },
    ];

    for (const sender of senders) {
      await pool.query(`
        INSERT INTO src_email_sender_identities (email, name, reply_to, is_default, verification_status, verified_at, created_at)
        VALUES ($1, $2, $3, $4, 'verified', NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          reply_to = EXCLUDED.reply_to,
          is_default = EXCLUDED.is_default,
          verification_status = 'verified',
          verified_at = NOW()
      `, [sender.email, sender.name, sender.reply_to, sender.is_default]);
      
      console.log(`  ✓ ${sender.email}`);
    }

    // 2. CREATE DEFAULT EMAIL TEMPLATES
    console.log('\n📝 Creating email templates...');
    
    const templates = [
      {
        name: 'Welcome Email',
        slug: 'welcome-email',
        category: 'customer_support',
        subject: 'Welcome to NOREN Fashion! 🎉',
        body_html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Welcome to NOREN!</h1>
            <p>Hi {{first_name}},</p>
            <p>Thank you for joining NOREN Fashion. We're excited to have you!</p>
            <p>Explore our latest collection and enjoy exclusive offers.</p>
            <a href="https://www.norenfastion.shop" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Shop Now</a>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>NOREN Team</p>
          </div>
        `,
        variables: ['first_name']
      },
      {
        name: 'Order Confirmation',
        slug: 'order-confirmation',
        category: 'transactional',
        subject: 'Order Confirmed - #{{order_id}}',
        body_html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981;">Order Confirmed! ✅</h1>
            <p>Hi {{customer_name}},</p>
            <p>Thank you for your order <strong>#{{order_id}}</strong></p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Order Details</h3>
              <p><strong>Total:</strong> ₹{{order_total}}</p>
              <p><strong>Estimated Delivery:</strong> {{delivery_date}}</p>
            </div>
            <p>Track your order: <a href="https://www.norenfastion.shop/orders/{{order_id}}">View Order</a></p>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>NOREN Team</p>
          </div>
        `,
        variables: ['customer_name', 'order_id', 'order_total', 'delivery_date']
      },
      {
        name: 'Marketing Newsletter',
        slug: 'marketing-newsletter',
        category: 'marketing',
        subject: '🔥 New Arrivals - Exclusive Collection',
        body_html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <img src="https://via.placeholder.com/600x200/2563eb/ffffff?text=NOREN+Fashion" style="width: 100%; border-radius: 8px;" alt="Banner">
            <h1 style="color: #2563eb;">New Arrivals Just Dropped!</h1>
            <p>Hi {{first_name}},</p>
            <p>Check out our latest collection with exclusive designs just for you.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>🎁 Special Offer</h3>
              <p><strong>Get 20% OFF</strong> on your next purchase!</p>
              <p>Use code: <strong>{{promo_code}}</strong></p>
            </div>
            <a href="https://www.norenfastion.shop/shop" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Shop Now</a>
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              You're receiving this because you subscribed to NOREN updates.<br>
              <a href="{{unsubscribe_url}}">Unsubscribe</a>
            </p>
          </div>
        `,
        variables: ['first_name', 'promo_code', 'unsubscribe_url']
      },
      {
        name: 'Password Reset',
        slug: 'password-reset',
        category: 'transactional',
        subject: 'Reset Your NOREN Password',
        body_html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">Reset Your Password</h1>
            <p>Hi {{user_name}},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="{{reset_link}}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Reset Password</a>
            <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br>NOREN Team</p>
          </div>
        `,
        variables: ['user_name', 'reset_link']
      }
    ];

    for (const template of templates) {
      const result = await pool.query(`
        INSERT INTO src_email_templates (name, slug, category, subject, body_html, variables, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          subject = EXCLUDED.subject,
          body_html = EXCLUDED.body_html,
          variables = EXCLUDED.variables,
          updated_at = NOW()
        RETURNING id
      `, [template.name, template.slug, template.category, template.subject, template.body_html, JSON.stringify(template.variables)]);
      
      console.log(`  ✓ ${template.name} (ID: ${result.rows[0].id})`);
    }

    // 3. VERIFY SETUP
    console.log('\n🔍 Verifying setup...');
    
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM src_email_templates) as templates,
        (SELECT COUNT(*) FROM src_email_sender_identities) as senders
    `);
    
    console.log(`  ✓ Templates: ${stats.rows[0].templates}`);
    console.log(`  ✓ Sender Identities: ${stats.rows[0].senders}`);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ SEEDING COMPLETE                                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('Email portal is ready with:');
    console.log('  • 4 Email Templates');
    console.log('  • 4 Sender Identities\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Seeding error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedEmailPortal();
