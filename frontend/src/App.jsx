import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Discover from './pages/Discover';
import PostFood from './pages/PostFood';
//import ClaimLimit from './pages/ClaimLimit';
//import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Wireframe 1: Registration */}
        <Route path="/register" element={<Register />} />
        
        {/* Main Application Flow */}
        <Route path="/discover" element={<Discover />} />
        <Route path="/post" element={<PostFood />} />
        {/* <Route path="/claim-status" element={<ClaimLimit />} /> */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Admin Flow */}
        {/* <Route path="/admin" element={<Admin />} /> */}

        {/* Default route */}
        <Route path="/" element={<Navigate to="/register" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;