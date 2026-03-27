import React from 'react';
import Sidebar from '../components/Sidebar';

const Dashboard = () => {
  const stats = [
    { label: 'Total Donations', value: '124', color: 'bg-blue-500' },
    { label: 'Active Claims', value: '12', color: 'bg-fb-light' },
    { label: 'Impact Score', value: '98%', color: 'bg-fb-coral' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-10">
        <header className="mb-10">
          <h2 className="text-3xl font-bold text-fb-dark">Welcome Back, User</h2>
          <p className="text-gray-500">Here is your impact for this month.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-4xl font-black text-fb-dark mt-2">{stat.value}</p>
              <div className={`h-1 w-12 mt-4 rounded-full ${stat.color}`}></div>
            </div>
          ))}
        </div>

        {/* Activity Table Placeholder */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="font-bold text-fb-dark">Recent Activity</h3>
          </div>
          <div className="p-10 text-center text-gray-400 italic">
            No recent activity to display. Start by discovering food!
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;