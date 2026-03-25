import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

const PostFood = () => {
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file)); // Creates a temporary URL for the preview
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-10">
        <header className="mb-10">
          <h2 className="text-3xl font-bold text-fb-dark tracking-tight">Post a Donation</h2>
          <p className="text-gray-500">Share your surplus food with those in need.</p>
        </header>

        <div className="max-w-4xl bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
          {/* Left Side: Image Upload */}
          <div className="w-full md:w-1/2 p-8 bg-fb-mint/30 border-r border-dashed border-gray-200 flex flex-col items-center justify-center">
            <label className="w-full h-64 border-2 border-dashed border-fb-light rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-fb-mint/50 transition-all overflow-hidden relative">
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-6">
                  <span className="text-4xl mb-2 block">📸</span>
                  <p className="text-sm font-bold text-fb-light uppercase">Upload Food Photo</p>
                  <p className="text-[10px] text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                </div>
              )}
              <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
            </label>
            <p className="text-xs text-gray-400 mt-4 text-center">
              Clear photos help recipients identify the items quickly.
            </p>
          </div>

          {/* Right Side: Form Details */}
          <div className="w-full md:w-1/2 p-10 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-fb-dark uppercase tracking-widest">Food Title</label>
              <input type="text" placeholder="e.g., 5KG Fresh Carrots" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-fb-light outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-fb-dark uppercase tracking-widest">Category</label>
                <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  <option>Vegetables</option>
                  <option>Fruits</option>
                  <option>Bakery</option>
                  <option>Cooked Meal</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-fb-dark uppercase tracking-widest">Expiry Date</label>
                <input type="date" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-fb-dark uppercase tracking-widest">Pickup Address</label>
              <input type="text" placeholder="Street name, City" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
            </div>

            <button className="w-full bg-fb-coral text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-fb-coral/40 active:scale-[0.98] transition-all">
              List Item Now →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PostFood;