import React, { useState, useEffect } from 'react';
import { getNearbyListings } from '../services/listings';
import { claimListing } from '../services/claims';

const DEFAULT_LAT = 52.2681;
const DEFAULT_LNG = -113.8112;

const Discover = () => {
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [radius,   setRadius]   = useState(5);
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

  // Fetch listings whenever coords or radius changes
  useEffect(() => {
    fetchListings();
  }, [coords, radius]);

  const fetchListings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getNearbyListings({
        lat: coords.lat, lng: coords.lng, radius
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

      {/* Sidebar Filter */}
      <aside className="w-64 bg-white p-6 border-r hidden md:block">
        <h3 className="font-bold text-fb-dark mb-4">Filters</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-fb-dark mb-1">
              Distance: <span className="font-bold">{radius} km</span>
            </label>
            <input
              type="range" min="1" max="25" value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-fb-light"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 km</span><span>25 km</span>
            </div>
          </div>
          <button
            onClick={fetchListings}
            className="w-full bg-fb-light text-white py-2 rounded-lg text-sm font-semibold"
          >
            Apply
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-fb-dark">Available Food Near You</h2>
          <div className="flex gap-4 items-center">
            <input
              type="text" placeholder="Search..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="p-2 border rounded-lg text-sm"
            />
            <div className="w-10 h-10 bg-fb-dark rounded-full" />
          </div>
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

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-lg font-medium">No listings found nearby.</p>
            <p className="text-sm mt-1">Try increasing the search radius.</p>
          </div>
        )}

        {/* Food Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div key={item._id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt={item.title}
                    className="h-40 w-full object-cover" />
                ) : (
                  <div className="h-40 bg-gray-200 flex items-center justify-center">
                    <span className="text-4xl">🍽️</span>
                  </div>
                )}
                <div className="p-4">
                  <h4 className="font-bold text-fb-dark">{item.title}</h4>
                  <p className="text-xs text-gray-500">
                    {item.donorName} • {item.category}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Pickup: {new Date(item.pickupStart).toLocaleTimeString([],
                      { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(item.pickupEnd).toLocaleTimeString([],
                      { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <button
                    onClick={() => handleClaim(item._id)}
                    disabled={claiming === item._id}
                    className="w-full mt-4 border-2 border-fb-light text-fb-light font-bold
                               py-2 rounded-xl hover:bg-fb-light hover:text-white
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