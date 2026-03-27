import React, { useState } from 'react';

const Register = () => {
  const [role, setRole] = useState('donor'); // Default to Donate Food

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Column - Informational */}
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
          {/* Status Badges */}
          <div className="flex gap-2 mb-8">
            <span className="bg-fb-coral text-white text-[10px] px-3 py-1 rounded font-black uppercase tracking-wider shadow-sm">Registration & Login</span>
            <span className="bg-fb-leaf text-white text-[10px] px-3 py-1 rounded font-black uppercase tracking-wider shadow-sm">Role-Based Onboarding</span>
          </div>

          <h2 className="text-4xl font-extrabold text-fb-dark tracking-tighter">Create Your Account</h2>
          <p className="text-gray-500 mt-2 mb-8">Join FoodBridge and start making a difference today</p>

          <form className="space-y-4">
            <div>First Name</div>
            <div className="grid gap-4">
              <input type="text" placeholder="First Name" className="input-field" />
            </div>
            <div>Last Name</div>
            <div className="grid gap-4">
              <input type="text" placeholder="Last Name" className="input-field" />
            </div>
            <div>Email Address</div>
            <input type="email" placeholder="Email Address" className="input-field" />
            <div>Password</div>
            <input type="password" placeholder="Password" className="input-field" />
            
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

            <button type="submit" className="btn-primary w-full mt-6">
              Create Account →
            </button>
            <div className="grid place-items-center">
              Already have an account? <a href="/login" className="text-fb-coral hover:underline">Log in</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;