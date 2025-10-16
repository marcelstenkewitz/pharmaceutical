import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';

const FormModal = ({
  show,
  onHide,
  onSave,
  title,
  formFields = [],
  initialData = null,
  error = null,
  submitButtonText = null
}) => {
  const [formData, setFormData] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  // Initialize form data when modal opens or initial data changes
  useEffect(() => {
    if (show) {
      const initData = {};
      formFields.forEach(field => {
        if (initialData && initialData[field.name] !== undefined) {
          initData[field.name] = initialData[field.name];
        } else {
          initData[field.name] = field.defaultValue || '';
        }
      });
      setFormData(initData);
      setValidationErrors({});
    }
  }, [show, initialData, formFields]);

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear validation error for this field
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: null
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    formFields.forEach(field => {
      const value = formData[field.name];

      // Required field validation
      if (field.required && (!value || value.toString().trim() === '')) {
        errors[field.name] = `${field.label} is required`;
        return;
      }

      // Custom validation function
      if (field.validate && value) {
        const validationResult = field.validate(value);
        if (validationResult && !validationResult.isValid) {
          errors[field.name] = validationResult.error || validationResult.message;
        }
      }

      // Type-specific validation
      if (value && field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[field.name] = 'Please enter a valid email address';
        }
      }

      if (value && field.type === 'number') {
        if (isNaN(value)) {
          errors[field.name] = 'Please enter a valid number';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Clean up form data - remove empty strings for optional fields
    const cleanedData = {};
    formFields.forEach(field => {
      const value = formData[field.name];
      if (field.required || (value && value.toString().trim() !== '')) {
        cleanedData[field.name] = value;
      }
    });

    onSave(cleanedData);
  };

  const renderField = (field) => {
    const value = formData[field.name] ?? '';
    const hasError = validationErrors[field.name];
    const isEditing = !!initialData;

    const commonProps = {
      value,
      onChange: (e) => handleInputChange(field.name, e.target.value),
      required: field.required,
      placeholder: field.placeholder,
      disabled: field.disabled || (field.disableOnEdit && isEditing),
      isInvalid: !!hasError
    };

    switch (field.type) {
      case 'textarea':
        return (
          <Form.Control
            as="textarea"
            rows={field.rows || 3}
            {...commonProps}
          />
        );

      case 'select':
        return (
          <Form.Select {...commonProps}>
            {field.placeholder && (
              <option value="">{field.placeholder}</option>
            )}
            {field.options && field.options.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        );

      case 'checkbox':
        return (
          <Form.Check
            type="checkbox"
            checked={!!value}
            onChange={(e) => handleInputChange(field.name, e.target.checked)}
            label={field.checkboxLabel || field.label}
            disabled={field.disabled}
          />
        );

      default:
        return (
          <Form.Control
            type={field.type || 'text'}
            {...commonProps}
            value={value || ''}
          />
        );
    }
  };

  const isEditing = !!initialData;
  const defaultSubmitText = isEditing ? 'Save Changes' : 'Add';

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {formFields.map((field, index) => (
            <Form.Group className="mb-3" key={index}>
              {field.type !== 'checkbox' && (
                <Form.Label>
                  {field.label}
                  {field.required && <span className="text-danger"> *</span>}
                </Form.Label>
              )}

              {renderField(field)}

              {validationErrors[field.name] && (
                <Form.Control.Feedback type="invalid">
                  {validationErrors[field.name]}
                </Form.Control.Feedback>
              )}

              {field.helpText && (
                <Form.Text className="text-muted">
                  {field.helpText}
                </Form.Text>
              )}
            </Form.Group>
          ))}
        </Form>
      </Modal.Body>
      <Modal.Footer className="modal-footer-mobile">
        <Button variant="secondary" onClick={onHide} className="modal-footer-btn">
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} className="modal-footer-btn">
          {submitButtonText || defaultSubmitText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FormModal;