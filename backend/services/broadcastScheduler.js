'use strict';

const { pool } = require('../config/db');
const { sendMail } = require('./mailService');
const fs = require('fs');
const path = require('path');

class BroadcastScheduler {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.checkInterval = 60000; // Check every 1 minute
  }

  start() {
    if (this.isRunning) {
      console.log('📅 Broadcast scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting broadcast scheduler...');
    console.log(`⏰ Checking for broadcasts every ${this.checkInterval / 1000} seconds`);

    // Run immediately, then set interval
    this.checkAndExecuteBroadcasts();
    
    this.interval = setInterval(() => {
      this.checkAndExecuteBroadcasts();
    }, this.checkInterval);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('🛑 Broadcast scheduler stopped');
  }

  async checkAndExecuteBroadcasts() {
    try {
      const now = new Date();
      console.log(`🔍 Checking for broadcasts to execute at ${now.toISOString()}`);

      // Get broadcasts that should run
      const result = await pool.query(`
        SELECT * FROM src_email_scheduled_broadcasts
        WHERE is_active = TRUE
          AND next_run_at IS NOT NULL
          AND next_run_at <= $1
        ORDER BY next_run_at ASC
      `, [now]);

      if (result.rows.length === 0) {
        console.log('📭 No broadcasts to execute');
        return;
      }

      console.log(`📬 Found ${result.rows.length} broadcast(s) to execute`);

      for (const broadcast of result.rows) {
        await this.executeBroadcast(broadcast);
      }

    } catch (error) {
      console.error('❌ Error checking broadcasts:', error);
    }
  }

  async executeBroadcast(broadcast) {
    try {
      console.log(`\n📤 Executing broadcast: "${broadcast.name}"`);
      console.log(`📧 Subject: "${broadcast.subject}"`);
      console.log(`⏰ Scheduled for: ${broadcast.next_run_at}`);

      // Get recipients based on audience type
      let recipients = [];

      if (broadcast.audience_type === 'custom_list') {
        if (broadcast.custom_recipient_list) {
          const emails = broadcast.custom_recipient_list
            .split(/[,;\n]+/)
            .map(e => e.trim())
            .filter(e => e);
          recipients = emails.map(email => ({ email, name: null }));
        }
      } else if (broadcast.audience_type === 'subscribers') {
        // Get newsletter subscribers
        const result = await pool.query(`
          SELECT name, email FROM src_newsletter_subscribers 
          WHERE is_active = TRUE
          UNION
          SELECT name, email FROM src_users 
          WHERE newsletter_subscribed = TRUE AND is_banned = FALSE
        `);
        recipients = result.rows;
      } else if (broadcast.audience_type === 'customers') {
        // Get customers (users who have placed orders)
        const result = await pool.query(`
          SELECT DISTINCT u.name, u.email 
          FROM src_users u
          INNER JOIN src_orders o ON o.user_id = u.id
          WHERE u.is_banned = FALSE
        `);
        recipients = result.rows;
      } else {
        // all_contacts - get all active users
        const result = await pool.query(`
          SELECT id, name, email FROM src_users 
          WHERE is_banned = FALSE AND email IS NOT NULL
        `);
        recipients = result.rows;
      }

      if (recipients.length === 0) {
        console.log('⚠️  No recipients found for broadcast');
        await this.logBroadcastExecution(broadcast.id, 0, 0, 'no_recipients');
        await this.updateNextRunTime(broadcast);
        return;
      }

      console.log(`👥 Sending to ${recipients.length} recipient(s)`);

      // Load and prepare email template
      const emailHtml = await this.prepareEmailContent(broadcast);

      // Send emails in batches
      let successCount = 0;
      let failedCount = 0;
      const batchSize = 10;

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        console.log(`📤 Sending batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(recipients.length/batchSize)}`);

        const results = await Promise.allSettled(
          batch.map(recipient => {
            const personalizedHtml = this.personalizeEmail(emailHtml, recipient, broadcast);
            return sendMail(recipient.email, broadcast.subject, personalizedHtml);
          })
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successCount++;
            console.log(`✅ Sent to ${batch[index].email}`);
          } else {
            failedCount++;
            console.error(`❌ Failed to send to ${batch[index].email}:`, result.reason?.message);
          }
        });

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Log broadcast execution
      await this.logBroadcastExecution(
        broadcast.id,
        recipients.length,
        successCount,
        failedCount > 0 ? 'partial' : 'sent'
      );

      // Update next run time
      await this.updateNextRunTime(broadcast);

      console.log(`✅ Broadcast "${broadcast.name}" completed:`);
      console.log(`   📤 Total recipients: ${recipients.length}`);
      console.log(`   ✅ Successfully sent: ${successCount}`);
      console.log(`   ❌ Failed: ${failedCount}`);

    } catch (error) {
      console.error(`❌ Error executing broadcast "${broadcast.name}":`, error);
      await this.logBroadcastExecution(broadcast.id, 0, 0, 'failed', error.message);
    }
  }

  async prepareEmailContent(broadcast) {
    try {
      // Load email template
      const templatePath = path.join(__dirname, '../templates/broadcast-email-template.html');
      let emailHtml = fs.readFileSync(templatePath, 'utf8');

      // Replace global variables
      emailHtml = emailHtml.replace(/{{company_name}}/g, broadcast.company_name || 'Dinesh Global Pvt Ltd');
      emailHtml = emailHtml.replace(/{{subject}}/g, broadcast.subject);
      emailHtml = emailHtml.replace(/{{current_year}}/g, new Date().getFullYear());

      return emailHtml;
    } catch (error) {
      console.error('Error loading email template:', error);
      // Fallback to simple HTML
      return `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">${broadcast.company_name || 'Dinesh Global Pvt Ltd'}</h1>
            </div>
            <div style="padding: 30px;">
              <h2>Hello {{recipient_name}},</h2>
              <p>${broadcast.subject}</p>
              <p>Thank you for being part of our community!</p>
              <hr style="margin: 30px 0;">
              <p style="text-align: center; color: #666;">
                © ${new Date().getFullYear()} ${broadcast.company_name || 'Dinesh Global Pvt Ltd'}. All rights reserved.
              </p>
            </div>
          </body>
        </html>
      `;
    }
  }

  personalizeEmail(emailHtml, recipient, broadcast) {
    let content = emailHtml
      .replace(/{{recipient_name}}/g, recipient.name || 'Valued Customer')
      .replace(/{{company_name}}/g, broadcast.company_name || 'Dinesh Global Enterprises Pvt Ltd')
      .replace(/{{subject}}/g, broadcast.subject)
      .replace(/{{current_year}}/g, new Date().getFullYear())
      .replace(/{{contact_email}}/g, 'info@dineshglobal.in')
      .replace(/{{website_url}}/g, 'https://dineshglobal.in')
      .replace(/{{social_facebook}}/g, 'https://facebook.com/dineshglobal')
      .replace(/{{social_twitter}}/g, 'https://twitter.com/dineshglobal')
      .replace(/{{unsubscribe_url}}/g, '#')
      .replace(/{{preferences_url}}/g, '#');

    // Replace custom content if provided
    if (broadcast.custom_content) {
      // Replace the default message content with custom content
      const customMessage = broadcast.custom_content
        .replace(/\n/g, '<br>')
        .replace(/{{recipient_name}}/g, recipient.name || 'Valued Customer')
        .replace(/{{company_name}}/g, broadcast.company_name || 'Dinesh Global Enterprises Pvt Ltd');
      
      // Find and replace the message content section
      content = content.replace(
        /We hope this message finds you well\. This is a quick note from the[\s\S]*?services and solutions\./,
        customMessage
      );
    }

    // Replace CTA if provided
    if (broadcast.cta_text && broadcast.cta_url) {
      content = content.replace(
        /<a href="#" class="cta-button">Get in Touch →<\/a>/,
        `<a href="${broadcast.cta_url}" class="cta-button">${broadcast.cta_text} →</a>`
      );
    }

    return content;
  }

  async logBroadcastExecution(broadcastId, recipientsCount, sentCount, status, errorMessage = null) {
    try {
      await pool.query(`
        INSERT INTO src_email_broadcast_logs 
        (broadcast_id, recipients_count, sent_count, failed_count, status, error_message)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        broadcastId,
        recipientsCount,
        sentCount,
        recipientsCount - sentCount,
        status,
        errorMessage
      ]);
    } catch (error) {
      console.error('Error logging broadcast execution:', error);
    }
  }

  async updateNextRunTime(broadcast) {
    try {
      const nextRun = this.calculateNextRunTime(
        broadcast.frequency,
        broadcast.send_time,
        broadcast.custom_days
      );

      await pool.query(`
        UPDATE src_email_scheduled_broadcasts
        SET next_run_at = $1, last_run_at = NOW(), updated_at = NOW()
        WHERE id = $2
      `, [nextRun, broadcast.id]);

      console.log(`⏰ Next run scheduled for: ${nextRun?.toISOString() || 'Not scheduled'}`);

    } catch (error) {
      console.error('Error updating next run time:', error);
    }
  }

  calculateNextRunTime(frequency, sendTime, customDays) {
    const now = new Date();
    const [hours, minutes] = sendTime.split(':').map(Number);
    
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    
    if (frequency === 'one_time') {
      // One-time broadcasts don't repeat
      return null;
    }
    
    if (frequency === 'daily') {
      // If time has passed today, schedule for tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }
    
    if (frequency === 'weekly') {
      // Schedule for next week, same day
      next.setDate(next.getDate() + 7);
      return next;
    }
    
    if (frequency === 'custom' && customDays) {
      const days = typeof customDays === 'string' ? JSON.parse(customDays) : customDays;
      
      // Find next matching day
      for (let i = 1; i <= 7; i++) {
        const testDate = new Date(now);
        testDate.setDate(now.getDate() + i);
        testDate.setHours(hours, minutes, 0, 0);
        
        if (days.includes(testDate.getDay())) {
          return testDate;
        }
      }
    }
    
    return next;
  }
}

module.exports = new BroadcastScheduler();