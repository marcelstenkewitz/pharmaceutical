import React, { useState } from 'react';
import { Container, Tab, Tabs, Card } from 'react-bootstrap';
import { PeopleFill, TagFill, PencilSquare } from 'react-bootstrap-icons';
import Wrapper from '../Layout/Wrapper';
import ClientManagement from './ClientManagement';
import LabelersManagement from './LabelersManagement';
import ManualEntries from './ManualEntries';
import './admin-panel.css';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('clients');

  return (
    <Wrapper>
      <Container fluid className="admin-panel-container py-4">
        <Card className="shadow-sm">
          <Card.Header className="bg-primary text-white">
            <h3 className="mb-0">
              <PencilSquare className="me-2" />
              Admin Panel - Edit Selection
            </h3>
            <p className="mb-0 mt-2 opacity-75">
              Manage clients, wholesalers, and manual entries
            </p>
          </Card.Header>
          <Card.Body className="p-0">
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="admin-tabs"
              justify
            >
              <Tab
                eventKey="clients"
                title={
                  <span>
                    <PeopleFill className="me-2" />
                    Clients
                  </span>
                }
              >
                <div className="tab-content-wrapper">
                  <ClientManagement />
                </div>
              </Tab>
              <Tab
                eventKey="wholesalers"
                title={
                  <span>
                    <TagFill className="me-2" />
                    Wholesalers
                  </span>
                }
              >
                <div className="tab-content-wrapper">
                  <LabelersManagement />
                </div>
              </Tab>
              <Tab
                eventKey="manual-entries"
                title={
                  <span>
                    <PencilSquare className="me-2" />
                    Manual Entries
                  </span>
                }
              >
                <div className="tab-content-wrapper">
                  <ManualEntries />
                </div>
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      </Container>
    </Wrapper>
  );
};

export default AdminPanel;
