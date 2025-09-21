const BaseController = require('./BaseController');

class HealthController extends BaseController {
  constructor(repositoryService) {
    super(repositoryService);
  }

  /**
   * Get health status of the application
   * @returns {Object} Health status response
   */
  getHealth() {
    try {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      };

      return this.handleSuccess(healthData, 'health check');
    } catch (error) {
      return this.handleError(error, 'health check');
    }
  }
}

module.exports = HealthController;