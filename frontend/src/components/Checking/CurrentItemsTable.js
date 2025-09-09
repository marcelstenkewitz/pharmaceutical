import React, { useState } from 'react';
import { Table, Card, Modal, Form, Alert, Button } from 'react-bootstrap';
import { deleteLineItemFromReport } from '../../Api/clientApi';

const CurrentItemsTable = ({ 
  currentReport, 
  selectedClient, 
  onItemUpdated, 
  onItemDeleted 
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);
  const [validationErrors, setValidationErrors] = useState([]);

  const handleEditItem = (item, index) => {
    setEditingItem({ ...item });
    setEditingItemIndex(index);
    setShowEditModal(true);
    setValidationErrors([]);
  };

  const handleSaveEditedItem = async () => {
    // Validate the edited item
    const errors = [];
    if (!editingItem.itemName?.trim()) errors.push('Item Name is required');
    if (!editingItem.ndc11?.trim()) errors.push('NDC-11 is required');
    if (!editingItem.packageSize?.trim()) errors.push('Package Size is required');
    if (!editingItem.packages || editingItem.packages < 1) errors.push('Quantity must be at least 1');

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      // Update the item in the local state
      const updatedItems = [...currentReport.items];
      updatedItems[editingItemIndex] = editingItem;
      
      // Call the parent callback to update the report
      if (onItemUpdated) {
        await onItemUpdated(updatedItems);
      }
      
      // Close the modal
      setShowEditModal(false);
      setEditingItem(null);
      setEditingItemIndex(-1);
      setValidationErrors([]);
    } catch (error) {
      console.error('Failed to save edited item:', error);
      setValidationErrors(['Failed to save changes. Please try again.']);
    }
  };

  const handleDeleteItem = async (index) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const item = currentReport.items[index];
      
      // If the report has a reportId and the item has an ID, delete from backend
      if (currentReport.reportId && item.id) {
        await deleteLineItemFromReport(selectedClient, currentReport.reportId, item.id);
      }
      
      // Update local state by removing the item
      const updatedItems = currentReport.items.filter((_, i) => i !== index);
      
      // Call the parent callback to update the report
      if (onItemDeleted) {
        await onItemDeleted(updatedItems);
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setEditingItemIndex(-1);
    setValidationErrors([]);
  };

  if (!currentReport?.items || currentReport.items.length === 0) {
    return null;
  }

  return (
    <>
      {/* Current Items Table */}
      <Card className="mb-4 current-items-card">
        <Card.Header>
          <h5 className="mb-0">Current Items in Report ({currentReport.items.length})</h5>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table striped hover className="current-items-table">
              <thead>
                <tr>
                  <th style={{ width: '8%' }}>Line #</th>
                  <th style={{ width: '35%' }}>Item Name</th>
                  <th style={{ width: '15%' }}>NDC-11</th>
                  <th style={{ width: '20%' }}>Package Size</th>
                  <th style={{ width: '10%' }}>Qty</th>
                  <th style={{ width: '12%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentReport.items.map((item, index) => (
                  <tr key={index}>
                    <td className="fw-bold">{index + 1}</td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: '300px' }} title={item.itemName}>
                        {item.itemName}
                      </div>
                    </td>
                    <td>
                      <code className="small">{item.ndc11}</code>
                    </td>
                    <td>{item.packageSize}</td>
                    <td className="text-center">
                      <span className="badge bg-secondary">{item.packages}</span>
                    </td>
                    <td>
                      <div className="d-flex gap-1 item-actions">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleEditItem(item, index)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteItem(index)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Edit Item Modal */}
      <Modal show={showEditModal} onHide={handleCancelEdit} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingItem && (
            <Form>
              <div className="row">
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>Item Name *</Form.Label>
                    <Form.Control
                      type="text"
                      value={editingItem.itemName || ''}
                      onChange={e => setEditingItem({...editingItem, itemName: e.target.value})}
                    />
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>NDC-11 *</Form.Label>
                    <Form.Control
                      type="text"
                      value={editingItem.ndc11 || ''}
                      onChange={e => setEditingItem({...editingItem, ndc11: e.target.value})}
                    />
                  </Form.Group>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>Package Size *</Form.Label>
                    <Form.Control
                      type="text"
                      value={editingItem.packageSize || ''}
                      onChange={e => setEditingItem({...editingItem, packageSize: e.target.value})}
                    />
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>Quantity *</Form.Label>
                    <Form.Control
                      type="number"
                      value={editingItem.packages || 1}
                      onChange={e => setEditingItem({...editingItem, packages: parseInt(e.target.value) || 1})}
                      min="1"
                    />
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
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelEdit}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEditedItem}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CurrentItemsTable;
