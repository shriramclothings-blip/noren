import client from './client';

export const getInfluencers = (params) => client.get('/api/support/influencers', { params });
export const getInfluencer = (id) => client.get(`/api/support/influencers/${id}`);
export const getInfluencerTickets = (id) => client.get(`/api/support/influencers/${id}/tickets`);
export const getInfluencerCampaigns = (id) => client.get(`/api/support/influencers/${id}/campaigns`);
export const getInfluencerLinks = (id) => client.get(`/api/support/influencers/${id}/links`);
