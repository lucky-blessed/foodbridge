import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, List, Users, Flag, FileText, Settings, 
  Search, Plus, Download, Eye, Trash2 
} from 'lucide-react';

const AdminModerationPage = () => {
  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [listings, setListings] = useState([
    { id: 1, title: 'Spam: "Free Cash"', donor: 'unknown', category: '—', posted: 'Today 2:14 PM', status: 'Flagged' },
    { id: 2, title: 'Sourdough Bread × 20', donor: 'Lucky Nkwor', category: 'Baked', posted: 'Today 8:00 AM', status: 'Active' },
    { id: 3, title: 'Fresh Pasta × 5', donor: 'Kartic Bavoria', category: 'Meals', posted: 'Yesterday', status: 'Active' },
    { id: 4, title: 'Veggie Box 2kg', donor: 'Upashana Khanal', category: 'Produce', posted: 'Yesterday', status: 'Active' },
    { id: 5, title: 'Canned Goods Bundle', donor: 'Yi Zhang', category: 'Non-perish', posted: 'Mar 19', status: 'Active' },
  ]);

  // --- Logic ---
  const filteredListings = useMemo(() => {
    return listings.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.donor.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, listings]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDelete = (id) => {
    setListings(prev => prev.filter(item => item.id !== id));
  };

  // --- Component Parts ---
  const StatCard = ({ label, value, icon: Icon, colorClass }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 flex-1 min-w-[200px]">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${colorClass}`}>
        <Icon size={20} />
      </div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500 font-medium">{label}</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#1a332a] text-slate-200 font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 p-6 space-y-2">
        <div className="text-orange-500 text-2xl font-black mb-10 px-4">FoodBridge</div>
        {[
          { icon: LayoutDashboard, label: 'Dashboard' },
          { icon: List, label: 'All Listings', active: true },
          { icon: Users, label: 'Users' },
          { icon: Flag, label: 'Flagged (3)' },
          { icon: FileText, label: 'Reports' },
          { icon: Settings, label: 'Settings' },
        ].map((item) => (
          <button 
            key={item.label}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${item.active ? 'bg-[#325a4a] text-white' : 'text-slate-400 hover:bg-[#254236]'}`}
          >
            <item.icon size={18} /> {item.label}
          </button>
        ))}
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50 rounded-tl-3xl p-10 text-slate-900 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[#1a332a]">Listing Moderation</h1>
          <p className="text-slate-500">Review, flag, and manage all food donation listings</p>
        </header>

        {/* Stats Row */}
        <div className="flex flex-wrap gap-6 mb-8">
          <StatCard label="Total Listings" value="247" icon={List} colorClass="bg-emerald-100 text-emerald-700" />
          <StatCard label="Active" value="239" icon={CheckCircle} colorClass="bg-emerald-100 text-emerald-700" />
          <StatCard label="Flagged" value="3" icon={Flag} colorClass="bg-red-100 text-red-600" />
          <StatCard label="Active Users" value="89" icon={Users} colorClass="bg-emerald-100 text-emerald-700" />
        </div>

        {/* Table Controls */}
        <div className="bg-white p-4 rounded-t-xl border border-slate-200 border-b-0 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search listings..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold">
            <option>Status: All</option>
          </select>
          <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold">
            <option>Date: Today</option>
          </select>
          <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold">
            <option>Category: All</option>
          </select>
          <button className="ml-auto flex items-center gap-2 border-2 border-[#1a332a] text-[#1a332a] px-4 py-2 rounded-full font-bold text-sm hover:bg-slate-50 transition-colors">
            <Plus size={16} /> Bulk Action
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#1a332a] text-white uppercase text-[11px] tracking-wider">
                <th className="p-4 w-12"><input type="checkbox" className="accent-emerald-500" /></th>
                <th className="p-4 font-semibold">Listing Title</th>
                <th className="p-4 font-semibold">Donor</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Posted</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredListings.map((item) => (
                <tr key={item.id} className={`${item.status === 'Flagged' ? 'bg-orange-50/50' : 'hover:bg-slate-50'}`}>
                  <td className="p-4">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(item.id)} 
                      onChange={() => toggleSelect(item.id)}
                      className="accent-emerald-500"
                    />
                  </td>
                  <td className="p-4 font-bold text-slate-700">{item.title}</td>
                  <td className="p-4 text-slate-600">{item.donor}</td>
                  <td className="p-4 text-slate-600">{item.category}</td>
                  <td className="p-4 text-slate-500 text-xs">{item.posted}</td>
                  <td className="p-4">
                    <span className={`flex items-center gap-1 font-bold text-[11px] uppercase ${item.status === 'Flagged' ? 'text-orange-600' : 'text-emerald-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Flagged' ? 'bg-orange-600' : 'bg-emerald-600'}`} />
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    {item.status === 'Flagged' ? (
                      <button onClick={() => handleDelete(item.id)} className="bg-red-500 text-white px-3 py-1 rounded-lg font-bold text-xs">Del</button>
                    ) : (
                      <button className="border border-slate-300 px-3 py-1 rounded-lg font-bold text-xs text-slate-600 hover:bg-slate-50">Flag</button>
                    )}
                    <button className="border border-[#1a332a] text-[#1a332a] px-3 py-1 rounded-lg font-bold text-xs hover:bg-slate-50 flex items-center gap-1">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Claim Distribution Report */}
        <section className="mt-8 bg-white border border-slate-200 rounded-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-[#1a332a]">Claim Distribution Report — This Week</h3>
            <button className="flex items-center gap-2 border-2 border-[#1a332a] text-[#1a332a] px-4 py-1.5 rounded-lg font-bold text-xs">
              Export CSV
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { name: 'Yi Zhang', val: '3/3', width: '100%' },
              { name: 'Lucky Nkwor', val: '2/3', width: '66%' },
              { name: 'Kartic Bavoria', val: '2/3', width: '66%' },
              { name: 'Upashana Khanal', val: '1/3', width: '33%' },
            ].map((report) => (
              <div key={report.name} className="text-center">
                <p className="text-[10px] font-bold text-slate-400 mb-2">{report.name}</p>
                <div className="bg-slate-100 h-14 w-full rounded relative overflow-hidden flex items-end">
                   <div className="bg-[#1a332a] w-full transition-all duration-700" style={{ height: report.width }} />
                </div>
                <p className="text-[10px] font-bold text-slate-500 mt-2">{report.val}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

// Helper for the icon in StatCard
const CheckCircle = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

export default AdminModerationPage;