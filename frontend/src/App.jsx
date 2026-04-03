/**
 * App.jsx - Root Application Component
 *
 * Defines the client-side routing structure for FoodBridge.
 * Uses React Router v6 BrowserRouter for navigation.
 *
 * Route structure:
 *  /login      → Login page (default entry point)
 *  /register   → Registration page
 *  /discover   → Food discovery map (recipients)
 *  /post       → Post a food donation (donors)
 *  /dashboard  → Donor activity dashboard
 *  /claimlimit → Recipient claim allowance tracker
 *  /admin      → Admin moderation panel
 *  /           → Redirects to /login
 *
 * Auth note:
 *  Route protection is handled inside each page component.
 *  If a user is not logged in, the API returns 401 and the
 *  Axios response interceptor in api.js redirects to /login.
 *
 * @author Team ShareBite
 * @course SWDV 1014 — Red Deer Polytechnic
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register   from './pages/Register';
import Login      from './pages/Login';
import Discover   from './pages/Discover';
import PostFood   from './pages/PostFood';
import Admin      from './pages/Admin';
import Dashboard  from './pages/Dashboard';
import ClaimLimit from './pages/ClaimLimit';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import Profile        from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/register"   element={<Register />} />
        <Route path="/login"      element={<Login />} />

        {/* Recipient flow */}
        <Route path="/discover"   element={<Discover />} />
        <Route path="/claimlimit" element={<ClaimLimit />} />

        {/* Donor flow */}
        <Route path="/post"       element={<PostFood />} />
        <Route path="/dashboard"  element={<Dashboard />} />

        {/* Admin flow */}
        <Route path="/admin"      element={<Admin />} />

        {/* Default — redirect to login */}
        <Route path="/"           element={<Navigate to="/login" replace />} />
                
                
        {/* forgot password flow */}
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/**Reset password flow */}
        <Route path="/reset-password"  element={<ResetPassword />} />

        {/** Profile flow */}
        <Route path="/profile"         element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;