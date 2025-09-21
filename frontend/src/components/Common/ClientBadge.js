import React from 'react';
import { Badge } from 'react-bootstrap';
import ClientName from './ClientName';

const ClientBadge = ({ client, variant = "primary", className = "", placeholder = "Unnamed Business" }) => {
  return (
    <Badge bg={variant} className={className}>
      <ClientName client={client} placeholder={placeholder} />
    </Badge>
  );
};

export default ClientBadge;