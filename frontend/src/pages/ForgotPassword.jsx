/**
 * ForgotPassword.jsx - Forgot Password Page
 *
 * Connects to POST /auth/forgot-password via api.js
 * Sends a reset link to the user's email address.
 * Always shows success message — prevents email enumeration.
 *
 * @author Lucky Nkwor
 * @course SWDV 1014 — Red Deer Polytechnic
 */

import React, { useState } from 'react';
import api from '../services/api';

const ForgotPassword = () => {
  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">

      {/* Left Column */}
      <div className="hidden lg:flex w-[40%] bg-fb-dark text-white p-16 flex-col justify-between">
        <div>
          <h1 className="text-7xl font-bold leading-tight">Food</h1>
          <h1 className="text-7xl font-bold text-fb-coral leading-tight">Bridge</h1>
          <p className="mt-4 text-xl opacity-80 font-light">
            Community Food Sharing Platform
          </p>
          <div className="mt-12 p-6 bg-white/10 rounded-2xl border border-white/10">
            <p className="text-lg font-semibold mb-2">Password Reset</p>
            <p className="text-sm opacity-70 leading-relaxed">
              Enter your registered email address and we will send you
              a secure link to reset your password. The link expires in 1 hour.
            </p>
          </div>
        </div>
        <p className="text-xs opacity-50 font-mono">
          Team ShareBite • Red Deer Polytechnic • SWDV 1014
        </p>
      </div>

      {/* Right Column */}
      <div className="w-full lg:w-[60%] p-10 md:p-20 flex flex-col justify-center items-center">
        <div className="max-w-md w-full mx-auto">

          {submitted ? (
            // Success state
            <div className="text-center">
              <div className="text-6xl mb-6">📬</div>
              <h2 className="text-3xl font-extrabold text-fb-dark mb-4">
                Check your inbox
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                If that email address is registered with FoodBridge,
                you will receive a reset link shortly. Check your spam
                folder if you don't see it within a few minutes.
              </p>
              <a href="/login"
                className="text-fb-coral hover:underline font-semibold text-sm">
                ← Back to Login
              </a>
            </div>
          ) : (
            // Form state
            <>
              <div className="flex gap-2 mb-8">
                <span className="bg-fb-coral text-white text-[10px] px-3 py-1 rounded font-black uppercase tracking-wider">
                  Password Reset
                </span>
                <span className="bg-fb-leaf text-white text-[10px] px-3 py-1 rounded font-black uppercase tracking-wider">
                  Secure Link
                </span>
              </div>

              <h2 className="text-4xl font-extrabold text-fb-dark tracking-tighter">
                Forgot Password?
              </h2>
              <p className="text-gray-500 mt-2 mb-8">
                Enter your email and we'll send you a reset link.
              </p>

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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="input-field w-full mt-1"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Reset Link →'}
                </button>

                <div className="text-center text-sm text-gray-500">
                  Remember your password?{' '}
                  <a href="/login" className="text-fb-coral hover:underline">
                    Sign in
                  </a>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;