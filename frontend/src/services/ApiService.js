import axios from 'axios';

class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // --- CLIENT METHODS ---
  async getClients() {
    try {
      const response = await this.client.get('/clients');
      return response.data.clients;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch clients');
    }
  }

  async createClient(clientData) {
    try {
      const response = await this.client.post('/clients', clientData);
      return response.data.client;
    } catch (error) {
      throw this.handleError(error, 'Failed to create client');
    }
  }

  async updateClient(id, clientData) {
    try {
      const response = await this.client.put(`/clients/${id}`, clientData);
      return response.data.client;
    } catch (error) {
      throw this.handleError(error, 'Failed to update client');
    }
  }

  async deleteClient(id) {
    try {
      await this.client.delete(`/clients/${id}`);
    } catch (error) {
      throw this.handleError(error, 'Failed to delete client');
    }
  }

  // --- REPORT METHODS ---
  async getClientReports(clientId) {
    try {
      const response = await this.client.get(`/clients/${clientId}/reports`);
      return response.data.reports;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch client reports');
    }
  }

  async createNewReport(clientId) {
    try {
      // Send empty object to ensure req.body exists on server
      const response = await this.client.post(`/clients/${clientId}/reports/new`, {});
      return response.data.report;
    } catch (error) {
      throw this.handleError(error, 'Failed to create new report');
    }
  }

  async deleteClientReport(clientId, reportId) {
    try {
      await this.client.delete(`/clients/${clientId}/reports/${reportId}`);
    } catch (error) {
      throw this.handleError(error, 'Failed to delete report');
    }
  }

  // --- LINE ITEM METHODS ---
  async addLineItemToReport(clientId, lineItemDto, reportId = null) {
    try {
      if (reportId) {
        // Use the dedicated endpoint for adding items to existing report
        const response = await this.client.post(`/clients/${clientId}/reports/${reportId}/items`, lineItemDto);
        // Backend returns { ok: true, lineItem, report }
        return {
          lineItem: response.data.lineItem,
          report: response.data.report,
          ok: response.data.ok
        };
      } else {
        // Create new report with initial item
        const response = await this.client.post(`/clients/${clientId}/reports`, lineItemDto);
        return {
          lineItem: response.data.lineItem,
          report: response.data.report,
          ok: response.data.ok
        };
      }
    } catch (error) {
      throw this.handleError(error, 'Failed to add line item to report');
    }
  }

  async updateLineItem(clientId, reportId, lineItemId, updateData) {
    try {
      console.log('🌐 ApiService.updateLineItem - Making PUT request with:', { clientId, reportId, lineItemId, updateData });
      const response = await this.client.put(`/clients/${clientId}/reports/${reportId}/items/${lineItemId}`, updateData);
      console.log('🌐 ApiService.updateLineItem - Raw response:', response.data);
      console.log('🌐 ApiService.updateLineItem - Returning item:', response.data.item);
      return response.data.item;
    } catch (error) {
      console.error('🌐 ApiService.updateLineItem - Error:', error);
      throw this.handleError(error, 'Failed to update line item');
    }
  }

  async deleteLineItemFromReport(clientId, reportId, lineItemId) {
    try {
      await this.client.delete(`/clients/${clientId}/reports/${reportId}/items/${lineItemId}`);
    } catch (error) {
      throw this.handleError(error, 'Failed to delete line item');
    }
  }

  // --- AUTH METHODS ---
  async login(credentials) {
    try {
      const response = await this.client.post('/users/login', credentials);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Login failed');
    }
  }

  async logout() {
    try {
      await this.client.get('/users/logout');
    } catch (error) {
      throw this.handleError(error, 'Logout failed');
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get('/users/me');
      return response.data.user;
    } catch (error) {
      throw this.handleError(error, 'Failed to get current user');
    }
  }

  // --- ERROR HANDLING ---
  handleError(error, defaultMessage) {
    let errorInfo;
    
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.data?.error || defaultMessage;
      const status = error.response.status;
      const errors = error.response.data?.errors || [];
      
      errorInfo = {
        message,
        status,
        errors,
        isApiError: true,
        originalError: error,
      };
    } else if (error.request) {
      // Request made but no response
      errorInfo = {
        message: 'Network error - please check your connection',
        status: 0,
        errors: [],
        isApiError: true,
        originalError: error,
      };
    } else {
      // Something else happened
      errorInfo = {
        message: error.message || defaultMessage,
        status: 0,
        errors: [],
        isApiError: true,
        originalError: error,
      };
    }
    
    // Create a proper Error object with the error info attached
    const apiError = new Error(errorInfo.message);
    Object.assign(apiError, errorInfo);
    return apiError;
  }

  // --- MANUAL ENTRIES METHODS ---
  async getManualEntry(barcode) {
    try {
      const response = await this.client.get(`/manual-entries/${encodeURIComponent(barcode)}`);
      return response.data.entry;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Not found is expected, not an error
      }
      throw this.handleError(error, 'Failed to get manual entry');
    }
  }

  async saveManualEntry(barcode, formData) {
    try {
      const response = await this.client.post('/manual-entries', { barcode, formData });
      return response.data.entry;
    } catch (error) {
      throw this.handleError(error, 'Failed to save manual entry');
    }
  }

  async getAllManualEntries() {
    try {
      const response = await this.client.get('/manual-entries');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get manual entries');
    }
  }

  async deleteManualEntry(barcode) {
    try {
      const response = await this.client.delete(`/manual-entries/${encodeURIComponent(barcode)}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to delete manual entry');
    }
  }

  // --- LABELERS METHODS ---
  async getLabelers() {
    try {
      const response = await this.client.get('/labelers');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get labelers');
    }
  }

  async saveLabeler(labeler_name, return_instructions, address = null, city = null, state = null, zipCode = null) {
    try {
      const response = await this.client.post('/labelers', {
        labeler_name,
        return_instructions,
        address,
        city,
        state,
        zipCode
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to save labeler');
    }
  }

  async getLabeler(labelerName) {
    try {
      const response = await this.client.get(`/labelers/${encodeURIComponent(labelerName)}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw this.handleError(error, 'Failed to get labeler');
    }
  }

  async deleteLabeler(labelerName) {
    try {
      const response = await this.client.delete(`/labelers/${encodeURIComponent(labelerName)}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to delete labeler');
    }
  }

  // --- MANUFACTURERS METHODS ---
  async getManufacturers() {
    try {
      const response = await this.client.get('/manufacturers');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get manufacturers');
    }
  }

  async saveManufacturer(manufacturerData) {
    try {
      const response = await this.client.post('/manufacturers', manufacturerData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to save manufacturer');
    }
  }

  async getManufacturer(manufacturerName) {
    try {
      const response = await this.client.get(`/manufacturers/${encodeURIComponent(manufacturerName)}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw this.handleError(error, 'Failed to get manufacturer');
    }
  }

  async deleteManufacturer(manufacturerName) {
    try {
      const response = await this.client.delete(`/manufacturers/${encodeURIComponent(manufacturerName)}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to delete manufacturer');
    }
  }

  // --- COMPANY SETTINGS METHODS ---
  async getCompanySettings() {
    try {
      const response = await this.client.get('/company-settings');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get company settings');
    }
  }

  async updateCompanySettings(settings) {
    try {
      const response = await this.client.put('/company-settings', settings);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to update company settings');
    }
  }

  // --- UTILITY METHODS ---
  setAuthToken(token) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  setBaseURL(url) {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }
}

// Create and export singleton instance
const apiService = new ApiService();
export default apiService;

// Also export the class for testing
export { ApiService };
