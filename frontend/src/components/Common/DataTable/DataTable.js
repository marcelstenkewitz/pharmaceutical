import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Alert, Card, Form } from 'react-bootstrap';
import { PencilSquare, Trash, Plus } from 'react-bootstrap-icons';
import Wrapper from '../../Layout/Wrapper';
import FormModal from './FormModal';
import DeleteConfirmModal from './DeleteConfirmModal';

const DataTable = ({
  title,
  entityName = 'item',
  columns = [],
  formFields = [],
  api = {},
  features = {
    search: false,
    add: true,
    edit: true,
    delete: true,
    deleteConfirmation: 'alert'
  },
  customModals = {},
  searchFields = [],
  emptyMessage = `No ${entityName}s found.`,
  addButtonText = `Add ${entityName}`,
  dataKey = null, // For accessing nested data in API response (e.g., 'clients', 'labelers')
  itemIdField = 'id', // Field to use as unique identifier
  onRowClick = null // Optional callback for row clicks
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    if (!api.load) {
      console.error('DataTable: No load function provided in api prop');
      setError('No data loading function provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log(`[DataTable] Loading ${entityName} data...`);

      const response = await api.load();

      // Extract data from response based on dataKey
      let responseData = response;
      if (dataKey && response[dataKey]) {
        responseData = response[dataKey];
      }

      // Ensure data is an array
      if (Array.isArray(responseData)) {
        setData(responseData);
      } else if (typeof responseData === 'object' && responseData !== null) {
        // Handle object data (like manual entries)
        setData(Object.entries(responseData));
      } else {
        setData([]);
      }

      console.log(`[DataTable] Loaded ${Array.isArray(responseData) ? responseData.length : Object.keys(responseData || {}).length} ${entityName}s`);
    } catch (error) {
      console.error(`[DataTable] Error loading ${entityName} data:`, error);
      setError(`Failed to load ${entityName}s: ${error.message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setShowAddModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowEditModal(true);
    setError(null);
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
    if (features.deleteConfirmation === 'modal') {
      setShowDeleteModal(true);
    } else {
      // Use window.confirm for simple confirmation
      const confirmMessage = `Are you sure you want to delete this ${entityName}?`;
      if (window.confirm(confirmMessage)) {
        executeDelete(item);
      }
    }
  };

  const executeDelete = async (item) => {
    if (!api.delete) {
      setError('Delete function not available');
      return;
    }

    try {
      setError(null);
      const itemId = Array.isArray(item) ? item[0] : item[itemIdField];
      await api.delete(itemId);
      await loadData();
      if (features.deleteConfirmation === 'modal') {
        setShowDeleteModal(false);
        setItemToDelete(null);
      }
    } catch (error) {
      console.error(`Failed to delete ${entityName}:`, error);
      setError(`Failed to delete ${entityName}`);
    }
  };

  const handleSave = async (formData) => {
    try {
      setError(null);

      if (editingItem) {
        // Update existing item
        if (!api.update) {
          setError('Update function not available');
          return;
        }
        const itemId = editingItem[itemIdField];
        await api.update(itemId, formData);
      } else {
        // Create new item
        if (!api.create) {
          setError('Create function not available');
          return;
        }
        await api.create(formData);
      }

      await loadData();
      setShowAddModal(false);
      setShowEditModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error(`Failed to save ${entityName}:`, error);
      setError(`Failed to save ${entityName}: ${error.message || error}`);
    }
  };

  // Filter data based on search term
  const filteredData = features.search && searchTerm ?
    data.filter(item => {
      const searchableFields = searchFields.length > 0 ?
        searchFields :
        columns.map(col => col.key).filter(key => key);

      return searchableFields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
      });
    }) : data;

  const renderCellContent = (item, column) => {
    if (column.render) {
      return column.render(item);
    }

    const value = item[column.key];
    if (value === null || value === undefined) {
      return '-';
    }

    return value.toString();
  };

  const AddModal = customModals.add || FormModal;
  const EditModal = customModals.edit || FormModal;

  return (
    <Wrapper>
      <Container className="mt-4">
        <Card>
          <Card.Header>
            <div className="d-flex justify-content-between align-items-center">
              <h3>{title}</h3>
              {features.add && (
                <Button variant="primary" onClick={handleAdd}>
                  <Plus className="me-2" />
                  {addButtonText}
                </Button>
              )}
            </div>
          </Card.Header>
          <Card.Body>
            {error && (
              <Alert variant="danger" className="mb-3" dismissible onClose={() => setError(null)}>
                <Alert.Heading>Error</Alert.Heading>
                {error}
              </Alert>
            )}

            {features.search && (
              <div className="mb-3">
                <Form.Control
                  type="text"
                  placeholder={`Search ${entityName}s...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-100 w-md-50"
                />
              </div>
            )}

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div>
                  <h5>Loading {title}...</h5>
                  <p className="text-muted">Please wait while we fetch your data</p>
                </div>
              </div>
            ) : filteredData.length === 0 ? (
              <Alert variant="info" className="text-center">
                {features.search && searchTerm ?
                  `No ${entityName}s found matching your search.` :
                  emptyMessage
                }
              </Alert>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    {columns.map((column, index) => (
                      <th key={index}>{column.label}</th>
                    ))}
                    {(features.edit || features.delete) && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, index) => (
                    <tr
                      key={Array.isArray(item) ? item[0] : (item[itemIdField] || index)}
                      onClick={onRowClick ? () => onRowClick(item) : undefined}
                      style={onRowClick ? { cursor: 'pointer' } : {}}
                      className={onRowClick ? 'table-row-clickable' : ''}
                    >
                      {columns.map((column, colIndex) => (
                        <td key={colIndex}>
                          {renderCellContent(item, column)}
                        </td>
                      ))}
                      {(features.edit || features.delete) && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="d-flex gap-2">
                            {features.edit && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleEdit(item)}
                                aria-label={`Edit ${entityName}`}
                              >
                                <PencilSquare />
                                <span className="d-none d-md-inline ms-1">Edit</span>
                              </Button>
                            )}
                            {features.delete && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDelete(item)}
                                aria-label={`Delete ${entityName}`}
                              >
                                <Trash />
                                <span className="d-none d-md-inline ms-1">Delete</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>

        {/* Add Modal */}
        {features.add && (
          <AddModal
            show={showAddModal}
            onHide={() => {
              setShowAddModal(false);
              setEditingItem(null);
              setError(null);
            }}
            onSave={handleSave}
            title={`Add New ${entityName}`}
            formFields={formFields}
            error={error}
          />
        )}

        {/* Edit Modal */}
        {features.edit && (
          <EditModal
            show={showEditModal}
            onHide={() => {
              setShowEditModal(false);
              setEditingItem(null);
              setError(null);
            }}
            onSave={handleSave}
            title={`Edit ${entityName}`}
            formFields={formFields}
            initialData={editingItem}
            error={error}
          />
        )}

        {/* Delete Confirmation Modal */}
        {features.delete && features.deleteConfirmation === 'modal' && (
          <DeleteConfirmModal
            show={showDeleteModal}
            onHide={() => {
              setShowDeleteModal(false);
              setItemToDelete(null);
            }}
            onConfirm={() => executeDelete(itemToDelete)}
            entityName={entityName}
            item={itemToDelete}
          />
        )}
      </Container>
    </Wrapper>
  );
};

export default DataTable;