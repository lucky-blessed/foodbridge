import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Discover from './pages/Discover';
import PostFood from './pages/PostFood';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import ClaimLimit from './pages/ClaimLimit';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Wireframe 1: Registration */}
        <Route path="/register" element={<Register />} />

        <Route path="/login" element={<Login />} />
        
        {/* Main Application Flow */}
        <Route path="/discover" element={<Discover />} />
        <Route path="/post" element={<PostFood />} />
        {/* <Route path="/dashboard" element={<dashboard />} /> */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* ClaimLimit Flow */}
        <Route path="/claimlimit" element={<ClaimLimit />} />

        {/* Admin Flow */}
        <Route path="/admin" element={<Admin />} />

        {/* Default route */}
        {<Route path="/" element={<Navigate to="/register" replace />} />}
      </Routes>
    </BrowserRouter>
  );
}

export default App;