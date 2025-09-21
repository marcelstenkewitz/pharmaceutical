import React from "react";
import Main from "./pages/Main";
import Layout from "./components/Layout/Layout";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Reports from "./components/Reports/Reports";
import ScanOut from "./components/Scanning/ScanOut";
import ManualEntries from "./components/Admin/ManualEntries";
import ClientManagement from "./components/Admin/ClientManagement";
import LabelersManagement from "./components/Admin/LabelersManagement";

//TO DO
//Move scanner logic out
//Create page lay out --done
//Style components using bootstrap
//Need auth
//Login page
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Main />} />
          {/* Reports routes */}
          <Route path="reports" element={<Reports />} />
          <Route path="reports/client/:clientId" element={<Reports />} />
          {/* Scanning routes */}
          <Route path="scanning" element={<ScanOut />} />
          <Route path="scanning/client/:clientId" element={<ScanOut />} />
          <Route path="scanning/client/:clientId/report/:reportId" element={<ScanOut />} />
          {/* Admin routes */}
          <Route path="clients" element={<ClientManagement />} />
          <Route path="manual-entries" element={<ManualEntries />} />
          <Route path="labelers" element={<LabelersManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
