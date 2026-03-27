import React, { useState } from 'react';
import { CheckCircle, Clock, MapPin, AlertTriangle } from 'lucide-react';

const ClaimLimit = () => {
  // Mock data/State
  const [globalLimit, setGlobalLimit] = useState(3);
  const [claimsUsed, setClaimsUsed] = useState(2);
  const [history, setHistory] = useState([
    { id: 1, date: 'Mon Mar 18', item: 'Sourdough Bread × 10', status: 'Completed' },
    { id: 2, date: 'Wed Mar 20', item: 'Fresh Produce Mix', status: 'Completed' },
  ]);

  const remaining = Math.max(0, globalLimit - claimsUsed);
  const progressPercent = (claimsUsed / globalLimit) * 100;

  const listings = [
    { id: 1, name: 'Fresh Pasta × 5', dist: '2.1 km', available: true },
    { id: 2, name: 'Veggie Box — 2 kg', dist: '3.2 km', available: false, resetDate: 'Mon 25 Mar' },
    { id: 3, name: 'Day-Old Bread', dist: '4.8 km', available: false, resetDate: 'Mon 25 Mar' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-900">My Claim Status</h1>
        <p className="text-slate-500">Track your weekly food claims and fair-distribution allowance</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Stats & History */}
        <div className="space-y-6">
          <section className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold mb-1">Weekly Claim Allowance</h2>
            <p className="text-sm text-slate-500 mb-8">Rolling 7-day window • Default limit: {globalLimit} claims per week</p>
            
            <div className="flex flex-col md:flex-row items-center justify-around gap-8">
              {/* Circular Progress */}
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                  <circle 
                    cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" 
                    strokeDasharray={502}
                    strokeDashoffset={502 - (502 * progressPercent) / 100}
                    className="text-emerald-600 transition-all duration-500"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-4xl font-bold">{claimsUsed}/{globalLimit}</span>
                  <p className="text-sm text-slate-500">used</p>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-800" />
                  <span className="text-sm text-slate-600">Used this week: <b>{claimsUsed} claims</b></span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-sm text-slate-600">Remaining: <b>{remaining} claim</b></span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-400" />
                  <span className="text-sm text-slate-600">Resets in: <b>4 days</b></span>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-wider text-slate-500">
                <span>Weekly Progress</span>
                <span>{claimsUsed} of {globalLimit}</span>
              </div>
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-900 transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </section>

          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-4">
            <AlertTriangle className="text-amber-600 shrink-0" size={20} />
            <div>
              <p className="text-amber-900 font-bold text-sm">You have {remaining} claim remaining this week</p>
              <p className="text-amber-800 text-xs mt-1">Cancelled claims still count toward your limit. Your allowance resets automatically on Monday, March 25.</p>
            </div>
          </div>

          {/* Claim History */}
          <section>
            <h3 className="text-sm font-bold text-emerald-800 mb-4 uppercase tracking-widest">Claim History This Week</h3>
            <div className="space-y-2">
              {history.map((item) => (
                <div key={item.id} className="bg-white border border-slate-200 p-4 rounded-lg flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-emerald-600" size={20} />
                    <div>
                      <p className="text-xs text-slate-500">{item.date}</p>
                      <p className="font-bold text-sm">{item.item}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-emerald-600">{item.status}</span>
                </div>
              ))}
              <div className="bg-emerald-50/50 border border-emerald-100 border-dashed p-4 rounded-lg flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                <div>
                  <p className="text-xs text-slate-500 italic">Fri Mar 21</p>
                  <p className="text-sm text-slate-400">—</p>
                </div>
                <span className="ml-auto text-xs text-slate-400">Remaining</span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Listings & Admin */}
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-bold">Available Listings</h2>
            <p className="text-sm text-slate-500 mb-6">{remaining} claim remaining this week</p>
            
            <div className="space-y-4">
              {listings.map((listing) => (
                <div key={listing.id} className={`bg-white border-2 rounded-xl p-6 flex items-center gap-4 transition-all ${listing.available && remaining > 0 ? 'border-emerald-500 shadow-md' : 'border-slate-200 opacity-60'}`}>
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                    <Clock size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800">{listing.name}</h4>
                    <div className="flex items-center text-xs text-slate-500 gap-1 mt-1">
                      <MapPin size={12} /> {listing.dist}
                    </div>
                    {!listing.available && (
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Resets {listing.resetDate}</p>
                    )}
                  </div>
                  {listing.available && remaining > 0 ? (
                    <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors">
                      Claim →
                    </button>
                  ) : (
                    <button disabled className="bg-slate-200 text-slate-400 px-4 py-2 rounded-lg font-bold text-sm cursor-not-allowed">
                      Limit Reached
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Admin Panel */}
          <section className="mt-12 p-6 border-2 border-emerald-600 rounded-xl bg-white">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Admin: Adjust Claim Limit</h3>
            <p className="text-xs text-slate-500 mb-4">Current global limit: {globalLimit} claims / 7-day window</p>
            <div className="flex gap-3">
              <input 
                type="number" 
                value={globalLimit}
                onChange={(e) => setGlobalLimit(parseInt(e.target.value) || 0)}
                className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button className="bg-emerald-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-800 transition-colors">
                Update Limit
              </button>
              <span className="text-[10px] text-slate-400 self-center">Changes apply immediately</span>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
};

export default ClaimLimit;