import { useEffect, useState } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

function Profile() {
  const { isDarkMode } = useDarkMode();
  const token = localStorage.getItem('token');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [profile, setProfile] = useState({ username: '', role: '', name: '', email: '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const commonHeaders = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/auth/me', { headers: commonHeaders });
        if (!res.ok) throw new Error((await res.json()).message || 'Failed to load profile');
        const data = await res.json();
        setProfile({
          username: data.username || '',
          role: data.role || '',
          name: data.name || '',
          email: data.email || ''
        });
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveProfile = async () => {
    setError(''); setMessage('');
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: commonHeaders,
        body: JSON.stringify({ name: profile.name, email: profile.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');
      setMessage('Profile updated');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }
  };

  const changePassword = async () => {
    setError(''); setMessage('');
    if (!pwd.newPassword || pwd.newPassword !== pwd.confirmPassword) {
      setError('New password and confirm password must match.');
      return;
    }
    try {
      const res = await fetch('/api/auth/me/password', {
        method: 'PUT',
        headers: commonHeaders,
        body: JSON.stringify({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update password');
      setMessage('Password updated');
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message || 'Failed to update password');
    }
  };

  if (loading) {
    return <div className="p-6">Loading profile...</div>;
  }

  return (
    <div className={`w-full p-4 sm:p-6 lg:p-8 ${isDarkMode ? 'bg-slate-950 text-gray-100' : 'bg-slate-50 text-gray-900'}`}>
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-400">Profile</p>
            <h1 className="text-3xl font-semibold">Your Account</h1>
            <p className="text-sm text-gray-500">View and update your basic info, or reset your password.</p>
          </div>
        </div>

        {(error || message) && (
          <div className={`p-3 rounded-lg text-sm ${error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {error || message}
          </div>
        )}

        <div className={`rounded-2xl shadow-lg p-6 space-y-4 ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input value={profile.username} disabled className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-gray-200' : 'bg-gray-100 border-gray-200 text-gray-700'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <input value={profile.role} disabled className={`w-full px-3 py-2 rounded-lg border capitalize ${isDarkMode ? 'bg-slate-800 border-slate-700 text-gray-200' : 'bg-gray-100 border-gray-200 text-gray-700'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Enter your email"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={saveProfile} className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Save Profile</button>
          </div>
        </div>

        <div className={`rounded-2xl shadow-lg p-6 space-y-4 ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>
          <div>
            <h2 className="text-lg font-semibold">Reset Password</h2>
            <p className="text-sm text-gray-500">Enter your current password and a new one.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current Password</label>
              <input type="password" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <input type="password" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <input type="password" value={pwd.confirmPassword} onChange={(e) => setPwd({ ...pwd, confirmPassword: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`} />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={changePassword} className="px-5 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800">Update Password</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
