import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';

function Settings() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  return (
    <div className={`w-full p-4 sm:p-6 lg:p-8 ${isDarkMode ? 'bg-slate-950 text-gray-100' : 'bg-slate-50 text-gray-900'}`}>
      <div className="w-full max-w-4xl space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-400">Settings</p>
          <h1 className="text-3xl font-semibold">Admin Settings</h1>
          <p className="text-sm text-gray-500">Manage preferences and access the staff module.</p>
        </div>

        <div className={`rounded-2xl shadow-lg p-6 space-y-4 ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>
          <h2 className="text-lg font-semibold">Appearance</h2>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={isDarkMode} onChange={toggleDarkMode} />
            Enable Dark Mode
          </label>
        </div>

        <div className={`rounded-2xl shadow-lg p-6 space-y-3 ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Staff Module</h2>
              <p className="text-sm text-gray-500">Manage staff accounts, roles, and access.</p>
            </div>
            <button
              onClick={() => navigate('/staff')}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Open Staff
            </button>
          </div>
        </div>

        <div className={`rounded-2xl shadow-lg p-6 space-y-3 ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>
          <h2 className="text-lg font-semibold">Profile & Security</h2>
          <p className="text-sm text-gray-500">Update your profile or change password from your profile page.</p>
          <button
            onClick={() => navigate('/profile')}
            className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800"
          >
            Go to Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;