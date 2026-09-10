import client from './client';

export const getSettings = (group) => client.get('/api/support/settings', { params: { group } });
export const updateSettings = (group, data) => client.patch('/api/support/settings', { group, data });
