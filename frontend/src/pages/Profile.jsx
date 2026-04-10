/**
 * Profile.jsx - User Profile Page
 *
 * Connects to:
 *  - GET  /auth/profile → load current user details
 *  - PATCH /auth/profile → update name, picture, and other profile fields
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
  const [profile,    setProfile]    = useState(null);
  const [formData,   setFormData]   = useState({ firstName: '', lastName: '' });
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [picFile,    setPicFile]    = useState(null);
  const [picPreview, setPicPreview] = useState(null);
  const [picSaving,  setPicSaving]  = useState(false);
  const [zoomPic, setZoomPic] = useState(false);

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

      // Sync full profile into localStorage so Sidebar always
      // has the latest picture and name without a page reload
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...stored,
        ...res.data.user
      }));
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
      const res = await api.patch('/auth/profile', {
        firstName: formData.firstName,
        lastName:  formData.lastName
      });
      setProfile(res.data.user);
      // Sync name changes into localStorage immediately
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...stored,
        first_name:      res.data.user.first_name,
        last_name:       res.data.user.last_name,
        profile_pic_url: res.data.user.profile_pic_url
      }));
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePicture = async () => {
    if (!picFile) return;
    setPicSaving(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('profilePic', picFile);
      const res = await api.patch('/auth/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(res.data.user);
      // Sync new picture URL into localStorage so Sidebar updates
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...stored,
        profile_pic_url: res.data.user.profile_pic_url
      }));
      setPicFile(null);
      setPicPreview(null);
      setSuccess('Profile picture updated successfully.');
    } catch {
      setError('Failed to upload picture. Please try again.');
    } finally {
      setPicSaving(false);
    }
  };

  const roleColor = {
    donor:     'bg-fb-light text-white',
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

            {/* ── Profile info card ─────────────────────────────── */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">

              {/* Avatar + name row */}
              <div className="flex items-center gap-4 mb-6">

                {/* Profile picture with edit button */}
                <div className="relative flex-shrink-0">
                  {profile.profile_pic_url || picPreview ? (
                    <img
                      src={picPreview || profile.profile_pic_url}
                      alt="Profile"
                      onClick={() => !picPreview && setZoomPic(true)}
                      className="w-16 h-16 rounded-full object-cover border-2 border-fb-mint
                                cursor-zoom-in hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-fb-dark rounded-full flex items-center
                                    justify-center text-white text-2xl font-bold">
                      {profile.first_name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  {/* + button opens file picker */}
                  <label htmlFor="profilePicInput"
                    className="absolute bottom-0 right-0 bg-fb-coral text-white rounded-full
                               w-6 h-6 flex items-center justify-center cursor-pointer
                               text-sm font-bold hover:bg-orange-600 transition-colors">
                    +
                    <input id="profilePicInput" type="file" accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setPicFile(file);
                        setPicPreview(URL.createObjectURL(file));
                        setSuccess('');
                        setError('');
                      }} />
                  </label>
                </div>

                {/* Name and role */}
                <div>
                  <p className="text-xl font-bold text-fb-dark">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize
                                   ${roleColor[profile.role] || 'bg-gray-200 text-gray-700'}`}>
                    {profile.role}
                  </span>
                  {/* Sub-role badge */}
                  {profile.sub_role && (
                    <span className="ml-2 text-xs font-semibold px-2 py-1 rounded-full
                                     bg-gray-100 text-gray-500 capitalize">
                      {profile.sub_role}
                    </span>
                  )}
                </div>
              </div>

              {/* Save new photo button — only visible when a file is selected */}
              {picFile && (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">
                    New photo selected — click below to save it.
                  </p>
                  <button
                    onClick={handleSavePicture}
                    disabled={picSaving}
                    className="w-full text-sm bg-fb-dark text-white py-2 rounded-xl
                               hover:bg-fb-light transition-colors disabled:opacity-50
                               disabled:cursor-not-allowed">
                    {picSaving ? 'Uploading...' : 'Save New Photo'}
                  </button>
                </div>
              )}

              {/* Read-only details */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500 font-medium">Email</span>
                  <span className="text-fb-dark">{profile.email}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500 font-medium">Role</span>
                  <span className="text-fb-dark capitalize">{profile.role}</span>
                </div>
                {profile.org_name && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500 font-medium">Organization</span>
                    <span className="text-fb-dark">{profile.org_name}</span>
                  </div>
                )}
                {profile.org_type && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500 font-medium">Type</span>
                    <span className="text-fb-dark">{profile.org_type}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Member since</span>
                  <span className="text-fb-dark">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Edit name form ─────────────────────────────────── */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-fb-dark mb-1">Edit Name</h3>
              <p className="text-xs text-gray-400 mb-6">
                Email address and role cannot be changed here.
              </p>

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200
                                text-green-700 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-sm font-medium text-fb-dark block mb-1">
                    First Name
                  </label>
                  <input type="text" name="firstName"
                    value={formData.firstName} onChange={handleChange} required
                    className="input-field w-full" />
                </div>
                <div>
                  <label className="text-sm font-medium text-fb-dark block mb-1">
                    Last Name
                  </label>
                  <input type="text" name="lastName"
                    value={formData.lastName} onChange={handleChange} required
                    className="input-field w-full" />
                </div>
                <button type="submit" disabled={saving}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? 'Saving...' : 'Save Changes →'}
                </button>
              </form>
            </div>

            {/* Password reset link */}
            <div className="mt-4 text-center">
              <a href="/forgot-password" className="text-sm text-fb-coral hover:underline">
                Change password →
              </a>
            </div>

          </div>
        )}
        {/* ── Picture lightbox ──────────── */}
        {zoomPic && profile.profile_pic_url && (
          <div
            onClick={() => setZoomPic(false)}
            className="fixed inset-0 bg-black/80 z-50 flex items-center
                      justify-center cursor-zoom-out"
          >
            <div className="relative" onClick={e => e.stopPropagation()}>
              <img
                src={profile.profile_pic_url}
                alt="Profile"
                className="max-w-sm max-h-[80vh] rounded-2xl object-contain shadow-2xl"
              />
              <button
                onClick={() => setZoomPic(false)}
                className="absolute -top-3 -right-3 bg-white text-fb-dark rounded-full
                          w-8 h-8 flex items-center justify-center font-bold
                          shadow-lg hover:bg-gray-100 transition-colors text-sm">
                ✕
              </button>
            </div>
            <p className="absolute bottom-6 text-white/50 text-xs">
              Click anywhere to close
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;