/**
 * Sidebar.jsx - Navigation Sidebar
 *
 * Used by Dashboard and other donor/admin pages.
 * Handles navigation, logout, and notification bell with unread badge.
 *
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/auth';
import { getNotifications } from '../services/api';

const Sidebar = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const user      = getCurrentUser();

  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count on mount and every 30 seconds as a polling fallback.
  // Socket.io real-time push will update this instantly when a notification
  // arrives — polling just ensures accuracy after reconnects or page refreshes.
  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      try {
        const { data } = await getNotifications({ limit: 30 });
        setUnreadCount(data.unreadCount);
      } catch {
        // Non-critical — badge simply won't update if this fails
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const donorItems = [
    { name: 'Dashboard',      path: '/dashboard',      icon: '📊' },
    { name: 'Post Food',      path: '/post',            icon: '➕' },
    { name: 'Notifications',  path: '/notifications',   icon: '🔔' },
    { name: 'Profile',        path: '/profile',         icon: '👤' },
  ];

  const recipientItems = [
    { name: 'Discover',       path: '/discover',        icon: '🔍' },
    { name: 'My Claims',      path: '/claimlimit',      icon: '📋' },
    { name: 'Notifications',  path: '/notifications',   icon: '🔔' },
    { name: 'Profile',        path: '/profile',         icon: '👤' },
    { name: 'Impact',         path: '/impact',           icon: '📊' },
  ];

  const adminItems = [
    { name: 'Admin Panel',    path: '/admin',           icon: '🛡️' },
    { name: 'Notifications',  path: '/notifications',   icon: '🔔' },
    { name: 'Profile',        path: '/profile',         icon: '👤' },
  ];

  const getMenuItems = () => {
    if (user?.role === 'recipient') return recipientItems;
    if (user?.role === 'admin')     return adminItems;
    return donorItems;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="w-64 bg-fb-dark min-h-screen p-6 text-white flex flex-col">

      {/* Logo and Profile pics*/}
      <div className="mb-10">
        <h1 className="text-2xl font-bold">
          Food<span className="text-fb-coral">Bridge</span>
        </h1>
        {user && (
          <div className="flex items-center gap-3 mt-3">
            {/* Profile picture or initial avatar */}
            {user.profile_pic_url ? (
              <img
                src={user.profile_pic_url}
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover border-2 border-white/20 flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-fb-coral flex items-center justify-center
                              text-white text-sm font-bold flex-shrink-0">
                {user.first_name?.[0]?.toUpperCase()}
              </div>
            )}
            <p className="text-xs text-white/50 capitalize leading-tight">
              {user.first_name} {user.last_name}<br />
              <span className="text-white/30">{user.role}</span>
            </p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <div className="flex-1 space-y-2">
        {getMenuItems().map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 p-3 rounded-xl transition-colors ${
              location.pathname === item.path
                ? 'bg-fb-light'
                : 'hover:bg-white/10'
            }`}
          >
            <span>{item.icon}</span>
            <span className="font-medium flex-1">{item.name}</span>

            {/* Unread badge — only shown on the Notifications link */}
            {item.path === '/notifications' && unreadCount > 0 && (
              <span className="bg-fb-coral text-white text-xs font-bold
                               rounded-full h-5 w-5 flex items-center
                               justify-center flex-shrink-0">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Logout */}
      <div className="pt-6 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 p-3 w-full hover:bg-red-500/20 rounded-xl text-red-400 transition-colors"
        >
          <span>🚪</span>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;