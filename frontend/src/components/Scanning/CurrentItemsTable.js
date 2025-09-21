import React, { useState, useContext, useEffect } from 'react';
import { Table, Card, Modal, Form, Alert, Button, Badge } from 'react-bootstrap';
import { ClientContext } from '../../context/ClientContext';
import { calculateLineTotal, calculatePackagePrice, parsePackageSize } from '../../services/PricingUtils';
import { createNdcService } from '../../services/NdcService';
import GenerateForm222Button from '../Reports/GenerateForm222Button';
import GenerateInventoryButton from '../Reports/GenerateInventoryButton';
import './current-items-table.css';


const CurrentItemsTable = ({
  selectedClient
}) => {
  const { currentReport, updateLineItem, deleteLineItem } = useContext(ClientContext);

  // Debug logging for currentReport changes
  useEffect(() => {
    console.log('🔍 CurrentItemsTable currentReport changed:', currentReport);
    console.log('🔍 CurrentItemsTable items count:', currentReport?.items?.length || 0);
  }, [currentReport]);

  // Log re-renders
  useEffect(() => {
    console.log('🔄 CurrentItemsTable component re-rendered');
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [ndcValidation, setNdcValidation] = useState({ isValid: true, message: "" });

  // Create NDC service instance
  const ndcService = createNdcService();

  // Get the client ID for API calls
  const clientId = selectedClient && typeof selectedClient === 'object' 
    ? selectedClient.id 
    : selectedClient;

  // Labelers are now loaded from ClientContext automatically

  // useEffect for automatic price recalculation when editing pricing fields
  useEffect(() => {
    if (editingItem && editingItem.pricePerUnit && editingItem.unitsPerPackage && editingItem.packages) {
      const pricePerPackage = calculatePackagePrice(editingItem.pricePerUnit, editingItem.unitsPerPackage);
      const totalPrice = calculateLineTotal(editingItem.pricePerUnit, editingItem.unitsPerPackage, editingItem.packages);

      // Only update if the calculated values are different to avoid infinite loops
      if (editingItem.pricePerPackage !== pricePerPackage || editingItem.totalPrice !== totalPrice) {
        setEditingItem(prev => ({
          ...prev,
          pricePerPackage,
          totalPrice
        }));
      }
    }
  }, [editingItem]);

  // Helper function to get return instructions from the selected client
  const getReturnInstructions = () => {
    return selectedClient?.returnInstructions || '';
  };


  const handleEditItem = (item, index) => {
    console.log('🔍 handleEditItem called with item:', item);

    // Prefer existing separated fields over re-parsing packageSize
    let packageCount, packageUnit;

    if (item.packageCount && item.packageUnit) {
      // Use existing separated fields if available
      packageCount = item.packageCount;
      packageUnit = item.packageUnit;
      console.log('✅ Using existing packageCount and packageUnit:', { packageCount, packageUnit });
    } else {
      // Fallback to parsing packageSize
      const parsed = parsePackageSize(item.packageSize);
      packageCount = parsed?.count || 1;
      packageUnit = parsed?.unit || 'units';
      console.log('⚠️ Parsed packageSize:', { packageSize: item.packageSize, parsed, packageCount, packageUnit });
    }

    const editItem = {
      ...item,
      labeler_name: selectedClient?.labelerName || 'N/A',
      return_instructions: getReturnInstructions(),
      // Use the determined package count and unit
      packageCount,
      packageUnit
    };

    console.log('📝 Setting editingItem:', editItem);
    setEditingItem(editItem);
    setShowEditModal(true);
    setValidationErrors([]);
  };

  const handleSaveEditedItem = async () => {
    console.log('🚀 SAVE BUTTON CLICKED!');
    console.log('💾 handleSaveEditedItem called with editingItem:', editingItem);
    console.log('🔍 currentReport at start of save:', currentReport);

    // Ensure packageSize is properly combined from separate fields with proper defaults
    const finalPackageCount = editingItem.packageCount === '' || !editingItem.packageCount ? 1 : editingItem.packageCount;
    const finalPackageUnit = editingItem.packageUnit === '' || !editingItem.packageUnit ? 'units' : editingItem.packageUnit;
    const packageSize = `${finalPackageCount} ${finalPackageUnit}`;

    console.log('🔍 DEBUG - editingItem.packages before itemToSave:', editingItem.packages);
    console.log('🔍 DEBUG - finalPackageCount:', finalPackageCount);
    console.log('🔍 DEBUG - editingItem full object:', editingItem);

    const itemToSave = {
      ...editingItem,
      packageSize,
      packageCount: finalPackageCount,
      packageUnit: finalPackageUnit
    };

    console.log('💾 itemToSave prepared:', itemToSave);
    console.log('🔍 DEBUG - itemToSave.packages:', itemToSave.packages);

    // Validate the edited item
    const errors = [];
    if (!itemToSave.itemName?.trim()) errors.push('Item Name is required');
    if (!itemToSave.ndc11?.trim()) errors.push('NDC-11 is required');
    if (!finalPackageCount || finalPackageCount < 1) errors.push('Package Size count is required and must be at least 1');
    if (!finalPackageUnit?.trim()) errors.push('Package Unit is required');
    if (!itemToSave.packages || itemToSave.packages < 1) errors.push('Quantity must be at least 1');
    if (!itemToSave.labeler_name?.trim()) errors.push('Labeler name is required');

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      // Use context method to update the line item
      console.log('📡 About to call updateLineItem with:', { clientId, reportId: currentReport.id, itemId: itemToSave.id, itemToSave });
      console.log('🔍 currentReport before API call:', currentReport);

      const updateResult = await updateLineItem(clientId, currentReport.id, itemToSave.id, itemToSave);

      console.log('📡 updateLineItem result:', updateResult);
      console.log('🔍 currentReport after API call:', currentReport);

      console.log('✅ Save operation completed successfully');

      // Close the modal
      setShowEditModal(false);
      setEditingItem(null);
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
      console.log('🗑️ Attempting to delete item:', { index, item, itemId: item?.id });

      // Check if item has an ID before attempting to delete
      if (!item || !item.id) {
        console.error('Cannot delete item: item or item.id is missing', { item });
        alert('Cannot delete this item: missing ID. Please refresh the page and try again.');
        return;
      }

      // Use context method to delete the line item
      console.log('📡 Calling deleteLineItem with:', { clientId, reportId: currentReport.id, itemId: item.id });
      await deleteLineItem(clientId, currentReport.id, item.id);
    } catch (error) {
      console.error('Failed to delete item:', error.message || error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingItem(null);
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
              <div className="d-flex gap-2">
                <GenerateInventoryButton 
                  clientId={clientId}
                  reportId={currentReport.id}
                  report={{ 
                    id: currentReport.id, 
                    lineItems: currentReport.items,
                    client: selectedClient 
                  }}
                  variant="outline-success"
                  size="sm"
                />
                <GenerateForm222Button 
                  clientId={clientId}
                  reportId={currentReport.id}
                  report={{ 
                    id: currentReport.id, 
                    lineItems: currentReport.items,
                    client: selectedClient 
                  }}
                  variant="outline-danger"
                  size="sm"
                />
              </div>
            )}
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {/* Desktop Table View */}
          <div className="table-responsive d-none d-lg-block">
            <Table striped hover className="current-items-table">
              <thead>
                <tr>
                  <th>Line #</th>
                  <th>Item Name</th>
                  <th>NDC-11</th>
                  <th>Package Details</th>
                  <th>Qty</th>
                  <th>Pricing</th>
                  <th>Total Price</th>
                  <th>DEA</th>
                  <th>Labeler</th>
                  <th>Notes for Return</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentReport.items.map((item, index) => (
                  <tr key={index}>
                    <td className="fw-bold">{index + 1}</td>
                    <td>
                      <div className="item-name-truncate-table" title={item.itemName}>
                        {item.itemName}
                        {item.isManualEntry && (
                          <span
                            className="manual-entry-badge-table"
                            title="Manual Entry"
                          >
                            🔧 Manual
                          </span>
                        )}
                        {item.hasFDAData && (
                          <span
                            className="fda-verified-badge-table"
                            title="FDA Verified Data"
                          >
                            ✅ FDA
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <code className="small">{item.ndc11}</code>
                    </td>
                    <td>
                      <div>
                        <strong className="text-primary">{item.packageSize}</strong>
                        {item.unitsPerPackage && (
                          <div className="small text-muted">
                            {item.unitsPerPackage} units/pkg
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="badge bg-secondary">{item.packages}</span>
                    </td>
                    <td className="text-end">
                      <div>
                        <strong>${item.pricePerUnit ? item.pricePerUnit.toFixed(4) : '0.0000'}</strong>
                        <small className="text-muted d-block">per {item.pricingUnit || 'unit'}</small>
                      </div>
                      <div className="mt-1">
                        <span className="text-info">${item.pricePerPackage ? item.pricePerPackage.toFixed(2) : '0.00'}</span>
                        <small className="text-muted d-block">per package</small>
                      </div>
                    </td>
                    <td className="text-end">
                      <strong className="text-success">${item.totalPrice ? item.totalPrice.toFixed(2) : '0.00'}</strong>
                    </td>
                    <td className="text-center">
                      {item.dea_schedule ? (
                        <Badge 
                          bg={item.dea_schedule === 'CI' || item.dea_schedule === 'CII' ? 'danger' : 
                              item.dea_schedule === 'CIII' ? 'warning' :
                              item.dea_schedule === 'CIV' || item.dea_schedule === 'CV' ? 'info' : 'secondary'}
                          title={item.dea_schedule === 'CI' || item.dea_schedule === 'CII' ? 'Requires Form 222' : 
                                 `Schedule ${item.dea_schedule.substring(1)} Controlled Substance`}
                        >
                          {item.dea_schedule}
                        </Badge>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="labeler-name-truncate" title={selectedClient?.labelerName || 'N/A'}>
                        {selectedClient?.labelerName || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div className="return-instructions-truncate" title={getReturnInstructions()}>
                        {getReturnInstructions() || 'N/A'}
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

          {/* Mobile Card View */}
          <div className="d-block d-lg-none">
            {currentReport.items.map((item, index) => (
              <div key={index} className="border-bottom p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center">
                    <span className="badge bg-primary me-2">#{index + 1}</span>
                    <h6 className="item-header-title">
                      {item.itemName}
                      {item.isManualEntry && (
                        <span
                          className="manual-entry-badge-mobile"
                          title="Manual Entry"
                        >
                          🔧 Manual
                        </span>
                      )}
                      {item.hasFDAData && (
                        <span
                          className="fda-verified-badge-mobile"
                          title="FDA Verified Data"
                        >
                          ✅ FDA
                        </span>
                      )}
                    </h6>
                  </div>
                  <div className="d-flex gap-1">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleEditItem(item, index)}
                      className="btn-table-small"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDeleteItem(index)}
                      className="btn-table-small"
                    >
                      Del
                    </Button>
                  </div>
                </div>
                
                <div className="row g-2 small">
                  <div className="col-6">
                    <strong>NDC:</strong> <code className="small">{item.ndc11}</code>
                  </div>
                  <div className="col-6">
                    <strong>Qty:</strong> <span className="badge bg-secondary">{item.packages}</span>
                  </div>
                  <div className="col-12">
                    <strong>Package:</strong>
                    <div>
                      <strong className="text-primary">{item.packageSize}</strong>
                      {item.unitsPerPackage && (
                        <div className="small text-muted">
                          {item.unitsPerPackage} units per package
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-6">
                    <strong>Unit Price:</strong> ${item.pricePerUnit ? item.pricePerUnit.toFixed(4) : '0.0000'} per {item.pricingUnit || 'unit'}
                  </div>
                  <div className="col-6">
                    <strong>Package Price:</strong> ${item.pricePerPackage ? item.pricePerPackage.toFixed(2) : '0.00'}
                  </div>
                  <div className="col-12">
                    <strong>Total Price:</strong> <span className="text-success fw-bold">${item.totalPrice ? item.totalPrice.toFixed(2) : '0.00'}</span>
                  </div>
                  {item.dea_schedule && (
                    <div className="col-6">
                      <strong>DEA:</strong>{' '}
                      <Badge 
                        bg={item.dea_schedule === 'CI' || item.dea_schedule === 'CII' ? 'danger' : 
                            item.dea_schedule === 'CIII' ? 'warning' :
                            item.dea_schedule === 'CIV' || item.dea_schedule === 'CV' ? 'info' : 'secondary'}
                        title={item.dea_schedule === 'CI' || item.dea_schedule === 'CII' ? 'Requires Form 222' : 
                               `Schedule ${item.dea_schedule.substring(1)} Controlled Substance`}
                      >
                        {item.dea_schedule}
                      </Badge>
                    </div>
                  )}
                  <div className="col-12">
                    <strong>Labeler:</strong> {selectedClient?.labelerName || 'N/A'}
                  </div>
                  {getReturnInstructions() && (
                    <div className="col-12">
                      <strong>Return Notes:</strong>
                      <div className="text-muted small mt-1">
                        {getReturnInstructions()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* Edit Item Modal */}
      <Modal show={showEditModal} onHide={handleCancelEdit} size="lg" scrollable>
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
                    <Form.Label>NDC-11/Product Code *</Form.Label>
                    <Form.Control
                      type="text"
                      value={editingItem.ndc11 || ''}
                      onChange={e => {
                        const value = e.target.value;
                        setEditingItem({...editingItem, ndc11: value});

                        // Validate NDC using centralized validation
                        if (value.trim() === "") {
                          setNdcValidation({ isValid: true, message: "" });
                        } else {
                          const isManual = editingItem?.isManualEntry;
                          let validation;
                          if (isManual || ndcService.utils.isCustomCode(value)) {
                            validation = ndcService.utils.validateManualCode(value);
                          } else {
                            validation = ndcService.utils.validateStandardNDC(value);
                          }
                          setNdcValidation(validation);
                        }
                      }}
                      disabled={editingItem?.hasFDAData}
                      isInvalid={!ndcValidation.isValid}
                    />
                    {!ndcValidation.isValid && ndcValidation.message && (
                      <Form.Control.Feedback type="invalid">
                        {ndcValidation.message}
                      </Form.Control.Feedback>
                    )}
                    {editingItem?.hasFDAData && (
                      <Form.Text className="text-muted">
                        🔒 NDC locked - FDA verified item
                      </Form.Text>
                    )}
                  </Form.Group>
                </div>
              </div>
              <div className="row">
                <div className="col-md-3">
                  <Form.Group className="mb-3">
                    <Form.Label>Package Size *</Form.Label>
                    <Form.Control
                      type="number"
                      value={editingItem.packageCount || ''}
                      onChange={e => {
                        const inputValue = e.target.value;
                        const newCount = inputValue === '' ? '' : parseInt(inputValue) || 0;
                        const newPackageSize = inputValue === '' ? '' : `${newCount || 1} ${editingItem.packageUnit || 'units'}`;
                        setEditingItem({
                          ...editingItem,
                          packageCount: newCount,
                          packageSize: newPackageSize,
                          unitsPerPackage: newCount || 1
                        });
                      }}
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
                      value={editingItem.packageUnit || ''}
                      onChange={e => {
                        const newUnit = e.target.value;
                        const newPackageSize = newUnit === '' ? '' : `${editingItem.packageCount || 1} ${newUnit || 'units'}`;
                        setEditingItem({
                          ...editingItem,
                          packageUnit: newUnit,
                          packageSize: newPackageSize
                        });
                      }}
                      placeholder="tablets"
                      list="packageUnits"
                    />
                    <datalist id="packageUnits">
                      <option value="tablets" />
                      <option value="capsules" />
                      <option value="patches" />
                      <option value="mL" />
                      <option value="grams" />
                      <option value="mg" />
                      <option value="mcg" />
                      <option value="units" />
                    </datalist>
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
                <div className="col-md-4">
                  <Form.Group className="mb-3">
                    <Form.Label>Price per Unit</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.0001"
                      value={editingItem.pricePerUnit || ''}
                      onChange={e => setEditingItem({...editingItem, pricePerUnit: parseFloat(e.target.value) || 0})}
                      placeholder="0.0000"
                    />
                  </Form.Group>
                </div>
                <div className="col-md-4">
                  <Form.Group className="mb-3">
                    <Form.Label>Units per Package</Form.Label>
                    <Form.Control
                      type="number"
                      value={editingItem.unitsPerPackage || ''}
                      onChange={e => setEditingItem({...editingItem, unitsPerPackage: parseInt(e.target.value) || 0})}
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
                      value={editingItem.pricePerPackage ? `$${editingItem.pricePerPackage.toFixed(4)}` : '$0.0000'}
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
                      value={editingItem.totalPrice ? `$${editingItem.totalPrice.toFixed(2)}` : '$0.00'}
                      readOnly
                      className="bg-light"
                    />
                    <Form.Text className="text-muted">
                      Calculated automatically (Price per Unit × Units per Package × Quantity)
                    </Form.Text>
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
                      disabled
                      title="Labeler is set at the client level"
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
                      disabled
                      title="Return instructions are set at the client level"
                      placeholder="Return instructions are set at the client level"
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
