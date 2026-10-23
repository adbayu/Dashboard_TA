import { pilotApi } from '../pilot/services/pilotApi.js';

export function createDeveloperApi({ request = pilotApi } = {}) {
  return {
    getKeys: () => request('/v1/keys'),
    createKey: body => request('/v1/keys', { method: 'POST', body }),
    revokeKey: id => request(`/v1/keys/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    getUsage: (id, days = 7) => request(`/v1/keys/${encodeURIComponent(id)}/usage?days=${days}`),
  };
}

export const developerApi = createDeveloperApi();
