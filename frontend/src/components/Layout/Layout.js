import React from 'react'
import { Stack } from "react-bootstrap";
import { Outlet, useNavigate } from 'react-router-dom';
import "./layout.css"

const Layout = () => {
  const navigate = useNavigate();
  
  const handleHeaderClick = () => {
    navigate('/');
  };
  
  console.log(window.innerWidth)
  return (
      <Stack gap={2} className="mx-auto mt-3">
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
