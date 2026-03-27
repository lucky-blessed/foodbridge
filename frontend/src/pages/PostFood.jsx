import React, { useState } from 'react';

const PostFood = () => {
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file)); // Dynamic image preview
    }
  };

  const steps = ['Food Details', 'Pickup Location', 'Schedule', 'Review & Post'];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Placeholder */}
      <div className="w-64 bg-fb-dark" />

      <main className="flex-1 p-10 bg-fb-bg">
        {/* Header and Step Tracker */}
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

        {/* Step Tracker UI */}
        <div className="flex items-center gap-4 mb-10 text-sm font-semibold text-fb-leaf bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          {steps.map((step, i) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-2 ${i > 0 ? 'text-gray-400' : ''}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${i > 0 ? 'bg-gray-100' : 'bg-fb-leaf text-white'}`}>{i + 1}</span>
                {step}
              </div>
              {i < steps.length - 1 && <div className="h-0.5 w-16 bg-gray-100" />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Side: Form Details */}
          <div className="space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-fb-dark text-lg mb-4">Food Information</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-fb-dark uppercase tracking-widest">Food Title *</label>
              <input type="text" placeholder="e.g., Sourdough Bread — 20 loaves" className="w-full p-4 border rounded-xl outline-fb-leaf" />
            </div>

            {/* Units/Condition Selector */}
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Quantity * (e.g., 20)" className="w-full p-4 border rounded-xl outline-fb-leaf" />
              <input type="text" placeholder="Condition * (e.g., Fresh)" className="w-full p-4 border rounded-xl outline-fb-leaf" />
            </div>

            {/* Description Textarea */}
            <div className="space-y-2">
              <label className="text-xs font-black text-fb-dark uppercase tracking-widest">Description (optional)</label>
              <textarea placeholder="e.g., Freshly baked this morning." className="w-full p-4 border rounded-xl outline-fb-leaf h-32" />
            </div>

            {/* Image Upload Area */}
            <div className="space-y-2">
              <label className="text-xs font-black text-fb-dark uppercase tracking-widest">Photos (optional)</label>
              <label className="w-full h-48 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-fb-leaf hover:bg-fb-mint/30 transition-all overflow-hidden relative">
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6 text-gray-400">
                    <span className="text-4xl mb-2 block">📸</span>
                    <p className="text-sm font-bold uppercase text-fb-dark">Click to upload or drag and drop</p>
                    <p className="text-xs mt-1">PNG, JPG up to 10MB</p>
                  </div>
                )}
                <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
              </label>
            </div>
            
            <div className="flex gap-4 pt-4">
              <button className="flex-1 bg-white text-fb-dark font-bold py-4 rounded-xl border border-fb-dark hover:bg-gray-50">← Save Draft</button>
              <button className="flex-1 btn-primary">Continue: Set Location →</button>
            </div>
          </div>

          {/* Right Side: Preview Panel */}
          <div className="bg-fb-mint/30 p-8 rounded-3xl border border-fb-mint">
            <h3 className="font-bold text-fb-dark text-lg mb-6">Listing Preview</h3>
            <div className="bg-white p-6 rounded-2xl shadow-md space-y-3">
              <div className="font-bold text-fb-dark">Sourdough Bread — 20 loaves</div>
              <div className="text-sm text-gray-500">20 loaves • Fresh</div>
              <div className="bg-fb-mint text-fb-dark inline-block px-3 py-1 rounded text-xs font-bold">Baked Goods</div>
              <div className="pt-3 text-xs text-gray-400">📍 Pickup Location</div>
              <div className="text-sm">32 Ave NW, Red Deer, AB</div>
              <div className="text-xs text-fb-leaf font-semibold pt-2 bg-fb-mint p-2 rounded">Listing will appear live on the map</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PostFood;