import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import api from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Validation Rules
  const validate = () => {
    let newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email format";
    } else if (formData.email.length > 50) {
      newErrors.email = "Maximum 50 characters allowed";
    }

    if (!passwordRegex.test(formData.password)) {
      newErrors.password = "Min 8 chars, including 1 uppercase & 1 lowercase";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    if (loginError) setLoginError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setLoginError('');

   try {
      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password,
      });
      //const response = {"status": 401, "data": {"token": "fake-jwt-token", "user": {"id": 1, "email": formData.email}}};

      if (response.status === 200) {
        console.log('Login successful, token received:', response.data.token);
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        navigate('/dashboard');
      }
    } catch (err) {
      // if (err.response?.status === 400) {
      //   console.error('Unauthorized: Invalid email or password');
      // }
      if (err.response) {
        console.error('Login failed:', err.response.status);
        // console.error(err.request.responseURL, err.config.url);
        // console.error('Server Error:', err.response.status, err.response.data);
        setLoginError(err.response.data?.message || 'Invalid email or password.');
      } else if (err.request) {
        console.error('Network Error: No response from server');
        setLoginError('Network error. Please check your connection.');
      } else {
        console.error('Request Setup Error:', err.message);
        setLoginError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      <div className="w-full lg:w-[100%] p-10 md:p-20 flex flex-col justify-center items-center">
        <div className="max-w-md w-full mx-auto">

          <form className="space-y-4" onSubmit={handleSubmit}>

            {[
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
                {errors[field.name] && (
                  <p className="text-[10px] text-red-500 mt-1 font-bold italic">{errors[field.name]}</p>
                )}
              </div>
            ))}

            {loginError && (
              <p className="text-sm text-red-500 font-bold italic text-center">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-900 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl mt-6 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {isLoading ? 'Logging in...' : 'Log in →'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
