import React, { useState, useContext, useEffect } from 'react';
import { Table, Card, Modal, Form, Alert, Button } from 'react-bootstrap';
import { ClientContext } from '../../context/ClientContext';
import apiService from '../../Services/ApiService';
import GenerateForm222Button from '../Reports/GenerateForm222Button';

const CurrentItemsTable = ({ 
  currentReport, 
  selectedClient
}) => {
  const { updateLineItem, deleteLineItem } = useContext(ClientContext);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [labelers, setLabelers] = useState([]);
  const [originalLabelerName, setOriginalLabelerName] = useState(null);

  // Get the client ID for API calls
  const clientId = selectedClient && typeof selectedClient === 'object' 
    ? selectedClient.id 
    : selectedClient;

  // Load labelers on component mount
  useEffect(() => {
    const loadLabelers = async () => {
      try {
        const response = await apiService.getLabelers();
        setLabelers(response.labelers || []);
      } catch (error) {
        console.error('Failed to load labelers:', error);
        setLabelers([]);
      }
    };
    loadLabelers();
  }, []);

  // Helper function to get return instructions for a labeler
  const getReturnInstructions = (labelerName) => {
    if (!labelerName || !labelers.length) return '';
    const labeler = labelers.find(l => l.labeler_name === labelerName);
    return labeler ? labeler.return_instructions : '';
  };

  const handleEditItem = (item, index) => {
    const editItem = { 
      ...item, 
      labeler_name: item.labeler_name || '',
      return_instructions: getReturnInstructions(item.labeler_name || '')
    };
    setEditingItem(editItem);
    setOriginalLabelerName(item.labeler_name || '');
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
    if (!editingItem.labeler_name?.trim()) errors.push('Labeler name is required');

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      // Check if labeler information was changed and update backend labelers if needed
      if (editingItem.labeler_name !== originalLabelerName || 
          (editingItem.return_instructions && editingItem.return_instructions.trim())) {
        
        // If there are return instructions, save/update the labeler
        if (editingItem.return_instructions?.trim()) {
          try {
            await apiService.saveLabeler(editingItem.labeler_name, editingItem.return_instructions);
            console.log(`Updated labeler ${editingItem.labeler_name} with return instructions`);
          } catch (labelerError) {
            console.error('Failed to save labeler:', labelerError);
            // Don't fail the whole operation if labeler save fails
          }
        }
      }

      // Use context method to update the line item
      await updateLineItem(clientId, currentReport.id, editingItem.id, editingItem);
      
      // Close the modal
      setShowEditModal(false);
      setEditingItem(null);
      setOriginalLabelerName(null);
      setValidationErrors([]);
    } catch (error) {
      console.error('Failed to save edited item:', error.message || error);
      setValidationErrors([error.message || 'Failed to save changes. Please try again.']);
    }
  };

  const handleDeleteItem = async (index) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const item = currentReport.items[index];
      
      // Use context method to delete the line item
      await deleteLineItem(clientId, currentReport.id, item.id);
    } catch (error) {
      console.error('Failed to delete item:', error.message || error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setOriginalLabelerName(null);
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
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Current Items in Report ({currentReport.items.length})</h5>
            {currentReport.id && clientId && currentReport.items.length > 0 && (
              <GenerateForm222Button 
                clientId={clientId}
                reportId={currentReport.id}
                report={{ 
                  id: currentReport.id, 
                  lineItems: currentReport.items,
                  client: selectedClient 
                }}
                variant="outline-info"
                size="sm"
              />
            )}
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table striped hover className="current-items-table">
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>Line #</th>
                  <th style={{ width: '20%' }}>Item Name</th>
                  <th style={{ width: '10%' }}>NDC-11</th>
                  <th style={{ width: '12%' }}>Package Size</th>
                  <th style={{ width: '6%' }}>Qty</th>
                  <th style={{ width: '10%' }}>Labeler</th>
                  <th style={{ width: '25%' }}>Notes for Return</th>
                  <th style={{ width: '12%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentReport.items.map((item, index) => (
                  <tr key={index}>
                    <td className="fw-bold">{index + 1}</td>
                    <td>
                      <div className="text-truncate d-flex align-items-center" style={{ maxWidth: '300px' }} title={item.itemName}>
                        {item.itemName}
                        {item.isManualEntry && (
                          <span 
                            className="badge bg-warning text-dark ms-2" 
                            style={{ fontSize: '0.7em' }}
                            title="Manual Entry"
                          >
                            🔧 Manual
                          </span>
                        )}
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
                      <div className="text-truncate" style={{ maxWidth: '120px' }} title={item.labeler_name || 'N/A'}>
                        {item.labeler_name || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: '200px', fontSize: '0.85em' }} title={getReturnInstructions(item.labeler_name)}>
                        {getReturnInstructions(item.labeler_name) || 'N/A'}
                      </div>
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
              <div className="row">
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>Labeler Name *</Form.Label>
                    <Form.Control
                      type="text"
                      value={editingItem.labeler_name || ''}
                      onChange={e => {
                        const newLabelerName = e.target.value;
                        let newReturnInstructions = editingItem.return_instructions || '';
                        
                        // If the labeler name has changed from the original, clear return instructions
                        if (newLabelerName !== originalLabelerName) {
                          // Check if the new labeler has existing instructions
                          const existingInstructions = getReturnInstructions(newLabelerName);
                          newReturnInstructions = existingInstructions || '';
                        }
                        // If labeler name is back to original, keep current instructions
                        
                        setEditingItem({
                          ...editingItem, 
                          labeler_name: newLabelerName,
                          return_instructions: newReturnInstructions
                        });
                      }}
                      placeholder="Enter labeler name"
                    />
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>Notes for Return</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={editingItem.return_instructions || ''}
                      onChange={e => setEditingItem({...editingItem, return_instructions: e.target.value})}
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
