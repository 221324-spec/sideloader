import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useDarkMode } from '../contexts/DarkModeContext';

function Transporters({ sidebarCollapsed = false }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTransporter, setEditingTransporter] = useState(null);
  const [selectedTransporter, setSelectedTransporter] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showCreateContract, setShowCreateContract] = useState(false);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const { register: registerContract, handleSubmit: handleSubmitContract, reset: resetContract, formState: { errors: errorsContract } } = useForm();
  const queryClient = useQueryClient();
  const { isDarkMode } = useDarkMode();

  
  const { data: transporters = [], isLoading } = useQuery({
    queryKey: ['transporters'],
    queryFn: async () => {
      const res = await fetch('/api/transporters');
      if (!res.ok) throw new Error('Failed to fetch transporters');
      const data = await res.json();
      const transportersArray = data.value || data; 
      console.log('Fetched transporters:', transportersArray);
      if (transportersArray.length > 0) {
        console.log('First transporter contracts:', transportersArray[0].contracts);
      }
      return transportersArray;
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
      console.log('Fetched cargo/products:', cargo);
      
      const filtered = cargo.filter(item => item.status !== 'contracted');
      console.log('Filtered available cargo (excluding contracted):', filtered);
      return filtered;
    }
  });


  useEffect(() => {
    if (!selectedContract) return;
    
    
    if (selectedContract.cargoId || selectedContract.agreedRate || selectedContract.origin) {
      console.log('Contract already has full details:', selectedContract);
      return;
    }

    console.log('Contract lacks details, attempting to resolve:', selectedContract);

    const transporterId = selectedContract.transporterId;
    if (!transporterId || !selectedContract.id) {
      console.log('Missing transporterId or contract id');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        console.log('Fetching transporter for contract resolution...');
        const res = await fetch(`/api/transporters/${transporterId}`);
        if (!res.ok) throw new Error('Failed to fetch transporter for contract resolution');
        const data = await res.json();
        console.log('Fetched transporter for contract resolution:', data);
        const found = data.contracts?.find(c => c.id === selectedContract.id);
        if (found && !cancelled) {
          console.log('Resolved contract details:', found);
          setSelectedContract({ ...found, transporterId });
        } else {
          console.log('Contract not found in transporter data');
        }
      } catch (err) {
        console.error('Error resolving contract details:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedContract]);

  const createTransporterMutation = useMutation({
    mutationFn: async (data) => {
      console.log('Creating transporter with data:', data);
      const res = await fetch('/api/transporters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create transporter');
      }
      return res.json();
    },
    onSuccess: (data) => {
      console.log('Transporter created successfully:', data);
      queryClient.invalidateQueries(['transporters']);
      setShowCreateForm(false);
      reset();
      alert('Transporter added successfully!');
    },
    onError: (error) => {
      console.error('Error creating transporter:', error);
      alert(`Error: ${error.message}`);
    }
  });

  
  const updateTransporterMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`/api/transporters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update transporter');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['transporters']);
      setEditingTransporter(null);
      reset();
    }
  });

  
  const deleteTransporterMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/transporters/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete transporter');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['transporters']);
    }
  });

  // Create contract mutation
  const createContractMutation = useMutation({
    mutationFn: async ({ transporterId, contractData }) => {
      console.log('Creating contract for transporter:', transporterId, 'with data:', contractData);
      const res = await fetch(`/api/transporters/${transporterId}/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create contract');
      }
      return res.json();
    },
    onSuccess: (data) => {
      console.log('Contract created successfully:', data);
      queryClient.invalidateQueries(['transporters']);
      queryClient.invalidateQueries(['products']);
      setShowCreateContract(false);
      setSelectedTransporter(null);
      resetContract();
      alert('Contract created successfully!');
    },
    onError: (error) => {
      console.error('Error creating contract:', error);
      alert(`Error creating contract: ${error.message}`);
    }
  });

 
  const updateContractMutation = useMutation({
    mutationFn: async ({ transporterId, contractId, status, performance }) => {
      console.log('Updating contract:', contractId, 'for transporter:', transporterId, 'status:', status);
      const res = await fetch(`/api/transporters/${transporterId}/contracts/${contractId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, performance })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update contract');
      }
      return res.json();
    },
    onSuccess: (data) => {
      console.log('Contract updated successfully:', data);
      queryClient.invalidateQueries(['transporters']);
      alert('Contract updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating contract:', error);
      alert(`Error updating contract: ${error.message}`);
    }
  });

  const onSubmit = (data) => {
    console.log('Form submitted with data:', data);
    const transporterData = {
      companyName: data.companyName,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      address: data.address,
      licenseNumber: data.licenseNumber,
      vehicles: data.vehicleNumber ? [{
        vehicleNumber: data.vehicleNumber,
        type: data.vehicleType,
        capacity: parseFloat(data.vehicleCapacity) || 0
      }] : [],
      rates: {
        perKm: parseFloat(data.perKm) || 0,
        perKg: parseFloat(data.perKg) || 0,
        baseRate: parseFloat(data.baseRate) || 0
      },
      status: data.status || 'active'
    };

    console.log('Transformed transporter data:', transporterData);

    if (editingTransporter) {
      console.log('Updating transporter:', editingTransporter.id);
      updateTransporterMutation.mutate({ id: editingTransporter.id, data: transporterData });
    } else {
      console.log('Creating new transporter');
      createTransporterMutation.mutate(transporterData);
    }
  };

  const handleEdit = (transporter) => {
    setEditingTransporter(transporter);
    setValue('companyName', transporter.companyName);
    setValue('contactPerson', transporter.contactPerson);
    setValue('email', transporter.email);
    setValue('phone', transporter.phone);
    setValue('address', transporter.address);
    setValue('licenseNumber', transporter.licenseNumber);
    setValue('perKm', transporter.rates?.perKm);
    setValue('perKg', transporter.rates?.perKg);
    setValue('baseRate', transporter.rates?.baseRate);
    setValue('status', transporter.status);
    
    
    if (transporter.vehicles && transporter.vehicles.length > 0) {
      const vehicle = transporter.vehicles[0]; 
      setValue('vehicleNumber', vehicle.vehicleNumber);
      setValue('vehicleType', vehicle.type);
      setValue('vehicleCapacity', vehicle.capacity);
    }
    
    setShowCreateForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this transporter?')) {
      deleteTransporterMutation.mutate(id);
    }
  };

  const handleCreateContract = (transporter) => {
    
    const hasActiveContract = transporter.contracts && transporter.contracts.some(c => c.status === 'active');
    
    if (hasActiveContract) {
      alert('This transporter already has an active contract. Please complete or cancel the existing contract before creating a new one.');
      return;
    }
    
    setSelectedTransporter(transporter);
    setShowCreateContract(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return <div className={`text-center py-8 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading transporters...</div>;
  }

  return (
    <div className={`w-full transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50'}`}>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>B2B Transporter Management</h2>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setEditingTransporter(null);
            reset();
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Add Transporter
        </button>
      </div>

      {/* Transporter List */}
      <div className={`rounded-lg shadow-md overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={`transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Company
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Contact
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Performance
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Contracts
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
              {transporters.map((transporter) => {
                
                const activeContracts = transporter.contracts?.filter(c => c.status === 'active' || !c.status) || [];
                const hasActiveContract = activeContracts.length > 0;
                return (
                <tr key={transporter.id} className={`transition-colors duration-300 border-l-4 ${hasActiveContract ? (isDarkMode ? 'bg-green-900/20 hover:bg-green-900/30 border-green-500' : 'bg-green-50 hover:bg-green-100 border-green-500') : (isDarkMode ? 'hover:bg-gray-700 border-transparent' : 'hover:bg-gray-50 border-transparent')}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{transporter.companyName}</div>
                    <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{transporter.licenseNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{transporter.contactPerson}</div>
                    <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{transporter.email}</div>
                    <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{transporter.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transporter.status)}`}>
                      {transporter.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Rating: {transporter.performance?.rating?.toFixed(1) || 'N/A'}</div>
                    <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completed: {transporter.performance?.completedShipments || 0}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {hasActiveContract ? (
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-200 text-green-800'}`}>
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                            Active Contract
                          </span>
                          <button
                            onClick={() => {
                              console.log('View clicked, active contracts array:', activeContracts);
                              console.log('First active contract:', activeContracts[0]);
                              console.log('Type of first contract:', typeof activeContracts[0]);
                              
                              const contract = activeContracts[0];
                              console.log('Setting selectedContract with:', contract);
                              
                              
                              setSelectedContract({
                                ...contract,
                                transporterId: transporter.id
                              });
                            }}
                            className={`text-xs px-2 py-1 rounded hover:bg-opacity-80 transition-colors ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                            title="View contract details"
                          >
                            View
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedTransporter(transporter);
                            setShowCreateContract(true);
                          }}
                          className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                          title="Create a contract with this transporter"
                        >
                          + Create Contract
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedTransporter(transporter)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(transporter)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      {transporter.status === 'active' && availableCargo.length > 0 && !hasActiveContract && (
                        <button
                          onClick={() => handleCreateContract(transporter)}
                          className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Contract
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(transporter.id)}
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
                );
              })}
            </tbody>
          </table>
        </div>
        {transporters.length === 0 && (
          <div className="text-center py-12">
            <svg className={`mx-auto h-12 w-12 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className={`mt-2 text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>No transporters</h3>
            <p className={`mt-1 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Get started by adding your first transporter partner.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Transporter Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className={`relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {editingTransporter ? 'Edit Transporter' : 'Add New Transporter'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingTransporter(null);
                  reset();
                }}
                className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Company Name *</label>
                  <input
                    type="text"
                    {...register('companyName', { required: 'Company name is required' })}
                    className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                    placeholder="ABC Transport Ltd."
                  />
                  {errors.companyName && <p className="mt-2 text-sm text-red-500">{errors.companyName.message}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Contact Person *</label>
                  <input
                    type="text"
                    {...register('contactPerson', { required: 'Contact person is required' })}
                    className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                    placeholder="John Smith"
                  />
                  {errors.contactPerson && <p className="mt-2 text-sm text-red-500">{errors.contactPerson.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Email *</label>
                  <input
                    type="email"
                    {...register('email', { required: 'Email is required' })}
                    className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                    placeholder="john@abc-transport.com"
                  />
                  {errors.email && <p className="mt-2 text-sm text-red-500">{errors.email.message}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Phone</label>
                  <input
                    type="tel"
                    {...register('phone')}
                    className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                    placeholder="+1-555-0123"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Address</label>
                <textarea
                  {...register('address')}
                  rows={3}
                  className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  placeholder="123 Transport Street, City, State, ZIP"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>License Number</label>
                  <input
                    type="text"
                    {...register('licenseNumber')}
                    className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                    placeholder="LIC123456"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Status</label>
                  <select
                    {...register('status')}
                    className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Vehicles Section */}
              <div>
                <h4 className={`text-md font-medium mb-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Vehicle Information</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Vehicle Number</label>
                      <input
                        type="text"
                        {...register('vehicleNumber')}
                        className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                        placeholder="ABC-1234"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Vehicle Type</label>
                      <input
                        type="text"
                        {...register('vehicleType')}
                        className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                        placeholder="Truck, Van, etc."
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Capacity (kg)</label>
                      <input
                        type="number"
                        {...register('vehicleCapacity')}
                        className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                        placeholder="5000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Rates Section */}
              <div>
                <h4 className={`text-md font-medium mb-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Pricing Rates</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Rate per Km ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('perKm')}
                      className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                      placeholder="2.50"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Rate per Kg ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('perKg')}
                      className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                      placeholder="0.10"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Base Rate ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('baseRate')}
                      className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                      placeholder="50.00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createTransporterMutation.isLoading || updateTransporterMutation.isLoading}
                  className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createTransporterMutation.isLoading || updateTransporterMutation.isLoading ? 'Saving...' : (editingTransporter ? 'Update Transporter' : 'Add Transporter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Contract Modal */}
      {showCreateContract && selectedTransporter && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className={`relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                Create Contract with {selectedTransporter.companyName}
              </h3>
              <button
                onClick={() => {
                  setShowCreateContract(false);
                  setSelectedTransporter(null);
                }}
                className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitContract((data) => {
              console.log('Contract form submitted with data:', data);
              const contractData = {
                cargoId: data.cargoId,
                origin: data.origin,
                destination: data.destination,
                distance: parseFloat(data.distance) || 0,
                weight: parseFloat(data.weight) || 0,
                agreedRate: parseFloat(data.agreedRate),
                startDate: data.startDate,
                endDate: data.endDate,
                terms: data.terms,
                invoiceIds: data.invoiceIds && data.invoiceIds.trim() ? data.invoiceIds.split(',').map(id => id.trim()).filter(id => id.length > 0) : []
              };
              console.log('Transformed contract data:', contractData);
              createContractMutation.mutate({
                transporterId: selectedTransporter.id,
                contractData
              });
            })} className="space-y-4">
              <div className={`p-4 rounded-md transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Transporter Details:</h4>
                <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Company: {selectedTransporter.companyName}</p>
                <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Contact: {selectedTransporter.contactPerson}</p>
                <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Rates: ${selectedTransporter.rates?.perKm || 0}/km, ${selectedTransporter.rates?.perKg || 0}/kg</p>
              </div>

              <div>
                <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Cargo *</label>
                <select
                  {...registerContract('cargoId', { required: 'Cargo selection is required' })}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300'}`}
                >
                  <option value="">Choose cargo for transport</option>
                  {availableCargo.map((cargo) => (
                    <option key={cargo.id} value={cargo.id}>
                      {cargo.name} - {cargo.weight}kg - {cargo.category || 'General'}
                    </option>
                  ))}
                </select>
                {errorsContract.cargoId && <p className="mt-1 text-sm text-red-600">{errorsContract.cargoId.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Origin *</label>
                  <input
                    type="text"
                    {...registerContract('origin', { required: 'Origin is required' })}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
                    placeholder="City, State"
                  />
                  {errorsContract.origin && <p className="mt-1 text-sm text-red-600">{errorsContract.origin.message}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Destination *</label>
                  <input
                    type="text"
                    {...registerContract('destination', { required: 'Destination is required' })}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
                    placeholder="City, State"
                  />
                  {errorsContract.destination && <p className="mt-1 text-sm text-red-600">{errorsContract.destination.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...registerContract('distance')}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
                    placeholder="150.5"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...registerContract('weight')}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
                    placeholder="1000"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Agreed Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...registerContract('agreedRate', { required: 'Agreed rate is required' })}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
                    placeholder="500.00"
                  />
                  {errorsContract.agreedRate && <p className="mt-1 text-sm text-red-600">{errorsContract.agreedRate.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Start Date</label>
                  <input
                    type="date"
                    {...registerContract('startDate')}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300'}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>End Date</label>
                  <input
                    type="date"
                    {...registerContract('endDate')}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300'}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Contract Terms</label>
                <textarea
                  {...registerContract('terms')}
                  rows={3}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
                  placeholder="Specific terms and conditions for this contract..."
                />
              </div>

              <div>
                <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Related Invoice IDs (Optional)</label>
                <textarea
                  {...registerContract('invoiceIds')}
                  rows={2}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'border-gray-300'}`}
                  placeholder="Enter invoice IDs separated by commas (e.g., inv123, inv456, inv789)"
                />
                <p className={`mt-1 text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>When contract is marked complete, these invoices will automatically be marked as delivered and paid</p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createContractMutation.isLoading}
                  className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createContractMutation.isLoading ? 'Creating...' : 'Create Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract View Modal (focused view for a single contract) */}
      {selectedContract && !selectedTransporter && !showCreateContract && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className={`relative top-20 mx-auto p-6 border w-11/12 max-w-2xl shadow-lg rounded-md transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            {(() => {
              console.log('Rendering contract modal with selectedContract:', selectedContract);
              console.log('Contract fields check:', {
                id: selectedContract.id,
                cargoId: selectedContract.cargoId,
                origin: selectedContract.origin,
                destination: selectedContract.destination,
                agreedRate: selectedContract.agreedRate,
                status: selectedContract.status
              });
              return null;
            })()}
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                Contract Details
              </h3>
              <button
                onClick={() => setSelectedContract(null)}
                className={`text-xl transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                ✕
              </button>
            </div>

            <div className={`p-5 rounded-lg border-2 transition-colors duration-300 ${
              selectedContract.status === 'active' || !selectedContract.status
                ? (isDarkMode ? 'bg-green-900/20 border-green-500' : 'bg-green-50 border-green-400')
                : selectedContract.status === 'completed'
                ? (isDarkMode ? 'bg-blue-900/20 border-blue-500' : 'bg-blue-50 border-blue-400')
                : (isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-400')
            }`}>
              {/* Contract ID and Status */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-300">
                <div>
                  <h4 className={`text-lg font-bold mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    Contract ID
                  </h4>
                  <p className={`text-sm font-mono transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {selectedContract.id || 'N/A'}
                  </p>
                </div>
                <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold ${
                  selectedContract.status === 'active' || !selectedContract.status
                    ? (isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-200 text-green-800')
                    : selectedContract.status === 'completed'
                    ? (isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-200 text-blue-800')
                    : (isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-300 text-gray-700')
                }`}>
                  {selectedContract.status || 'active'}
                </span>
              </div>

              {/* Contract Details Grid */}
              <div className="space-y-4">
                {/* Dates */}
                {(selectedContract.startDate || selectedContract.endDate) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedContract.startDate && (
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Start Date
                        </p>
                        <p className={`mt-1 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {new Date(selectedContract.startDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {selectedContract.endDate && (
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          End Date
                        </p>
                        <p className={`mt-1 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {new Date(selectedContract.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Cargo Information */}
                {selectedContract.cargoId && (
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Cargo ID
                    </p>
                    <p className={`mt-1 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {selectedContract.cargoId}
                    </p>
                  </div>
                )}

                {/* Route Information */}
                {(selectedContract.origin || selectedContract.destination || selectedContract.route) && (
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Route
                    </p>
                    <p className={`mt-1 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {selectedContract.origin && selectedContract.destination 
                        ? `${selectedContract.origin} → ${selectedContract.destination}`
                        : selectedContract.route || 'Not specified'}
                    </p>
                  </div>
                )}

                {/* Distance, Weight, Rate */}
                {(selectedContract.distance || selectedContract.weight || selectedContract.agreedRate) && (
                  <div className="grid grid-cols-3 gap-4">
                    {selectedContract.distance && (
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Distance
                        </p>
                        <p className={`mt-1 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {selectedContract.distance} km
                        </p>
                      </div>
                    )}
                    {selectedContract.weight && (
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Weight
                        </p>
                        <p className={`mt-1 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {selectedContract.weight} kg
                        </p>
                      </div>
                    )}
                    {selectedContract.agreedRate && (
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Agreed Rate
                        </p>
                        <p className={`mt-1 text-sm font-semibold text-green-600`}>
                          {formatCurrency(selectedContract.agreedRate)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Contract Terms */}
                {selectedContract.terms && (
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Terms & Conditions
                    </p>
                    <p className={`mt-1 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {selectedContract.terms}
                    </p>
                  </div>
                )}

                {/* Performance Metrics */}
                {selectedContract.performance && (
                  <div className={`pt-4 mt-4 border-t transition-colors duration-300 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Performance
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedContract.performance.rating !== undefined && (
                        <div>
                          <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <strong>Rating:</strong> {selectedContract.performance.rating}/5
                          </p>
                        </div>
                      )}
                      {selectedContract.performance.onTimeDelivery !== undefined && (
                        <div>
                          <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <strong>On-Time Delivery:</strong> {selectedContract.performance.onTimeDelivery ? 'Yes' : 'No'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons (only for active contracts) */}
              {(selectedContract.status === 'active' || !selectedContract.status) && (
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-300">
                  <button
                    onClick={() => {
                      if (!selectedContract.id) {
                        alert('Error: Contract ID is missing. Please refresh the page and try again.');
                        return;
                      }
                      
                      if (window.confirm('Mark this contract as completed?')) {
                
                        const transporterId = selectedContract.transporterId;
                        
                        if (!transporterId) {
                          alert('Error: Transporter ID is missing from contract.');
                          return;
                        }

                        updateContractMutation.mutate({
                          transporterId: transporterId,
                          contractId: selectedContract.id,
                          status: 'completed',
                          performance: {
                            rating: 5,
                            onTimeDelivery: true
                          }
                        }, {
                          onSuccess: () => {
                            setSelectedContract(null);
                          }
                        });
                      }
                    }}
                    disabled={updateContractMutation.isLoading}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {updateContractMutation.isLoading ? 'Completing...' : 'Complete Contract'}
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedContract.id) {
                        alert('Error: Contract ID is missing. Please refresh the page and try again.');
                        return;
                      }
                      
                      if (window.confirm('Cancel this contract? This action cannot be undone.')) {
                        
                        const transporterId = selectedContract.transporterId;
                        
                        if (!transporterId) {
                          alert('Error: Transporter ID is missing from contract.');
                          return;
                        }

                        updateContractMutation.mutate({
                          transporterId: transporterId,
                          contractId: selectedContract.id,
                          status: 'cancelled'
                        }, {
                          onSuccess: () => {
                            setSelectedContract(null);
                          }
                        });
                      }
                    }}
                    disabled={updateContractMutation.isLoading}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Cancel Contract
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transporter Detail Modal */}
      {selectedTransporter && !showCreateContract && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className={`relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{selectedTransporter.companyName} Details</h3>
              <button
                onClick={() => setSelectedTransporter(null)}
                className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className={`font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Company Information</h4>
                  <div className={`space-y-2 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <p><strong>License:</strong> {selectedTransporter.licenseNumber || 'Not provided'}</p>
                    <p><strong>Status:</strong> <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTransporter.status)}`}>{selectedTransporter.status}</span></p>
                    <p><strong>Vehicle Types:</strong> {selectedTransporter.vehicleTypes?.join(', ') || 'Not specified'}</p>
                    <p><strong>Address:</strong> {selectedTransporter.address || 'Not provided'}</p>
                  </div>
                </div>

                <div>
                  <h4 className={`font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Contact Information</h4>
                  <div className={`space-y-2 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <p><strong>Contact Person:</strong> {selectedTransporter.contactPerson}</p>
                    <p><strong>Email:</strong> {selectedTransporter.email}</p>
                    <p><strong>Phone:</strong> {selectedTransporter.phone || 'Not provided'}</p>
                  </div>

                  <h4 className={`font-medium mb-2 mt-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Performance</h4>
                  <div className={`space-y-2 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <p><strong>Rating:</strong> {selectedTransporter.performance?.rating?.toFixed(1) || 'N/A'}</p>
                    <p><strong>Total Shipments:</strong> {selectedTransporter.performance?.totalShipments || 0}</p>
                    <p><strong>Completed:</strong> {selectedTransporter.performance?.completedShipments || 0}</p>
                    <p><strong>On-Time Delivery:</strong> {selectedTransporter.performance?.onTimeDelivery ? `${(selectedTransporter.performance.onTimeDelivery * 100).toFixed(1)}%` : 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className={`font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Pricing Rates</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className={`p-3 rounded-md transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Per Kilometer</p>
                    <p className="text-lg text-green-600">{formatCurrency(selectedTransporter.rates?.perKm || 0)}</p>
                  </div>
                  <div className={`p-3 rounded-md transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Per Kilogram</p>
                    <p className="text-lg text-green-600">{formatCurrency(selectedTransporter.rates?.perKg || 0)}</p>
                  </div>
                  <div className={`p-3 rounded-md transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Base Rate</p>
                    <p className="text-lg text-green-600">{formatCurrency(selectedTransporter.rates?.baseRate || 0)}</p>
                  </div>
                </div>
              </div>

              {selectedTransporter.contracts && selectedTransporter.contracts.length > 0 ? (
                <div className="mt-6">
                  <h4 className={`text-lg font-semibold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    Contracts ({selectedTransporter.contracts.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedTransporter.contracts.map((contract, index) => {
                      const isActive = contract.status === 'active' || !contract.status;
                      const isCompleted = contract.status === 'completed';
                      const isCancelled = contract.status === 'cancelled';
                      
                      console.log('Displaying contract:', contract);
                      
                      return (
                        <div 
                          key={contract.id || index} 
                          className={`p-4 rounded-md border-2 transition-colors duration-300 ${
                            isActive 
                              ? (isDarkMode ? 'bg-green-900/20 border-green-500' : 'bg-green-50 border-green-400')
                              : isCompleted
                              ? (isDarkMode ? 'bg-blue-900/20 border-blue-500' : 'bg-blue-50 border-blue-400')
                              : (isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-400')
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className={`font-bold text-base transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                  Contract #{(contract.id || '').slice(-6) || index + 1}
                                </span>
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                  isActive 
                                    ? (isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-200 text-green-800')
                                    : isCompleted
                                    ? (isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-200 text-blue-800')
                                    : (isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-300 text-gray-700')
                                }`}>
                                  {contract.status || 'active'}
                                </span>
                              </div>
                              <div className={`text-sm space-y-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <p><strong>Contract ID:</strong> {contract.id || 'N/A'}</p>
                                {contract.startDate && (
                                  <p><strong>Start:</strong> {new Date(contract.startDate).toLocaleDateString()}</p>
                                )}
                                {contract.endDate && (
                                  <p><strong>End:</strong> {new Date(contract.endDate).toLocaleDateString()}</p>
                                )}
                                {contract.cargoId && (
                                  <p><strong>Cargo:</strong> {contract.cargoId}</p>
                                )}
                                {contract.route && (
                                  <p><strong>Route:</strong> {contract.route}</p>
                                )}
                                {contract.terms && (
                                  <p><strong>Terms:</strong> {contract.terms}</p>
                                )}
                                {contract.performance && (
                                  <div className="mt-2 pt-2 border-t border-gray-300">
                                    <p><strong>Rating:</strong> {contract.performance.rating}/5</p>
                                    {contract.performance.onTimeDelivery !== undefined && (
                                      <p><strong>On-Time:</strong> {contract.performance.onTimeDelivery ? 'Yes' : 'No'}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col space-y-2 ml-4">
                              {isActive && (
                                <>
                                  <button
                                    onClick={() => {
                                      console.log('Complete button clicked for contract:', contract);
                                      console.log('Contract ID:', contract.id);
                                      console.log('Transporter ID:', selectedTransporter.id);
                                      
                                      if (!contract.id) {
                                        alert('Error: Contract ID is missing. Please refresh the page and try again.');
                                        return;
                                      }
                                      
                                      if (window.confirm('Mark this contract as completed?')) {
                                        updateContractMutation.mutate({
                                          transporterId: selectedTransporter.id,
                                          contractId: contract.id,
                                          status: 'completed',
                                          performance: {
                                            rating: 5,
                                            onTimeDelivery: true
                                          }
                                        });
                                      }
                                    }}
                                    disabled={updateContractMutation.isLoading}
                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    {updateContractMutation.isLoading ? 'Completing...' : 'Complete'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!contract.id) {
                                        alert('Error: Contract ID is missing. Please refresh the page and try again.');
                                        return;
                                      }
                                      
                                      if (window.confirm('Cancel this contract?')) {
                                        updateContractMutation.mutate({
                                          transporterId: selectedTransporter.id,
                                          contractId: contract.id,
                                          status: 'cancelled'
                                        });
                                      }
                                    }}
                                    disabled={updateContractMutation.isLoading}
                                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-6">
                  <h4 className={`text-lg font-semibold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    Contracts
                  </h4>
                  <div className={`p-4 rounded-md text-center ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                    <p>No contracts found for this transporter.</p>
                  </div>
                </div>
              )}

              {selectedTransporter.notes && (
                <div>
                  <h4 className={`font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Notes</h4>
                  <p className={`text-gray-600 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{selectedTransporter.notes}</p>
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

export default Transporters;