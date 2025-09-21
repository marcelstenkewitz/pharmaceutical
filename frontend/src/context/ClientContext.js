import React, { createContext, useState, useMemo, useCallback, useEffect } from 'react';
import apiService from '../services/ApiService';

export const ClientContext = createContext(null);

// Storage keys
const STORAGE_KEYS = {
  SELECTED_CLIENT: 'loanbase_selectedClient',
  CURRENT_REPORT: 'loanbase_currentReport',
  SESSION_REPORT: 'loanbase_sessionReport',
  CLIENTS_CACHE: 'loanbase_clientsCache',
  REPORTS_CACHE: 'loanbase_reportsCache'
};

// Storage utilities
const saveToStorage = (key, data) => {
  try {
    if (data !== null && data !== undefined) {
      localStorage.setItem(key, JSON.stringify(data));
    } else {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

const loadFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

const clearStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
};

export const ClientProvider = ({ children }) => {
  // Initialize state from localStorage or defaults
  const [selectedClient, setSelectedClient] = useState(() => 
    loadFromStorage(STORAGE_KEYS.SELECTED_CLIENT, null)
  );
  const [currentReport, setCurrentReport] = useState(() => 
    loadFromStorage(STORAGE_KEYS.CURRENT_REPORT, null)
  );
  const [sessionReport, setSessionReport] = useState(() => 
    loadFromStorage(STORAGE_KEYS.SESSION_REPORT, null)
  );
  const [clients, setClients] = useState(() => 
    loadFromStorage(STORAGE_KEYS.CLIENTS_CACHE, [])
  );
  const [reports, setReports] = useState(() =>
    loadFromStorage(STORAGE_KEYS.REPORTS_CACHE, [])
  );

  // UI state (not persisted)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Persist selectedClient to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SELECTED_CLIENT, selectedClient);
  }, [selectedClient]);

  // Persist currentReport to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CURRENT_REPORT, currentReport);
  }, [currentReport]);

  // Persist sessionReport to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SESSION_REPORT, sessionReport);
  }, [sessionReport]);

  // Persist clients cache to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CLIENTS_CACHE, clients);
  }, [clients]);

  // Persist reports cache to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.REPORTS_CACHE, reports);
  }, [reports]);

  // --- CLIENT ACTIONS ---
  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const clientData = await apiService.getClients();
      setClients(clientData);
      return clientData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createClient = useCallback(async (clientData) => {
    setLoading(true);
    setError(null);
    try {
      const newClient = await apiService.createClient(clientData);
      setClients(prev => [...prev, newClient]);
      return newClient;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateClient = useCallback(async (clientId, clientData) => {
    setLoading(true);
    setError(null);
    try {
      const updatedClient = await apiService.updateClient(clientId, clientData);
      setClients(prev => prev.map(client => 
        client.id === clientId ? updatedClient : client
      ));
      
      // If the updated client is the currently selected client, update selectedClient too
      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient(updatedClient);
      }
      
      return updatedClient;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedClient]);

  const deleteClient = useCallback(async (clientId) => {
    setLoading(true);
    setError(null);
    try {
      await apiService.deleteClient(clientId);
      setClients(prev => prev.filter(client => client.id !== clientId));
      if (selectedClient === clientId || (selectedClient && selectedClient.id === clientId)) {
        setSelectedClient(null);
        setCurrentReport(null);
        setReports([]);
        // Clear localStorage for this client's data
        clearStorage(STORAGE_KEYS.SELECTED_CLIENT);
        clearStorage(STORAGE_KEYS.CURRENT_REPORT);
        clearStorage(STORAGE_KEYS.SESSION_REPORT);
        clearStorage(STORAGE_KEYS.REPORTS_CACHE);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedClient]);

  // --- REPORT ACTIONS ---
  const loadReports = useCallback(async (clientId) => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const reportData = await apiService.getClientReports(clientId);
      // Use lineItems array directly - no more duplicate arrays
      const mappedReports = reportData.map(report => ({
        ...report,
        lineItems: report.lineItems || []
      }));
      setReports(mappedReports);
      return mappedReports;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createNewReport = useCallback(async (clientId) => {
    setLoading(true);
    setError(null);
    try {
      const newReport = await apiService.createNewReport(clientId);
      // Normalize structure: use lineItems consistently
      const normalizedReport = {
        ...newReport,
        items: newReport.lineItems || newReport.items || []
      };
      setCurrentReport(normalizedReport);
      setSessionReport(normalizedReport);
      return normalizedReport;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addLineItemToReport = useCallback(async (clientId, lineItemDto, reportId = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.addLineItemToReport(clientId, lineItemDto, reportId);
      
      // Update current report with new item, or set it if it wasn't set
      if (result && result.report) {
        // Normalize the report structure - backend returns lineItems
        const normalizedReport = {
          ...result.report,
          items: result.report.lineItems || result.report.items || []
        };

        setCurrentReport(normalizedReport);

        // Also update session report if this is the active session
        if (sessionReport && sessionReport.id === result.report.id) {
          setSessionReport(normalizedReport);
        }
      } else if (currentReport && result.lineItem) {
        // Fallback: just add the item to existing current report
        setCurrentReport(prev => ({
          ...prev,
          items: [...(prev.items || []), result.lineItem]
        }));
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentReport, sessionReport]);

  const updateLineItem = useCallback(async (clientId, reportId, lineItemId, updateData) => {
    console.log('🚀 ClientContext.updateLineItem called with:', { clientId, reportId, lineItemId, updateData });
    setLoading(true);
    setError(null);
    try {
      console.log('📡 Making API call to updateLineItem...');
      const updatedItem = await apiService.updateLineItem(clientId, reportId, lineItemId, updateData);
      console.log('📡 API call completed, got updatedItem:', updatedItem);

      // Update current report items using callback to get latest state
      setCurrentReport(prev => {
        console.log('🔍 setCurrentReport callback - prev state:', prev);
        console.log('🔍 Checking: prev exists?', !!prev, 'prev.id === reportId?', prev?.id === reportId, 'prev.items exists?', !!prev?.items);

        // Only update if we have a current report and it matches the reportId
        if (prev && prev.id === reportId && prev.items) {
          console.log('🔄 Condition passed - Updating currentReport with new item:', updatedItem);
          const newItems = prev.items.map(item =>
            item.id === lineItemId ? updatedItem : item
          );
          console.log('🔄 New items array:', newItems);

          const newState = {
            ...prev,
            items: newItems
          };
          console.log('🔄 New currentReport state:', newState);
          return newState;
        } else {
          console.log('❌ Condition failed - NOT updating currentReport. Prev ID:', prev?.id, 'Target ID:', reportId);
          return prev;
        }
      });

      console.log('✅ updateLineItem operation completed successfully');
      return updatedItem;
    } catch (err) {
      console.error('❌ updateLineItem failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteLineItem = useCallback(async (clientId, reportId, lineItemId) => {
    setLoading(true);
    setError(null);
    try {
      await apiService.deleteLineItemFromReport(clientId, reportId, lineItemId);
      
      // Update current report items
      if (currentReport) {
        setCurrentReport(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== lineItemId)
        }));
      }
      
      // Refresh reports if needed
      await loadReports(clientId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentReport, loadReports]);

  const deleteReport = useCallback(async (clientId, reportId) => {
    setLoading(true);
    setError(null);
    try {
      await apiService.deleteClientReport(clientId, reportId);
      setReports(prev => prev.filter(report => report.id !== reportId));
      
      if (currentReport && currentReport.id === reportId) {
        setCurrentReport(null);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentReport]);


  // --- UTILITY ACTIONS ---
  const clearError = useCallback(() => {
    setError(null);
  }, []);


  const resetSession = useCallback(() => {
    setCurrentReport(null);
    setSessionReport(null);
    // Clear session data from localStorage
    clearStorage(STORAGE_KEYS.CURRENT_REPORT);
    clearStorage(STORAGE_KEYS.SESSION_REPORT);
  }, []);

  const selectClient = useCallback(async (clientId) => {
    if (!clientId) {
      setSelectedClient(null);
      setReports([]);
      resetSession();
      return;
    }
    
    // Find the full client object from the clients array
    let clientObject = clients.find(client => client.id === clientId);
    
    // If not found in cache, load all clients and try again
    if (!clientObject) {
      try {
        const allClients = await loadClients();
        clientObject = allClients.find(client => client.id === clientId);
      } catch (err) {
        console.error('Failed to load clients:', err);
      }
    }
    
    setSelectedClient(clientObject || null);
    resetSession();
    await loadReports(clientId);
  }, [clients, loadClients, loadReports, resetSession]);

  const value = useMemo(() => ({
    // State
    selectedClient,
    currentReport,
    sessionReport,
    clients,
    reports,
    loading,
    error,

    // Client actions
    loadClients,
    createClient,
    updateClient,
    deleteClient,
    selectClient,

    // Report actions
    loadReports,
    createNewReport,
    addLineItemToReport,
    updateLineItem,
    deleteLineItem,
    deleteReport,

    // State setters (for compatibility with existing code)
    setSelectedClient,
    setCurrentReport,
    setSessionReport,

    // Utilities
    setError,
    clearError,
    resetSession,
  }), [
    selectedClient, currentReport, sessionReport, clients, reports, loading, error,
    loadClients, createClient, updateClient, deleteClient, selectClient,
    loadReports, createNewReport, addLineItemToReport, updateLineItem, deleteLineItem, deleteReport,
    setError, clearError, resetSession
  ]);

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
};
