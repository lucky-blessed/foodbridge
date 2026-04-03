/**
 * ResetPassword.jsx - Reset Password Page
 *
 * Connects to POST /auth/reset-password via api.js
 * Reads the reset token from the URL query string:
 *   /reset-password?token=abc123...
 *
 * @author Lucky Nkwor
 * @course SWDV 1014 — Red Deer Polytechnic
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
  const [searchParams]   = useSearchParams();
  const token            = searchParams.get('token');

  const [formData,  setFormData]  = useState({ newPassword: '', confirm: '' });
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: formData.newPassword
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Reset failed. The link may have expired. Please request a new one.'
      );
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
            <p className="text-lg font-semibold mb-2">Secure Password Reset</p>
            <p className="text-sm opacity-70 leading-relaxed">
              Choose a strong password with at least 8 characters,
              including uppercase and lowercase letters.
              This link expires after one use.
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

          {success ? (
            <div className="text-center">
              <div className="text-6xl mb-6">✅</div>
              <h2 className="text-3xl font-extrabold text-fb-dark mb-4">
                Password Updated
              </h2>
              <p className="text-gray-500 mb-8">
                Your password has been reset successfully.
                You can now sign in with your new password.
              </p>
              <a href="/login"
                className="btn-primary inline-block px-8 py-3">
                Go to Login →
              </a>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-8">
                <span className="bg-fb-coral text-white text-[10px] px-3 py-1 rounded font-black uppercase tracking-wider">
                  New Password
                </span>
                <span className="bg-fb-leaf text-white text-[10px] px-3 py-1 rounded font-black uppercase tracking-wider">
                  Single Use Link
                </span>
              </div>

              <h2 className="text-4xl font-extrabold text-fb-dark tracking-tighter">
                Reset Password
              </h2>
              <p className="text-gray-500 mt-2 mb-8">
                Choose a new password for your FoodBridge account.
              </p>

              {!token && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  Invalid reset link. Please{' '}
                  <a href="/forgot-password" className="underline">
                    request a new one
                  </a>.
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-sm font-medium text-fb-dark">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    required
                    className="input-field w-full mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-fb-dark">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirm"
                    value={formData.confirm}
                    onChange={handleChange}
                    placeholder="Repeat your new password"
                    required
                    className="input-field w-full mt-1"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Password →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;