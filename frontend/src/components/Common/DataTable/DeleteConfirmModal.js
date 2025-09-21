import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const DeleteConfirmModal = ({
  show,
  onHide,
  onConfirm,
  entityName = 'item',
  item = null,
  customMessage = null,
  customWarning = null,
  displayField = null // Field to show in confirmation (e.g., 'businessName', 'labeler_name')
}) => {
  const getDisplayValue = () => {
    if (!item) return 'this item';

    if (displayField && item[displayField]) {
      return item[displayField];
    }

    // Try common display fields
    const commonFields = ['businessName', 'name', 'labeler_name', 'title', 'itemName'];
    for (const field of commonFields) {
      if (item[field]) {
        return item[field];
      }
    }

    // Fallback to first string value or 'this item'
    const firstStringValue = Object.values(item).find(value =>
      typeof value === 'string' && value.trim() !== ''
    );

    return firstStringValue || 'this item';
  };

  const getDefaultMessage = () => {
    const displayValue = getDisplayValue();
    return `Are you sure you want to delete ${displayValue}?`;
  };

  const getWarningMessage = () => {
    if (customWarning) {
      return customWarning;
    }

    // Check for related data that might be affected
    if (item && item.reports && Array.isArray(item.reports) && item.reports.length > 0) {
      return `This action cannot be undone. All associated reports (${item.reports.length} reports) will also be deleted.`;
    }

    return 'This action cannot be undone.';
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Confirm Delete</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-3">
          {customMessage || getDefaultMessage()}
        </p>
        <p className="text-danger mb-0">
          <strong>Warning:</strong> {getWarningMessage()}
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Delete {entityName}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteConfirmModal;