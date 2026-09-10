'use strict';

/**
 * NOREN EMAIL PORTAL - Analytics Controller
 * Comprehensive email analytics and reporting
 */

const { pool } = require('../config/db');

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/email/analytics/overview - Dashboard overview statistics
 */
const getAnalyticsOverview = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const daysAgo = parseInt(period);

    // Overall email statistics
    const emailStats = await pool.query(`
      SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked,
        COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN complained_at IS NOT NULL THEN 1 END) as complained
      FROM src_email_sent
      WHERE sent_at >= NOW() - INTERVAL '${daysAgo} days'
    `);

    // Campaign statistics
    const campaignStats = await pool.query(`
      SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as drafts,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
        COUNT(CASE WHEN status = 'sending' THEN 1 END) as sending,
        COALESCE(SUM(sent_count), 0) as total_campaign_emails
      FROM src_email_campaigns
      WHERE created_at >= NOW() - INTERVAL '${daysAgo} days'
    `);

    // Template usage
    const templateStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT template_id) as templates_used,
        COUNT(*) as emails_with_templates
      FROM src_email_sent
      WHERE template_id IS NOT NULL
        AND sent_at >= NOW() - INTERVAL '${daysAgo} days'
    `);

    // Automation statistics
    const automationStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT automation_id) as active_automations,
        COUNT(*) as automation_executions,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful_executions
      FROM src_email_automation_logs
      WHERE executed_at >= NOW() - INTERVAL '${daysAgo} days'
    `);

    const emailData = emailStats.rows[0];
    const campaignData = campaignStats.rows[0];
    const templateData = templateStats.rows[0];
    const automationData = automationStats.rows[0];

    // Calculate rates
    const deliveryRate = emailData.total_sent > 0 
      ? ((emailData.delivered / emailData.total_sent) * 100).toFixed(2) 
      : 0;
    const openRate = emailData.delivered > 0 
      ? ((emailData.opened / emailData.delivered) * 100).toFixed(2) 
      : 0;
    const clickRate = emailData.delivered > 0 
      ? ((emailData.clicked / emailData.delivered) * 100).toFixed(2) 
      : 0;
    const bounceRate = emailData.total_sent > 0 
      ? ((emailData.bounced / emailData.total_sent) * 100).toFixed(2) 
      : 0;

    res.json({
      period_days: daysAgo,
      emails: {
        total_sent: parseInt(emailData.total_sent),
        delivered: parseInt(emailData.delivered),
        opened: parseInt(emailData.opened),
        clicked: parseInt(emailData.clicked),
        bounced: parseInt(emailData.bounced),
        failed: parseInt(emailData.failed),
        complained: parseInt(emailData.complained),
        delivery_rate: parseFloat(deliveryRate),
        open_rate: parseFloat(openRate),
        click_rate: parseFloat(clickRate),
        bounce_rate: parseFloat(bounceRate),
      },
      campaigns: {
        total: parseInt(campaignData.total_campaigns),
        completed: parseInt(campaignData.completed),
        drafts: parseInt(campaignData.drafts),
        scheduled: parseInt(campaignData.scheduled),
        sending: parseInt(campaignData.sending),
        total_emails: parseInt(campaignData.total_campaign_emails),
      },
      templates: {
        templates_used: parseInt(templateData.templates_used),
        emails_with_templates: parseInt(templateData.emails_with_templates),
      },
      automations: {
        active_automations: parseInt(automationData.active_automations),
        total_executions: parseInt(automationData.automation_executions),
        successful_executions: parseInt(automationData.successful_executions),
      },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching analytics overview:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/analytics/deliverability - Deliverability metrics
 */
const getDeliverability = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);

    // Daily deliverability stats
    const dailyStats = await pool.query(`
      SELECT 
        DATE_TRUNC('day', sent_at) as date,
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM src_email_sent
      WHERE sent_at >= NOW() - INTERVAL '${daysAgo} days'
      GROUP BY DATE_TRUNC('day', sent_at)
      ORDER BY date DESC
    `);

    // Bounce reasons (if available)
    const bounceReasons = await pool.query(`
      SELECT 
        metadata->>'bounce_reason' as reason,
        COUNT(*) as count
      FROM src_email_sent
      WHERE status = 'bounced'
        AND sent_at >= NOW() - INTERVAL '${daysAgo} days'
        AND metadata->>'bounce_reason' IS NOT NULL
      GROUP BY metadata->>'bounce_reason'
      ORDER BY count DESC
      LIMIT 10
    `);

    // ISP/Domain distribution
    const domainStats = await pool.query(`
      SELECT 
        SUBSTRING(recipient_email FROM '@(.*)$') as domain,
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced
      FROM src_email_sent
      WHERE sent_at >= NOW() - INTERVAL '${daysAgo} days'
      GROUP BY SUBSTRING(recipient_email FROM '@(.*)$')
      ORDER BY total_sent DESC
      LIMIT 10
    `);

    res.json({
      period_days: daysAgo,
      daily_stats: dailyStats.rows.map(row => ({
        date: row.date,
        total_sent: parseInt(row.total_sent),
        delivered: parseInt(row.delivered),
        bounced: parseInt(row.bounced),
        failed: parseInt(row.failed),
        delivery_rate: row.total_sent > 0 
          ? ((row.delivered / row.total_sent) * 100).toFixed(2) 
          : 0,
      })),
      bounce_reasons: bounceReasons.rows,
      top_domains: domainStats.rows.map(row => ({
        domain: row.domain,
        total_sent: parseInt(row.total_sent),
        delivered: parseInt(row.delivered),
        bounced: parseInt(row.bounced),
        delivery_rate: row.total_sent > 0 
          ? ((row.delivered / row.total_sent) * 100).toFixed(2) 
          : 0,
      })),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching deliverability:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/analytics/engagement - Engagement metrics
 */
const getEngagement = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);

    // Daily engagement stats
    const dailyEngagement = await pool.query(`
      SELECT 
        DATE_TRUNC('day', sent_at) as date,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked
      FROM src_email_sent
      WHERE sent_at >= NOW() - INTERVAL '${daysAgo} days'
      GROUP BY DATE_TRUNC('day', sent_at)
      ORDER BY date DESC
    `);

    // Email type engagement
    const typeEngagement = await pool.query(`
      SELECT 
        email_type,
        COUNT(*) as total_sent,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked
      FROM src_email_sent
      WHERE sent_at >= NOW() - INTERVAL '${daysAgo} days'
      GROUP BY email_type
      ORDER BY total_sent DESC
    `);

    // Time to open analysis
    const timeToOpen = await pool.query(`
      SELECT 
        CASE 
          WHEN EXTRACT(EPOCH FROM (opened_at - sent_at))/3600 < 1 THEN '< 1 hour'
          WHEN EXTRACT(EPOCH FROM (opened_at - sent_at))/3600 < 24 THEN '1-24 hours'
          WHEN EXTRACT(EPOCH FROM (opened_at - sent_at))/3600 < 72 THEN '1-3 days'
          ELSE '> 3 days'
        END as time_range,
        COUNT(*) as count
      FROM src_email_sent
      WHERE opened_at IS NOT NULL
        AND sent_at >= NOW() - INTERVAL '${daysAgo} days'
      GROUP BY time_range
      ORDER BY 
        CASE 
          WHEN time_range = '< 1 hour' THEN 1
          WHEN time_range = '1-24 hours' THEN 2
          WHEN time_range = '1-3 days' THEN 3
          ELSE 4
        END
    `);

    res.json({
      period_days: daysAgo,
      daily_engagement: dailyEngagement.rows.map(row => ({
        date: row.date,
        delivered: parseInt(row.delivered),
        opened: parseInt(row.opened),
        clicked: parseInt(row.clicked),
        open_rate: row.delivered > 0 
          ? ((row.opened / row.delivered) * 100).toFixed(2) 
          : 0,
        click_rate: row.delivered > 0 
          ? ((row.clicked / row.delivered) * 100).toFixed(2) 
          : 0,
      })),
      by_email_type: typeEngagement.rows.map(row => ({
        email_type: row.email_type,
        total_sent: parseInt(row.total_sent),
        opened: parseInt(row.opened),
        clicked: parseInt(row.clicked),
        open_rate: row.total_sent > 0 
          ? ((row.opened / row.total_sent) * 100).toFixed(2) 
          : 0,
        click_rate: row.total_sent > 0 
          ? ((row.clicked / row.total_sent) * 100).toFixed(2) 
          : 0,
      })),
      time_to_open: timeToOpen.rows,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching engagement:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/analytics/campaigns - Campaign performance
 */
const getCampaignPerformance = async (req, res) => {
  try {
    const { period = '30', limit = 20 } = req.query;
    const daysAgo = parseInt(period);

    const campaigns = await pool.query(`
      SELECT 
        c.id, c.name, c.campaign_type, c.status, c.created_at,
        c.total_recipients, c.sent_count, c.delivered_count,
        c.opened_count, c.clicked_count, c.bounced_count,
        c.unsubscribed_count,
        u.name as created_by_name
      FROM src_email_campaigns c
      LEFT JOIN src_users u ON u.id = c.created_by
      WHERE c.created_at >= NOW() - INTERVAL '${daysAgo} days'
        AND c.status IN ('completed', 'sent')
      ORDER BY c.created_at DESC
      LIMIT $1
    `, [limit]);

    res.json({
      period_days: daysAgo,
      campaigns: campaigns.rows.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        campaign_type: campaign.campaign_type,
        status: campaign.status,
        created_at: campaign.created_at,
        created_by: campaign.created_by_name,
        metrics: {
          total_recipients: parseInt(campaign.total_recipients),
          sent: parseInt(campaign.sent_count),
          delivered: parseInt(campaign.delivered_count),
          opened: parseInt(campaign.opened_count),
          clicked: parseInt(campaign.clicked_count),
          bounced: parseInt(campaign.bounced_count),
          unsubscribed: parseInt(campaign.unsubscribed_count),
          delivery_rate: campaign.sent_count > 0 
            ? ((campaign.delivered_count / campaign.sent_count) * 100).toFixed(2) 
            : 0,
          open_rate: campaign.delivered_count > 0 
            ? ((campaign.opened_count / campaign.delivered_count) * 100).toFixed(2) 
            : 0,
          click_rate: campaign.delivered_count > 0 
            ? ((campaign.clicked_count / campaign.delivered_count) * 100).toFixed(2) 
            : 0,
          unsubscribe_rate: campaign.delivered_count > 0 
            ? ((campaign.unsubscribed_count / campaign.delivered_count) * 100).toFixed(2) 
            : 0,
        },
      })),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching campaign performance:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/analytics/audience - Audience analytics
 */
const getAudienceAnalytics = async (req, res) => {
  try {
    // Contact type distribution
    const contactDistribution = await pool.query(`
      SELECT 
        'customers' as type,
        COUNT(*) as count
      FROM src_users WHERE role = 'customer' AND email IS NOT NULL
      UNION ALL
      SELECT 
        'subscribers' as type,
        COUNT(*) as count
      FROM src_newsletter_subscribers WHERE is_active = TRUE
      UNION ALL
      SELECT 
        'sellers' as type,
        COUNT(*) as count
      FROM src_sellers WHERE email IS NOT NULL
      UNION ALL
      SELECT 
        'influencers' as type,
        COUNT(*) as count
      FROM src_influencers WHERE email IS NOT NULL
      UNION ALL
      SELECT 
        'employees' as type,
        COUNT(*) as count
      FROM src_erp_employees WHERE email IS NOT NULL
    `);

    // Suppression statistics
    const suppressionStats = await pool.query(`
      SELECT 
        suppression_type,
        COUNT(*) as count
      FROM src_email_suppression
      GROUP BY suppression_type
    `);

    // Most engaged recipients
    const topRecipients = await pool.query(`
      SELECT 
        recipient_email,
        recipient_name,
        COUNT(*) as emails_received,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as emails_opened,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as emails_clicked
      FROM src_email_sent
      WHERE sent_at >= NOW() - INTERVAL '90 days'
      GROUP BY recipient_email, recipient_name
      HAVING COUNT(*) >= 5
      ORDER BY COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) DESC
      LIMIT 20
    `);

    res.json({
      contact_distribution: contactDistribution.rows.map(row => ({
        type: row.type,
        count: parseInt(row.count),
      })),
      suppression_breakdown: suppressionStats.rows.map(row => ({
        type: row.suppression_type,
        count: parseInt(row.count),
      })),
      top_engaged_recipients: topRecipients.rows.map(row => ({
        email: row.recipient_email,
        name: row.recipient_name,
        emails_received: parseInt(row.emails_received),
        emails_opened: parseInt(row.emails_opened),
        emails_clicked: parseInt(row.emails_clicked),
        open_rate: row.emails_received > 0 
          ? ((row.emails_opened / row.emails_received) * 100).toFixed(2) 
          : 0,
      })),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching audience analytics:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/analytics/revenue - Revenue attribution (if applicable)
 */
const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);

    // This would require integration with order/revenue data
    // For now, return placeholder structure
    res.json({
      period_days: daysAgo,
      total_revenue_attributed: 0,
      campaigns_with_revenue: [],
      revenue_by_email_type: [],
      message: 'Revenue attribution requires order tracking integration',
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching revenue analytics:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/analytics/templates - Template performance
 */
const getTemplatePerformance = async (req, res) => {
  try {
    const { period = '30', limit = 20 } = req.query;
    const daysAgo = parseInt(period);

    const templates = await pool.query(`
      SELECT 
        t.id, t.name, t.category,
        COUNT(e.id) as times_used,
        COUNT(CASE WHEN e.opened_at IS NOT NULL THEN 1 END) as opened,
        COUNT(CASE WHEN e.clicked_at IS NOT NULL THEN 1 END) as clicked
      FROM src_email_templates t
      LEFT JOIN src_email_sent e ON e.template_id = t.id 
        AND e.sent_at >= NOW() - INTERVAL '${daysAgo} days'
      GROUP BY t.id, t.name, t.category
      HAVING COUNT(e.id) > 0
      ORDER BY COUNT(e.id) DESC
      LIMIT $1
    `, [limit]);

    res.json({
      period_days: daysAgo,
      templates: templates.rows.map(template => ({
        id: template.id,
        name: template.name,
        category: template.category,
        times_used: parseInt(template.times_used),
        opened: parseInt(template.opened),
        clicked: parseInt(template.clicked),
        open_rate: template.times_used > 0 
          ? ((template.opened / template.times_used) * 100).toFixed(2) 
          : 0,
        click_rate: template.times_used > 0 
          ? ((template.clicked / template.times_used) * 100).toFixed(2) 
          : 0,
      })),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching template performance:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAnalyticsOverview,
  getDeliverability,
  getEngagement,
  getCampaignPerformance,
  getAudienceAnalytics,
  getRevenueAnalytics,
  getTemplatePerformance,
};