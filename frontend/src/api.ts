const BASE = '/api';

async function request(url: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// Players
export const getPlayers = () => request('/players');
export const createPlayer = (data: { telegram_id: number; name: string }) =>
  request('/players', { method: 'POST', body: JSON.stringify(data) });
export const deletePlayer = (id: number) =>
  request(`/players/${id}`, { method: 'DELETE' });
export const getPlayerInvitation = (id: number) =>
  request(`/players/${id}/invitation`, { method: 'POST' });

// Enterprises
export const getEnterprises = () => request('/enterprises');
export const createEnterprise = (data: any) =>
  request('/enterprises', { method: 'POST', body: JSON.stringify(data) });
export const updateEnterprise = (id: number, data: any) =>
  request(`/enterprises/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteEnterprise = (id: number) =>
  request(`/enterprises/${id}`, { method: 'DELETE' });

// Settings
export const getSettings = () => request('/settings');
export const updateSetting = (key: string, value: string) =>
  request('/settings', { method: 'PUT', body: JSON.stringify({ key, value }) });

// Game
export const getGameState = () => request('/game/state');
export const advanceCycle = () => request('/game/cycle/advance', { method: 'POST' });
export const setCycle = (cycle: number) =>
  request('/game/cycle/set', { method: 'POST', body: JSON.stringify({ cycle }) });
export const addEnterpriseToPlayer = (playerId: number, enterpriseId: number) =>
  request(`/game/players/${playerId}/enterprises/${enterpriseId}`, { method: 'POST' });
export const removeEnterpriseFromPlayer = (playerId: number, enterpriseId: number) =>
  request(`/game/players/${playerId}/enterprises/${enterpriseId}`, { method: 'DELETE' });
export const addFactory = (playerId: number, enterpriseId: number, count = 1) =>
  request(`/game/players/${playerId}/enterprises/${enterpriseId}/factories/add`, {
    method: 'POST', body: JSON.stringify({ count }),
  });
export const removeFactory = (playerId: number, enterpriseId: number, count = 1) =>
  request(`/game/players/${playerId}/enterprises/${enterpriseId}/factories/remove`, {
    method: 'POST', body: JSON.stringify({ count }),
  });
export const adjustMoney = (playerId: number, amount: number, reason = '') =>
  request(`/game/players/${playerId}/money`, {
    method: 'POST', body: JSON.stringify({ amount, reason }),
  });
export const notifyPlayer = (playerId: number, message: string) =>
  request(`/game/players/${playerId}/notify`, {
    method: 'POST', body: JSON.stringify({ message }),
  });
export const resetGame = () => request('/game/reset', { method: 'POST' });

// Timers
export const getTimers = () => request('/game/timers');
export const startTimers = () => request('/game/timers/start', { method: 'POST' });
export const pauseTimers = () => request('/game/timers/pause', { method: 'POST' });
export const resetGameTimer = () => request('/game/timers/reset-game', { method: 'POST' });
export const resetCycleTimer = () => request('/game/timers/reset-cycle', { method: 'POST' });

// Stocks
export const getStocks = () => request('/stocks');
export const getPlayerStocks = (playerId: number) => request(`/stocks/player/${playerId}`);
export const transferStock = (data: { buyer_id: number; target_player_id: number; percentage: number; price_override?: number }) =>
  request('/stocks/transfer', { method: 'POST', body: JSON.stringify(data) });

// Events
export const getEvents = () => request('/events');
export const createEvent = (data: any) =>
  request('/events', { method: 'POST', body: JSON.stringify(data) });
export const updateEvent = (id: number, data: any) =>
  request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteEvent = (id: number) =>
  request(`/events/${id}`, { method: 'DELETE' });
export const activateEvent = (id: number) =>
  request(`/events/${id}/activate`, { method: 'POST' });
export const deactivateEvent = (id: number) =>
  request(`/events/${id}/deactivate`, { method: 'POST' });

// Dashboard
export const getDashboard = () => request('/game/dashboard');

// WebApp (Mini App)
export const webappAuth = (initData: string) =>
  request('/webapp/auth', { method: 'POST', body: JSON.stringify({ initData }) });
export const webappAuthDev = (telegramId: number) =>
  request('/webapp/auth', { method: 'POST', body: JSON.stringify({ telegram_id: telegramId }) });
export const getWebappRules = () => request('/webapp/rules');
export const getWebappPrices = () => request('/webapp/prices');
export const getWebappStocks = (initData: string) =>
  request('/webapp/stocks', { method: 'POST', body: JSON.stringify({ initData }) });
export const getWebappStocksDev = (telegramId: number) =>
  request('/webapp/stocks', { method: 'POST', body: JSON.stringify({ telegram_id: telegramId }) });

// WebApp Notifications
export const getWebappNotifications = (initData: string) =>
  request('/webapp/notifications', { method: 'POST', body: JSON.stringify({ initData }) });
export const getWebappNotificationsDev = (telegramId: number) =>
  request('/webapp/notifications', { method: 'POST', body: JSON.stringify({ telegram_id: telegramId }) });
export const markNotificationsRead = (initData: string, ids: number[]) =>
  request('/webapp/notifications/read', { method: 'POST', body: JSON.stringify({ initData, ids }) });
export const markNotificationsReadDev = (telegramId: number, ids: number[]) =>
  request('/webapp/notifications/read', { method: 'POST', body: JSON.stringify({ telegram_id: telegramId, ids }) });
