import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { createNdcService } from '../../Services/NdcService';
import apiService from '../../Services/ApiService';

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
  const [formData, setFormData] = useState({
    barcode: "",
    itemName: "",
    ndcNumber: "",
    packageSize: "",
    pricePerEA: "",
    labeler_name: ""
  });
  const [ndcValidation, setNdcValidation] = useState({ isValid: true, message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (show) {
      if (initialData) {
        // Use provided initial data for editing
        setFormData({
          barcode: initialData.barcode || "",
          itemName: initialData.itemName || "",
          ndcNumber: initialData.ndcNumber || "",
          packageSize: initialData.packageSize || "",
          pricePerEA: initialData.pricePerEA || "",
          labeler_name: initialData.labeler_name || ""
        });
      } else {
        // Use initialBarcode for new entries
        setFormData(prev => ({
          ...prev,
          barcode: initialBarcode || prev.barcode,
          // Only pre-fill NDC if the initial barcode appears to be valid NDC format
          ndcNumber: (initialBarcode && /^\d{11}$/.test(initialBarcode.replace(/\D/g, ''))) ? initialBarcode : prev.ndcNumber
        }));
      }
      setNdcValidation({ isValid: true, message: "" });
    }
  }, [show, initialBarcode, initialData]);

  // Validate NDC number using the same logic as barcode scanning
  const validateNdcNumber = (ndc) => {
    if (!ndc || ndc.trim() === "") {
      return { isValid: false, message: "NDC number is required" };
    }
    
    const norm = ndcService.normalizeScan(ndc.trim());
    if (norm.ok) {
      return { isValid: true, message: "" };
    } else {
      return { isValid: false, message: norm.reason || "Invalid NDC-11 format" };
    }
  };

  // Handle NDC input change with validation
  const handleNdcChange = (value) => {
    setFormData(prev => ({ ...prev, ndcNumber: value }));
    
    // Validate as user types
    if (value.trim() === "") {
      setNdcValidation({ isValid: true, message: "" });
    } else {
      const validation = validateNdcNumber(value);
      setNdcValidation(validation);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.itemName.trim() || !formData.ndcNumber.trim() || !formData.packageSize.trim() || !formData.labeler_name.trim()) {
      return;
    }

    // Validate NDC number
    const validation = validateNdcNumber(formData.ndcNumber);
    if (!validation.isValid) {
      setNdcValidation(validation);
      return;
    }

    setIsSubmitting(true);

    try {
      // Save to cache if requested
      if (saveToCache) {
        try {
          // Use barcode as key, or NDC if no barcode provided
          const cacheKey = formData.barcode.trim() || formData.ndcNumber;
          await apiService.saveManualEntry(cacheKey, {
            itemName: formData.itemName,
            ndcNumber: formData.ndcNumber,
            packageSize: formData.packageSize,
            pricePerEA: formData.pricePerEA,
            labeler_name: formData.labeler_name
          });
          console.log('Manual entry saved to cache with key:', cacheKey);
        } catch (error) {
          console.error('Failed to save manual entry to cache:', error);
        }
      }

      // Call the onSubmit callback with form data
      await onSubmit(formData);
      
      // Reset form and close modal
      handleClose();
    } catch (error) {
      console.error('Failed to submit manual entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form data
    setFormData({
      barcode: "",
      itemName: "",
      ndcNumber: "",
      packageSize: "",
      pricePerEA: "",
      labeler_name: ""
    });
    setNdcValidation({ isValid: true, message: "" });
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Barcode/Identifier</Form.Label>
            <Form.Control
              type="text"
              value={formData.barcode}
              onChange={(e) => handleInputChange('barcode', e.target.value)}
              placeholder="Scanned barcode or unique identifier"
            />
            <Form.Text className="text-muted">
              The barcode that was scanned or a unique identifier for this entry
            </Form.Text>
          </Form.Group>

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

          <Form.Group className="mb-3">
            <Form.Label>NDC Number *</Form.Label>
            <Form.Control
              type="text"
              value={formData.ndcNumber}
              onChange={(e) => handleNdcChange(e.target.value)}
              placeholder="NDC-11 format (e.g., 12345678901)"
              isInvalid={!ndcValidation.isValid}
              required
            />
            {!ndcValidation.isValid && ndcValidation.message && (
              <Form.Control.Feedback type="invalid">
                {ndcValidation.message}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Package Size *</Form.Label>
            <Form.Control
              type="text"
              value={formData.packageSize}
              onChange={(e) => handleInputChange('packageSize', e.target.value)}
              placeholder="e.g., 100 tablets"
              required
            />
          </Form.Group>

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

          <Form.Group className="mb-3">
            <Form.Label>Price per EA</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={formData.pricePerEA}
              onChange={(e) => handleInputChange('pricePerEA', e.target.value)}
              placeholder="Optional"
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={!formData.itemName || !formData.ndcNumber || !formData.packageSize || !formData.labeler_name || !ndcValidation.isValid || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : submitButtonText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ManualEntryModal;
