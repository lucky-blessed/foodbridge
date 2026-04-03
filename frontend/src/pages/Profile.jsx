/**
 * Profile.jsx - User Profile Page
 *
 * Connects to:
 *  - GET  /auth/profile → load current user details
 *  - PATCH /auth/profile → update firstName and lastName
 *
 * Email and role are displayed but cannot be changed here.
 *
 * @author Lucky Nkwor
 * @course SWDV 1014 — Red Deer Polytechnic
 */

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';

const Profile = () => {
  const [profile,  setProfile]  = useState(null);
  const [formData, setFormData] = useState({ firstName: '', lastName: '' });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/auth/profile');
      setProfile(res.data.user);
      setFormData({
        firstName: res.data.user.first_name,
        lastName:  res.data.user.last_name
      });
    } catch (err) {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await api.patch('/auth/profile', formData);
      setProfile(res.data.user);
      // Update localStorage so Sidebar shows new name immediately
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...stored,
        first_name: res.data.user.first_name,
        last_name:  res.data.user.last_name
      }));
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const roleColor = {
    donor:     'bg-fb-leaf text-white',
    recipient: 'bg-fb-coral text-white',
    admin:     'bg-blue-600 text-white',
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-10">
        <header className="mb-10">
          <h2 className="text-3xl font-bold text-fb-dark">My Profile</h2>
          <p className="text-gray-500">Manage your account details.</p>
        </header>

        {loading && (
          <div className="text-center text-gray-400 mt-20">Loading profile...</div>
        )}

        {error && !loading && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {!loading && profile && (
          <div className="max-w-xl">

            {/* Read-only info card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center gap-4 mb-6">
                {/* Avatar */}
                <div className="w-16 h-16 bg-fb-dark rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {profile.first_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-xl font-bold text-fb-dark">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${roleColor[profile.role] || 'bg-gray-200'}`}>
                    {profile.role}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500 font-medium">Email</span>
                  <span className="text-fb-dark">{profile.email}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500 font-medium">Role</span>
                  <span className="text-fb-dark capitalize">{profile.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Member since</span>
                  <span className="text-fb-dark">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit form */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-fb-dark mb-4">Edit Name</h3>
              <p className="text-xs text-gray-400 mb-6">
                Email address and role cannot be changed here.
              </p>

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-sm font-medium text-fb-dark">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="input-field w-full mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-fb-dark">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="input-field w-full mt-1"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes →'}
                </button>
              </form>
            </div>

            {/* Password reset link */}
            <div className="mt-4 text-center">
              <a href="/forgot-password"
                className="text-sm text-fb-coral hover:underline">
                Change password →
              </a>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;