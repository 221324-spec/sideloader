import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDarkMode } from '../contexts/DarkModeContext';

function Staff() {
  const { isDarkMode } = useDarkMode();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('token');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'staff' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  
  const { data: staffData = { value: [] }, isLoading, error: fetchError } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const response = await fetch('/api/auth/staff', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    },
    refetchInterval: 5000
  });

  const staff = staffData.value || [];


  const addStaffMutation = useMutation({
    mutationFn: async (newStaff) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add staff');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff']);
      setShowAddModal(false);
      setFormData({ username: '', password: '', role: 'staff' });
      setSuccess('Staff member added successfully');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  });


  const toggleBlockMutation = useMutation({
    mutationFn: async ({ id, isBlocked }) => {
      const response = await fetch(`/api/auth/staff/${id}/block`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isBlocked })
      });
      if (!response.ok) throw new Error('Failed to update staff status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff']);
      setSuccess('Staff status updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`/api/auth/staff/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete staff');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff']);
      setSuccess('Staff member deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  });

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && !member.isBlocked) ||
      (filterStatus === 'blocked' && member.isBlocked);
    return matchesSearch && matchesStatus;
  });

  const handleAddStaff = (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setError('Username and password are required');
      return;
    }
    addStaffMutation.mutate(formData);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Staff Management
        </h2>
        <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Manage all registered staff members and their access
        </p>
      </div>

      {/* Error & Success Messages */}
      {error && (
        <div className={`mb-4 p-4 rounded-lg ${isDarkMode ? 'bg-red-900/20 border border-red-700 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {error}
        </div>
      )}
      {success && (
        <div className={`mb-4 p-4 rounded-lg ${isDarkMode ? 'bg-green-900/20 border border-green-700 text-green-400' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {success}
        </div>
      )}

      {/* Controls */}
      <div className={`mb-6 p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
              isDarkMode
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            + Add Staff
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading staff...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            No staff members found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${isDarkMode ? 'bg-gray-700 border-b border-gray-600' : 'bg-gray-50 border-b border-gray-200'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Username</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Role</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Joined</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Status</th>
                  <th className={`px-6 py-3 text-right text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member, index) => (
                  <tr key={member.id} className={`${index % 2 === 0 ? (isDarkMode ? 'bg-gray-800' : 'bg-white') : (isDarkMode ? 'bg-gray-750' : 'bg-gray-50')} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">{member.username.charAt(0).toUpperCase()}</span>
                        </div>
                        <span>{member.username}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {member.createdAt ? new Date(member.createdAt.seconds * 1000 || member.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className={`px-6 py-4 text-sm`}>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        member.isBlocked 
                          ? (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700')
                          : (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700')
                      }`}>
                        {member.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm text-right`}>
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => toggleBlockMutation.mutate({ id: member.id, isBlocked: !member.isBlocked })}
                          disabled={toggleBlockMutation.isPending}
                          className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                            member.isBlocked
                              ? (isDarkMode ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-50 text-green-700 hover:bg-green-100')
                              : (isDarkMode ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-700 hover:bg-red-100')
                          } disabled:opacity-50`}
                        >
                          {member.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this staff member?')) {
                              deleteMutation.mutate(member.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                            isDarkMode 
                              ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' 
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          } disabled:opacity-50`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full p-6`}>
            <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Add New Staff Member
            </h3>
            
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="Enter password"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addStaffMutation.isPending}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-white ${
                    isDarkMode
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-600/50'
                      : 'bg-green-500 hover:bg-green-600 disabled:bg-green-500/50'
                  }`}
                >
                  {addStaffMutation.isPending ? 'Adding...' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Staff;
