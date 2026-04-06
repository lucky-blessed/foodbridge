/**
 * Discover.jsx - Food Discovery Page
 *
 * Fetches real listings from GET /listings via getNearbyListings().
 * Uses browser Geolocation API for user's position.
 * Falls back to Red Deer coordinates if location is denied.
 *
 * Changes:
 *  - Real Sidebar added for navigation
 *  - Radius slider replaced with 4 discrete buttons (1/5/10/25 km) — FR-09
 *  - Category filter dropdown added — FR-10
 *
 */

import React, { useState, useEffect } from 'react';
import { getNearbyListings } from '../services/listings';
import { claimListing } from '../services/claims';
import Sidebar from '../components/Sidebar';

const DEFAULT_LAT = 52.2681;
const DEFAULT_LNG = -113.8112;

const Discover = () => {
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [radius,   setRadius]   = useState(5);
  const [category, setCategory] = useState('');
  const [search,   setSearch]   = useState('');
  const [coords,   setCoords]   = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [claiming, setClaiming] = useState(null);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        ()    => setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG })
      );
    }
  }, []);

  // Re-fetch whenever coords, radius, or category changes
  useEffect(() => {
    fetchListings();
  }, [coords, radius, category]);

  const fetchListings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getNearbyListings({
        lat: coords.lat,
        lng: coords.lng,
        radius,
        category: category || null,
      });
      setListings(data.listings || []);
    } catch (err) {
      setError('Failed to load listings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (listingId) => {
    setClaiming(listingId);
    try {
      await claimListing(listingId);
      setListings(prev => prev.filter(l => l._id !== listingId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to claim listing.');
    } finally {
      setClaiming(null);
    }
  };

  const filtered = listings.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-fb-mint">

      {/* Real Sidebar for navigation */}
      <Sidebar />

      {/* Filters Panel */}
      <aside className="w-56 bg-white p-5 border-r hidden md:block flex-shrink-0">
        <h3 className="font-bold text-fb-dark mb-5">Filters</h3>

        <div className="space-y-5">

          {/* Radius — 4 discrete buttons per spec FR-09 */}
          <div>
            <label className="block text-sm font-medium text-fb-dark mb-2">
              Distance
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[1, 5, 10, 25].map((km) => (
                <button
                  key={km}
                  onClick={() => setRadius(km)}
                  className={`py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    radius === km
                      ? 'bg-fb-dark text-white border-fb-dark'
                      : 'bg-white text-fb-dark border-gray-200 hover:border-fb-dark'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
          </div>

          {/* Category filter — FR-10 */}
          <div>
            <label className="block text-sm font-medium text-fb-dark mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border-2 border-gray-200 rounded-lg text-sm
                         focus:border-fb-dark outline-none"
            >
              <option value="">All Categories</option>
              <option value="produce">Produce</option>
              <option value="baked">Baked Goods</option>
              <option value="meals">Meals</option>
              <option value="dairy">Dairy</option>
              <option value="non-perishable">Non-Perishable</option>
              <option value="other">Other</option>
            </select>
          </div>

        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-fb-dark">Available Food Near You</h2>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 border rounded-lg text-sm w-48"
          />
        </header>

        {/* Loading */}
        {loading && (
          <div className="text-center text-fb-dark font-medium mt-20">
            Finding food near you...
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center text-red-500 mt-20">{error}</div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-lg font-medium">No listings found nearby.</p>
            <p className="text-sm mt-1">Try a wider radius or different category.</p>
          </div>
        )}

        {/* Food Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden
                           border border-gray-100 hover:shadow-md transition-shadow"
              >
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt={item.title}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="h-40 bg-gray-200 flex items-center justify-center">
                    <span className="text-4xl">🍽️</span>
                  </div>
                )}
                <div className="p-4">
                  <h4 className="font-bold text-fb-dark">{item.title}</h4>
                  <p className="text-xs text-gray-500 capitalize mt-1">
                    {item.donorName} · {item.category}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Pickup:{' '}
                    {new Date(item.pickupStart).toLocaleTimeString([], {
                      hour: '2-digit', minute: '2-digit'
                    })}
                    {' '}–{' '}
                    {new Date(item.pickupEnd).toLocaleTimeString([], {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  <button
                    onClick={() => handleClaim(item._id)}
                    disabled={claiming === item._id}
                    className="w-full mt-4 border-2 border-fb-light text-fb-light
                               font-bold py-2 rounded-xl hover:bg-fb-light hover:text-white
                               transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {claiming === item._id ? 'Claiming...' : 'Claim Item'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Discover;