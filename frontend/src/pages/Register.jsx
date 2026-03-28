import React, { useState } from 'react';
import { register } from '../services/auth';

const Register = () => {
  const [role, setRole] = useState('donor');

  // Form field state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    password:  ''
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Update form state on every keystroke
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Called when form is submitted
  const handleSubmit = async (e) => {
    e.preventDefault(); // prevent page reload
    setError('');
    setLoading(true);

    try {
      const data = await register({ ...formData, role });
      // Registration successful — redirect based on role
      if (data.user.role === 'donor') {
        window.location.href = '/post-food';
      } else {
        window.location.href = '/discover';
      }
    } catch (err) {
      // Show the error message from the backend
      setError(
        err.response?.data?.error || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Column */}
      <div className="hidden lg:flex w-[40%] bg-fb-dark text-white p-16 flex-col justify-between">
        <div>
          <h1 className="text-7xl font-bold leading-tight">Food</h1>
          <h1 className="text-7xl font-bold text-fb-coral leading-tight">Bridge</h1>
          <p className="mt-4 text-xl opacity-80 font-light">Community Food Sharing Platform</p>
          <div className="mt-12 space-y-4 max-w-sm">
            {[
              { icon: '🍽️', text: 'Connect donors & recipients' },
              { icon: '📍', text: 'Location-based discovery' },
              { icon: '⚡', text: 'Real-time notifications' },
              { icon: '⚖️', text: 'Fair distribution system' },
            ].map((feature, i) => (
              <div key={i} className="bg-white/10 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                <span className="text-fb-leaf text-xl">{feature.icon}</span> {feature.text}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs opacity-50 font-mono">Team ShareBite • Red Deer Polytechnic • SWDV 1014</p>
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-[60%] p-10 md:p-20 flex flex-col justify-center items-center">
        <div className="max-w-md w-full mx-auto">
          <div className="flex gap-2 mb-8">
            <span className="bg-fb-coral text-white text-[10px] px-3 py-1 rounded font-black uppercase tracking-wider shadow-sm">Registration & Login</span>
            <span className="bg-fb-leaf text-white text-[10px] px-3 py-1 rounded font-black uppercase tracking-wider shadow-sm">Role-Based Onboarding</span>
          </div>

          <h2 className="text-4xl font-extrabold text-fb-dark tracking-tighter">Create Your Account</h2>
          <p className="text-gray-500 mt-2 mb-8">Join FoodBridge and start making a difference today</p>

          {/* Error message from backend */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>

            <div>
              <label className="text-sm font-medium text-fb-dark">First Name</label>
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="input-field w-full mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-fb-dark">Last Name</label>
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="input-field w-full mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-fb-dark">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
                className="input-field w-full mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-fb-dark">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Password (min 8 characters)"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="input-field w-full mt-1"
              />
            </div>

            <p className="text-sm font-bold text-fb-dark pt-2">I want to:</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('donor')}
                className={`p-5 border-2 rounded-2xl text-left transition-all ${role === 'donor' ? 'border-fb-leaf bg-fb-mint shadow-md ring-1 ring-fb-leaf' : 'border-gray-100 bg-gray-50'}`}
              >
                <div className="font-bold text-sm text-fb-dark">Donate Food</div>
                <div className="text-[10px] text-gray-500 leading-tight">Share surplus food with community</div>
              </button>
              <button
                type="button"
                onClick={() => setRole('recipient')}
                className={`p-5 border-2 rounded-2xl text-left transition-all ${role === 'recipient' ? 'border-fb-leaf bg-fb-mint shadow-md ring-1 ring-fb-leaf' : 'border-gray-100 bg-gray-50'}`}
              >
                <div className="font-bold text-sm text-fb-dark">Receive Food</div>
                <div className="text-[10px] text-gray-500 leading-tight">Find donations near you</div>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>

            <div className="grid place-items-center text-sm text-gray-500">
              Already have an account?{' '}
              <a href="/login" className="text-fb-coral hover:underline">Log in</a>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;