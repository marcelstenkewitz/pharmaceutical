import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Alert, Badge } from 'react-bootstrap';
import { PencilSquare, Trash, Plus } from 'react-bootstrap-icons';
import Wrapper from '../Layout/Wrapper';
import ManualEntryModal from '../Scanning/ManualEntryModal';
import apiService from '../../Services/ApiService';

const ManualEntries = () => {
  const [entries, setEntries] = useState({});
  const [labelers, setLabelers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Load manual entries on component mount
  useEffect(() => {
    loadManualEntries();
  }, []);

  const loadManualEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const [entriesResponse, labelersResponse] = await Promise.all([
        apiService.getAllManualEntries(),
        apiService.getLabelers()
      ]);
      setEntries(entriesResponse.entries || {});
      setLabelers(labelersResponse.labelers || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load manual entries');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = () => {
    setShowAddModal(true);
  };

  const handleEditEntry = (barcode, entry) => {
    setEditingEntry({
      barcode: barcode,
      itemName: entry.itemName || '',
      ndcNumber: entry.ndcNumber || '',
      packageSize: entry.packageSize || '',
      pricePerEA: entry.pricePerEA || '',
      labeler_name: entry.labeler_name || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteEntry = async (barcode) => {
    if (!window.confirm('Are you sure you want to delete this manual entry?')) {
      return;
    }

    try {
      setError(null);
      await apiService.deleteManualEntry(barcode);
      await loadManualEntries();
    } catch (error) {
      console.error('Failed to delete manual entry:', error);
      setError('Failed to delete manual entry');
    }
  };

  const handleSaveEntry = async (formData) => {
    try {
      setError(null);
      await apiService.saveManualEntry(formData.barcode, formData);
      await loadManualEntries();
      setShowEditModal(false);
      setShowAddModal(false);
      setEditingEntry(null);
    } catch (error) {
      console.error('Failed to save manual entry:', error);
      setError('Failed to save manual entry');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const getReturnInstructions = (labelerName) => {
    const labeler = labelers.find(l => l.labeler_name === labelerName);
    return labeler ? labeler.return_instructions : 'Contact manufacturer for return instructions';
  };

  const entryArray = Object.entries(entries);

  return (
    <Wrapper>
      <Container className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Manual Entries Management</h2>
          <Button variant="primary" onClick={handleAddEntry}>
            <Plus className="me-2" />
            Add Manual Entry
          </Button>
        </div>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center">Loading manual entries...</div>
        ) : entryArray.length === 0 ? (
          <Alert variant="info" className="text-center">
            No manual entries found. Click "Add Manual Entry" to create your first entry.
          </Alert>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Barcode/Key</th>
                <th>Item Name</th>
                <th>NDC Number</th>
                <th>Package Size</th>
                <th>Labeler Name</th>
                <th>Return Instructions</th>
                <th>Price per EA</th>
                <th>Created</th>
                <th>Last Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entryArray.map(([barcode, entry]) => (
                <tr key={barcode}>
                  <td>
                    <code>{barcode}</code>
                    {entry.isManualEntry && (
                      <Badge bg="secondary" className="ms-2">Manual</Badge>
                    )}
                  </td>
                  <td>{entry.itemName || 'N/A'}</td>
                  <td><code>{entry.ndcNumber || 'N/A'}</code></td>
                  <td>{entry.packageSize || 'N/A'}</td>
                  <td>{entry.labeler_name || 'N/A'}</td>
                  <td style={{ maxWidth: '200px', fontSize: '0.85em' }}>
                    {getReturnInstructions(entry.labeler_name)}
                  </td>
                  <td>
                    {entry.pricePerEA ? `$${parseFloat(entry.pricePerEA).toFixed(2)}` : 'N/A'}
                  </td>
                  <td>{formatDate(entry.createdAt)}</td>
                  <td>{formatDate(entry.lastUsed)}</td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      onClick={() => handleEditEntry(barcode, entry)}
                    >
                      <PencilSquare />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDeleteEntry(barcode)}
                    >
                      <Trash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {/* Add Manual Entry Modal */}
        <ManualEntryModal
          show={showAddModal}
          onHide={() => {
            setShowAddModal(false);
            setError(null);
          }}
          onSubmit={handleSaveEntry}
          title="Add New Manual Entry"
          submitButtonText="Add Entry"
          saveToCache={false}
        />

        {/* Edit Manual Entry Modal */}
        <ManualEntryModal
          show={showEditModal}
          onHide={() => {
            setShowEditModal(false);
            setEditingEntry(null);
            setError(null);
          }}
          onSubmit={handleSaveEntry}
          title="Edit Manual Entry"
          submitButtonText="Save Changes"
          initialData={editingEntry}
          saveToCache={false}
        />
      </Container>
    </Wrapper>
  );
};

export default ManualEntries;
