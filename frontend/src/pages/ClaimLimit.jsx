import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, MapPin, AlertTriangle, XCircle } from 'lucide-react';
import { getClaimCount, getMyClaims, cancelClaim } from '../services/claims';
import Sidebar from '../components/Sidebar';

const ClaimLimit = () => {
  const [countData,  setCountData]  = useState({ count:0, limit:3, remaining:3, resetsAt:null });
  const [claims,     setClaims]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [countRes, claimsRes] = await Promise.all([
        getClaimCount(),
        getMyClaims()
      ]);
      setCountData(countRes);
      setClaims(claimsRes.claims || []);
    } catch (err) {
      setError('Failed to load claim data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (claimId) => {
    if (!window.confirm('Cancel this claim? This will still count toward your weekly limit.')) return;
    setCancelling(claimId);
    try {
      await cancelClaim(claimId);
      await fetchData(); // refresh stats
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel claim.');
    } finally {
      setCancelling(null);
    }
  };

  const { count, limit, remaining, resetsAt } = countData;
  const progressPercent = limit > 0 ? (count / limit) * 100 : 0;

  const resetsIn = resetsAt
    ? Math.ceil((new Date(resetsAt) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const statusColor = {
    active:    'text-green-600',
    completed: 'text-blue-600',
    cancelled: 'text-gray-400',
  };

  const statusIcon = {
    active:    <Clock size={20} className="text-green-600" />,
    completed: <CheckCircle size={20} className="text-blue-600" />,
    cancelled: <XCircle size={20} className="text-gray-400" />,
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 p-8 font-sans text-slate-900">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-emerald-900">My Claim Status</h1>
          <p className="text-slate-500">
            Track your weekly food claims and fair-distribution allowance
          </p>
        </header>

        {loading && (
          <div className="text-center text-gray-400 mt-20">Loading your claims...</div>
        )}

        {error && !loading && (
          <div className="text-center text-red-500 mt-20">{error}</div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left — Stats & History */}
            <div className="space-y-6">

              {/* Allowance card */}
              <section className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold mb-1">Weekly Claim Allowance</h2>
                <p className="text-sm text-slate-500 mb-8">
                  Rolling 7-day window • Limit: {limit} claims per week
                </p>

                <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                  {/* Circle */}
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="96" cy="96" r="80" stroke="currentColor"
                        strokeWidth="12" fill="transparent" className="text-slate-100" />
                      <circle cx="96" cy="96" r="80" stroke="currentColor"
                        strokeWidth="12" fill="transparent"
                        strokeDasharray={502}
                        strokeDashoffset={502 - (502 * progressPercent) / 100}
                        className="text-emerald-600 transition-all duration-500" />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-4xl font-bold">{count}/{limit}</span>
                      <p className="text-sm text-slate-500">used</p>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-800" />
                      <span className="text-sm text-slate-600">
                        Used: <b>{count} claims</b>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                      <span className="text-sm text-slate-600">
                        Remaining: <b>{remaining} claims</b>
                      </span>
                    </div>
                    {resetsIn !== null && (
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-slate-400" />
                        <span className="text-sm text-slate-600">
                          Resets in: <b>{resetsIn} day{resetsIn !== 1 ? 's' : ''}</b>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-10">
                  <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-wider text-slate-500">
                    <span>Weekly Progress</span>
                    <span>{count} of {limit}</span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-900 transition-all"
                      style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </section>

              {/* Warning banner */}
              {remaining <= 1 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-4">
                  <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                  <div>
                    <p className="text-amber-900 font-bold text-sm">
                      {remaining === 0
                        ? 'You have reached your claim limit for this week.'
                        : `Only ${remaining} claim remaining this week.`}
                    </p>
                    <p className="text-amber-800 text-xs mt-1">
                      Cancelled claims still count toward your limit.
                      {resetsAt && ` Resets on ${new Date(resetsAt).toLocaleDateString()}.`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right — Claim History */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-widest">
                Claim History
              </h3>

              {claims.length === 0 && (
                <div className="bg-white border border-slate-200 p-8 rounded-xl text-center text-slate-400 italic">
                  No claims yet. Visit Discover to find food near you.
                </div>
              )}

              {claims.map((claim) => (
                <div key={claim.id}
                  className="bg-white border border-slate-200 p-4 rounded-lg flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    {statusIcon[claim.status] || <Clock size={20} />}
                    <div>
                      <p className="text-xs text-slate-500">
                        {new Date(claim.claimed_at).toLocaleDateString()}
                      </p>
                      <p className="font-bold text-sm">
                        {claim.listing?.title || `Listing ${claim.listing_id}`}
                      </p>
                      {claim.listing?.category && (
                        <p className="text-xs text-slate-400 capitalize">
                          {claim.listing.category}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs font-semibold capitalize ${statusColor[claim.status] || 'text-slate-500'}`}>
                      {claim.status}
                    </span>
                    {claim.status === 'active' && (
                      <button
                        onClick={() => handleCancel(claim.id)}
                        disabled={cancelling === claim.id}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold disabled:opacity-50"
                      >
                        {cancelling === claim.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default ClaimLimit;