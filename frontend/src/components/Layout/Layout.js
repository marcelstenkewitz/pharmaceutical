import { Stack } from "react-bootstrap";
import { Outlet, useNavigate } from 'react-router-dom';
import "./layout.css"

const Layout = () => {
  const navigate = useNavigate();

  const handleHeaderClick = (e) => {
    // Prevent default to avoid any potential issues
    if (e) {
      e.preventDefault();
    }

    // Always navigate to home page (which shows Create Report / View Reports)
    // Client context is preserved through ClientContext
    navigate('/');
  };

  // Handle touch events for better mobile support
  const handleTouchEnd = (e) => {
    // Prevent the click event from firing after touch
    e.preventDefault();
    handleHeaderClick(e);
  };
  
  console.log(window.innerWidth)
  return (
      <Stack gap={2} className="mx-auto">
        <div
          className="header-container mx-auto"
          onClick={handleHeaderClick}
          onTouchEnd={handleTouchEnd}
          role="button"
          tabIndex="0"
          aria-label="Navigate to home"
        >
          <h3 className="website-header">
            💊 DIRECT RETURNS
          </h3>
        </div>
        
        <Outlet />
      </Stack>
  )
}

export default Layout
