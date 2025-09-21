import React, { useContext } from 'react'
import { Stack } from "react-bootstrap";
import { Outlet, useNavigate } from 'react-router-dom';
import { ClientContext } from "../../context/ClientContext";
import "./layout.css"

const Layout = () => {
  const navigate = useNavigate();
  const { selectedClient } = useContext(ClientContext);

  const handleHeaderClick = () => {
    // Navigate with client ID in URL to preserve context on mobile
    if (selectedClient) {
      const clientId = typeof selectedClient === 'object' ? selectedClient.id : selectedClient;
      navigate(`/scanning/client/${clientId}`);
    } else {
      navigate('/');
    }
  };
  
  console.log(window.innerWidth)
  return (
      <Stack gap={2} className="mx-auto">
        <div className="header-container mx-auto" onClick={handleHeaderClick}>
          <h3 className="website-header">
            💊 DIRECT RETURNS
          </h3>
        </div>
        
        <Outlet />
      </Stack>
  )
}

export default Layout
