import React, { useState } from 'react';
import { registration } from '../services/auth';

const Register = () => {
  const [role, setRole] = useState('donor');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  // Validation Rules
  const validate = () => {
    let newErrors = {};
    const nameRegex = /^[A-Za-z]{3,16}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

    // First Name Validation
    if (!nameRegex.test(formData.firstName)) {
      newErrors.firstName = "3-16 alphabetic characters required";
    }

    // Last Name Validation
    if (!nameRegex.test(formData.lastName)) {
      newErrors.lastName = "3-16 alphabetic characters required";
    }

    // Email Validation
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email format";
    } else if (formData.email.length > 50) {
      newErrors.email = "Maximum 50 characters allowed";
    }

    // Password Validation
    if (!passwordRegex.test(formData.password)) {
      newErrors.password = "Min 8 chars, including 1 uppercase & 1 lowercase";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing again
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      //console.log("Form Submitted Successfully", formData, role);
      // Proceed with API call
      registration(formData.firstName, formData.lastName, formData.email, formData.password, role);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      {/* Left Column - Informational (Kept from your original) */}
      <div className="hidden lg:flex w-[40%] bg-emerald-900 text-white p-16 flex-col justify-between">
        <div>
          <h1 className="text-7xl font-bold leading-tight">Food</h1>
          <h1 className="text-7xl font-bold text-orange-500 leading-tight">Bridge</h1>
          <p className="mt-4 text-xl opacity-80 font-light text-slate-300">Community Food Sharing Platform</p>
          <div className="mt-12 space-y-4 max-w-sm">
            {[
              { icon: '🍽️', text: 'Connect donors & recipients' },
              { icon: '📍', text: 'Location-based discovery' },
              { icon: '⚡', text: 'Real-time notifications' },
              { icon: '⚖️', text: 'Fair distribution system' },
            ].map((feature, i) => (
              <div key={i} className="bg-white/10 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                <span className="text-xl">{feature.icon}</span> {feature.text}
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
            <span className="bg-orange-500 text-white text-[10px] px-3 py-1 rounded font-black uppercase tracking-wider">Registration & Login</span>
            <span className="bg-emerald-600 text-white text-[10px] px-3 py-1 rounded font-black uppercase tracking-wider">Role-Based Onboarding</span>
          </div>

          <h2 className="text-4xl font-extrabold text-emerald-900 tracking-tighter">Create Your Account</h2>
          <p className="text-gray-500 mt-2 mb-8">Join FoodBridge and start making a difference today</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Input fields with validation logic */}
            {[
              { label: 'First Name', name: 'firstName', type: 'text', placeholder: 'First Name' },
              { label: 'Last Name', name: 'lastName', type: 'text', placeholder: 'Last Name' },
              { label: 'Email Address', name: 'email', type: 'email', placeholder: 'Email Address' },
              { label: 'Password', name: 'password', type: 'password', placeholder: 'Password' },
            ].map((field) => (
              <div key={field.name}>
                <label className="text-sm font-bold text-emerald-900 block mb-1">{field.label}</label>
                <input 
                  type={field.type}
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className={`w-full p-3 rounded-lg border-2 transition-all outline-none ${
                    errors[field.name] ? 'border-red-400 bg-red-50' : 'border-gray-100 bg-gray-50 focus:border-emerald-500'
                  }`}
                />
                {errors[field.name] && <p className="text-[10px] text-red-500 mt-1 font-bold italic">{errors[field.name]}</p>}
              </div>
            ))}
            
            <p className="text-sm font-bold text-emerald-900 pt-2">I want to:</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('donor')}
                className={`p-5 border-2 rounded-2xl text-left transition-all ${role === 'donor' ? 'border-emerald-500 bg-emerald-50 shadow-md ring-1 ring-emerald-500' : 'border-gray-100 bg-gray-50'}`}
              >
                <div className="font-bold text-sm text-emerald-900">Donate Food</div>
                <div className="text-[10px] text-gray-500 leading-tight">Share surplus food with community</div>
              </button>
              <button
                type="button"
                onClick={() => setRole('recipient')}
                className={`p-5 border-2 rounded-2xl text-left transition-all ${role === 'recipient' ? 'border-emerald-500 bg-emerald-50 shadow-md ring-1 ring-emerald-500' : 'border-gray-100 bg-gray-50'}`}
              >
                <div className="font-bold text-sm text-emerald-900">Receive Food</div>
                <div className="text-[10px] text-gray-500 leading-tight">Find donations near you</div>
              </button>
            </div>

            <button type="submit" className="w-full bg-emerald-900 hover:bg-emerald-800 text-white font-bold py-4 rounded-xl mt-6 transition-all shadow-lg flex items-center justify-center gap-2">
              Create Account →
            </button>
            
            <div className="text-sm text-center mt-4">
              Already have an account? <a href="/login" className="text-orange-500 font-bold hover:underline">Log in</a>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;