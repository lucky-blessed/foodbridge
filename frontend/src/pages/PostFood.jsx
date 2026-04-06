/**
 * PostFood.jsx - Post Food Donation Page
 *
 * Connects to POST /listings via createListing() from listings.js
 * Uses FormData because of photo upload (multipart).
 * Address input with Google Places Autocomplete — converts address to lat/lng.
 * Redirects to /dashboard on success.
 *
 * @author Yi Zhang
 * @course SWDV 1014 — Red Deer Polytechnic
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { createListing } from '../services/listings';
import Sidebar from '../components/Sidebar';

const LIBRARIES = ['places'];

const PostFood = () => {
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries: LIBRARIES,
  });

  const autocompleteRef = useRef(null);

  const [formData, setFormData] = useState({
    title:       '',
    category:    'baked',
    quantity:    '',
    unit:        '',
    condition:   'fresh',
    description: '',
    address:     '',
    lat:         '',
    lng:         '',
    pickupStart: '',
    pickupEnd:   '',
  });

  const [photoFile,  setPhotoFile]  = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const steps = ['Food Details', 'Pickup Location', 'Schedule', 'Review & Post'];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Called when donor selects an address from the autocomplete dropdown
  const handlePlaceSelect = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setFormData(prev => ({
          ...prev,
          address: place.formatted_address,
          lat:     lat.toString(),
          lng:     lng.toString(),
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.quantity || !formData.unit || !formData.condition) {
      setError('Title, quantity, unit and condition are required.');
      return;
    }
    if (!formData.lat || !formData.lng) {
      setError('Please select a pickup address from the dropdown suggestions.');
      return;
    }
    if (!formData.pickupStart || !formData.pickupEnd) {
      setError('Pickup window is required.');
      return;
    }

    setLoading(true);
    try {
      await createListing(formData, photoFile);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 p-10 bg-fb-bg overflow-y-auto">

        {/* Header */}
        <header className="mb-8">
          <div className="flex gap-2 mb-2">
            <span className="bg-fb-coral text-white text-[10px] px-2 py-1 rounded font-bold uppercase">
              Donor Flow
            </span>
          </div>
          <h2 className="text-3xl font-extrabold text-fb-dark tracking-tight">
            Post a Food Donation
          </h2>
          <p className="text-gray-500">Share surplus food with your community in minutes</p>
        </header>

        {/* Step Tracker */}
        <div className="flex items-center gap-4 mb-8 text-sm font-semibold bg-white
                        p-4 rounded-2xl shadow-sm border border-gray-100">
          {steps.map((step, i) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-2 ${i > 0 ? 'text-gray-400' : 'text-fb-leaf'}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center
                                  font-bold text-xs ${i > 0 ? 'bg-gray-100' : 'bg-fb-leaf text-white'}`}>
                  {i + 1}
                </span>
                {step}
              </div>
              {i < steps.length - 1 && <div className="h-0.5 w-12 bg-gray-100" />}
            </React.Fragment>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700
                          rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Left — Form */}
            <div className="space-y-5 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-fb-dark text-lg">Food Information</h3>

              {/* Title */}
              <div>
                <label className="text-xs font-black text-fb-dark uppercase tracking-widest">
                  Food Title *
                </label>
                <input
                  type="text" name="title" value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Sourdough Bread — 20 loaves"
                  className="w-full p-3 border rounded-xl outline-fb-leaf mt-1"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-black text-fb-dark uppercase tracking-widest">
                  Category *
                </label>
                <select
                  name="category" value={formData.category}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-xl outline-fb-leaf mt-1"
                >
                  <option value="baked">Baked Goods</option>
                  <option value="produce">Produce</option>
                  <option value="meals">Meals</option>
                  <option value="dairy">Dairy</option>
                  <option value="non-perishable">Non-Perishable</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Quantity + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-fb-dark uppercase tracking-widest">
                    Quantity *
                  </label>
                  <input
                    type="number" name="quantity" value={formData.quantity}
                    onChange={handleChange} placeholder="e.g., 20"
                    className="w-full p-3 border rounded-xl outline-fb-leaf mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-fb-dark uppercase tracking-widest">
                    Unit *
                  </label>
                  <input
                    type="text" name="unit" value={formData.unit}
                    onChange={handleChange} placeholder="e.g., loaves"
                    className="w-full p-3 border rounded-xl outline-fb-leaf mt-1"
                    required
                  />
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="text-xs font-black text-fb-dark uppercase tracking-widest">
                  Condition *
                </label>
                <select
                  name="condition" value={formData.condition}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-xl outline-fb-leaf mt-1"
                >
                  <option value="fresh">Fresh</option>
                  <option value="good">Good</option>
                  <option value="use-soon">Use Soon</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-black text-fb-dark uppercase tracking-widest">
                  Description (optional)
                </label>
                <textarea
                  name="description" value={formData.description}
                  onChange={handleChange}
                  placeholder="e.g., Freshly baked this morning."
                  className="w-full p-3 border rounded-xl outline-fb-leaf mt-1 h-20"
                />
              </div>

              {/* Pickup Address — Google Places Autocomplete */}
              <div>
                <label className="text-xs font-black text-fb-dark uppercase tracking-widest">
                  Pickup Address *
                </label>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(ref) => (autocompleteRef.current = ref)}
                    onPlaceChanged={handlePlaceSelect}
                    options={{ componentRestrictions: { country: 'ca' } }}
                  >
                  {/**  Uncontrolled — Google manages the input value */}
                  <input
                    type="text"
                    name="address"
                    defaultValue={formData.address}
                    placeholder="Start typing your address..."
                    className="w-full p-3 border rounded-xl outline-fb-leaf mt-1"
                  />
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    placeholder="Loading address search..."
                    disabled
                    className="w-full p-3 border rounded-xl bg-gray-100 mt-1"
                  />
                )}
                {formData.lat && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Location confirmed: {parseFloat(formData.lat).toFixed(4)},
                    {parseFloat(formData.lng).toFixed(4)}
                  </p>
                )}
              </div>

              {/* Pickup Window */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-fb-dark uppercase tracking-widest">
                    Pickup Start *
                  </label>
                  <input
                    type="datetime-local" name="pickupStart" value={formData.pickupStart}
                    onChange={handleChange}
                    className="w-full p-3 border rounded-xl outline-fb-leaf mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-fb-dark uppercase tracking-widest">
                    Pickup End *
                  </label>
                  <input
                    type="datetime-local" name="pickupEnd" value={formData.pickupEnd}
                    onChange={handleChange}
                    className="w-full p-3 border rounded-xl outline-fb-leaf mt-1"
                    required
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="text-xs font-black text-fb-dark uppercase tracking-widest">
                  Photo (optional)
                </label>
                <label className="w-full h-36 border-2 border-dashed border-gray-200
                                  rounded-2xl flex flex-col items-center justify-center
                                  cursor-pointer hover:border-fb-leaf transition-all
                                  overflow-hidden relative mt-1">
                  {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <span className="text-3xl block mb-1">📸</span>
                      <p className="text-sm font-bold text-fb-dark">Click to upload</p>
                      <p className="text-xs">PNG, JPG up to 10MB</p>
                    </div>
                  )}
                  <input
                    type="file" className="hidden"
                    onChange={handleImageChange} accept="image/*"
                  />
                </label>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Posting...' : 'Post Donation →'}
              </button>
            </div>

            {/* Right — Live Preview */}
            <div className="bg-fb-mint/30 p-8 rounded-3xl border border-fb-mint">
              <h3 className="font-bold text-fb-dark text-lg mb-6">Listing Preview</h3>
              <div className="bg-white p-6 rounded-2xl shadow-md space-y-3">
                <div className="font-bold text-fb-dark">
                  {formData.title || 'Your listing title'}
                </div>
                <div className="text-sm text-gray-500">
                  {formData.quantity || '—'} {formData.unit} · {formData.condition}
                </div>
                {formData.category && (
                  <span className="bg-fb-mint text-fb-dark inline-block px-3 py-1
                                   rounded text-xs font-bold capitalize">
                    {formData.category}
                  </span>
                )}
                {formData.address && (
                  <div className="text-sm mt-1">📍 {formData.address}</div>
                )}
                {formData.pickupStart && (
                  <div className="text-xs text-fb-leaf font-semibold bg-fb-mint p-2 rounded">
                    Pickup from {new Date(formData.pickupStart).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

          </div>
        </form>
      </main>
    </div>
  );
};

export default PostFood;