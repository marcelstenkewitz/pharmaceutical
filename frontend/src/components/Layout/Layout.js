import React, { useContext } from 'react'
import { Stack } from "react-bootstrap";
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ClientContext } from '../../context/ClientContext';
import "./layout.css"

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClient } = useContext(ClientContext);

  const handleHeaderClick = () => {
    // If we have a selected client and we're on a client-specific route, navigate to the client's main page
    if (selectedClient) {
      // Check current path to determine best navigation
      if (location.pathname.includes('/scanning')) {
        // If on scanning page, go to client's scanning page
        navigate(`/scanning/client/${selectedClient.id}`);
      } else if (location.pathname.includes('/reports')) {
        // If on reports page, go to client's reports page
        navigate(`/reports/client/${selectedClient.id}`);
      } else {
        // Otherwise just go home
        navigate('/');
      }
    } else {
      // No client selected, go to home
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
