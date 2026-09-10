import { create } from 'zustand'

const useEmailStore = create((set, get) => ({
  // Templates state
  templates: [],
  templatesLoading: false,
  templatesError: null,

  // Campaigns state
  campaigns: [],
  campaignsLoading: false,
  campaignsError: null,

  // Drafts state
  drafts: [],
  draftsLoading: false,
  draftsError: null,

  // Sent emails state
  sentEmails: [],
  sentEmailsLoading: false,
  sentEmailsError: null,

  // Current email being composed/edited
  currentEmail: null,
  isComposing: false,

  // UI state
  sidebarOpen: true,
  activeTab: 'inbox',
  selectedEmails: [],

  // Templates actions
  setTemplates: (templates) => set({ templates }),
  setTemplatesLoading: (loading) => set({ templatesLoading: loading }),
  setTemplatesError: (error) => set({ templatesError: error }),
  
  addTemplate: (template) => set(state => ({
    templates: [template, ...state.templates]
  })),
  
  updateTemplate: (id, updates) => set(state => ({
    templates: state.templates.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  
  removeTemplate: (id) => set(state => ({
    templates: state.templates.filter(t => t.id !== id)
  })),

  // Campaigns actions
  setCampaigns: (campaigns) => set({ campaigns }),
  setCampaignsLoading: (loading) => set({ campaignsLoading: loading }),
  setCampaignsError: (error) => set({ campaignsError: error }),
  
  addCampaign: (campaign) => set(state => ({
    campaigns: [campaign, ...state.campaigns]
  })),
  
  updateCampaign: (id, updates) => set(state => ({
    campaigns: state.campaigns.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
  
  removeCampaign: (id) => set(state => ({
    campaigns: state.campaigns.filter(c => c.id !== id)
  })),

  // Drafts actions
  setDrafts: (drafts) => set({ drafts }),
  setDraftsLoading: (loading) => set({ draftsLoading: loading }),
  setDraftsError: (error) => set({ draftsError: error }),
  
  addDraft: (draft) => set(state => ({
    drafts: [draft, ...state.drafts]
  })),
  
  updateDraft: (id, updates) => set(state => ({
    drafts: state.drafts.map(d => d.id === id ? { ...d, ...updates } : d)
  })),
  
  removeDraft: (id) => set(state => ({
    drafts: state.drafts.filter(d => d.id !== id)
  })),

  // Sent emails actions
  setSentEmails: (sentEmails) => set({ sentEmails }),
  setSentEmailsLoading: (loading) => set({ sentEmailsLoading: loading }),
  setSentEmailsError: (error) => set({ sentEmailsError: error }),
  
  addSentEmail: (email) => set(state => ({
    sentEmails: [email, ...state.sentEmails]
  })),

  // Composer actions
  setCurrentEmail: (email) => set({ currentEmail: email }),
  setIsComposing: (composing) => set({ isComposing: composing }),
  
  startComposing: (template = null) => {
    const newEmail = {
      to: '',
      cc: '',
      bcc: '',
      subject: template?.subject || '',
      body: template?.body || '',
      template_id: template?.id || null
    }
    set({ currentEmail: newEmail, isComposing: true })
  },
  
  stopComposing: () => set({ 
    currentEmail: null, 
    isComposing: false 
  }),

  // UI actions
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setSelectedEmails: (emails) => set({ selectedEmails: emails }),
  toggleEmailSelection: (emailId) => set(state => ({
    selectedEmails: state.selectedEmails.includes(emailId)
      ? state.selectedEmails.filter(id => id !== emailId)
      : [...state.selectedEmails, emailId]
  })),
  selectAllEmails: (emailIds) => set({ selectedEmails: emailIds }),
  clearSelection: () => set({ selectedEmails: [] }),

  // Utility actions
  clearErrors: () => set({
    templatesError: null,
    campaignsError: null,
    draftsError: null,
    sentEmailsError: null
  }),

  // Reset store
  reset: () => set({
    templates: [],
    campaigns: [],
    drafts: [],
    sentEmails: [],
    currentEmail: null,
    isComposing: false,
    selectedEmails: [],
    templatesLoading: false,
    campaignsLoading: false,
    draftsLoading: false,
    sentEmailsLoading: false,
    templatesError: null,
    campaignsError: null,
    draftsError: null,
    sentEmailsError: null
  })
}))

export default useEmailStore