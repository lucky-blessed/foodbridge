/**
 * Login.jsx - Login Page
 *
 * Connects to POST /auth/login via login() from auth.js service.
 *
 * On success:
 *  - token and user are stored in localStorage by auth.js
 *  - Redirects donor     → /post
 *  - Redirects recipient → /discover
 *  - Redirects admin     → /admin
 *
 * Styling matches Register.jsx conventions exactly.
 *
 * @author Yi Zhang
 * @course SWDV 1014 — Red Deer Polytechnic
 */

import React, { useState } from 'react';
import { login } from '../services/auth';

const Login = () => {
  const [formData, setFormData] = useState({
    email:    '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(formData);

      // Redirect based on role
      if (data.user.role === 'donor') {
        window.location.href = '/post';
      } else if (data.user.role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/discover';
      }
    } catch (err) {
      // if (err.response?.status === 400) {
      //   console.error('Unauthorized: Invalid email or password');
      // }
      if (err.response) {
        console.error('Login failed:', err.response.status);
        // console.error(err.request.responseURL, err.config.url);
        // console.error('Server Error:', err.response.status, err.response.data);
        // setLoginError(err.response.data?.message || 'Invalid email or password.');
      } else if (err.request) {
        console.error('Network Error: No response from server');
        setLoginError('Network error. Please check your connection.');
      } else {
        console.error('Request Setup Error:', err.message);
        setLoginError('Something went wrong. Please try again.');
      }
      setError(
        err.response?.data?.error || 'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">

      {/* ── Left Column ── */}
      <div className="hidden lg:flex w-[40%] bg-fb-dark text-white p-16 flex-col justify-between">
        <div>
          <h1 className="text-7xl font-bold leading-tight">Food</h1>
          <h1 className="text-7xl font-bold text-fb-coral leading-tight">Bridge</h1>
          <p className="mt-4 text-xl opacity-80 font-light">
            Community Food Sharing Platform
          </p>
          <div className="mt-12 space-y-4 max-w-sm">
            {[
              { icon: '🍽️', text: 'Connect donors & recipients' },
              { icon: '📍', text: 'Location-based discovery'    },
              { icon: '⚡', text: 'Real-time notifications'     },
              { icon: '⚖️', text: 'Fair distribution system'    },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white/10 p-4 rounded-xl border border-white/5 flex items-center gap-3"
              >
                <span className="text-fb-leaf text-xl">{feature.icon}</span>
                {feature.text}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs opacity-50 font-mono">
          Team ShareBite • Red Deer Polytechnic • SWDV 1014
        </p>
      </div>

      {/* ── Right Column — Login form ── */}
      <div className="w-full lg:w-[60%] p-10 md:p-20 flex flex-col justify-center items-center">
        <div className="max-w-md w-full mx-auto">

          {/* Badges */}
          <div className="flex gap-2 mb-8">
            <span className="bg-fb-coral text-white text-[10px] px-3 py-1 rounded font-black uppercase tracking-wider shadow-sm">
              Secure Login
            </span>
            <span className="bg-fb-leaf text-white text-[10px] px-3 py-1 rounded font-black uppercase tracking-wider shadow-sm">
              JWT Authentication
            </span>
          </div>

          <h2 className="text-4xl font-extrabold text-fb-dark tracking-tighter">
            Welcome Back
          </h2>
          <p className="text-gray-500 mt-2 mb-8">
            Sign in to your FoodBridge account
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>

            <div>
              <label className="text-sm font-medium text-fb-dark">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
                className="input-field w-full mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-fb-dark">
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="input-field w-full mt-1"
              />
            </div>

            <div className="text-right">
              <a href="/forgot-password"
                className="text-xs text-fb-coral hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>

            <div className="grid place-items-center text-sm text-gray-500">
              Don't have an account?{' '}
              <a href="/register" className="text-fb-coral hover:underline">
                Create one
              </a>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;