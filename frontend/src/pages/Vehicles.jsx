import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useDarkMode } from '../contexts/DarkModeContext';

function Vehicles({ sidebarCollapsed = false }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showAssignCargo, setShowAssignCargo] = useState(false);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const queryClient = useQueryClient();
  const { isDarkMode } = useDarkMode();

 
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await fetch('/api/vehicles');
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      const data = await res.json();
      return data.value || data; 
    }
  });

  
  const { data: availableCargo = [] } = useQuery({
    queryKey: ['available-cargo'],
    queryFn: async () => {
      const res = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch cargo');
      const cargo = await res.json();
      const cargoArray = cargo.value || cargo; 
      return cargoArray.filter(item => item.status === 'available' || !item.status);
    }
  });

  
  const createVehicleMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create vehicle');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles']);
      setShowCreateForm(false);
      reset();
    }
  });

  
  const updateVehicleMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update vehicle');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles']);
      setEditingVehicle(null);
      reset();
    }
  });

  
  const deleteVehicleMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete vehicle');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles']);
    }
  });

  
  const assignCargoMutation = useMutation({
    mutationFn: async ({ vehicleId, cargoId }) => {
      const res = await fetch(`/api/vehicles/${vehicleId}/assign-cargo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cargoId })
      });
      if (!res.ok) throw new Error('Failed to assign cargo');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles']);
      queryClient.invalidateQueries(['products']);
      setShowAssignCargo(false);
    }
  });

  
  const unassignCargoMutation = useMutation({
    mutationFn: async (vehicleId) => {
      const res = await fetch(`/api/vehicles/${vehicleId}/unassign-cargo`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to unassign cargo');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles']);
      queryClient.invalidateQueries(['products']);
    }
  });

  const onSubmit = (data) => {
    if (editingVehicle) {
      updateVehicleMutation.mutate({ id: editingVehicle.id, data });
    } else {
      createVehicleMutation.mutate(data);
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setValue('vehicleName', vehicle.vehicleName || '');
    setValue('vehicleNumber', vehicle.vehicleNumber);
    setValue('type', vehicle.type);
    setValue('capacity', vehicle.capacity);
    setValue('driverName', vehicle.driverName);
    setValue('driverPhone', vehicle.driverPhone);
    setValue('status', vehicle.status);
    setShowCreateForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      deleteVehicleMutation.mutate(id);
    }
  };

  const handleAssignCargo = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowAssignCargo(true);
  };

  const handleUnassignCargo = (vehicleId) => {
    if (window.confirm('Are you sure you want to unassign this cargo from the vehicle?')) {
      unassignCargoMutation.mutate(vehicleId);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'in-transit': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'out-of-service': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatWeight = (weight) => {
    return `${weight} kg`;
  };

  if (isLoading) {
    return <div className={`text-center py-8 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading vehicles...</div>;
  }

  return (
    <div className={`w-full transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50'}`}>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Vehicle Management (B2C Transport)</h2>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setEditingVehicle(null);
            reset();
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Add Vehicle
        </button>
      </div>

      {/* Vehicle List */}
      <div className={`rounded-lg shadow-md overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
        <div className="overflow-x-hidden">
          <table className={`min-w-full divide-y transition-colors duration-300 ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={`transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Vehicle Name
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Registration Number
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Type
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Capacity
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Driver
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Current Cargo
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className={`transition-colors duration-300 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    {vehicle.vehicleName || 'N/A'}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    {vehicle.vehicleNumber}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    {vehicle.type}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    {formatWeight(vehicle.capacity)}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    <div>
                      <div className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'}`}>{vehicle.driverName || 'Not assigned'}</div>
                      {vehicle.driverPhone && (
                        <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{vehicle.driverPhone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vehicle.status)}`}>
                      {vehicle.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    {vehicle.currentCargo ? (
                      <div>
                        <div className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'}`}>{vehicle.currentCargo.name}</div>
                        <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatWeight(vehicle.currentCargo.weight)}</div>
                      </div>
                    ) : (
                      <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No cargo assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => setSelectedVehicle(vehicle)}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-all duration-300 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(vehicle)}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-all duration-300 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      {vehicle.status === 'available' && availableCargo.length > 0 && (
                        <button
                          onClick={() => handleAssignCargo(vehicle)}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-all duration-300 ${isDarkMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Assign
                        </button>
                      )}
                      {vehicle.currentCargo && (
                        <button
                          onClick={() => handleUnassignCargo(vehicle.id)}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-all duration-300 ${isDarkMode ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Unassign
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(vehicle.id)}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-all duration-300 ${isDarkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        {vehicles.length === 0 && (
          <div className="text-center py-12">
            <svg className={`mx-auto h-12 w-12 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <h3 className={`mt-2 text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>No vehicles</h3>
            <p className={`mt-1 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Get started by adding your first vehicle.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Vehicle Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className={`relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingVehicle(null);
                  reset();
                }}
                className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Vehicle Name *</label>
                  <input
                    type="text"
                    {...register('vehicleName', { required: 'Vehicle name is required' })}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
                    placeholder="e.g., Ferrari, Truck 1"
                  />
                  {errors.vehicleName && <p className="mt-1 text-sm text-red-600">{errors.vehicleName.message}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Registration Number *</label>
                  <input
                    type="text"
                    {...register('vehicleNumber', { required: 'Registration number is required' })}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
                    placeholder="e.g., MH-12-AB-1234"
                  />
                  {errors.vehicleNumber && <p className="mt-1 text-sm text-red-600">{errors.vehicleNumber.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Vehicle Type *</label>
                  <select
                    {...register('type', { required: 'Vehicle type is required' })}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300'}`}
                  >
                    <option value="">Select type</option>
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                    <option value="Pickup">Pickup</option>
                    <option value="Trailer">Trailer</option>
                    <option value="Container">Container</option>
                  </select>
                  {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Capacity (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('capacity', { required: 'Capacity is required', min: 0 })}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
                    placeholder="1000"
                  />
                  {errors.capacity && <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
                  <select
                    {...register('status')}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300'}`}
                  >
                    <option value="available">Available</option>
                    <option value="in-transit">In Transit</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="out-of-service">Out of Service</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Driver Name</label>
                  <input
                    type="text"
                    {...register('driverName')}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Driver Phone</label>
                  <input
                    type="tel"
                    {...register('driverPhone')}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
                    placeholder="+1-555-0123"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createVehicleMutation.isLoading || updateVehicleMutation.isLoading}
                  className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createVehicleMutation.isLoading || updateVehicleMutation.isLoading ? 'Saving...' : (editingVehicle ? 'Update Vehicle' : 'Add Vehicle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Cargo Modal */}
      {showAssignCargo && selectedVehicle && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Assign Cargo to {selectedVehicle.vehicleNumber}
              </h3>
              <button
                onClick={() => {
                  setShowAssignCargo(false);
                  setSelectedVehicle(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium text-gray-900 mb-2">Vehicle Details:</h4>
                <p className="text-sm text-gray-600">Type: {selectedVehicle.type}</p>
                <p className="text-sm text-gray-600">Capacity: {formatWeight(selectedVehicle.capacity)}</p>
                <p className="text-sm text-gray-600">Driver: {selectedVehicle.driverName || 'Not assigned'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Cargo to Assign:</label>
                {availableCargo.length === 0 ? (
                  <p className="text-gray-500 text-sm">No available cargo for assignment.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableCargo.map((cargo) => (
                      <div
                        key={cargo.id}
                        className={`border rounded-md p-3 cursor-pointer hover:bg-gray-50 ${
                          cargo.weight > selectedVehicle.capacity ? 'border-red-200 bg-red-50' : 'border-gray-200'
                        }`}
                        onClick={() => {
                          if (cargo.weight <= selectedVehicle.capacity) {
                            assignCargoMutation.mutate({
                              vehicleId: selectedVehicle.id,
                              cargoId: cargo.id
                            });
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{cargo.name}</h4>
                            <p className="text-sm text-gray-600">Weight: {formatWeight(cargo.weight)}</p>
                            <p className="text-sm text-gray-600">Category: {cargo.category || 'N/A'}</p>
                          </div>
                          {cargo.weight > selectedVehicle.capacity && (
                            <span className="text-red-600 text-xs font-medium">Over capacity</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Detail Modal */}
      {selectedVehicle && !showAssignCargo && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Vehicle Details: {selectedVehicle.vehicleNumber}</h3>
              <button
                onClick={() => setSelectedVehicle(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Vehicle Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Type:</strong> {selectedVehicle.type}</p>
                    <p><strong>Capacity:</strong> {formatWeight(selectedVehicle.capacity)}</p>
                    <p><strong>Status:</strong> <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedVehicle.status)}`}>{selectedVehicle.status}</span></p>
                    <p><strong>Created:</strong> {new Date(selectedVehicle.createdAt.seconds * 1000).toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Driver Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedVehicle.driverName || 'Not assigned'}</p>
                    <p><strong>Phone:</strong> {selectedVehicle.driverPhone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {selectedVehicle.currentCargo && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Current Cargo Assignment</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Cargo:</strong> {selectedVehicle.currentCargo.name}</p>
                        <p><strong>Weight:</strong> {formatWeight(selectedVehicle.currentCargo.weight)}</p>
                      </div>
                      <div>
                        <p><strong>Assigned:</strong> {new Date(selectedVehicle.currentCargo.assignedAt.seconds * 1000).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedVehicle.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-gray-600 text-sm">{selectedVehicle.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default Vehicles;