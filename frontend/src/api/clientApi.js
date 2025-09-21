import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';

// --- CLIENTS ---
export const getClients = async () => {
  const res = await axios.get(`${API_BASE}/clients`);
  return res.data.clients;
};

export const createClient = async (clientData) => {
  const res = await axios.post(`${API_BASE}/clients`, clientData);
  return res.data.client;
};

export const updateClient = async (id, clientData) => {
  const res = await axios.put(`${API_BASE}/clients/${id}`, clientData);
  return res.data.client;
};

export const deleteClient = async (id) => {
  await axios.delete(`${API_BASE}/clients/${id}`);
};

// --- REPORTS (collections of line items) ---
export const getClientReports = async (clientId) => {
  const res = await axios.get(`${API_BASE}/clients/${clientId}/reports`);
  return res.data.reports;
};

export const createNewReport = async (clientId) => {
  const res = await axios.post(`${API_BASE}/clients/${clientId}/reports/new`);
  return res.data.report;
};

export const addLineItemToReport = async (clientId, lineItemDto, reportId = null) => {
  const payload = reportId ? { ...lineItemDto, reportId } : lineItemDto;
  const res = await axios.post(`${API_BASE}/clients/${clientId}/reports`, payload);
  return res.data;
};

export const deleteClientReport = async (clientId, reportId) => {
  await axios.delete(`${API_BASE}/clients/${clientId}/reports/${reportId}`);
};

export const deleteLineItemFromReport = async (clientId, reportId, lineItemId) => {
  await axios.delete(`${API_BASE}/clients/${clientId}/reports/${reportId}/items/${lineItemId}`);
};
