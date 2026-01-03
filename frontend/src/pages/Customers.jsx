import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDarkMode } from '../contexts/DarkModeContext';

function Customers({ sidebarCollapsed = false }) {
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const queryClient = useQueryClient();
  const { isDarkMode } = useDarkMode();

  const token = localStorage.getItem('token');
  if (!token) {
    return (
      <div className={`flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  const { data: customers, isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please login first.');
      }
      return fetch('/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      }).then(data => {
        console.log('Customers data received:', data);
        return data.value || data;
      }).catch(err => {
        console.error('Customers fetch error:', err);
        throw err;
      });
    },
    enabled: !!token, 
  });

  const addCustomerMutation = useMutation({
    mutationFn: (newCustomer) => fetch('/api/customers', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(newCustomer),
    }).then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setShowForm(false);
      reset();
    },
    onError: (error) => {
      console.error('Error creating customer:', error);
      alert(`Failed to create customer: ${error.message}`);
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }) => fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data),
    }).then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setEditingCustomer(null);
      reset();
    },
    onError: (error) => {
      console.error('Error updating customer:', error);
      alert(`Failed to update customer: ${error.message}`);
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id) => fetch(`/api/customers/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
    },
  });

  const onSubmit = (data) => {
    console.log('Form submitted with data:', data);
    console.log('Token exists:', !!localStorage.getItem('token'));
    if (editingCustomer) {
      updateCustomerMutation.mutate({ id: editingCustomer.id, data });
    } else {
      addCustomerMutation.mutate(data);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setValue('name', customer.name);
    setValue('email', customer.email);
    setValue('phone', customer.phone);
    setValue('address', customer.address);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      deleteCustomerMutation.mutate(id);
    }
  };

  if (isLoading) return <div className={`text-center py-8 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</div>;
  if (error) {
    console.error('Customer query error:', error);
    return (
      <div className={`text-center py-8 transition-colors duration-300 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
        <p>Error loading customers</p>
        <p className="text-sm mt-2">{error?.message || 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <div className={`w-full transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50'}`}>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>B2C Customer Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Customer'}
        </button>
      </div>

      {showForm && (
        <div className={`p-6 rounded-lg shadow-md mb-6 transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <h3 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
              <input
                {...register('name', { required: 'Name is required' })}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <div>
              <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
              />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>
            <div>
              <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
              <input
                {...register('phone', { required: 'Phone is required' })}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
              />
              {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Address</label>
              <textarea
                {...register('address', { required: 'Address is required' })}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
                rows="3"
              />
              {errors.address && <p className="text-red-500 text-sm">{errors.address.message}</p>}
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={addCustomerMutation.isLoading || updateCustomerMutation.isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {addCustomerMutation.isLoading || updateCustomerMutation.isLoading 
                  ? (editingCustomer ? 'Updating...' : 'Adding...') 
                  : (editingCustomer ? 'Update Customer' : 'Add Customer')
                }
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className={`relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {selectedCustomer.name} Details
              </h3>
              <button
                onClick={() => setSelectedCustomer(null)}
                className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <h4 className={`font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Contact Information</h4>
                  <div className="space-y-3">
                    <div className={`flex items-center transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-medium w-20">Name:</span>
                      <span>{selectedCustomer.name}</span>
                    </div>
                    <div className={`flex items-center transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-medium w-20">Email:</span>
                      <span>{selectedCustomer.email}</span>
                    </div>
                    <div className={`flex items-center transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-medium w-20">Phone:</span>
                      <span>{selectedCustomer.phone || 'Not provided'}</span>
                    </div>
                    <div className={`flex items-start transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-medium w-20">Address:</span>
                      <span>{selectedCustomer.address || 'Not provided'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => handleEdit(selectedCustomer)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Edit Customer
                </button>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    handleDelete(selectedCustomer.id);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`p-6 rounded-lg shadow-md transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
        {customers && customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y transition-colors duration-300 ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={`transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Name</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Email</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Phone</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Address</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                {customers.map((customer) => (
                  <tr key={customer.id} className={`transition-colors duration-300 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{customer.name}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{customer.email}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{customer.phone}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{customer.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setSelectedCustomer(customer)}
                          className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button 
                          onClick={() => handleEdit(customer)}
                          className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(customer.id)}
                          className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className={`mx-auto h-12 w-12 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className={`mt-2 text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>No customers</h3>
            <p className={`mt-1 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Get started by creating a new customer.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                + Add Customer
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default Customers;