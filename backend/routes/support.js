'use strict';
/**
 * NOREN Support Portal Routes
 * All routes require authenticated admin/super_admin/business_owner/store_admin.
 * Mounts at: /api/support
 */

const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const s = require('../controllers/supportController');

// All support routes require authenticated internal staff
const guard = [auth, requireRole('admin', 'super_admin', 'business_owner', 'store_admin')];

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get('/dashboard', ...guard, s.getDashboardMetrics);

// ── Tickets ────────────────────────────────────────────────────────────────
router.get('/tickets/stats',          ...guard, s.getTicketStats);
router.get('/tickets',                ...guard, s.getTickets);
router.post('/tickets',               ...guard, s.createTicket);
router.get('/tickets/:id',            ...guard, s.getTicket);
router.patch('/tickets/:id',          ...guard, s.updateTicket);
router.delete('/tickets/:id',         ...guard, s.deleteTicket);

// Ticket actions
router.get('/tickets/:id/replies',    ...guard, s.getReplies);
router.post('/tickets/:id/replies',   ...guard, s.addReply);
router.post('/tickets/:id/notes',     ...guard, s.addInternalNote);
router.post('/tickets/:id/assign',    ...guard, s.assignTicket);
router.post('/tickets/:id/escalate',  ...guard, s.escalateTicket);
router.post('/tickets/:id/resolve',   ...guard, s.resolveTicket);
router.post('/tickets/:id/reopen',    ...guard, s.reopenTicket);
router.post('/tickets/:id/close',     ...guard, s.closeTicket);

// ── Teams ──────────────────────────────────────────────────────────────────
router.get('/teams',                  ...guard, s.getTeams);
router.post('/teams',                 ...guard, s.createTeam);
router.patch('/teams/:id',            ...guard, s.updateTeam);
router.delete('/teams/:id',           ...guard, s.deleteTeam);

// ── Agents ─────────────────────────────────────────────────────────────────
router.get('/agents',                 ...guard, s.getAgents);

// ── SLA Rules ──────────────────────────────────────────────────────────────
router.get('/sla',                    ...guard, s.getSLARules);
router.post('/sla',                   ...guard, s.createSLARule);
router.patch('/sla/:id',              ...guard, s.updateSLARule);
router.delete('/sla/:id',             ...guard, s.deleteSLARule);

// ── Categories (static) ────────────────────────────────────────────────────
router.get('/categories',             ...guard, s.getCategories);

// ── Incidents ──────────────────────────────────────────────────────────────
router.get('/incidents',              ...guard, s.getIncidents);
router.post('/incidents',             ...guard, s.createIncident);
router.get('/incidents/:id',          ...guard, s.getIncident);
router.patch('/incidents/:id',        ...guard, s.updateIncident);

// ── Customers ──────────────────────────────────────────────────────────────
router.get('/customers',              ...guard, s.getCustomers);
router.get('/customers/:id',          ...guard, s.getCustomer);
router.get('/customers/:id/orders',   ...guard, s.getCustomerOrders);
router.get('/customers/:id/tickets',  ...guard, s.getCustomerTickets);
router.get('/customers/:id/activity', ...guard, s.getCustomerActivity);
router.get('/customers/:id/sessions', ...guard, s.getCustomerSessions);

// ── Orders ─────────────────────────────────────────────────────────────────
router.get('/orders',                 ...guard, s.getOrders);
router.get('/orders/:id',             ...guard, s.getOrder);
router.get('/orders/:id/tickets',     ...guard, s.getOrderTickets);

// ── Sellers ────────────────────────────────────────────────────────────────
router.get('/sellers',                ...guard, s.getSellers);
router.get('/sellers/:id',            ...guard, s.getSeller);
router.get('/sellers/:id/tickets',    ...guard, s.getSellerTickets);
router.get('/sellers/:id/orders',     ...guard, s.getSellerOrders);
router.get('/sellers/:id/products',   ...guard, s.getSellerProducts);

// ── Influencers ────────────────────────────────────────────────────────────
router.get('/influencers',            ...guard, s.getInfluencers);
router.get('/influencers/:id',        ...guard, s.getInfluencer);
router.get('/influencers/:id/tickets', ...guard, s.getInfluencerTickets);
router.get('/influencers/:id/campaigns', ...guard, s.getInfluencerCampaigns);
router.get('/influencers/:id/links',  ...guard, s.getInfluencerLinks);

// ── Analytics ──────────────────────────────────────────────────────────────
router.get('/analytics',              ...guard, s.getSupportAnalytics);
router.get('/analytics/agents',       ...guard, s.getAgentWorkload);
router.get('/analytics/visitors',     ...guard, s.getVisitorSessions);
router.get('/analytics/utm',          ...guard, s.getUTMAnalytics);
router.get('/analytics/marketing',    ...guard, s.getUTMAnalytics); // reuses UTM data

// ── Knowledge Base ─────────────────────────────────────────────────────────
router.get('/kb',                     ...guard, s.getKBArticles);
router.post('/kb',                    ...guard, s.createKBArticle);
router.get('/kb/:id',                 ...guard, s.getKBArticle);
router.patch('/kb/:id',               ...guard, s.updateKBArticle);
router.delete('/kb/:id',              ...guard, s.deleteKBArticle);

// ── Quick Replies ──────────────────────────────────────────────────────────
router.get('/quick-replies',          ...guard, s.getQuickReplies);
router.post('/quick-replies',         ...guard, s.createQuickReply);
router.patch('/quick-replies/:id',    ...guard, s.updateQuickReply);
router.delete('/quick-replies/:id',   ...guard, s.deleteQuickReply);

// ── Email Templates ────────────────────────────────────────────────────────
router.get('/email-templates',        ...guard, s.getEmailTemplates);
router.post('/email-templates',       ...guard, s.createEmailTemplate);
router.patch('/email-templates/:id',  ...guard, s.updateEmailTemplate);
router.delete('/email-templates/:id', ...guard, s.deleteEmailTemplate);

// ── Audit Logs ─────────────────────────────────────────────────────────────
router.get('/audit-logs',             ...guard, s.getAuditLogs);

// ── Activity feed ──────────────────────────────────────────────────────────
router.get('/activity',               ...guard, s.getAuditLogs); // alias

// ── Settings ───────────────────────────────────────────────────────────────
router.get('/settings',               ...guard, s.getPortalSettings);
router.patch('/settings',             ...guard, s.updatePortalSettings);

// ── Automation rules ──────────────────────────────────────────────────────
router.get('/automation',             ...guard, s.getAutomationRules);
router.post('/automation',            ...guard, s.createAutomationRule);
router.patch('/automation/:id',       ...guard, s.updateAutomationRule);
router.delete('/automation/:id',      ...guard, s.deleteAutomationRule);

module.exports = router;
