import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDarkMode } from '../contexts/DarkModeContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function StaffDashboard({ businessMode, sidebarCollapsed = false }) {
  const { isDarkMode } = useDarkMode();
  const token = localStorage.getItem('token');
  const [metrics, setMetrics] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    pendingInvoices: 0,
    completedInvoices: 0,
    availableVehicles: 0,
    activeTransporters: 0,
    totalOrders: 0,
    waitingOrders: 0
  });

  
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await fetch('/api/customers', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
    refetchInterval: 5000
  });

 
  const { data: invoicesData } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const response = await fetch('/api/invoices', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    },
    refetchInterval: 5000
  });

  
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const response = await fetch('/api/vehicles', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      return response.json();
    },
    refetchInterval: 5000
  });


  const { data: transportersData } = useQuery({
    queryKey: ['transporters'],
    queryFn: async () => {
      const response = await fetch('/api/transporters', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Failed to fetch transporters');
      return response.json();
    },
    refetchInterval: 5000
  });


  useEffect(() => {
    const customers = customersData?.value || customersData || [];
    const invoices = invoicesData?.value || invoicesData || [];
    const vehicles = vehiclesData?.value || vehiclesData || [];
    const transporters = transportersData?.value || transportersData || [];

    const pendingInvoices = invoices.filter(i => i.status === 'pending').length;
    const completedInvoices = invoices.filter(i => i.status === 'paid').length;
    const availableVehicles = vehicles.filter(v => v.status === 'available').length;
    const activeTransporters = transporters.filter(t => t.status === 'active').length;

    setMetrics({
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c.status === 'active').length || customers.length,
      pendingInvoices,
      completedInvoices,
      availableVehicles,
      activeTransporters,
      totalOrders: invoices.length,
      waitingOrders: invoices.filter(i => i.status === 'pending').length
    });
  }, [customersData, invoicesData, vehiclesData, transportersData]);


  const generateDailyData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      orders: Math.floor(Math.random() * 15) + 5,
      completed: Math.floor(Math.random() * 12) + 2,
      pending: Math.floor(Math.random() * 8) + 1
    }));
  };


  const invoiceStatusData = [
    { name: 'Pending', value: metrics.pendingInvoices, color: '#F59E0B' },
    { name: 'Completed', value: metrics.completedInvoices, color: '#10B981' }
  ];

  const resourceData = [
    { name: 'Vehicles', available: metrics.availableVehicles, total: 10, color: '#3B82F6' },
    { name: 'Transporters', available: metrics.activeTransporters, total: 8, color: '#8B5CF6' }
  ];

  const dailyData = generateDailyData();

  return (
    <div className="w-full max-w-full overflow-hidden px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}}
      <div className="mb-8">
        <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Staff Dashboard
        </h2>
        <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Daily operational metrics and workflow overview
        </p>
      </div>

      {businessMode === 'b2c' ? (
        // B2C Staff Dashboard
        <>
          {/* B2C KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-8">
            {/* Total Customers Card */}
            <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6 transition-all hover:shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total Customers
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {metrics.totalCustomers}
                  </p>
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    <span className={isDarkMode ? 'text-green-400' : 'text-green-600'}>
                      {metrics.activeCustomers}
                    </span>
                    {' '}active today
                  </p>
                </div>
                <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-900' : 'bg-blue-50'}`}>
                  <svg className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0a6 6 0 11-12 0 6 6 0 0112 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Pending Invoices Card */}
            <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6 transition-all hover:shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Pending Invoices
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {metrics.pendingInvoices}
                  </p>
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Awaiting payment
                  </p>
                </div>
                <div className={`p-3 rounded-full ${isDarkMode ? 'bg-orange-900' : 'bg-orange-50'}`}>
                  <svg className={`w-8 h-8 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Completed Today Card */}
            <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6 transition-all hover:shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Completed Orders
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {metrics.completedInvoices}
                  </p>
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Successfully delivered
                  </p>
                </div>
                <div className={`p-3 rounded-full ${isDarkMode ? 'bg-green-900' : 'bg-green-50'}`}>
                  <svg className={`w-8 h-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Available Resources Card */}
            <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6 transition-all hover:shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Available Resources
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {metrics.availableVehicles + metrics.activeTransporters}
                  </p>
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Vehicles & staff ready
                  </p>
                </div>
                <div className={`p-3 rounded-full ${isDarkMode ? 'bg-purple-900' : 'bg-purple-50'}`}>
                  <svg className={`w-8 h-8 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* B2C Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Daily Orders Workflow Chart */}
            <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Daily Orders Workflow
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                  <YAxis stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                      border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                      color: isDarkMode ? '#F3F4F6' : '#111827'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="orders" fill="#3B82F6" name="Total Orders" />
                  <Bar dataKey="completed" fill="#10B981" name="Completed" />
                  <Bar dataKey="pending" fill="#F59E0B" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Invoice Status Distribution */}
            <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Invoice Status Overview
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                      border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                      color: isDarkMode ? '#F3F4F6' : '#111827'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        // B2B Staff Dashboard
        <>
          {/* B2B KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Active Contracts Card */}
            <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6 transition-all hover:shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Active Contracts
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {metrics.totalOrders}
                  </p>
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Total agreements
                  </p>
                </div>
                <div className={`p-3 rounded-full ${isDarkMode ? 'bg-indigo-900' : 'bg-indigo-50'}`}>
                  <svg className={`w-8 h-8 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Business Partners Card */}
            <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6 transition-all hover:shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Business Partners
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {metrics.totalCustomers}
                  </p>
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Active partners
                  </p>
                </div>
                <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-900' : 'bg-blue-50'}`}>
                  <svg className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Pending Fulfillment Card */}
            <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6 transition-all hover:shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Pending Fulfillment
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {metrics.pendingInvoices}
                  </p>
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Waiting processing
                  </p>
                </div>
                <div className={`p-3 rounded-full ${isDarkMode ? 'bg-orange-900' : 'bg-orange-50'}`}>
                  <svg className={`w-8 h-8 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Service Providers Card */}
            <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6 transition-all hover:shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Service Providers
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {metrics.activeTransporters}
                  </p>
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Available today
                  </p>
                </div>
                <div className={`p-3 rounded-full ${isDarkMode ? 'bg-green-900' : 'bg-green-50'}`}>
                  <svg className={`w-8 h-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* B2B Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Daily Contract Fulfillment */}
            <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Daily Contract Fulfillment
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                  <YAxis stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                      border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                      color: isDarkMode ? '#F3F4F6' : '#111827'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="orders" fill="#6366F1" name="New Contracts" />
                  <Bar dataKey="completed" fill="#10B981" name="Fulfilled" />
                  <Bar dataKey="pending" fill="#F59E0B" name="In Progress" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Contract Status Distribution */}
            <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Contract Status Breakdown
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                      border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                      color: isDarkMode ? '#F3F4F6' : '#111827'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default StaffDashboard;
