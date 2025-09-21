const BaseController = require('./BaseController');

class ClientController extends BaseController {
  constructor(repositoryService) {
    super(repositoryService);
  }

  /**
   * Get all clients
   * @returns {Object} Response with all clients
   */
  getAllClients() {
    try {
      const clients = this.repos.clients.findAll();

      return this.handleSuccess({ clients }, 'fetch all clients');
    } catch (error) {
      return this.handleError(error, 'fetch all clients');
    }
  }

  /**
   * Get a specific client by ID
   * @param {string} clientId - The client ID
   * @returns {Object} Response with client data
   */
  getClientById(clientId) {
    try {
      if (!clientId) {
        return {
          success: false,
          error: 'Client ID is required',
          statusCode: 400
        };
      }

      const client = this.repos.clients.findById(clientId);

      const recordError = this.validateRecordExists(client, 'Client', clientId);
      if (recordError) {
        return recordError;
      }

      return this.handleSuccess({ client }, 'fetch client by ID');
    } catch (error) {
      return this.handleError(error, 'fetch client by ID');
    }
  }

  /**
   * Create a new client
   * @param {Object} clientData - The client data
   * @param {string} clientData.businessName - The business name
   * @param {string} clientData.deaNumber - The DEA number
   * @param {string} clientData.streetAddress - The street address
   * @param {string} clientData.city - The city
   * @param {string} clientData.state - The state
   * @param {string} clientData.zipCode - The zip code
   * @param {string} [clientData.phoneNumber] - The phone number
   * @param {string} [clientData.contactName] - The contact name
   * @param {string} [clientData.labelerName] - The labeler name
   * @param {string} [clientData.returnInstructions] - The return instructions
   * @returns {Object} Response with created client
   */
  createClient(clientData) {
    try {
      // Validate required fields
      const requiredFields = ['businessName', 'deaNumber', 'streetAddress', 'city', 'state', 'zipCode'];
      const validationError = this.validateRequiredFields(clientData, requiredFields);
      if (validationError) {
        return validationError;
      }

      const {
        businessName,
        deaNumber,
        streetAddress,
        city,
        state,
        zipCode,
        phoneNumber = '',
        contactName = '',
        labelerName = 'N/A',
        returnInstructions = ''
      } = clientData;

      const newClientData = {
        businessName,
        deaNumber,
        streetAddress,
        city,
        state,
        zipCode,
        phoneNumber,
        contactName,
        labelerName,
        returnInstructions
      };

      const client = this.repos.clients.create(newClientData);

      return this.handleSuccess({ client }, 'create client');
    } catch (error) {
      return this.handleError(error, 'create client');
    }
  }

  /**
   * Update a client
   * @param {string} clientId - The client ID
   * @param {Object} updateData - The data to update
   * @returns {Object} Response with updated client
   */
  updateClient(clientId, updateData) {
    try {
      if (!clientId) {
        return {
          success: false,
          error: 'Client ID is required',
          statusCode: 400
        };
      }

      const allowedFields = [
        'businessName',
        'deaNumber',
        'streetAddress',
        'city',
        'state',
        'zipCode',
        'phoneNumber',
        'contactName',
        'labelerName',
        'returnInstructions'
      ];

      // Filter updates to only include allowed fields
      const updates = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        return {
          success: false,
          error: 'No valid fields to update',
          statusCode: 400
        };
      }

      const client = this.repos.clients.update(clientId, updates);

      return this.handleSuccess({ client }, 'update client');
    } catch (error) {
      // Handle specific "not found" errors from repository
      if (error.message && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Client not found',
          statusCode: 404
        };
      }

      return this.handleError(error, 'update client');
    }
  }

  /**
   * Delete a client
   * @param {string} clientId - The client ID
   * @returns {Object} Response confirming deletion
   */
  deleteClient(clientId) {
    try {
      if (!clientId) {
        return {
          success: false,
          error: 'Client ID is required',
          statusCode: 400
        };
      }

      this.repos.clients.delete(clientId);

      return this.handleSuccess(
        { message: 'Client deleted successfully', clientId },
        'delete client'
      );
    } catch (error) {
      // Handle specific "not found" errors from repository
      if (error.message && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Client not found',
          statusCode: 404
        };
      }

      return this.handleError(error, 'delete client');
    }
  }
}

module.exports = ClientController;