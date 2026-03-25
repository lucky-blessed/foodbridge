import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Discover', path: '/discover', icon: '🔍' },
    { name: 'Post Food', path: '/post', icon: '➕' },
    { name: 'Admin', path: '/admin', icon: '🛡️' },
  ];

  return (
    <nav className="w-64 bg-fb-dark min-h-screen p-6 text-white flex flex-col">
      <div className="mb-10">
        <h1 className="text-2xl font-bold">Food<span className="text-fb-coral">Bridge</span></h1>
      </div>
      
      <div className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 p-3 rounded-xl transition-colors ${
              location.pathname === item.path ? 'bg-fb-light' : 'hover:bg-white/10'
            }`}
          >
            <span>{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}
      </div>

      <div className="pt-6 border-t border-white/10">
        <button className="flex items-center space-x-3 p-3 w-full hover:bg-red-500/20 rounded-xl text-red-400 transition-colors">
          <span>🚪</span>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;