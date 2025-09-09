import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import { PencilSquare, Trash, Plus } from 'react-bootstrap-icons';
import Wrapper from '../Layout/Wrapper';
import apiService from '../../Services/ApiService';

const LabelersManagement = () => {
  const [labelers, setLabelers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLabeler, setEditingLabeler] = useState(null);

  // Load labelers on component mount
  useEffect(() => {
    loadLabelers();
  }, []);

  const loadLabelers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getLabelers();
      setLabelers(response.labelers || []);
    } catch (error) {
      console.error('Failed to load labelers:', error);
      setError('Failed to load labelers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLabeler = () => {
    setEditingLabeler({
      labeler_name: '',
      return_instructions: ''
    });
    setShowAddModal(true);
  };

  const handleEditLabeler = (labeler) => {
    setEditingLabeler({
      labeler_name: labeler.labeler_name || '',
      return_instructions: labeler.return_instructions || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteLabeler = async (labelerName) => {
    if (!window.confirm(`Are you sure you want to delete labeler "${labelerName}"?`)) {
      return;
    }

    try {
      setError(null);
      await apiService.deleteLabeler(labelerName);
      await loadLabelers();
    } catch (error) {
      console.error('Failed to delete labeler:', error);
      setError('Failed to delete labeler');
    }
  };

  const handleSaveLabeler = async () => {
    if (!editingLabeler.labeler_name.trim() || !editingLabeler.return_instructions.trim()) {
      setError('Both labeler name and return instructions are required');
      return;
    }

    try {
      setError(null);
      await apiService.saveLabeler(editingLabeler.labeler_name, editingLabeler.return_instructions);
      await loadLabelers();
      setShowEditModal(false);
      setShowAddModal(false);
      setEditingLabeler(null);
    } catch (error) {
      console.error('Failed to save labeler:', error);
      setError('Failed to save labeler');
    }
  };

  return (
    <Wrapper>
      <Container className="mt-4">
        <div className="d-flex justify-content-between gap-2 align-items-center mb-4">
          <h2>Labelers & Return Instructions Management</h2>
          <Button variant="primary" onClick={handleAddLabeler}>
            <Plus className="ml-2" />
            Add Labeler
          </Button>
        </div>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center">Loading labelers...</div>
        ) : labelers.length === 0 ? (
          <Alert variant="info" className="text-center">
            No labelers found. Click "Add Labeler" to create your first entry.
          </Alert>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Labeler Name</th>
                <th>Return Instructions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {labelers.map((labeler, index) => (
                <tr key={index}>
                  <td>
                    <strong>{labeler.labeler_name}</strong>
                  </td>
                  <td>
                    <div className="text-wrap" style={{ maxWidth: '400px' }}>
                      {labeler.return_instructions}
                    </div>
                  </td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      onClick={() => handleEditLabeler(labeler)}
                    >
                      <PencilSquare />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDeleteLabeler(labeler.labeler_name)}
                    >
                      <Trash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {/* Add Labeler Modal */}
        <Modal show={showAddModal} onHide={() => {
          setShowAddModal(false);
          setEditingLabeler(null);
          setError(null);
        }} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Add New Labeler</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Labeler Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={editingLabeler?.labeler_name || ''}
                  onChange={(e) => setEditingLabeler(prev => ({
                    ...prev,
                    labeler_name: e.target.value
                  }))}
                  placeholder="e.g., Pfizer Inc, Johnson & Johnson"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Return Instructions *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={editingLabeler?.return_instructions || ''}
                  onChange={(e) => setEditingLabeler(prev => ({
                    ...prev,
                    return_instructions: e.target.value
                  }))}
                  placeholder="Detailed instructions for returning products to this labeler..."
                  required
                />
                <Form.Text className="text-muted">
                  Include phone numbers, addresses, special procedures, or portal information
                </Form.Text>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => {
              setShowAddModal(false);
              setEditingLabeler(null);
              setError(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveLabeler}>
              Add Labeler
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Edit Labeler Modal */}
        <Modal show={showEditModal} onHide={() => {
          setShowEditModal(false);
          setEditingLabeler(null);
          setError(null);
        }} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Edit Labeler</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Labeler Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={editingLabeler?.labeler_name || ''}
                  onChange={(e) => setEditingLabeler(prev => ({
                    ...prev,
                    labeler_name: e.target.value
                  }))}
                  placeholder="e.g., Pfizer Inc, Johnson & Johnson"
                  required
                  disabled // Don't allow editing labeler name for existing entries
                />
                <Form.Text className="text-muted">
                  Labeler name cannot be changed for existing entries
                </Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Return Instructions *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={editingLabeler?.return_instructions || ''}
                  onChange={(e) => setEditingLabeler(prev => ({
                    ...prev,
                    return_instructions: e.target.value
                  }))}
                  placeholder="Detailed instructions for returning products to this labeler..."
                  required
                />
                <Form.Text className="text-muted">
                  Include phone numbers, addresses, special procedures, or portal information
                </Form.Text>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => {
              setShowEditModal(false);
              setEditingLabeler(null);
              setError(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveLabeler}>
              Save Changes
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Wrapper>
  );
};

export default LabelersManagement;
