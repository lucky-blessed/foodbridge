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
import { saveUserLocation } from '../services/api';

const DEFAULT_LAT = 52.2681;
const DEFAULT_LNG = -113.8112;
const MAP_STYLE = { width: '100%', height: '100%' };

const Discover = () => {
  const [listings,     setListings]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [radius,       setRadius]       = useState(5);
  const [category,     setCategory]     = useState('');
  const [search,       setSearch]       = useState('');
  const [coords,       setCoords]       = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [selected,     setSelected]     = useState(null);
  const [claiming,     setClaiming]     = useState(null);
  const [lastClaimed,  setLastClaimed]  = useState(null); // Stores { pin, title }
  const [scheduleModal,      setScheduleModal]      = useState(null); // { listing }
  const [scheduledPickupAt,  setScheduledPickupAt]  = useState('');
  const [view,         setView]         = useState('list');  // 'list' or 'map'
  const [mapRef,       setMapRef]       = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
  });

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setCoords({ lat, lng });

          saveUserLocation(lat, lng).catch(() => {
            // Non-critical — silently ignore if save fails
          });
        },
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
      bounds.extend(coords); 
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

 // handleClaim — PIN comes from server response
  const handleClaim = async (listingId, scheduled = null) => {
    setClaiming(listingId);
    try {
        const response = await claimListing(listingId, scheduled);
        const claimedItem = listings.find(l => l._id === listingId);
        setLastClaimed({ pin: response.pin, title: claimedItem?.title });
        setListings(prev => prev.filter(l => l._id !== listingId));
        setSelected(null);
        setScheduleModal(null);
        setScheduledPickupAt('');
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

  const ListingCard = ({ item, compact = false }) => (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden border
                     border-gray-100 hover:shadow-md transition-shadow`}>
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

          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-gray-500">👤 {item.donorName}</p>
            {item.condition && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize
                ${item.condition === 'fresh'    ? 'bg-green-100 text-green-700' :
                  item.condition === 'good'     ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'}`}>
                {item.condition}
              </span>
            )}
          </div>

          {item.quantity && (
            <p className="text-xs text-gray-500 mt-1">
              📦 {item.quantity} {item.unit}
            </p>
          )}

          {item.expiryDate && (
            <p className={`text-xs font-medium mt-1 ${
              new Date(item.expiryDate) < new Date()
                ? 'text-red-500'
                : new Date(item.expiryDate) - new Date() < 86400000 * 2
                ? 'text-orange-500'
                : 'text-gray-500'
            }`}>
              📅 Expires: {new Date(item.expiryDate).toLocaleDateString()}
            </p>
          )}

          {item.location?.address && (
            <p className="text-xs text-gray-600 mt-1 flex items-start gap-1">
              <span className="flex-shrink-0">📍</span>
              <span>{item.location.address}</span>
            </p>
          )}

          <button
            onClick={() => setScheduleModal({ listing: item })}
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

      {/* ── Schedule Pickup Modal ── */}
      {scheduleModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                  <h3 className="text-lg font-bold text-fb-dark mb-1">Claim This Item</h3>
                  <p className="font-semibold text-fb-dark mb-1">
                      {scheduleModal.listing.title}
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                      Pickup window: {new Date(scheduleModal.listing.pickupStart).toLocaleString('en-CA', {
                          dateStyle: 'medium', timeStyle: 'short'
                      })} – {new Date(scheduleModal.listing.pickupEnd).toLocaleString('en-CA', {
                          dateStyle: 'medium', timeStyle: 'short'
                      })}
                  </p>

                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Schedule Pickup Time (optional)
                  </label>
                  <input
                      type="datetime-local"
                      value={scheduledPickupAt}
                      min={new Date(scheduleModal.listing.pickupStart).toISOString().slice(0,16)}
                      max={new Date(scheduleModal.listing.pickupEnd).toISOString().slice(0,16)}
                      onChange={e => setScheduledPickupAt(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4
                                focus:outline-none focus:ring-2 focus:ring-fb-mint"
                  />
                  <p className="text-xs text-gray-400 mb-4">
                      Leave blank to claim without a scheduled time.
                  </p>

                  <div className="flex gap-3">
                      <button
                          onClick={() => { setScheduleModal(null); setScheduledPickupAt(''); }}
                          className="flex-1 border border-gray-200 rounded-xl py-2 text-sm
                                    font-semibold text-gray-600 hover:bg-gray-50">
                          Cancel
                      </button>
                      <button
                          onClick={() => handleClaim(
                              scheduleModal.listing._id,
                              scheduledPickupAt ? new Date(scheduledPickupAt).toISOString() : null
                          )}
                          disabled={claiming === scheduleModal.listing._id}
                          className="flex-1 bg-fb-dark text-white rounded-xl py-2 text-sm
                                    font-semibold hover:bg-fb-light disabled:opacity-50">
                          {claiming === scheduleModal.listing._id ? 'Claiming...' : 'Confirm Claim'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* PIN SUCCESS MODAL */}
      {lastClaimed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border-4 border-fb-mint animate-in fade-in zoom-in duration-300">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-fb-dark mb-2">Claim Successful!</h3>
            <p className="text-gray-600 text-sm mb-6">
              You've claimed: <span className="font-semibold">{lastClaimed.title}</span>
            </p>

            <div className="bg-gray-100 rounded-2xl p-6 mb-4 relative">
              <span className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                Your Pickup PIN
              </span>
              <span className="text-4xl font-black tracking-[0.2em] text-fb-dark">
                {lastClaimed.pin}
              </span>
              
              <button 
                onClick={() => navigator.clipboard.writeText(lastClaimed.pin)}
                className="mt-4 flex items-center justify-center gap-2 mx-auto text-fb-coral font-bold text-xs hover:underline"
              >
                📋 Copy Code
              </button>
            </div>

            <p className="text-sm text-fb-dark font-medium leading-relaxed mb-6 italic">
              "Save this code — your donor will ask for it at pickup."
            </p>

            <button
              onClick={() => setLastClaimed(null)}
              className="w-full bg-fb-dark text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      <aside className="w-52 bg-white p-5 border-r hidden md:flex flex-col flex-shrink-0">
        <h3 className="font-bold text-fb-dark mb-5">Filters</h3>
        <div className="mb-5">
          <label className="block text-xs font-bold text-fb-dark uppercase tracking-widest mb-2">
            Distance
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[1, 5, 10, 25].map((km) => (
              <button
                key={km}
                onClick={() => setRadius(km)}
                className={`py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  radius === km ? 'bg-fb-dark text-white border-fb-dark' : 'bg-white text-fb-dark border-gray-200 hover:border-fb-dark'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-bold text-fb-dark uppercase tracking-widest mb-2">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border-2 border-gray-200 rounded-lg text-sm focus:border-fb-dark outline-none"
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
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-fb-dark">Available Food</h2>
            <span className="text-xs text-gray-400 hidden sm:block">
              {radius} km · {category || 'all categories'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="p-2 border rounded-lg text-sm w-36 hidden sm:block"
            />
            <div className="flex border-2 border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${view === 'list' ? 'bg-fb-dark text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                ☰ List
              </button>
              <button
                onClick={() => setView('map')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${view === 'map' ? 'bg-fb-dark text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                🗺 Map
              </button>
            </div>
          </div>
        </div>

        {view === 'list' && (
          <div className="flex-1 overflow-y-auto p-6">
            {loading && <div className="text-center text-gray-400 mt-20">Finding food near you...</div>}
            {!loading && filtered.length === 0 && (
              <div className="text-center text-gray-500 mt-20">
                <p className="text-lg font-medium">No listings found nearby.</p>
              </div>
            )}
            {!loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((item) => <ListingCard key={item._id} item={item} />)}
              </div>
            )}
          </div>
        )}

        {view === 'map' && (
          <div className="flex-1 relative">
            {!isLoaded ? (
              <div className="flex items-center justify-center h-full text-gray-400">Loading map...</div>
            ) : (
              <GoogleMap
                mapContainerStyle={MAP_STYLE}
                center={coords}
                zoom={14}
                onLoad={onMapLoad}
                options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
              >
                <Marker position={coords} icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#4285F4', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 }} />
                {listings.map((listing) => (
                  <Marker
                    key={listing._id}
                    position={{ lat: listing.location.coordinates[1], lng: listing.location.coordinates[0] }}
                    onClick={() => setSelected(listing)}
                    icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' }}
                  />
                ))}
                {selected && (
                  <InfoWindow
                    position={{ lat: selected.location.coordinates[1], lng: selected.location.coordinates[0] }}
                    onCloseClick={() => setSelected(null)}
                  >
                    <div className="p-1 w-64">
                        {selected.photoUrl && (
                        <img src={selected.photoUrl} alt={selected.title}
                            className="w-full h-28 object-cover rounded-lg mb-2" />
                        )}
                        <h4 className="font-bold text-fb-dark text-sm mb-1">{selected.title}</h4>
                        <p className="text-xs text-gray-500">👤 {selected.donorName}</p>
                        <p className="text-xs text-gray-500">📦 {selected.quantity} {selected.unit}</p>
                        <p className="text-xs text-gray-500 capitalize">🏷️ {selected.category}</p>
                        {selected.location?.address && (
                            <p className="text-xs text-gray-500">📍 {selected.location.address}</p>
                        )}
                        <p className="text-xs text-gray-500">
                            🕐 Pickup: {new Date(selected.pickupStart).toLocaleDateString()} – {new Date(selected.pickupEnd).toLocaleDateString()}
                        </p>
                        <button
                            onClick={() => setScheduleModal({ listing: selected })}
                            disabled={claiming === selected._id}
                            style={{ width: '100%', marginTop: '10px', backgroundColor: '#40916C', color: 'white', fontWeight: 'bold', fontSize: '12px', padding: '8px', borderRadius: '8px', border: 'none' }}
                        >
                            {claiming === selected._id ? 'Claiming...' : 'Claim This Item'}
                        </button>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Discover;