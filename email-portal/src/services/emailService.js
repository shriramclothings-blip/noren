import { emailApi } from './api'

class EmailService {
  // ===============================
  // TEMPLATES
  // ===============================
  async getTemplates(params = {}) {
    try {
      const response = await emailApi.get('/templates', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getTemplateById(id) {
    try {
      const response = await emailApi.get(`/templates/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async createTemplate(templateData) {
    try {
      const response = await emailApi.post('/templates', templateData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async updateTemplate(id, templateData) {
    try {
      const response = await emailApi.put(`/templates/${id}`, templateData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async deleteTemplate(id) {
    try {
      const response = await emailApi.delete(`/templates/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async duplicateTemplate(id) {
    try {
      const response = await emailApi.post(`/templates/${id}/duplicate`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  // ===============================
  // DRAFTS
  // ===============================
  async getDrafts(params = {}) {
    try {
      const response = await emailApi.get('/drafts', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async saveDraft(draftData) {
    try {
      const response = await emailApi.post('/draft', draftData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async deleteDraft(id) {
    try {
      const response = await emailApi.delete(`/draft/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  // ===============================
  // SEND EMAIL
  // ===============================
  async sendEmail(emailData) {
    try {
      const response = await emailApi.post('/send', emailData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  // ===============================
  // INBOX & SENT
  // ===============================
  async getSentEmails(params = {}) {
    try {
      const response = await emailApi.get('/sent', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getEmailById(id) {
    try {
      const response = await emailApi.get(`/email/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getEmailThread(threadId) {
    try {
      const response = await emailApi.get(`/threads/${threadId}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  // ===============================
  // CAMPAIGNS
  // ===============================
  async getCampaigns(params = {}) {
    try {
      const response = await emailApi.get('/campaigns', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getCampaignById(id) {
    try {
      const response = await emailApi.get(`/campaigns/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async createCampaign(campaignData) {
    try {
      const response = await emailApi.post('/campaigns', campaignData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async updateCampaign(id, campaignData) {
    try {
      const response = await emailApi.put(`/campaigns/${id}`, campaignData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async deleteCampaign(id) {
    try {
      const response = await emailApi.delete(`/campaigns/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async scheduleCampaign(id, scheduleData) {
    try {
      const response = await emailApi.post(`/campaigns/${id}/schedule`, scheduleData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async approveCampaign(id) {
    try {
      const response = await emailApi.post(`/campaigns/${id}/approve`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async sendCampaign(id) {
    try {
      const response = await emailApi.post(`/campaigns/${id}/send`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async sendTestEmail(id, testData) {
    try {
      const response = await emailApi.post(`/campaigns/${id}/test`, testData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getCampaignAnalytics(id, params = {}) {
    try {
      const response = await emailApi.get(`/campaigns/${id}/analytics`, { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  // ===============================
  // SEGMENTS
  // ===============================
  async getSegments(params = {}) {
    try {
      const response = await emailApi.get('/segments', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getSegmentById(id) {
    try {
      const response = await emailApi.get(`/segments/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async createSegment(segmentData) {
    try {
      const response = await emailApi.post('/segments', segmentData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async updateSegment(id, segmentData) {
    try {
      const response = await emailApi.put(`/segments/${id}`, segmentData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async deleteSegment(id) {
    try {
      const response = await emailApi.delete(`/segments/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async calculateSegment(id) {
    try {
      const response = await emailApi.post(`/segments/${id}/calculate`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async refreshSegment(id) {
    try {
      const response = await emailApi.post(`/segments/${id}/refresh`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async previewSegment(id, params = {}) {
    try {
      const response = await emailApi.get(`/segments/${id}/preview`, { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  // ===============================
  // CONTACTS
  // ===============================
  async getContacts(params = {}) {
    try {
      const response = await emailApi.get('/contacts', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getContactByEmail(email) {
    try {
      const response = await emailApi.get(`/contacts/${email}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getContactHistory(email, params = {}) {
    try {
      const response = await emailApi.get(`/contacts/${email}/history`, { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async searchContacts(searchData) {
    try {
      const response = await emailApi.post('/contacts/search', searchData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async importContacts(importData) {
    try {
      const response = await emailApi.post('/contacts/import', importData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async exportContacts(params = {}) {
    try {
      const response = await emailApi.get('/contacts/export', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getContactStats() {
    try {
      const response = await emailApi.get('/contacts/stats')
      return response.data
    } catch (error) {
      throw error
    }
  }

  async addContact(contactData) {
    try {
      const response = await emailApi.post('/contacts', contactData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async deleteContact(email) {
    try {
      const response = await emailApi.delete(`/contacts/${email}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  // ===============================
  // AUTOMATION
  // ===============================
  async getAutomations(params = {}) {
    try {
      const response = await emailApi.get('/automations', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getAutomationById(id) {
    try {
      const response = await emailApi.get(`/automations/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async createAutomation(automationData) {
    try {
      const response = await emailApi.post('/automations', automationData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async updateAutomation(id, automationData) {
    try {
      const response = await emailApi.put(`/automations/${id}`, automationData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async deleteAutomation(id) {
    try {
      const response = await emailApi.delete(`/automations/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async toggleAutomation(id, isActive) {
    try {
      const response = await emailApi.patch(`/automations/${id}/toggle`, { is_active: isActive })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getAutomationStats(id) {
    try {
      const response = await emailApi.get(`/automations/${id}/stats`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async testAutomation(id, testData) {
    try {
      const response = await emailApi.post(`/automations/${id}/test`, testData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  // ===============================
  // SCHEDULED BROADCASTS
  // ===============================
  async getScheduledBroadcasts(params = {}) {
    try {
      const response = await emailApi.get('/broadcasts', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getBroadcastById(id) {
    try {
      const response = await emailApi.get(`/broadcasts/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async createBroadcast(broadcastData) {
    try {
      const response = await emailApi.post('/broadcasts', broadcastData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async updateBroadcast(id, broadcastData) {
    try {
      const response = await emailApi.put(`/broadcasts/${id}`, broadcastData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async deleteBroadcast(id) {
    try {
      const response = await emailApi.delete(`/broadcasts/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async toggleBroadcast(id, isActive) {
    try {
      const response = await emailApi.patch(`/broadcasts/${id}/toggle`, { is_active: isActive })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getBroadcastStats(id) {
    try {
      const response = await emailApi.get(`/broadcasts/${id}/stats`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async sendBroadcastNow(id) {
    try {
      const response = await emailApi.post(`/broadcasts/${id}/send-now`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  // ===============================
  // ANALYTICS
  // ===============================
  async getAnalyticsOverview(params = {}) {
    try {
      const response = await emailApi.get('/analytics/overview', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getDeliverability(params = {}) {
    try {
      const response = await emailApi.get('/analytics/deliverability', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getEngagement(params = {}) {
    try {
      const response = await emailApi.get('/analytics/engagement', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getCampaignPerformance(params = {}) {
    try {
      const response = await emailApi.get('/analytics/campaigns', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getAudienceAnalytics(params = {}) {
    try {
      const response = await emailApi.get('/analytics/audience', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getRevenueAnalytics(params = {}) {
    try {
      const response = await emailApi.get('/analytics/revenue', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getTemplatePerformance(params = {}) {
    try {
      const response = await emailApi.get('/analytics/templates', { params })
      return response.data
    } catch (error) {
      throw error
    }
  }
}

export default new EmailService()