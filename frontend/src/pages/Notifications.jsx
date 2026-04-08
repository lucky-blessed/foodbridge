import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getNotifications, markNotifRead, markAllNotifsRead } from '../services/api';

const TYPE_ICON = {
  NewListing:     '🍎',
  ClaimConfirm:   '✅',
  LimitWarning:   '⚠️',
  PickupReminder: '🕐',
};

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getNotifications({ limit: 50 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await markNotifRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Non-critical — silently ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotifsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      alert('Failed to mark all as read. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-10">

        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-fb-dark">Notifications</h2>
            <p className="text-gray-500 mt-1">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.`
                : 'You are all caught up.'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm font-semibold text-fb-dark border-2 border-fb-dark
                         px-4 py-2 rounded-xl hover:bg-fb-dark hover:text-white
                         transition-colors"
            >
              Mark all as read
            </button>
          )}
        </header>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {loading && (
            <div className="p-10 text-center text-gray-400">
              Loading notifications...
            </div>
          )}

          {error && !loading && (
            <div className="p-10 text-center text-red-500">{error}</div>
          )}

          {!loading && !error && notifications.length === 0 && (
            <div className="p-10 text-center text-gray-400 italic">
              No notifications yet. They will appear here when food is posted nearby
              or your claims are updated.
            </div>
          )}

          {!loading && !error && notifications.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkOneRead(n.id)}
                  className={`flex items-start gap-4 px-6 py-4 transition-colors
                    ${n.is_read
                      ? 'bg-white'
                      : 'bg-fb-mint/20 cursor-pointer hover:bg-fb-mint/30'
                    }`}
                >
                  {/* Icon */}
                  <span className="text-2xl flex-shrink-0 mt-0.5">
                    {TYPE_ICON[n.notification_type] || '🔔'}
                  </span>

                  {/* Message + time */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.is_read ? 'text-gray-500' : 'text-fb-dark font-medium'}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.is_read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-fb-coral
                                    flex-shrink-0 mt-1.5" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};

export default Notifications;