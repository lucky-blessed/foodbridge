import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createListing } from '../services/listings';

const PostFood = () => {
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!formData.title || !formData.quantity || !formData.unit || !formData.condition) {
      setError('Title, quantity, unit and condition are required.');
      return;
    }
    if (!formData.lat || !formData.lng) {
      setError('Location coordinates are required.');
      return;
    }
    if (!formData.pickupStart || !formData.pickupEnd) {
      setError('Pickup window is required.');
      return;
    }

    setLoading(true);
    try {
      await createListing(formData, photoFile);
      navigate('/discover');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Placeholder */}
      <div className="w-64 bg-fb-dark" />

      <main className="flex-1 p-10 bg-fb-bg">
        {/* Header */}
        <header className="mb-10 flex items-center justify-between">
          <div>
            <div className="flex gap-2 mb-2">
              <span className="bg-fb-coral text-white text-[10px] px-2 py-1 rounded font-bold uppercase">Screen 2 of 6</span>
              <span className="bg-fb-leaf text-white text-[10px] px-2 py-1 rounded font-bold uppercase">Donor Flow</span>
            </div>
            <h2 className="text-3xl font-extrabold text-fb-dark tracking-tight">Post a Food Donation</h2>
            <p className="text-gray-500">Share surplus food with your community in minutes</p>
          </div>
          <div className="text-fb-dark font-black text-xs opacity-70">Red Deer Polytechnic • SWDV 1014</div>
        </header>

        {/* Step Tracker */}
        <div className="flex items-center gap-4 mb-10 text-sm font-semibold text-fb-leaf bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          {steps.map((step, i) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-2 ${i > 0 ? 'text-gray-400' : ''}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${i > 0 ? 'bg-gray-100' : 'bg-fb-leaf text-white'}`}>
                  {i + 1}
                </span>
                {step}
              </div>
              {i < steps.length - 1 && <div className="h-0.5 w-16 bg-gray-100" />}
            </React.Fragment>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Left — Form */}
            <div className="space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-fb-dark text-lg mb-4">Food Information</h3>

              <div className="space-y-2">
                <label className="text-xs font-black text-fb-dark uppercase tracking-widest">Food Title *</label>
                <input type="text" name="title" value={formData.title}
                  onChange={handleChange} placeholder="e.g., Sourdough Bread — 20 loaves"
                  className="w-full p-4 border rounded-xl outline-fb-leaf" required />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-fb-dark uppercase tracking-widest">Category *</label>
                <select name="category" value={formData.category} onChange={handleChange}
                  className="w-full p-4 border rounded-xl outline-fb-leaf">
                  <option value="baked">Baked</option>
                  <option value="produce">Produce</option>
                  <option value="meals">Meals</option>
                  <option value="dairy">Dairy</option>
                  <option value="non-perishable">Non-perishable</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input type="number" name="quantity" value={formData.quantity}
                  onChange={handleChange} placeholder="Quantity *"
                  className="w-full p-4 border rounded-xl outline-fb-leaf" required />
                <input type="text" name="unit" value={formData.unit}
                  onChange={handleChange} placeholder="Unit * (e.g., loaves)"
                  className="w-full p-4 border rounded-xl outline-fb-leaf" required />
              </div>

              {/* FIX — dropdown with exact enum values */}
              <select name="condition" value={formData.condition} onChange={handleChange}
                className="w-full p-4 border rounded-xl outline-fb-leaf" required>
                <option value="">Select condition *</option>
                <option value="fresh">Fresh</option>
                <option value="good">Good</option>
                <option value="use-soon">Use Soon</option>
              </select>

              <textarea name="description" value={formData.description}
                onChange={handleChange} placeholder="Description (optional)"
                className="w-full p-4 border rounded-xl outline-fb-leaf h-24" />

              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="any" name="lat" value={formData.lat}
                  onChange={handleChange} placeholder="Latitude *"
                  className="w-full p-4 border rounded-xl outline-fb-leaf" required />
                <input type="number" step="any" name="lng" value={formData.lng}
                  onChange={handleChange} placeholder="Longitude *"
                  className="w-full p-4 border rounded-xl outline-fb-leaf" required />
              </div>

              <input type="text" name="address" value={formData.address}
                onChange={handleChange} placeholder="Address (optional)"
                className="w-full p-4 border rounded-xl outline-fb-leaf" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-fb-dark uppercase tracking-widest">Pickup Start *</label>
                  <input type="datetime-local" name="pickupStart" value={formData.pickupStart}
                    onChange={handleChange}
                    className="w-full p-4 border rounded-xl outline-fb-leaf mt-1" required />
                </div>
                <div>
                  <label className="text-xs font-black text-fb-dark uppercase tracking-widest">Pickup End *</label>
                  <input type="datetime-local" name="pickupEnd" value={formData.pickupEnd}
                    onChange={handleChange}
                    className="w-full p-4 border rounded-xl outline-fb-leaf mt-1" required />
                </div>
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <label className="text-xs font-black text-fb-dark uppercase tracking-widest">Photo (optional)</label>
                <label className="w-full h-40 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-fb-leaf transition-all overflow-hidden relative">
                  {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4 text-gray-400">
                      <span className="text-3xl mb-1 block">📸</span>
                      <p className="text-sm font-bold text-fb-dark">Click to upload</p>
                      <p className="text-xs mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  )}
                  <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                </label>
              </div>

              <button type="submit" disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Posting...' : 'Post Donation →'}
              </button>
            </div>

            {/* Right — Preview */}
            <div className="bg-fb-mint/30 p-8 rounded-3xl border border-fb-mint">
              <h3 className="font-bold text-fb-dark text-lg mb-6">Listing Preview</h3>
              <div className="bg-white p-6 rounded-2xl shadow-md space-y-3">
                <div className="font-bold text-fb-dark">
                  {formData.title || 'Your listing title'}
                </div>
                <div className="text-sm text-gray-500">
                  {formData.quantity || '—'} {formData.unit || ''} • {formData.condition || '—'}
                </div>
                {formData.category && (
                  <div className="bg-fb-mint text-fb-dark inline-block px-3 py-1 rounded text-xs font-bold capitalize">
                    {formData.category}
                  </div>
                )}
                {formData.address && (
                  <div className="text-sm mt-2">📍 {formData.address}</div>
                )}
                {formData.pickupStart && (
                  <div className="text-xs text-fb-leaf font-semibold pt-2 bg-fb-mint p-2 rounded">
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