/**
 * Discover.jsx - Food Discovery Page
 *
 * Two views: List (default) and Map toggle.
 * List view shows full listing cards with address visible.
 * Map view shows Google Maps with markers and InfoWindow on click.
 *
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { getNearbyListings } from '../services/listings';
import { claimListing } from '../services/claims';
import Sidebar from '../components/Sidebar';

const DEFAULT_LAT = 52.2681;
const DEFAULT_LNG = -113.8112;
const MAP_STYLE = { width: '100%', height: '100%' };

const Discover = () => {
  const [listings,  setListings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [radius,    setRadius]    = useState(5);
  const [category,  setCategory]  = useState('');
  const [search,    setSearch]    = useState('');
  const [coords,    setCoords]    = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [selected,  setSelected]  = useState(null);
  const [claiming,  setClaiming]  = useState(null);
  const [view,      setView]      = useState('list');  // 'list' or 'map'
  const [mapRef,    setMapRef]    = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
  });

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }),
        () => setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG })
      );
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [coords, radius, category]);

  // Auto-fit map to show all markers when listings load
  useEffect(() => {
    if (mapRef && listings.length > 0 && window.google) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(coords); // include user location
      listings.forEach(l => {
        bounds.extend({
          lat: l.location.coordinates[1],
          lng: l.location.coordinates[0],
        });
      });
      mapRef.fitBounds(bounds);
    }
  }, [mapRef, listings]);

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
      setSelected(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to claim listing.');
    } finally {
      setClaiming(null);
    }
  };

  const onMapLoad = useCallback((map) => setMapRef(map), []);

  const filtered = listings.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase())
  );

  // ── Listing Card — used in both list view and map InfoWindow ──────────────
  const ListingCard = ({ item, compact = false }) => (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden border
                     border-gray-100 hover:shadow-md transition-shadow
                     ${compact ? '' : ''}`}>
      {item.photoUrl ? (
        <img
          src={item.photoUrl}
          alt={item.title}
          className={`w-full object-cover ${compact ? 'h-28' : 'h-44'}`}
        />
      ) : (
        <div className={`bg-gray-100 flex items-center justify-center
                         ${compact ? 'h-28' : 'h-44'}`}>
          <span className="text-4xl">🍽️</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-bold text-fb-dark text-sm leading-tight">
            {item.title}
          </h4>
          <span className="text-[10px] bg-fb-mint text-fb-dark px-2 py-0.5
                           rounded-full font-semibold capitalize flex-shrink-0">
            {item.category}
          </span>
        </div>

        <p className="text-xs text-gray-500 mt-1">
          👤 {item.donorName}
        </p>

        {/* Address — visible to recipient */}
        {item.address && (
          <p className="text-xs text-gray-600 mt-1 flex items-start gap-1">
            <span className="flex-shrink-0">📍</span>
            <span>{item.address}</span>
          </p>
        )}

        {/* Coordinates as fallback if no address stored */}
        {!item.address && item.location && (
          <p className="text-xs text-gray-400 mt-1">
            📍 {item.location.coordinates[1].toFixed(4)},
            {item.location.coordinates[0].toFixed(4)}
          </p>
        )}

        <p className="text-xs text-gray-400 mt-1">
          🕐 Pickup:{' '}
          {new Date(item.pickupStart).toLocaleDateString([], {
            month: 'short', day: 'numeric'
          })}{' '}
          {new Date(item.pickupStart).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit'
          })}
          {' – '}
          {new Date(item.pickupEnd).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit'
          })}
        </p>

        <button
          onClick={() => handleClaim(item._id)}
          disabled={claiming === item._id}
          className="w-full mt-3 bg-white border-2 border-fb-coral text-fb-coral
                    font-bold py-2 rounded-xl hover:bg-fb-coral hover:text-white
                    text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
          {claiming === item._id ? 'Claiming...' : 'Claim Item'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      {/* Filters Panel */}
      <aside className="w-52 bg-white p-5 border-r hidden md:flex flex-col flex-shrink-0">
        <h3 className="font-bold text-fb-dark mb-5">Filters</h3>

        {/* Radius buttons */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-fb-dark uppercase
                            tracking-widest mb-2">
            Distance
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[1, 5, 10, 25].map((km) => (
              <button
                key={km}
                onClick={() => setRadius(km)}
                className={`py-2 rounded-lg text-sm font-semibold border-2
                            transition-colors ${
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

        {/* Category */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-fb-dark uppercase
                            tracking-widest mb-2">
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

        <p className="text-xs text-gray-400">
          {loading ? 'Searching...' : `${listings.length} listing${listings.length !== 1 ? 's' : ''} found`}
        </p>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header bar */}
        <div className="bg-white border-b px-6 py-3 flex items-center
                        justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-fb-dark">
              Available Food Near You
            </h2>
            <span className="text-xs text-gray-400 hidden sm:block">
              {radius} km · {category || 'all categories'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="p-2 border rounded-lg text-sm w-36 hidden sm:block"
            />

            {/* View toggle */}
            <div className="flex border-2 border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === 'list'
                    ? 'bg-fb-dark text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                ☰ List
              </button>
              <button
                onClick={() => setView('map')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === 'map'
                    ? 'bg-fb-dark text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                🗺 Map
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm text-center border-b">
            {error}
          </div>
        )}

        {/* ── LIST VIEW (default) ── */}
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto p-6">

            {loading && (
              <div className="text-center text-gray-400 mt-20">
                Finding food near you...
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="text-center text-gray-500 mt-20">
                <p className="text-lg font-medium">No listings found nearby.</p>
                <p className="text-sm mt-1 text-gray-400">
                  Try a wider radius or different category.
                </p>
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                              xl:grid-cols-4 gap-5">
                {filtered.map((item) => (
                  <ListingCard key={item._id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MAP VIEW ── */}
        {view === 'map' && (
          <div className="flex-1 relative">
            {!isLoaded ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                Loading map...
              </div>
            ) : (
              <>
                {/* Hint for non-tech users */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10
                                bg-white px-4 py-2 rounded-full shadow text-xs
                                text-gray-600 font-medium">
                  📍 Click a green pin to see details and claim
                </div>

                <GoogleMap
                  mapContainerStyle={MAP_STYLE}
                  center={coords}
                  zoom={14}
                  onLoad={onMapLoad}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                  }}
                >
                  {/* Blue dot — your location */}
                  <Marker
                    position={coords}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: 8,
                      fillColor: '#4285F4',
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 2,
                    }}
                    title="Your location"
                  />

                  {/* Green pins — food listings */}
                  {listings.map((listing) => (
                    <Marker
                      key={listing._id}
                      position={{
                        lat: listing.location.coordinates[1],
                        lng: listing.location.coordinates[0],
                      }}
                      onClick={() => setSelected(listing)}
                      icon={{
                        url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                      }}
                      title={listing.title}
                    />
                  ))}

                  {/* InfoWindow on marker click */}
                  {selected && (
                    <InfoWindow
                      position={{
                        lat: selected.location.coordinates[1],
                        lng: selected.location.coordinates[0],
                      }}
                      onCloseClick={() => setSelected(null)}
                    >
                      <div className="p-1 w-56">
                        {selected.photoUrl && (
                          <img
                            src={selected.photoUrl}
                            alt={selected.title}
                            className="w-full h-28 object-cover rounded mb-2"
                          />
                        )}
                        <h4 className="font-bold text-fb-dark text-sm">
                          {selected.title}
                        </h4>
                        <p className="text-xs text-gray-500 capitalize mt-1">
                          👤 {selected.donorName} · {selected.category}
                        </p>
                        {selected.address && (
                          <p className="text-xs text-gray-600 mt-1">
                            📍 {selected.address}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          🕐{' '}
                          {new Date(selected.pickupStart).toLocaleTimeString([], {
                            hour: '2-digit', minute: '2-digit'
                          })}
                          {' – '}
                          {new Date(selected.pickupEnd).toLocaleTimeString([], {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                        <button
                          onClick={() => handleClaim(selected._id)}
                          disabled={claiming === selected._id}
                          style={{
                            width: '100%',
                            marginTop: '10px',
                            backgroundColor: '#40916C',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            padding: '8px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: claiming === selected._id ? 'not-allowed' : 'pointer',
                            opacity: claiming === selected._id ? 0.5 : 1,
                          }}
                        >
                          {claiming === selected._id
                            ? 'Claiming...'
                            : 'Claim This Item'}
                        </button>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Discover;