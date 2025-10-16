import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { Building } from 'react-bootstrap-icons';
import apiService from '../../services/ApiService';
import { validateDEANumber } from '../../utils/deaValidator';

const CompanySettings = () => {
  const [settings, setSettings] = useState({
    companyName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    deaNumber: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getCompanySettings();
      setSettings(data);
    } catch (err) {
      setError(err.message || 'Failed to load company settings');
      console.error('Error loading company settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!settings.companyName || settings.companyName.trim() === '') {
      errors.companyName = 'Company name is required';
    }

    if (settings.zipCode && !/^\d{5}(-\d{4})?$/.test(settings.zipCode)) {
      errors.zipCode = 'ZIP code must be in format 12345 or 12345-6789';
    }

    if (settings.state && settings.state.length > 2) {
      errors.state = 'State must be a 2-letter code (e.g., CA)';
    }

    // Validate DEA number if provided
    if (settings.deaNumber) {
      const deaValidation = validateDEANumber(settings.deaNumber);
      if (!deaValidation.isValid) {
        errors.deaNumber = deaValidation.error;
      }
      // Additional format check: 2 letters + 7 digits
      if (!/^[A-Z]{2}\d{7}$/.test(settings.deaNumber)) {
        errors.deaNumber = 'DEA number must be 2 letters followed by 7 digits (e.g., AB1234567)';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear validation error for this field when user types
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    // Clear success message when editing
    if (success) {
      setSuccess(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const updatedSettings = await apiService.updateCompanySettings(settings);
      setSettings(updatedSettings);
      setSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to update company settings');
      console.error('Error updating company settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card className="shadow-sm">
        <Card.Header className="bg-white border-bottom">
          <div className="d-flex align-items-center">
            <Building size={24} className="me-2 text-primary" />
            <h5 className="mb-0">Company Settings</h5>
          </div>
          <p className="text-muted mb-0 mt-2 small">
            This information will be used in Form 222 PDFs and other documents
          </p>
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess(false)}>
              Company settings updated successfully!
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Company Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    isInvalid={!!validationErrors.companyName}
                    placeholder="Enter company name"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.companyName}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Address Line 1</Form.Label>
                  <Form.Control
                    type="text"
                    value={settings.addressLine1}
                    onChange={(e) => handleChange('addressLine1', e.target.value)}
                    placeholder="Street address"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Address Line 2</Form.Label>
                  <Form.Control
                    type="text"
                    value={settings.addressLine2}
                    onChange={(e) => handleChange('addressLine2', e.target.value)}
                    placeholder="Suite, unit, building, floor, etc. (optional)"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={5}>
                <Form.Group className="mb-3">
                  <Form.Label>City</Form.Label>
                  <Form.Control
                    type="text"
                    value={settings.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="City"
                  />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>State</Form.Label>
                  <Form.Control
                    type="text"
                    value={settings.state}
                    onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
                    isInvalid={!!validationErrors.state}
                    placeholder="CA"
                    maxLength={2}
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.state}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>ZIP Code</Form.Label>
                  <Form.Control
                    type="text"
                    value={settings.zipCode}
                    onChange={(e) => handleChange('zipCode', e.target.value)}
                    isInvalid={!!validationErrors.zipCode}
                    placeholder="12345"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.zipCode}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>DEA Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={settings.deaNumber}
                    onChange={(e) => handleChange('deaNumber', e.target.value.toUpperCase())}
                    isInvalid={!!validationErrors.deaNumber}
                    placeholder="AB1234567 (2 letters + 7 digits)"
                    maxLength={9}
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.deaNumber}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Format: 2 letters followed by 7 digits (e.g., AB1234567)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={loadSettings}
                disabled={saving}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CompanySettings;
