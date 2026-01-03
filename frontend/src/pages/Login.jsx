import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';

function Login({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();

  const onSubmit = async (data) => {
    setIsLoading(true);
    const endpoint = isRegister ? 'register' : 'login';
    try {
      const res = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        if (isRegister) {
          setError('User registered successfully. Please login.');
          setIsRegister(false);
          reset();
        } else {
          localStorage.setItem('token', result.token);
          localStorage.setItem('user', JSON.stringify(result.user));
          onLogin(result.user);
          navigate('/');
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(`${isRegister ? 'Registration' : 'Login'} failed`);
    } finally {
      setIsLoading(false);
    }
  };

  // Role Selection Screen
  if (!selectedRole) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${isDarkMode ? 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900' : 'bg-gradient-to-br from-indigo-100 via-white to-blue-100'}`}>
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl ${isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-200/50'}`}></div>
          <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-200/50'}`}></div>
        </div>
        
        <div className={`relative w-full max-w-lg p-8 sm:p-10 rounded-3xl shadow-2xl backdrop-blur-xl border transition-all duration-300 ${isDarkMode ? 'bg-slate-900/80 border-slate-700/50 shadow-indigo-900/20' : 'bg-white/80 border-white/50 shadow-indigo-200/50'}`}>
          {/* Logo & Brand */}
          <div className="text-center mb-10">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 shadow-lg ${isDarkMode ? 'bg-gradient-to-br from-indigo-600 to-blue-700' : 'bg-gradient-to-br from-indigo-500 to-blue-600'}`}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              SIDELOADER
            </h1>
            <p className={`text-lg font-medium ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>TRANSPORTS L.L.C</p>
            <p className={`mt-4 text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Professional Transport & Logistics Management
            </p>
          </div>

          {/* Role Selection */}
          <div className="mb-8">
            <h2 className={`text-xl font-semibold text-center mb-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Select Your Role
            </h2>
            <div className="space-y-4">
              <button
                onClick={() => { setSelectedRole('admin'); setIsRegister(false); }}
                className={`w-full group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${isDarkMode ? 'bg-gradient-to-r from-red-900/40 to-red-800/40 hover:from-red-800/60 hover:to-red-700/60 border border-red-700/50' : 'bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border border-red-200'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-red-900/50' : 'bg-red-200'}`}>
                    <svg className={`w-7 h-7 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>Administrator</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Full system access & management</p>
                  </div>
                  <svg className={`w-6 h-6 transition-transform group-hover:translate-x-1 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button
                onClick={() => { setSelectedRole('staff'); setIsRegister(false); }}
                className={`w-full group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${isDarkMode ? 'bg-gradient-to-r from-blue-900/40 to-blue-800/40 hover:from-blue-800/60 hover:to-blue-700/60 border border-blue-700/50' : 'bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-200'}`}>
                    <svg className={`w-7 h-7 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>Staff Member</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Operations & daily tasks</p>
                  </div>
                  <svg className={`w-6 h-6 transition-transform group-hover:translate-x-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className={`text-center text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Secure login powered by JWT authentication
          </p>
        </div>
      </div>
    );
  }

  // Login/Register Form Screen
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${isDarkMode ? 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900' : 'bg-gradient-to-br from-indigo-100 via-white to-blue-100'}`}>
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl ${isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-200/50'}`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-200/50'}`}></div>
      </div>
      
      <div className={`relative w-full max-w-md p-8 sm:p-10 rounded-3xl shadow-2xl backdrop-blur-xl border transition-all duration-300 ${isDarkMode ? 'bg-slate-900/80 border-slate-700/50 shadow-indigo-900/20' : 'bg-white/80 border-white/50 shadow-indigo-200/50'}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg ${selectedRole === 'admin' ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
            {selectedRole === 'admin' ? (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <h1 className={`text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent`}>
            SIDELOADER TRANSPORTS
          </h1>
          <p className={`mt-2 text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {selectedRole === 'admin' ? 'Administrator Access' : 'Staff Portal'}
          </p>
        </div>

        {/* Form Title */}
        <h2 className={`text-2xl font-bold text-center mb-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>

        {/* Error Message */}
        {error && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${error.includes('successfully') ? (isDarkMode ? 'bg-green-900/30 text-green-400 border border-green-700/50' : 'bg-green-50 text-green-700 border border-green-200') : (isDarkMode ? 'bg-red-900/30 text-red-400 border border-red-700/50' : 'bg-red-50 text-red-700 border border-red-200')}`}>
            <div className="flex items-center gap-2">
              {error.includes('successfully') ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              {error}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {isRegister && selectedRole === 'staff' && (
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Role</label>
              <select
                {...register('role', { required: 'Role is required' })}
                defaultValue="staff"
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-200 bg-white text-gray-900'}`}
              >
                <option value="staff">Staff</option>
              </select>
              <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Admin accounts are created by system administrator</p>
              {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>}
            </div>
          )}

          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Username</label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                {...register('username', { required: 'Username is required' })}
                placeholder="Enter your username"
                className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'}`}
              />
            </div>
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>}
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type="password"
                {...register('password', { required: 'Password is required' })}
                placeholder="Enter your password"
                className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'}`}
              />
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 px-6 rounded-xl font-bold text-white text-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${selectedRole === 'admin' ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-500/30' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-500/30'} shadow-lg`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              isRegister ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 space-y-3 text-center">
          <button
            onClick={() => setSelectedRole(null)}
            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl transition-all duration-300 ${isDarkMode ? 'text-indigo-400 hover:bg-indigo-900/30' : 'text-indigo-600 hover:bg-indigo-50'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Role Selection
          </button>
          
          {selectedRole === 'staff' && (
            <button
              onClick={() => { setIsRegister(!isRegister); reset(); setError(''); }}
              className={`text-base font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-gray-600 hover:text-indigo-600'}`}
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;