import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { createNdcService } from '../../services/NdcService';
import {
  createEmptyLineItemForm,
  validateLineItemForm,
  formDataToInventoryLine,
  buildPackageSize,
  PACKAGE_UNIT_OPTIONS
} from '../../services/LineItemFormService';
import { calculatePackagePrice, calculateLineTotal } from '../../services/PricingUtils';
import apiService from '../../services/ApiService';

const ndcService = createNdcService();

const ManualEntryModal = ({
  show,
  onHide,
  onSubmit,
  title = "Manual Entry - Form 222 Line",
  submitButtonText = "Create Line Item",
  initialBarcode = "",
  initialData = null,
  saveToCache = true
}) => {
  const [formData, setFormData] = useState(createEmptyLineItemForm());
  const [ndcValidation, setNdcValidation] = useState({ isValid: true, message: "" });
  const [validationErrors, setValidationErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (show) {
      if (initialData) {
        // Use provided initial data for editing
        setFormData({
          ...createEmptyLineItemForm(),
          barcode: initialData.barcode || "",
          itemName: initialData.itemName || "",
          ndc11: initialData.ndc11 || initialData.ndcNumber || "",
          packageCount: initialData.packageCount || 1,
          packageUnit: initialData.packageUnit || "units",
          packageSize: initialData.packageSize || "",
          packages: initialData.packages || 1,
          pricePerUnit: initialData.pricePerUnit || initialData.pricePerEA || 0,
          unitsPerPackage: initialData.unitsPerPackage || 1,
          labeler_name: initialData.labeler_name || "",
          return_instructions: initialData.return_instructions || "",
          isManualEntry: true
        });
      } else {
        // New manual entry
        const newForm = {
          ...createEmptyLineItemForm(),
          barcode: initialBarcode || "",
          isManualEntry: true
        };

        // Only pre-fill NDC if the initial barcode appears to be valid NDC format
        if (initialBarcode && /^\d{11}$/.test(initialBarcode.replace(/\D/g, ''))) {
          newForm.ndc11 = initialBarcode;
        }

        setFormData(newForm);
      }
      setNdcValidation({ isValid: true, message: "" });
      setValidationErrors([]);
    }
  }, [show, initialBarcode, initialData]);

  // Automatic pricing calculations
  useEffect(() => {
    const pricePerUnit = parseFloat(formData.pricePerUnit) || 0;
    const unitsPerPackage = parseInt(formData.unitsPerPackage) || 1;
    const packages = parseInt(formData.packages) || 1;

    if (pricePerUnit && unitsPerPackage && packages) {
      const pricePerPackage = calculatePackagePrice(pricePerUnit, unitsPerPackage);
      const totalPrice = calculateLineTotal(pricePerUnit, unitsPerPackage, packages);

      // Only update if the calculated values are different to avoid infinite loops
      if (formData.pricePerPackage !== pricePerPackage || formData.totalPrice !== totalPrice) {
        setFormData(prev => ({
          ...prev,
          pricePerPackage,
          totalPrice
        }));
      }
    }
  }, [formData.pricePerUnit, formData.unitsPerPackage, formData.packages, formData.pricePerPackage, formData.totalPrice]);

  // Validate NDC/code using centralized validation
  const validateNdcNumber = (code) => {
    if (!code || code.trim() === "") {
      return { isValid: false, message: "Code is required" };
    }

    // Check if it's a custom code or standard NDC
    if (ndcService.utils.isCustomCode(code)) {
      // This looks like a custom code (e.g., "1231"), use permissive validation
      return ndcService.utils.validateManualCode(code.trim());
    } else {
      // This looks like an NDC number, use strict NDC validation
      return ndcService.utils.validateStandardNDC(code.trim());
    }
  };

  // Handle NDC input change with validation
  const handleNdcChange = (value) => {
    setFormData(prev => ({
      ...prev,
      ndc11: value
    }));

    // Validate as user types
    if (value.trim() === "") {
      setNdcValidation({ isValid: true, message: "" });
    } else {
      const validation = validateNdcNumber(value);
      setNdcValidation(validation);
    }
  };

  // Handle package count change
  const handlePackageCountChange = (value) => {
    const newCount = value === '' ? '' : parseInt(value) || 1;
    const newPackageSize = buildPackageSize(newCount, formData.packageUnit);

    setFormData(prev => ({
      ...prev,
      packageCount: newCount,
      packageSize: newPackageSize,
      unitsPerPackage: newCount || 1
    }));
  };

  // Handle package unit change
  const handlePackageUnitChange = (value) => {
    const newPackageSize = buildPackageSize(formData.packageCount, value);

    setFormData(prev => ({
      ...prev,
      packageUnit: value,
      packageSize: newPackageSize
    }));
  };

  // Generic input change handler
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validate form using service
    const validation = validateLineItemForm(formData);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    // Optional: Show NDC validation feedback but don't block submission for manual entries
    const ndcValidationResult = validateNdcNumber(formData.ndc11);
    if (!ndcValidationResult.isValid) {
      setNdcValidation(ndcValidationResult);
      // Don't return - allow manual entries with non-standard NDC formats
    }

    setIsSubmitting(true);

    try {
      // Save to cache if requested
      if (saveToCache) {
        try {
          // Use barcode as key, or NDC if no barcode provided
          const cacheKey = formData.barcode.trim() || formData.ndc11;
          const cacheData = {
            itemName: formData.itemName,
            ndcNumber: formData.ndc11, // Keep old field name for cache compatibility
            ndc11: formData.ndc11,
            packageSize: formData.packageSize,
            pricePerEA: formData.pricePerUnit, // Keep old field name for cache compatibility
            pricePerUnit: formData.pricePerUnit,
            price: formData.pricePerUnit, // Store price for simpler access
            labeler_name: formData.labeler_name,
            return_instructions: formData.return_instructions
          };

          await apiService.saveManualEntry(cacheKey, cacheData);
          console.log('Manual entry saved to cache with key:', cacheKey);
        } catch (error) {
          console.error('Failed to save manual entry to cache:', error);
        }
      }

      // Convert form data to inventory line format
      const inventoryLineData = formDataToInventoryLine(formData);

      // Call the onSubmit callback with inventory line data
      await onSubmit(inventoryLineData);

      // Reset form and close modal
      handleClose();
    } catch (error) {
      console.error('Failed to submit manual entry:', error);
      setValidationErrors([error.message || 'Failed to save changes. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form data
    setFormData(createEmptyLineItemForm());
    setNdcValidation({ isValid: true, message: "" });
    setValidationErrors([]);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <div className="row">
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>Barcode/Identifier</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                  placeholder="Scanned barcode or unique identifier"
                />
                <Form.Text className="text-muted">
                  The barcode/code that was scanned (used as cache key for retrieving this entry)
                </Form.Text>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>Item Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.itemName}
                  onChange={(e) => handleInputChange('itemName', e.target.value)}
                  placeholder="Item name (brand or generic)"
                  required
                />
              </Form.Group>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>NDC-11/Product Code *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.ndc11}
                  onChange={(e) => handleNdcChange(e.target.value)}
                  placeholder="NDC-11 or custom code (e.g., 12345678901 or 1231)"
                  isInvalid={!ndcValidation.isValid}
                  required
                />
                {!ndcValidation.isValid && ndcValidation.message && (
                  <Form.Control.Feedback type="invalid">
                    {ndcValidation.message}
                  </Form.Control.Feedback>
                )}
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>Labeler Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.labeler_name}
                  onChange={(e) => handleInputChange('labeler_name', e.target.value)}
                  placeholder="Pharmaceutical manufacturer/labeler name"
                  required
                />
              </Form.Group>
            </div>
          </div>

          <div className="row">
            <div className="col-md-3">
              <Form.Group className="mb-3">
                <Form.Label>Package Size *</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.packageCount || ''}
                  onChange={(e) => handlePackageCountChange(e.target.value)}
                  min="1"
                  placeholder="100"
                />
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group className="mb-3">
                <Form.Label>Package Unit *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.packageUnit || ''}
                  onChange={(e) => handlePackageUnitChange(e.target.value)}
                  placeholder="tablets"
                  list="packageUnits"
                />
                <datalist id="packageUnits">
                  {PACKAGE_UNIT_OPTIONS.map(option => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>Quantity *</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.packages || 1}
                  onChange={(e) => handleInputChange('packages', parseInt(e.target.value) || 1)}
                  min="1"
                />
              </Form.Group>
            </div>
          </div>

          <div className="row">
            <div className="col-md-4">
              <Form.Group className="mb-3">
                <Form.Label>Price per Unit</Form.Label>
                <Form.Control
                  type="number"
                  step="0.0001"
                  value={formData.pricePerUnit || ''}
                  onChange={(e) => handleInputChange('pricePerUnit', parseFloat(e.target.value) || 0)}
                  placeholder="0.0000"
                />
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group className="mb-3">
                <Form.Label>Units per Package</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.unitsPerPackage || ''}
                  onChange={(e) => handleInputChange('unitsPerPackage', parseInt(e.target.value) || 1)}
                  placeholder="1"
                  min="1"
                />
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group className="mb-3">
                <Form.Label>Price per Package</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.pricePerPackage ? `$${formData.pricePerPackage.toFixed(4)}` : '$0.0000'}
                  readOnly
                  className="bg-light"
                />
                <Form.Text className="text-muted">
                  Calculated automatically
                </Form.Text>
              </Form.Group>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>Total Price</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.totalPrice ? `$${formData.totalPrice.toFixed(2)}` : '$0.00'}
                  readOnly
                  className="bg-light"
                />
                <Form.Text className="text-muted">
                  Calculated automatically (Price per Unit × Units per Package × Quantity)
                </Form.Text>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>Notes for Return</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={formData.return_instructions || ''}
                  onChange={(e) => handleInputChange('return_instructions', e.target.value)}
                  placeholder="Enter return instructions for this labeler"
                />
                <Form.Text className="text-muted">
                  These notes will be saved for all items from this labeler
                </Form.Text>
              </Form.Group>
            </div>
          </div>

          {validationErrors.length > 0 && (
            <Alert variant="danger">
              <Alert.Heading>Validation Errors:</Alert.Heading>
              <ul className="mb-0">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!formData.itemName || !formData.ndc11 || !formData.packageCount || !formData.packageUnit || !formData.labeler_name || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : submitButtonText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ManualEntryModal;