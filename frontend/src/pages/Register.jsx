import React, { useState } from 'react';

export default function Register() {
  const [role, setRole] = useState('donate'); // donate or receive

  return (
    <div className="flex min-h-screen font-sans bg-white">
      {/* Left Branding Section */}
      <div className="hidden lg:flex w-5/12 bg-fb-dark text-white p-16 flex-col justify-between">
        <div>
          <h1 className="text-7xl font-bold">Food<br /><span className="text-fb-coral">Bridge</span></h1>
          <p className="mt-4 text-xl opacity-80">Community Food Sharing Platform</p>
          <div className="mt-12 space-y-4">
            {['Connect donors & recipients', 'Location-based discovery', 'Real-time notifications', 'Fair distribution system'].map((text, i) => (
              <div key={i} className="bg-white/10 p-4 rounded-xl border border-white/10 flex items-center gap-3">
                <span className="text-fb-light text-xl">✔</span> {text}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs opacity-50">Team ShareBite • Red Deer Polytechnic • SWDV 1014</p>
      </div>

      {/* Right Form Section */}
      <div className="w-full lg:w-7/12 p-8 md:p-20 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <div className="flex gap-2 mb-8">
            <span className="bg-fb-coral text-white text-[10px] px-2 py-1 rounded font-bold uppercase">Registration & Login</span>
            <span className="bg-fb-light text-white text-[10px] px-2 py-1 rounded font-bold uppercase">Onboarding</span>
          </div>
          
          <h2 className="text-3xl font-bold text-fb-dark">Create Your Account</h2>
          <p className="text-gray-500 mb-8">Start making a difference today</p>

          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="First Name" className="p-3 border rounded-lg outline-fb-light" />
              <input type="text" placeholder="Last Name" className="p-3 border rounded-lg outline-fb-light" />
            </div>
            <input type="email" placeholder="Email Address" className="w-full p-3 border rounded-lg outline-fb-light" />
            <input type="password" placeholder="Password" className="w-full p-3 border rounded-lg outline-fb-light" />
            
            <p className="text-sm font-bold text-fb-dark pt-2">I want to:</p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => setRole('donate')}
                className={`p-4 border-2 rounded-xl text-left transition-all ${role === 'donate' ? 'border-fb-light bg-fb-mint' : 'border-gray-100'}`}
              >
                <div className="font-bold text-sm">Donate Food</div>
                <div className="text-[10px] text-gray-500 leading-tight">Share surplus food</div>
              </button>
              <button 
                type="button"
                onClick={() => setRole('receive')}
                className={`p-4 border-2 rounded-xl text-left transition-all ${role === 'receive' ? 'border-fb-light bg-fb-mint' : 'border-gray-100'}`}
              >
                <div className="font-bold text-sm">Receive Food</div>
                <div className="text-[10px] text-gray-500 leading-tight">Find donations near you</div>
              </button>
            </div>

            <button className="w-full bg-fb-coral text-white py-4 rounded-xl font-bold mt-6 shadow-lg hover:opacity-90 transition-opacity">
              Create Account →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}