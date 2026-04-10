import React, { useState } from 'react';
import { register } from '../services/auth';

const ORG_DONOR_TYPES = [
  'Restaurant', 'Grocery Store', 'Bakery',
  'Catering Company', 'Food Bank', 'Community Kitchen',
  'Hotel / Hospitality', 'Other'
];

const ORG_RECIPIENT_TYPES = [
  'Food Bank', 'Orphanage / Children\'s Home', 'Homeless Shelter',
  'Community Kitchen', 'Charity Organization', 'Religious Institution',
  'School or Educational Institution', 'Other'
];

const AGE_RANGES = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_24',    label: '18 – 24'  },
  { value: '25_34',    label: '25 – 34'  },
  { value: '35_44',    label: '35 – 44'  },
  { value: '45_54',    label: '45 – 54'  },
  { value: '55_64',    label: '55 – 64'  },
  { value: '65_plus',  label: '65 and over' },
];

const Register = () => {
  const [role,    setRole]    = useState('donor');
  const [subRole, setSubRole] = useState('individual');
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '',
    orgName: '', orgType: '', orgRegNumber: '',
    ageRange: '', gender: '',
  });
  const [profilePic,    setProfilePic]    = useState(null);
  const [profilePreview,setProfilePreview]= useState(null);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    const nameRegex     = /^[A-Za-z]{3,16}$/;
    const emailRegex    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

    if (!nameRegex.test(formData.firstName))
      newErrors.firstName = '3–16 alphabetic characters required';
    if (!nameRegex.test(formData.lastName))
      newErrors.lastName = '3–16 alphabetic characters required';
    if (!emailRegex.test(formData.email))
      newErrors.email = 'Invalid email format';
    else if (formData.email.length > 50)
      newErrors.email = 'Maximum 50 characters allowed';
    if (!passwordRegex.test(formData.password))
      newErrors.password = 'Min 8 chars, including 1 uppercase & 1 lowercase';

    // Org fields required for organization sub-role
    if (subRole === 'organization') {
      if (!formData.orgName) newErrors.orgName = 'Organization name is required';
      if (!formData.orgType) newErrors.orgType = 'Organization type is required';
    }

    // Demographic fields required for individual recipients
    if (role === 'recipient' && subRole === 'individual') {
      if (!formData.ageRange) newErrors.ageRange = 'Age range is required';
      if (!formData.gender)   newErrors.gender   = 'Gender is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleProfilePic = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfilePic(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await register({
        firstName:    formData.firstName,
        lastName:     formData.lastName,
        email:        formData.email,
        password:     formData.password,
        role,
        subRole,
        orgName:      formData.orgName      || undefined,
        orgType:      formData.orgType      || undefined,
        orgRegNumber: formData.orgRegNumber || undefined,
        ageRange:     formData.ageRange     || undefined,
        gender:       formData.gender       || undefined,
        profilePic:   profilePic            || undefined,
      });
      window.location.href = data.user.role === 'donor' ? '/post' : '/discover';
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full p-3 rounded-lg border-2 transition-all outline-none ${
      errors[field]
        ? 'border-red-400 bg-red-50'
        : 'border-gray-100 bg-gray-50 focus:border-emerald-500'
    }`;

  return (
    <div className="flex min-h-screen bg-white font-sans">

      {/* Left column */}
      <div className="hidden lg:flex w-[40%] bg-emerald-900 text-white p-16 flex-col justify-between">
        <div>
          <h1 className="text-7xl font-bold leading-tight">Food</h1>
          <h1 className="text-7xl font-bold text-orange-500 leading-tight">Bridge</h1>
          <p className="mt-4 text-xl opacity-80 font-light text-slate-300">Community Food Sharing Platform</p>
          <div className="mt-12 space-y-4 max-w-sm">
            {[
              { icon: '🍽️', text: 'Connect donors & recipients' },
              { icon: '📍', text: 'Location-based discovery'    },
              { icon: '⚡', text: 'Real-time notifications'     },
              { icon: '⚖️', text: 'Fair distribution system'   },
            ].map((f, i) => (
              <div key={i} className="bg-white/10 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                <span className="text-xl">{f.icon}</span> {f.text}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs opacity-50 font-mono">Team ShareBite • Red Deer Polytechnic • SWDV 1014</p>
      </div>

      {/* Right column — form */}
      <div className="w-full lg:w-[60%] p-10 md:p-16 flex flex-col justify-center items-center overflow-y-auto">
        <div className="max-w-md w-full mx-auto">

          <div className="flex gap-2 mb-8">
            <span className="bg-orange-500 text-white text-[10px] px-3 py-1 rounded font-black uppercase tracking-wider">Registration</span>
            <span className="bg-emerald-600 text-white text-[10px] px-3 py-1 rounded font-black uppercase tracking-wider">Role-Based Onboarding</span>
          </div>

          <h2 className="text-4xl font-extrabold text-emerald-900 tracking-tighter">Create Your Account</h2>
          <p className="text-gray-500 mt-2 mb-8">Join FoodBridge and start making a difference today</p>

          <form className="space-y-4" onSubmit={handleSubmit}>

            {/* Profile picture — optional, always shown */}
            <div className="flex flex-col items-center gap-3 mb-2">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-emerald-100 overflow-hidden bg-gray-100 flex items-center justify-center">
                  {profilePreview
                    ? <img src={profilePreview} alt="Preview" className="w-full h-full object-cover" />
                    : <span className="text-3xl">👤</span>
                  }
                </div>
                <label htmlFor="profilePicInput"
                  className="absolute bottom-0 right-0 bg-emerald-600 text-white rounded-full w-6 h-6
                             flex items-center justify-center cursor-pointer text-xs hover:bg-emerald-700">
                  +
                </label>
                <input id="profilePicInput" type="file" accept="image/*"
                  className="hidden" onChange={handleProfilePic} />
              </div>
              <p className="text-xs text-gray-400">Profile photo (optional)</p>
            </div>

            {/* Base fields */}
            {[
              { label: 'First Name',     name: 'firstName', type: 'text',     placeholder: 'First Name'     },
              { label: 'Last Name',      name: 'lastName',  type: 'text',     placeholder: 'Last Name'      },
              { label: 'Email Address',  name: 'email',     type: 'email',    placeholder: 'Email Address'  },
              { label: 'Password',       name: 'password',  type: 'password', placeholder: 'Password'       },
            ].map((field) => (
              <div key={field.name}>
                <label className="text-sm font-bold text-emerald-900 block mb-1">{field.label}</label>
                <input type={field.type} name={field.name}
                  value={formData[field.name]} onChange={handleChange}
                  placeholder={field.placeholder} className={inputClass(field.name)} />
                {errors[field.name] && (
                  <p className="text-[10px] text-red-500 mt-1 font-bold italic">{errors[field.name]}</p>
                )}
              </div>
            ))}

            {/* Role selection */}
            <p className="text-sm font-bold text-emerald-900 pt-2">I want to:</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'donor',     label: 'Donate Food',   sub: 'Share surplus food with community' },
                { value: 'recipient', label: 'Receive Food',  sub: 'Find donations near you'           },
              ].map(({ value, label, sub }) => (
                <button key={value} type="button" onClick={() => setRole(value)}
                  className={`p-5 border-2 rounded-2xl text-left transition-all ${
                    role === value
                      ? 'border-emerald-500 bg-emerald-50 shadow-md ring-1 ring-emerald-500'
                      : 'border-gray-100 bg-gray-50'
                  }`}>
                  <div className="font-bold text-sm text-emerald-900">{label}</div>
                  <div className="text-[10px] text-gray-500 leading-tight">{sub}</div>
                </button>
              ))}
            </div>

            {/* Sub-role selection */}
            <p className="text-sm font-bold text-emerald-900 pt-2">Account type:</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'individual',   label: '👤 Individual',   sub: 'Personal account'       },
                { value: 'organization', label: '🏢 Organization', sub: 'Business or charity'    },
              ].map(({ value, label, sub }) => (
                <button key={value} type="button" onClick={() => setSubRole(value)}
                  className={`p-4 border-2 rounded-2xl text-left transition-all ${
                    subRole === value
                      ? 'border-emerald-500 bg-emerald-50 shadow-md ring-1 ring-emerald-500'
                      : 'border-gray-100 bg-gray-50'
                  }`}>
                  <div className="font-bold text-sm text-emerald-900">{label}</div>
                  <div className="text-[10px] text-gray-500 leading-tight">{sub}</div>
                </button>
              ))}
            </div>

            {/* Organization fields — only shown for organization sub-role */}
            {subRole === 'organization' && (
              <div className="space-y-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Organization Details</p>

                <div>
                  <label className="text-sm font-bold text-emerald-900 block mb-1">Organization Name *</label>
                  <input type="text" name="orgName" value={formData.orgName}
                    onChange={handleChange} placeholder="e.g. Red Deer Food Bank"
                    className={inputClass('orgName')} />
                  {errors.orgName && <p className="text-[10px] text-red-500 mt-1 font-bold italic">{errors.orgName}</p>}
                </div>

                <div>
                  <label className="text-sm font-bold text-emerald-900 block mb-1">Organization Type *</label>
                  <select name="orgType" value={formData.orgType} onChange={handleChange}
                    className={inputClass('orgType')}>
                    <option value="">Select type...</option>
                    {(role === 'donor' ? ORG_DONOR_TYPES : ORG_RECIPIENT_TYPES).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {errors.orgType && <p className="text-[10px] text-red-500 mt-1 font-bold italic">{errors.orgType}</p>}
                </div>

                <div>
                  <label className="text-sm font-bold text-emerald-900 block mb-1">
                    Registration Number <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input type="text" name="orgRegNumber" value={formData.orgRegNumber}
                    onChange={handleChange} placeholder="Business or charity registration number"
                    className={inputClass('orgRegNumber')} />
                </div>
              </div>
            )}

            {/* Demographic fields — only for individual recipients */}
            {role === 'recipient' && subRole === 'individual' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                  Demographic Info
                  <span className="ml-2 text-blue-400 font-normal normal-case">
                    Used anonymously for community planning
                  </span>
                </p>

                <div>
                  <label className="text-sm font-bold text-emerald-900 block mb-1">Age Range *</label>
                  <select name="ageRange" value={formData.ageRange} onChange={handleChange}
                    className={inputClass('ageRange')}>
                    <option value="">Select age range...</option>
                    {AGE_RANGES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  {errors.ageRange && <p className="text-[10px] text-red-500 mt-1 font-bold italic">{errors.ageRange}</p>}
                </div>

                <div>
                  <label className="text-sm font-bold text-emerald-900 block mb-1">Gender *</label>
                  <select name="gender" value={formData.gender} onChange={handleChange}
                    className={inputClass('gender')}>
                    <option value="">Select gender...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                  {errors.gender && <p className="text-[10px] text-red-500 mt-1 font-bold italic">{errors.gender}</p>}
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {errors.submit}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-emerald-900 hover:bg-emerald-800 text-white font-bold py-4 rounded-xl
                         mt-6 transition-all shadow-lg flex items-center justify-center gap-2
                         disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>

            <div className="text-sm text-center mt-4">
              Already have an account?{' '}
              <a href="/login" className="text-orange-500 font-bold hover:underline">Log in</a>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;