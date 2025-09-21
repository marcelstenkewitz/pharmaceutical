import React from 'react';
import ClientName from './ClientName';

const ClientDisplay = ({ client, showContact = false, placeholder = "Unnamed Business" }) => {
  return (
    <div>
      <strong><ClientName client={client} placeholder={placeholder} /></strong>
      {showContact && client?.contactName && (
        <div className="text-muted small">Contact: {client.contactName}</div>
      )}
    </div>
  );
};

export default ClientDisplay;