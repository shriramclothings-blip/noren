import client from './client';

// ── Tickets ────────────────────────────────────────────────────────────────
export const getTickets = (params) => client.get('/api/support/tickets', { params });
export const getTicket = (id) => client.get(`/api/support/tickets/${id}`);
export const createTicket = (data) => client.post('/api/support/tickets', data);
export const updateTicket = (id, data) => client.patch(`/api/support/tickets/${id}`, data);
export const deleteTicket = (id) => client.delete(`/api/support/tickets/${id}`);
export const getTicketStats = (params) => client.get('/api/support/tickets/stats', { params });

// ── Ticket actions ─────────────────────────────────────────────────────────
export const replyTicket = (id, data) => client.post(`/api/support/tickets/${id}/replies`, data);
export const addInternalNote = (id, data) => client.post(`/api/support/tickets/${id}/notes`, data);
export const assignTicket = (id, data) => client.post(`/api/support/tickets/${id}/assign`, data);
export const escalateTicket = (id, data) => client.post(`/api/support/tickets/${id}/escalate`, data);
export const resolveTicket = (id, data) => client.post(`/api/support/tickets/${id}/resolve`, data);
export const reopenTicket = (id, data) => client.post(`/api/support/tickets/${id}/reopen`, data);
export const closeTicket = (id, data) => client.post(`/api/support/tickets/${id}/close`, data);

// ── Replies / Notes ────────────────────────────────────────────────────────
export const getTicketReplies = (id) => client.get(`/api/support/tickets/${id}/replies`);

// ── Teams / Agents ─────────────────────────────────────────────────────────
export const getTeams = () => client.get('/api/support/teams');
export const createTeam = (data) => client.post('/api/support/teams', data);
export const updateTeam = (id, data) => client.patch(`/api/support/teams/${id}`, data);
export const deleteTeam = (id) => client.delete(`/api/support/teams/${id}`);
export const getAgents = (params) => client.get('/api/support/agents', { params });

// ── SLA ────────────────────────────────────────────────────────────────────
export const getSLARules = () => client.get('/api/support/sla');
export const createSLARule = (data) => client.post('/api/support/sla', data);
export const updateSLARule = (id, data) => client.patch(`/api/support/sla/${id}`, data);
export const deleteSLARule = (id) => client.delete(`/api/support/sla/${id}`);

// ── Automation ────────────────────────────────────────────────────────────
export const getAutomationRules = () => client.get('/api/support/automation');
export const createAutomationRule = (data) => client.post('/api/support/automation', data);
export const updateAutomationRule = (id, data) => client.patch(`/api/support/automation/${id}`, data);
export const deleteAutomationRule = (id) => client.delete(`/api/support/automation/${id}`);

// ── Categories ─────────────────────────────────────────────────────────────
export const getCategories = () => client.get('/api/support/categories');
export const createCategory = (data) => client.post('/api/support/categories', data);
export const updateCategory = (id, data) => client.patch(`/api/support/categories/${id}`, data);
export const deleteCategory = (id) => client.delete(`/api/support/categories/${id}`);

// ── Email Templates ────────────────────────────────────────────────────────
export const getEmailTemplates = () => client.get('/api/support/email-templates');
export const createEmailTemplate = (data) => client.post('/api/support/email-templates', data);
export const updateEmailTemplate = (id, data) => client.patch(`/api/support/email-templates/${id}`, data);
export const deleteEmailTemplate = (id) => client.delete(`/api/support/email-templates/${id}`);

// ── Quick Replies ──────────────────────────────────────────────────────────
export const getQuickReplies = () => client.get('/api/support/quick-replies');
export const createQuickReply = (data) => client.post('/api/support/quick-replies', data);
export const updateQuickReply = (id, data) => client.patch(`/api/support/quick-replies/${id}`, data);
export const deleteQuickReply = (id) => client.delete(`/api/support/quick-replies/${id}`);

// ── Knowledge Base ─────────────────────────────────────────────────────────
export const getKBArticles = (params) => client.get('/api/support/kb', { params });
export const getKBArticle = (id) => client.get(`/api/support/kb/${id}`);
export const createKBArticle = (data) => client.post('/api/support/kb', data);
export const updateKBArticle = (id, data) => client.patch(`/api/support/kb/${id}`, data);
export const deleteKBArticle = (id) => client.delete(`/api/support/kb/${id}`);

// ── Incidents ─────────────────────────────────────────────────────────────
export const getIncidents = (params) => client.get('/api/support/incidents', { params });
export const getIncident = (id) => client.get(`/api/support/incidents/${id}`);
export const createIncident = (data) => client.post('/api/support/incidents', data);
export const updateIncident = (id, data) => client.patch(`/api/support/incidents/${id}`, data);

// ── Analytics ─────────────────────────────────────────────────────────────
export const getSupportAnalytics = (params) => client.get('/api/support/analytics', { params });
export const getAgentWorkload = (params) => client.get('/api/support/analytics/agents', { params });

// ── Audit Logs ────────────────────────────────────────────────────────────
export const getAuditLogs = (params) => client.get('/api/support/audit-logs', { params });
