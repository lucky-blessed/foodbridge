import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getMyListings, deleteListing, confirmPickup } from '../services/listings';
import { getCurrentUser } from '../services/auth';

const Dashboard = () => {
  const [listings, setListings]  = useState([]);
  const [loading,  setLoading]   = useState(true);
  const [error,    setError]     = useState('');
  const user = getCurrentUser();

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyListings();
      setListings(data.listings || []);
    } catch (err) {
      setError('Failed to load your listings.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await deleteListing(id);
      setListings(prev => prev.filter(l => l._id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete listing.');
    }
  };

  const handleConfirmPickup = async (id) => {
    if (!window.confirm('Confirm that the recipient has picked up this donation?')) return;
    try {
      await confirmPickup(id);
      setListings(prev => prev.map(l =>
        l._id === id ? { ...l, status: 'completed' } : l
      ));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to confirm pickup.');
    }
  };

  // Compute stats from real data
  const total     = listings.length;
  const active    = listings.filter(l => l.status === 'available').length;
  const claimed   = listings.filter(l => l.status === 'claimed').length;
  const completed = listings.filter(l => l.status === 'completed').length;

  const stats = [
    { label: 'Total Donations', value: String(total),     color: 'bg-blue-500'  },
    { label: 'Active Listings', value: String(active),    color: 'bg-fb-light'  },
    { label: 'Completed',       value: String(completed), color: 'bg-fb-coral'  },
  ];

  const statusColor = {
    available:  'text-green-600 bg-green-50',
    claimed:    'text-blue-600 bg-blue-50',
    completed:  'text-gray-600 bg-gray-100',
    expired:    'text-red-500 bg-red-50',
    hidden:     'text-yellow-600 bg-yellow-50',
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-10">

        {/* Header */}
        <header className="mb-10">
          <h2 className="text-3xl font-bold text-fb-dark">
            Welcome Back, {user?.first_name || 'Donor'}
          </h2>
          <p className="text-gray-500">Here is your donation activity.</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-4xl font-black text-fb-dark mt-2">{stat.value}</p>
              <div className={`h-1 w-12 mt-4 rounded-full ${stat.color}`} />
            </div>
          ))}
        </div>

        {/* Listings Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-bold text-fb-dark">My Listings</h3>
            <a href="/post"
              className="bg-fb-dark text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-fb-light transition-colors">
              + Post Food
            </a>
          </div>

          {loading && (
            <div className="p-10 text-center text-gray-400">Loading your listings...</div>
          )}

          {error && !loading && (
            <div className="p-10 text-center text-red-500">{error}</div>
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="p-10 text-center text-gray-400 italic">
              No listings yet. Start by posting a food donation!
            </div>
          )}

          {!loading && listings.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">Title</th>
                  <th className="px-6 py-3 text-left">Category</th>
                  <th className="px-6 py-3 text-left">ExpiresAt</th>
                  <th className="px-6 py-3 text-left">Value ($)</th>
                  <th className="px-6 py-3 text-left">Pickup End</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listings.map((listing) => (
                  <tr key={listing._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-fb-dark">
                      {listing.title}
                    </td>
                    <td className="px-6 py-4 capitalize text-gray-500">
                      {listing.category}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {listing.expiresAt ? new Date(listing.expiresAt).toLocaleDateString() : new Date(0).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {listing.value?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(listing.pickupEnd).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize
                        ${statusColor[listing.status] || 'text-gray-500 bg-gray-100'}`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-3">
                      {listing.status === 'available' && (
                        <button
                          onClick={() => handleDelete(listing._id)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold">
                          Delete
                        </button>
                      )}
                      {listing.status === 'claimed' && (
                        <button
                          onClick={() => handleConfirmPickup(listing._id)}
                          className="text-green-600 hover:text-green-800 text-xs font-semibold">
                          Confirm Pickup
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;