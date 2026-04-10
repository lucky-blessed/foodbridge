/**
 * Admin.jsx - Admin Moderation Panel
 *
 * Connects to:
 *  GET    /admin/stats                  → platform stats
 *  GET    /admin/listings               → all listings paginated
 *  PATCH  /admin/listings/:id/flag      → hide a listing
 *  PATCH  /admin/listings/:id/restore   → restore a listing
 *  DELETE /admin/listings/:id           → hard delete
 *  GET    /admin/users                  → all users
 *  PATCH  /admin/users/:id/deactivate   → deactivate user
 *  PATCH  /admin/users/:id/activate     → activate user
 *  GET    /admin/reports/distribution   → claims per recipient
 *  GET    /admin/audit-log              → recent admin actions
 *
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, List, Users, Flag,
  FileText, Search, Trash2, RefreshCw, Settings
} from 'lucide-react';

// Chart.js import
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, ArcElement,
  Title, Tooltip, Legend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, ArcElement,
  Title, Tooltip, Legend
);

import api from '../services/api';
import Sidebar from '../components/Sidebar';

const Admin = () => {
  const [activeTab,   setActiveTab]   = useState('listings');
  const [stats,       setStats]       = useState(null);
  const [listings,    setListings]    = useState([]);
  const [users,       setUsers]       = useState([]);
  const [report,      setReport]      = useState([]);
  const [auditLog,    setAuditLog]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [searchTerm,  setSearchTerm]  = useState('');
  const [statusFilter,setStatusFilter]= useState('');
  const [actioningId, setActioningId] = useState(null);

  const [settings,      setSettings]     = useState({ claimLimitIndividual: 3, claimLimitOrganization: 10, windowDays: 7 });
  const [settingsDirty, setSettingsDirty]= useState(false);
  const [settingsSaving,setSettingsSaving]= useState(false);
  const [settingsMsg,   setSettingsMsg]  = useState('');

  const [demographics,   setDemographics]   = useState(null);
  const [demoLoading,    setDemoLoading]     = useState(false);
  const [demoView,       setDemoView]        = useState('both');
  const [demoRole,       setDemoRole]        = useState('all');
  const [demoGender,     setDemoGender]      = useState('all');
  const [demoAgeRange,   setDemoAgeRange]    = useState('all');

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'demographics') {
        fetchDemographics(demoView, demoRole, demoGender, demoAgeRange);
    }
}, [activeTab]);

  const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
          const [statsRes, listingsRes, usersRes, reportRes, auditRes, settingsRes] =
              await Promise.allSettled([
                  api.get('/admin/stats'),
                  api.get('/admin/listings?limit=50'),
                  api.get('/admin/users?limit=50'),
                  api.get('/admin/reports/distribution'),
                  api.get('/admin/audit-log?limit=20'),
                  api.get('/admin/settings/claims'),
              ]);

          // Only update state for requests that succeeded
          if (statsRes.status    === 'fulfilled') setStats(statsRes.value.data);
          if (listingsRes.status === 'fulfilled') setListings(listingsRes.value.data.listings || []);
          if (usersRes.status    === 'fulfilled') setUsers(usersRes.value.data.users || []);
          if (reportRes.status   === 'fulfilled') setReport(reportRes.value.data.report || []);
          if (auditRes.status    === 'fulfilled') setAuditLog(auditRes.value.data.log || []);
          if (settingsRes.status === 'fulfilled') setSettings({
              claimLimitIndividual:   settingsRes.value.data.claimLimitIndividual,
              claimLimitOrganization: settingsRes.value.data.claimLimitOrganization,
              windowDays:             settingsRes.value.data.windowDays
          });

          // Only show error if ALL critical requests failed
          const criticalFailed = [statsRes, listingsRes, usersRes]
              .every(r => r.status === 'rejected');
          if (criticalFailed) {
              setError('Failed to load admin data.');
          }
      } catch (err) {
          setError('Failed to load admin data.');
      } finally {
          setLoading(false);
      }
  };

  // ── Listing actions ───────────────────────────────
  const handleFlag = async (id) => {
    const reason = window.prompt('Reason for flagging (optional):');
    if (reason === null) return; // cancelled
    setActioningId(id);
    try {
      await api.patch(`/admin/listings/${id}/flag`, { reason });
      setListings(prev => prev.map(l =>
        l._id === id ? { ...l, status: 'hidden' } : l
      ));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to flag listing.');
    } finally {
      setActioningId(null);
    }
  };

  const handleRestore = async (id) => {
    setActioningId(id);
    try {
      await api.patch(`/admin/listings/${id}/restore`);
      setListings(prev => prev.map(l =>
        l._id === id ? { ...l, status: 'available' } : l
      ));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to restore listing.');
    } finally {
      setActioningId(null);
    }
  };

  const handleDeleteListing = async (id) => {
    if (!window.confirm('Permanently delete this listing? This cannot be undone.')) return;
    setActioningId(id);
    try {
      await api.delete(`/admin/listings/${id}`);
      setListings(prev => prev.filter(l => l._id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete listing.');
    } finally {
      setActioningId(null);
    }
  };

  // ── User actions ──────────────────────────────────
  const handleDeactivate = async (id) => {
    const reason = window.prompt('Reason for deactivation (optional):');
    if (reason === null) return;
    setActioningId(id);
    try {
      await api.patch(`/admin/users/${id}/deactivate`, { reason });
      setUsers(prev => prev.map(u =>
        u.id === id ? { ...u, is_active: false } : u
      ));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate user.');
    } finally {
      setActioningId(null);
    }
  };

  const handleActivate = async (id) => {
    setActioningId(id);
    try {
      await api.patch(`/admin/users/${id}/activate`);
      setUsers(prev => prev.map(u =>
        u.id === id ? { ...u, is_active: true } : u
      ));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to activate user.');
    } finally {
      setActioningId(null);
    }
  };

  // ── Filtered listings ─────────────────────────────
  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      const matchSearch = !searchTerm ||
        l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.donorName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !statusFilter || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [listings, searchTerm, statusFilter]);

  const statusColor = {
    available: 'text-emerald-600',
    claimed:   'text-blue-600',
    completed: 'text-gray-500',
    expired:   'text-orange-500',
    hidden:    'text-red-600',
  };

  const tabs = [
    { id: 'listings', label: 'Listings',     icon: List },
    { id: 'users',    label: 'Users',        icon: Users },
    { id: 'reports',  label: 'Distribution', icon: FileText },
    { id: 'audit',    label: 'Audit Log',    icon: Flag },
    { id: 'settings', label: 'Settings',     icon: Settings }, 
    { id: 'demographics', label: 'Demographics', icon: LayoutDashboard },
 

  ];

  const handleSaveSettings = async () => {
      setSettingsSaving(true);
      setSettingsMsg('');
      try {
          await api.patch('/admin/settings/claims', {
              claimLimitIndividual:   settings.claimLimitIndividual,
              claimLimitOrganization: settings.claimLimitOrganization,
              windowDays:             settings.windowDays
          });
          setSettingsDirty(false);
          setSettingsMsg('Settings saved successfully.');
      } catch (err) {
          setSettingsMsg(err.response?.data?.error || 'Failed to save settings.');
      } finally {
          setSettingsSaving(false);
      }
  };


  const fetchDemographics = async (view = demoView, role = demoRole, gender = demoGender, ageRange = demoAgeRange) => {
      setDemoLoading(true);
      try {
          const params = { view, role };
          if (gender   !== 'all') params.gender    = gender;
          if (ageRange !== 'all') params.age_range = ageRange;
          const res = await api.get('/admin/demographics', { params });
          setDemographics(res.data);
      } catch (err) {
          console.error('Failed to fetch demographics:', err);
      } finally {
          setDemoLoading(false);
      }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-10 overflow-y-auto">

        {/* Header */}
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-fb-dark">Admin Panel</h1>
            <p className="text-gray-500">Moderation, user management and platform reports</p>
          </div>
          <button onClick={fetchAll}
            className="flex items-center gap-2 border border-fb-dark text-fb-dark px-4 py-2 rounded-xl text-sm font-semibold hover:bg-fb-dark hover:text-white transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </header>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Listings', value: stats.listings?.total       || 0, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Available',      value: stats.listings?.available   || 0, color: 'bg-green-50 text-green-700'    },
              { label: 'Hidden',         value: stats.listings?.hidden      || 0, color: 'bg-red-50 text-red-700'        },
              { label: 'Total Users',    value: stats.users?.total_users    || 0, color: 'bg-blue-50 text-blue-700'      },
              { label: 'Donors',         value: stats.users?.donors         || 0, color: 'bg-emerald-50 text-emerald-700'},
              { label: 'Recipients',     value: stats.users?.recipients     || 0, color: 'bg-blue-50 text-blue-700'      },
              { label: 'Total Claims',   value: stats.claims?.total_claims  || 0, color: 'bg-purple-50 text-purple-700'  },
              { label: 'Completed',      value: stats.claims?.completed     || 0, color: 'bg-gray-50 text-gray-700'      },
            ].map((s, i) => (
              <div key={i} className={`p-4 rounded-xl border ${s.color} border-current border-opacity-20`}>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-fb-dark text-fb-dark'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-gray-400 mt-20">Loading admin data...</div>
        )}

        {/* ── LISTINGS TAB ── */}
        {!loading && activeTab === 'listings' && (
          <>
            {/* Controls */}
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input type="text" placeholder="Search listings..."
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fb-dark" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">All Statuses</option>
                <option value="available">Available</option>
                <option value="claimed">Claimed</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-fb-dark text-white text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Donor</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Posted</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredListings.map((l) => (
                    <tr key={l._id} className={l.status === 'hidden' ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-fb-dark max-w-[200px] truncate">
                        {l.title}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{l.donorName}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{l.category}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold uppercase ${statusColor[l.status] || 'text-gray-500'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {l.status !== 'hidden' ? (
                            <button onClick={() => handleFlag(l._id)}
                              disabled={actioningId === l._id}
                              className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-semibold hover:bg-orange-200 disabled:opacity-50">
                              Flag
                            </button>
                          ) : (
                            <button onClick={() => handleRestore(l._id)}
                              disabled={actioningId === l._id}
                              className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg font-semibold hover:bg-green-200 disabled:opacity-50">
                              Restore
                            </button>
                          )}
                          <button onClick={() => handleDeleteListing(l._id)}
                            disabled={actioningId === l._id}
                            className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg font-semibold hover:bg-red-200 disabled:opacity-50">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredListings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-400 italic">
                        No listings found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── USERS TAB ── */}
        {!loading && activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-fb-dark text-white text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className={!u.is_active ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-fb-dark">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                        u.role === 'admin'     ? 'bg-blue-100 text-blue-700'    :
                        u.role === 'donor'     ? 'bg-green-100 text-green-700'  :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${u.is_active ? 'text-green-600' : 'text-red-500'}`}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.role !== 'admin' && (
                        u.is_active ? (
                          <button onClick={() => handleDeactivate(u.id)}
                            disabled={actioningId === u.id}
                            className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg font-semibold hover:bg-red-200 disabled:opacity-50">
                            Deactivate
                          </button>
                        ) : (
                          <button onClick={() => handleActivate(u.id)}
                            disabled={actioningId === u.id}
                            className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg font-semibold hover:bg-green-200 disabled:opacity-50">
                            Activate
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── DISTRIBUTION REPORT TAB ── */}
        {!loading && activeTab === 'reports' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="font-bold text-fb-dark">Claim Distribution Report</h3>
              <p className="text-sm text-gray-500 mt-1">
                Total claims per recipient — rolling 7-day fair distribution
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">Recipient</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Total</th>
                  <th className="px-6 py-3 text-left">Active</th>
                  <th className="px-6 py-3 text-left">Completed</th>
                  <th className="px-6 py-3 text-left">Cancelled</th>
                  <th className="px-6 py-3 text-left">Last Claim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-fb-dark">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{r.email}</td>
                    <td className="px-6 py-4 font-bold text-fb-dark">{r.total_claims}</td>
                    <td className="px-6 py-4 text-green-600">{r.active_claims}</td>
                    <td className="px-6 py-4 text-blue-600">{r.completed_claims}</td>
                    <td className="px-6 py-4 text-gray-400">{r.cancelled_claims}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {r.last_claim_at
                        ? new Date(r.last_claim_at).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
                {report.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400 italic">
                      No recipient data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── AUDIT LOG TAB ── */}
        {!loading && activeTab === 'audit' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="font-bold text-fb-dark">Audit Log</h3>
              <p className="text-sm text-gray-500 mt-1">Recent admin actions</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">Admin</th>
                  <th className="px-6 py-3 text-left">Action</th>
                  <th className="px-6 py-3 text-left">Target ID</th>
                  <th className="px-6 py-3 text-left">Reason</th>
                  <th className="px-6 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLog.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-fb-dark">
                      {entry.first_name} {entry.last_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold bg-fb-dark text-white px-2 py-1 rounded">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs font-mono truncate max-w-[120px]">
                      {entry.target_id}
                    </td>
                    <td className="px-6 py-4 text-gray-500 italic">
                      {entry.reason || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {auditLog.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">
                      No admin actions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {/* ── SETTINGS TAB ── */}
        {!loading && activeTab === 'settings' && (
            <div className="max-w-lg">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                    <h3 className="font-bold text-fb-dark text-lg mb-1">Claim Settings</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        Adjust claim limits and rolling window for all recipients.
                        Changes take effect immediately for all new claims.
                    </p>

                    <div className="space-y-5">
                        {/* Individual claim limit */}
                        <div>
                            <label className="block text-sm font-semibold text-fb-dark mb-1">
                                Individual Recipient Claim Limit
                            </label>
                            <p className="text-xs text-gray-400 mb-2">
                                Maximum claims an individual recipient can make per rolling window. (1–20)
                            </p>
                            <input
                                type="number" min={1} max={20}
                                value={settings.claimLimitIndividual}
                                onChange={e => {
                                    setSettings(prev => ({ ...prev, claimLimitIndividual: parseInt(e.target.value) }));
                                    setSettingsDirty(true);
                                    setSettingsMsg('');
                                }}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm
                                          focus:border-fb-dark focus:outline-none"
                            />
                        </div>

                        {/* Organization claim limit */}
                        <div>
                            <label className="block text-sm font-semibold text-fb-dark mb-1">
                                Organization Recipient Claim Limit
                            </label>
                            <p className="text-xs text-gray-400 mb-2">
                                Maximum claims an organization recipient can make per rolling window. (1–100)
                            </p>
                            <input
                                type="number" min={1} max={100}
                                value={settings.claimLimitOrganization}
                                onChange={e => {
                                    setSettings(prev => ({ ...prev, claimLimitOrganization: parseInt(e.target.value) }));
                                    setSettingsDirty(true);
                                    setSettingsMsg('');
                                }}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm
                                          focus:border-fb-dark focus:outline-none"
                            />
                        </div>

                        {/* Window days */}
                        <div>
                            <label className="block text-sm font-semibold text-fb-dark mb-1">
                                Rolling Window (Days)
                            </label>
                            <p className="text-xs text-gray-400 mb-2">
                                Number of days in the rolling claim window. (1–30)
                            </p>
                            <input
                                type="number" min={1} max={30}
                                value={settings.windowDays}
                                onChange={e => {
                                    setSettings(prev => ({ ...prev, windowDays: parseInt(e.target.value) }));
                                    setSettingsDirty(true);
                                    setSettingsMsg('');
                                }}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm
                                          focus:border-fb-dark focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Feedback message */}
                    {settingsMsg && (
                        <p className={`mt-4 text-sm font-medium ${
                            settingsMsg.includes('success') ? 'text-green-600' : 'text-red-600'
                        }`}>
                            {settingsMsg}
                        </p>
                    )}

                    {/* Save button */}
                    <button
                        onClick={handleSaveSettings}
                        disabled={!settingsDirty || settingsSaving}
                        className="mt-6 w-full bg-fb-dark text-white font-bold py-3 rounded-xl
                                  hover:bg-fb-light transition-colors disabled:opacity-40
                                  disabled:cursor-not-allowed text-sm">
                        {settingsSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
          </div>
        )}

        {/* ── DEMOGRAPHICS TAB ── */}
        {!loading && activeTab === 'demographics' && (
            <div>
                {/* Privacy notice */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                    🔒 Demographic data is anonymised and used for community planning purposes only.
                    No personally identifiable information is shown.
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap gap-3 mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">View</label>
                        <select value={demoView}
                            onChange={e => { setDemoView(e.target.value); fetchDemographics(e.target.value, demoRole, demoGender, demoAgeRange); }}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                            <option value="both">Both</option>
                            <option value="individual">Individuals only</option>
                            <option value="organization">Organizations only</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Role</label>
                        <select value={demoRole}
                            onChange={e => { setDemoRole(e.target.value); fetchDemographics(demoView, e.target.value, demoGender, demoAgeRange); }}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                            <option value="all">All roles</option>
                            <option value="donor">Donors only</option>
                            <option value="recipient">Recipients only</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Gender</label>
                        <select value={demoGender}
                            onChange={e => { setDemoGender(e.target.value); fetchDemographics(demoView, demoRole, e.target.value, demoAgeRange); }}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                            <option value="all">All genders</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Age Range</label>
                        <select value={demoAgeRange}
                            onChange={e => { setDemoAgeRange(e.target.value); fetchDemographics(demoView, demoRole, demoGender, e.target.value); }}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                            <option value="all">All ages</option>
                            <option value="under_18">Under 18</option>
                            <option value="18_24">18 – 24</option>
                            <option value="25_34">25 – 34</option>
                            <option value="35_44">35 – 44</option>
                            <option value="45_54">45 – 54</option>
                            <option value="55_64">55 – 64</option>
                            <option value="65_plus">65 and over</option>
                        </select>
                    </div>
                    {/* Totals */}
                    <div className="ml-auto flex items-end gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-black text-fb-dark">{demographics?.totals?.individuals || 0}</p>
                            <p className="text-xs text-gray-400 font-semibold uppercase">Individuals</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-fb-dark">{demographics?.totals?.organizations || 0}</p>
                            <p className="text-xs text-gray-400 font-semibold uppercase">Organizations</p>
                        </div>
                    </div>
                </div>

                {demoLoading && (
                    <div className="text-center text-gray-400 py-10">Loading demographic data...</div>
                )}

                {!demoLoading && demographics && (
                    <div className="space-y-6">

                        {/* ── INDIVIDUAL VIEW ── */}
                        {demographics.individuals && (
                            <>
                                <h3 className="font-bold text-fb-dark text-base border-b pb-2">
                                    Individual Users
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Gender doughnut */}
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <h4 className="font-bold text-fb-dark text-sm mb-4">By Gender</h4>
                                        {demographics.individuals.byGender.length > 0 ? (
                                            <div className="max-w-[220px] mx-auto">
                                                <Doughnut
                                                    data={{
                                                        labels: demographics.individuals.byGender.map(g => g.gender),
                                                        datasets: [{
                                                            data: demographics.individuals.byGender.map(g => g.count),
                                                            backgroundColor: ['rgba(64,145,108,0.8)', 'rgba(231,111,81,0.8)', 'rgba(41,128,185,0.8)'],
                                                            borderWidth: 0
                                                        }]
                                                    }}
                                                    options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }}
                                                />
                                            </div>
                                        ) : <p className="text-gray-400 text-sm italic text-center py-8">No data yet.</p>}
                                    </div>

                                    {/* Age range bar */}
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <h4 className="font-bold text-fb-dark text-sm mb-4">By Age Range</h4>
                                        {demographics.individuals.byAgeRange.length > 0 ? (
                                            <Bar
                                                data={{
                                                    labels: demographics.individuals.byAgeRange.map(a => a.ageRange),
                                                    datasets: [{
                                                        data: demographics.individuals.byAgeRange.map(a => a.count),
                                                        backgroundColor: 'rgba(64,145,108,0.8)',
                                                        borderRadius: 4,
                                                        borderWidth: 0
                                                    }]
                                                }}
                                                options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
                                            />
                                        ) : <p className="text-gray-400 text-sm italic text-center py-8">No data yet.</p>}
                                    </div>

                                    {/* Role doughnut */}
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <h4 className="font-bold text-fb-dark text-sm mb-4">By Role</h4>
                                        {demographics.individuals.byRole.length > 0 ? (
                                            <div className="max-w-[220px] mx-auto">
                                                <Doughnut
                                                    data={{
                                                        labels: demographics.individuals.byRole.map(r => r.role),
                                                        datasets: [{
                                                            data: demographics.individuals.byRole.map(r => r.count),
                                                            backgroundColor: ['rgba(64,145,108,0.8)', 'rgba(231,111,81,0.8)', 'rgba(41,128,185,0.8)'],
                                                            borderWidth: 0
                                                        }]
                                                    }}
                                                    options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }}
                                                />
                                            </div>
                                        ) : <p className="text-gray-400 text-sm italic text-center py-8">No data yet.</p>}
                                    </div>
                                </div>

                                {/* Gender x Age matrix */}
                                {demographics.individuals.genderAge.length > 0 && (
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <h4 className="font-bold text-fb-dark text-sm mb-4">Gender × Age Matrix</h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">Gender</th>
                                                        <th className="px-4 py-2 text-left">Age Range</th>
                                                        <th className="px-4 py-2 text-left">Count</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {demographics.individuals.genderAge.map((row, i) => (
                                                        <tr key={i} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2 capitalize">{row.gender}</td>
                                                            <td className="px-4 py-2">{row.ageRange}</td>
                                                            <td className="px-4 py-2 font-bold text-fb-dark">{row.count}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── ORGANIZATION VIEW ── */}
                        {demographics.organizations && (
                            <>
                                <h3 className="font-bold text-fb-dark text-base border-b pb-2 mt-4">
                                    Organizations
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Org type bar */}
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm md:col-span-2">
                                        <h4 className="font-bold text-fb-dark text-sm mb-4">By Organization Type</h4>
                                        {demographics.organizations.byType.length > 0 ? (
                                            <Bar
                                                data={{
                                                    labels: demographics.organizations.byType.map(o => o.orgType),
                                                    datasets: [{
                                                        data: demographics.organizations.byType.map(o => o.count),
                                                        backgroundColor: 'rgba(41,128,185,0.8)',
                                                        borderRadius: 4,
                                                        borderWidth: 0
                                                    }]
                                                }}
                                                options={{ responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }}
                                            />
                                        ) : <p className="text-gray-400 text-sm italic text-center py-8">No data yet.</p>}
                                    </div>

                                    {/* Org role doughnut + active stat */}
                                    <div className="space-y-4">
                                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                            <h4 className="font-bold text-fb-dark text-sm mb-4">By Role</h4>
                                            {demographics.organizations.byRole.length > 0 ? (
                                                <div className="max-w-[180px] mx-auto">
                                                    <Doughnut
                                                        data={{
                                                            labels: demographics.organizations.byRole.map(r => r.role),
                                                            datasets: [{
                                                                data: demographics.organizations.byRole.map(r => r.count),
                                                                backgroundColor: ['rgba(64,145,108,0.8)', 'rgba(231,111,81,0.8)'],
                                                                borderWidth: 0
                                                            }]
                                                        }}
                                                        options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }}
                                                    />
                                                </div>
                                            ) : <p className="text-gray-400 text-sm italic text-center py-4">No data yet.</p>}
                                        </div>
                                        <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 text-center">
                                            <p className="text-3xl font-black text-emerald-700">
                                                {demographics.organizations.active30d}
                                            </p>
                                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-1">
                                                New orgs (30 days)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
};

export default Admin;