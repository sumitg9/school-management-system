import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useSettings } from '../../context/SettingsContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showValidationError } = useAlert();
  const { settings } = useSettings();

  const schoolName = settings?.school_name && settings.school_name !== 'null' ? settings.school_name : 'School Management System';
  const schoolTagline = settings?.school_tagline && settings.school_tagline !== 'null' ? settings.school_tagline : 'Sign in to your account';
  const schoolLogo = settings?.school_logo && settings.school_logo !== 'null' ? settings.school_logo : '';
  const [formData, setFormData] = useState({
    email: 'admin@school.com',
    password: 'password',
    remember: false,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      showValidationError('Please enter both email and password to sign in.', 'Validation Error');
      return;
    }

    setLoading(true);
    const result = await login({
      email: formData.email,
      password: formData.password
    });
    setLoading(false);

    if (result.success) {
      navigate('/');
    }
  };

  const handleDemoLogin = async (role) => {
    const roleKey = role.toLowerCase();
    const credentials = {
      admin: { email: 'admin@school.com', password: 'password' },
      teacher: { email: 'teacher@school.com', password: 'password' },
      student: { email: 'student@school.com', password: 'password' },
      parent: { email: 'parent@school.com', password: 'password' },
    };

    if (credentials[roleKey]) {
      setFormData(prev => ({
        ...prev,
        email: credentials[roleKey].email,
        password: credentials[roleKey].password,
      }));
      setLoading(true);
      const result = await login(credentials[roleKey]);
      setLoading(false);

      if (result.success) {
        navigate('/');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-4 overflow-hidden p-2">
            {typeof schoolLogo === 'string' && schoolLogo ? (
              schoolLogo.startsWith('preset:') ? (
                <span className="text-4xl">{schoolLogo.replace('preset:', '')}</span>
              ) : (
                <img
                  src={schoolLogo}
                  alt={schoolName}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.parentElement.innerHTML = '<span class="text-4xl">🎓</span>';
                  }}
                />
              )
            ) : (
              <span className="text-4xl">🎓</span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{schoolName}</h1>
          <p className="text-blue-100">{schoolTagline}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email/Username */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email or Username
              </label>
              <input
                type="text"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your email or username"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4">
            <button className="btn-outline py-2">
              <svg className="w-5 h-5 inline mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button className="btn-outline py-2">
              <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.5 0C5.15 0 0 5.15 0 11.5c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.21.7-3.89-1.55-3.89-1.55-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.17 1.18a11 11 0 012.89-.39c.98 0 1.97.13 2.89.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.56C20.71 20.89 24 16.58 24 11.5 24 5.15 18.85 0 12.5 0h-1z"/>
              </svg>
              Microsoft
            </button>
          </div>

          {/* Demo Access */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center mb-3">Quick Demo Access:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('Admin')}
                className="text-xs py-2 px-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('Teacher')}
                className="text-xs py-2 px-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
              >
                Teacher
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('Student')}
                className="text-xs py-2 px-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition"
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('Parent')}
                className="text-xs py-2 px-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition"
              >
                Parent
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-100 text-sm mt-6">
          © 2025 School Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;

