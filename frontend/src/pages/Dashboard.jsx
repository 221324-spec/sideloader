import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDarkMode } from '../contexts/DarkModeContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend
} from 'recharts';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};


const generateMonthlyRevenueData = (invoices) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  const monthlyData = {};
  
  
  monthNames.forEach((month) => {
    monthlyData[month] = 0;
  });

 
  if (invoices && Array.isArray(invoices)) {
    invoices.forEach((invoice) => {
      
      if (invoice.status === 'paid' && invoice.createdAt) {
        try {
          const timestamp = invoice.createdAt.seconds !== undefined 
            ? invoice.createdAt.seconds * 1000 
            : new Date(invoice.createdAt).getTime();
          
          const date = new Date(timestamp);
          
          
          if (date.getFullYear() === currentYear) {
            const monthName = monthNames[date.getMonth()];
            const revenue = invoice.billTotal || 0;
            monthlyData[monthName] += revenue;
          }
        } catch (e) {
          console.warn('Error parsing invoice date:', e);
        }
      }
    });
  }
  return monthNames.map((month) => ({ name: month, value: monthlyData[month] }));
};


const generatePaymentFlowData = (invoices) => {

  const now = new Date();
  const currentDay = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - currentDay);
  
  const weeks = [];
  

  for (let i = 3; i >= 0; i--) {
    const weekDate = new Date(weekStart);
    weekDate.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekDate);
    weekEnd.setDate(weekDate.getDate() + 6);
    
    const weekLabel = `${weekDate.getDate()}/${weekDate.getMonth() + 1}`;
    weeks.push({
      name: weekLabel,
      completed: 0,
      pending: 0,
      startDate: weekDate,
      endDate: weekEnd
    });
  }

  
  invoices?.forEach((invoice) => {
    if (invoice.createdAt) {
      const timestamp = invoice.createdAt.seconds !== undefined 
        ? invoice.createdAt.seconds * 1000 
        : new Date(invoice.createdAt).getTime();
      const invoiceDate = new Date(timestamp);
      
      for (let i = 0; i < weeks.length; i++) {
        if (invoiceDate >= weeks[i].startDate && invoiceDate <= weeks[i].endDate) {
          if (invoice.status === 'paid') {
            weeks[i].completed += 1;
          } else {
            weeks[i].pending += 1;
          }
          break;
        }
      }
    }
  });

  
  return weeks.map(week => ({
    name: week.name,
    completed: week.completed,
    pending: week.pending
  }));
};

function Dashboard({ businessMode = 'b2c', sidebarCollapsed = false }) {
  const { isDarkMode } = useDarkMode();
  const [isLoading, setIsLoading] = React.useState(true);

 
  const { data: invoiceStats } = useQuery({
    queryKey: ['invoice-stats', businessMode],
    queryFn: async () => {
      const res = await fetch(`http://localhost:5000/api/invoices/stats/summary?businessMode=${businessMode}`);
      if (!res.ok) throw new Error('Failed to fetch invoice stats');
      return res.json();
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true
  });

  const { data: allInvoices } = useQuery({
    queryKey: ['invoices', businessMode],
    queryFn: async () => {
      const res = await fetch(`http://localhost:5000/api/invoices?businessMode=${businessMode}`);
      if (!res.ok) throw new Error('Failed to fetch invoices');
      return res.json();
    },
    refetchInterval: 5000, 
    refetchIntervalInBackground: true
  });

  const { data: vehicleStats } = useQuery({
    queryKey: ['vehicle-stats'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/vehicles/stats/summary');
      if (!res.ok) throw new Error('Failed to fetch vehicle stats');
      return res.json();
    }
  });

  const { data: customerStats } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/customers', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      return data.value || data; 
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true
  });

  const { data: productStats } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/products', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      return data.value || data; 
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true
  });

  const { data: transporterStats } = useQuery({
    queryKey: ['transporter-stats'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/transporters/stats/summary');
      if (!res.ok) throw new Error('Failed to fetch transporter stats');
      return res.json();
    }
  });

  
  const totalRevenue = invoiceStats?.paidAmount || 0;
  const totalCustomers = customerStats?.length || 0;
  const totalProducts = productStats?.length || 0;
  const totalVehicles = vehicleStats?.totalVehicles || 0;
  const availableVehicles = vehicleStats?.availableVehicles || 0;
  const inTransitVehicles = vehicleStats?.inTransitVehicles || 0;
  const maintenanceVehicles = vehicleStats?.maintenanceVehicles || 0;
  const activeContracts = invoiceStats?.totalInvoices || 0;
  const activeTransporters = transporterStats?.activeTransporters || 0;

  
  const monthlyRevenueData = generateMonthlyRevenueData(allInvoices);
  const paymentFlowData = generatePaymentFlowData(allInvoices);
  
  const fleetData = [
    { name: 'Available', value: availableVehicles, color: '#3B82F6' },
    { name: 'In Transit', value: inTransitVehicles, color: '#A855F7' },
    { name: 'Maintenance', value: maintenanceVehicles, color: '#FBBF24' },
  ];

  return (
    <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} w-full max-w-full overflow-hidden px-4 sm:px-6 lg:px-8 py-6 min-h-screen`}>
      <div className="w-full max-w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {businessMode === 'b2c' ? 'B2C Dashboard' : 'B2B Dashboard'}
          </h1>
          <p className={`mt-2 text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Professional business analytics and metrics
          </p>
        </div>

        {businessMode === 'b2c' ? (
          /* B2C DASHBOARD */
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-8">
              {/* Total Revenue Card */}
              <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-xl shadow-md p-5 lg:p-6 transition-all hover:shadow-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Revenue</p>
                    <p className={`text-2xl lg:text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(totalRevenue)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'}`}>
                        ✓ {formatCurrency(invoiceStats?.paidAmount || 0)}
                      </span>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-700'}`}>
                        ⏱ {formatCurrency(invoiceStats?.pendingAmount || 0)}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full flex-shrink-0 ${isDarkMode ? 'bg-blue-900' : 'bg-blue-50'}`}>
                    <svg className={`w-6 h-6 lg:w-8 lg:h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Total Customers Card */}
              <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-xl shadow-md p-5 lg:p-6 transition-all hover:shadow-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Customers</p>
                    <p className={`text-2xl lg:text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalCustomers}</p>
                    <p className={`text-xs mt-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      <span className={isDarkMode ? 'text-green-400' : 'text-green-600'}>Active business relationships</span>
                    </p>
                  </div>
                  <div className={`p-3 rounded-full flex-shrink-0 ${isDarkMode ? 'bg-green-900' : 'bg-green-50'}`}>
                    <svg className={`w-6 h-6 lg:w-8 lg:h-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Total Products Card */}
              <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-xl shadow-md p-5 lg:p-6 transition-all hover:shadow-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Cargo/Products</p>
                    <p className={`text-2xl lg:text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalProducts}</p>
                    <p className={`text-xs mt-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      <span className={isDarkMode ? 'text-purple-400' : 'text-purple-600'}>Ready for shipment</span>
                    </p>
                  </div>
                  <div className={`p-3 rounded-full flex-shrink-0 ${isDarkMode ? 'bg-purple-900' : 'bg-purple-50'}`}>
                    <svg className={`w-6 h-6 lg:w-8 lg:h-8 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m0 0L4 7m8 4v10l8-4v-10" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Active Invoices Card */}
              <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-xl shadow-md p-5 lg:p-6 transition-all hover:shadow-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Active Invoices</p>
                    <p className={`text-2xl lg:text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activeContracts}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-700'}`}>
                        {invoiceStats?.pendingInvoices || 0} pending
                      </span>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'}`}>
                        {invoiceStats?.paidInvoices || 0} paid
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full flex-shrink-0 ${isDarkMode ? 'bg-orange-900' : 'bg-orange-50'}`}>
                    <svg className={`w-6 h-6 lg:w-8 lg:h-8 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 mb-8">
              {/* Revenue Trend */}
              <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-white via-blue-50/30 to-white border border-gray-200'} rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-4 lg:p-6`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                  <div>
                    <h3 className={`text-lg lg:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Monthly Revenue Trend</h3>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Year-over-year performance</p>
                  </div>
                  <div className="sm:text-right">
                    <p className={`text-2xl lg:text-3xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-green-400 to-emerald-400' : 'from-green-600 to-emerald-600'} bg-clip-text text-transparent`}>
                      {formatCurrency(totalRevenue)}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total revenue</p>
                  </div>
                </div>
                {monthlyRevenueData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isDarkMode ? '#10B981' : '#059669'} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={isDarkMode ? '#10B981' : '#059669'} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke={isDarkMode ? '#374151' : '#E5E7EB'} opacity={0.5} />
                      <XAxis dataKey="name" stroke={isDarkMode ? '#9CA3AF' : '#9CA3AF'} style={{ fontSize: '12px', fontWeight: '500' }} />
                      <YAxis stroke={isDarkMode ? '#9CA3AF' : '#9CA3AF'} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                          border: `2px solid ${isDarkMode ? '#10B981' : '#059669'}`,
                          borderRadius: '12px',
                          boxShadow: isDarkMode ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.1)'
                        }}
                        contentClassName={isDarkMode ? 'bg-gray-900' : 'bg-white'}
                        formatter={(value) => [`${formatCurrency(value)}`, 'Revenue']}
                        labelFormatter={(label) => `📅 ${label}`}
                        cursor={{ strokeDasharray: '5 5', stroke: isDarkMode ? '#10B981' : '#059669', opacity: 0.8 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={isDarkMode ? '#10B981' : '#059669'}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        dot={{ fill: isDarkMode ? '#10B981' : '#059669', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, fill: isDarkMode ? '#86EFAC' : '#10B981', stroke: 'white', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={`h-80 flex items-center justify-center rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100/50'}`}>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No revenue data yet</p>
                  </div>
                )}
              </div>

              {/* Payment Flow */}
              <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-white via-amber-50/30 to-white border border-gray-200'} rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6`}>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payment Flow Analysis</h3>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>4-week payment status</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2 justify-end">
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                        ✓ {paymentFlowData.reduce((sum, w) => sum + w.completed, 0)}
                      </div>
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>
                        ⏱ {paymentFlowData.reduce((sum, w) => sum + w.pending, 0)}
                      </div>
                    </div>
                    <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {paymentFlowData.reduce((sum, w) => sum + w.completed, 0) > 0
                        ? `${Math.round((paymentFlowData.reduce((sum, w) => sum + w.completed, 0) / (paymentFlowData.reduce((sum, w) => sum + w.completed + w.pending, 0) || 1)) * 100)}%`
                        : '0%'}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completion rate</p>
                  </div>
                </div>
                {paymentFlowData.some(d => d.completed > 0 || d.pending > 0) ? (
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={paymentFlowData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isDarkMode ? '#10B981' : '#059669'} stopOpacity={0.9}/>
                          <stop offset="95%" stopColor={isDarkMode ? '#10B981' : '#059669'} stopOpacity={0.3}/>
                        </linearGradient>
                        <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isDarkMode ? '#F59E0B' : '#DC2626'} stopOpacity={0.9}/>
                          <stop offset="95%" stopColor={isDarkMode ? '#F59E0B' : '#DC2626'} stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke={isDarkMode ? '#374151' : '#E5E7EB'} opacity={0.5} />
                      <XAxis dataKey="name" stroke={isDarkMode ? '#9CA3AF' : '#9CA3AF'} style={{ fontSize: '12px', fontWeight: '500' }} />
                      <YAxis stroke={isDarkMode ? '#9CA3AF' : '#9CA3AF'} style={{ fontSize: '12px' }} label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                          border: `2px solid ${isDarkMode ? '#9CA3AF' : '#D1D5DB'}`,
                          borderRadius: '12px',
                          boxShadow: isDarkMode ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value, name) => {
                          if (name === 'Paid ✓') return [`${value} paid`, '✓'];
                          return [`${value} pending`, '⏱'];
                        }}
                        labelFormatter={(label) => `📅 Week: ${label}`}
                        cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                      />
                      <Legend 
                        wrapperStyle={{
                          paddingTop: '16px',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                        iconType="rect"
                      />
                      <Bar
                        dataKey="completed"
                        fill="url(#colorCompleted)"
                        radius={[8, 8, 0, 0]}
                        name="Paid ✓"
                        animationDuration={800}
                      />
                      <Bar
                        dataKey="pending"
                        fill="url(#colorPending)"
                        radius={[8, 8, 0, 0]}
                        name="Pending"
                        animationDuration={800}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={`h-80 flex items-center justify-center rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100/50'}`}>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No payment data yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Business Insights & Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vehicle Fleet Status */}
              <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-white via-cyan-50/30 to-white border border-gray-200'} rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Fleet Status Overview</h3>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vehicle distribution</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                    {totalVehicles} total
                  </div>
                </div>
                {totalVehicles > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={fleetData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {fleetData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                            border: `2px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                            borderRadius: '12px',
                            boxShadow: isDarkMode ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value) => [`${value} vehicles`, '']}
                          contentClassName="text-sm font-medium"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-3 mt-6">
                      <div className={`${isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-blue-50/50 border border-blue-200'} rounded-lg p-4 text-center transition-all hover:shadow-md`}>
                        <div className="w-5 h-5 bg-blue-500 rounded-full mx-auto mb-2"></div>
                        <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{availableVehicles}</p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Available</p>
                      </div>
                      <div className={`${isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-purple-50/50 border border-purple-200'} rounded-lg p-4 text-center transition-all hover:shadow-md`}>
                        <div className="w-5 h-5 bg-purple-500 rounded-full mx-auto mb-2"></div>
                        <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{inTransitVehicles}</p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>In Transit</p>
                      </div>
                      <div className={`${isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-yellow-50/50 border border-yellow-200'} rounded-lg p-4 text-center transition-all hover:shadow-md`}>
                        <div className="w-5 h-5 bg-yellow-500 rounded-full mx-auto mb-2"></div>
                        <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{maintenanceVehicles}</p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Maintenance</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={`h-80 flex items-center justify-center rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100/50'}`}>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No vehicles data yet</p>
                  </div>
                )}
              </div>

              {/* B2C Business Insights */}
              <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-white via-emerald-50/30 to-white border border-gray-200'} rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6`}>
                <h3 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Business Insights</h3>
                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-4 ${isDarkMode ? 'bg-gradient-to-r from-blue-900/20 to-blue-900/5 border border-blue-800/30 rounded-lg hover:border-blue-700/50' : 'bg-gradient-to-r from-blue-50/50 to-blue-50/20 border border-blue-200/50 rounded-lg hover:border-blue-300'} transition-all`}>
                    <div>
                      <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Order Value</p>
                      <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {formatCurrency(activeContracts > 0 ? totalRevenue / activeContracts : 0)}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                      <svg className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-4 ${isDarkMode ? 'bg-gradient-to-r from-green-900/20 to-green-900/5 border border-green-800/30 rounded-lg hover:border-green-700/50' : 'bg-gradient-to-r from-green-50/50 to-green-50/20 border border-green-200/50 rounded-lg hover:border-green-300'} transition-all`}>
                    <div>
                      <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Customers</p>
                      <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{totalCustomers}</p>
                    </div>
                    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                      <svg className={`w-6 h-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-4 ${isDarkMode ? 'bg-gradient-to-r from-orange-900/20 to-orange-900/5 border border-orange-800/30 rounded-lg hover:border-orange-700/50' : 'bg-gradient-to-r from-orange-50/50 to-orange-50/20 border border-orange-200/50 rounded-lg hover:border-orange-300'} transition-all`}>
                    <div>
                      <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Pending Invoices</p>
                      <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                        {invoiceStats?.totalInvoices || 0}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                      <svg className={`w-6 h-6 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* B2B DASHBOARD */
          <>
            {/* B2B KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Revenue Card */}
              <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6 transition-all hover:shadow-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Total Contract Value</p>
                    <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(totalRevenue)}</p>
                    <div className="mt-3 flex items-center space-x-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'}`}>
                        ✓ {formatCurrency(invoiceStats?.paidAmount || 0)}
                      </span>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-700'}`}>
                        ⏱ {formatCurrency(invoiceStats?.pendingAmount || 0)}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-900' : 'bg-blue-50'}`}>
                    <svg className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Active Business Contracts Card */}
              <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6 transition-all hover:shadow-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Active Contracts</p>
                    <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activeContracts}</p>
                    <div className="mt-3 flex items-center space-x-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-700'}`}>
                        {invoiceStats?.paidInvoices || 0} fulfilled
                      </span>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-700'}`}>
                        {invoiceStats?.pendingInvoices || 0} pending
                      </span>
                    </div>
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
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Business Partners</p>
                    <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalCustomers}</p>
                    <p className={`text-xs mt-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      <span className={isDarkMode ? 'text-green-400' : 'text-green-600'}>Active partnerships</span>
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${isDarkMode ? 'bg-green-900' : 'bg-green-50'}`}>
                    <svg className={`w-8 h-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Service Providers Card */}
              <div className={`${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-lg shadow-md p-6 transition-all hover:shadow-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>Service Providers</p>
                    <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activeTransporters || 0}</p>
                    <p className={`text-xs mt-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      <span className={isDarkMode ? 'text-orange-400' : 'text-orange-600'}>{totalVehicles || 0} assets available</span>
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${isDarkMode ? 'bg-orange-900' : 'bg-orange-50'}`}>
                    <svg className={`w-8 h-8 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* B2B Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Contract Revenue Trend */}
              <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-white via-indigo-50/30 to-white border border-gray-200'} rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6`}>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Monthly Contract Value</h3>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>B2B contract performance</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-indigo-400 to-purple-400' : 'from-indigo-600 to-purple-600'} bg-clip-text text-transparent`}>
                      {formatCurrency(totalRevenue)}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total value</p>
                  </div>
                </div>
                {monthlyRevenueData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={340}>
                    <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorContract" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isDarkMode ? '#6366F1' : '#4F46E5'} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={isDarkMode ? '#6366F1' : '#4F46E5'} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke={isDarkMode ? '#374151' : '#E5E7EB'} opacity={0.5} />
                      <XAxis dataKey="name" stroke={isDarkMode ? '#9CA3AF' : '#9CA3AF'} style={{ fontSize: '12px', fontWeight: '500' }} />
                      <YAxis stroke={isDarkMode ? '#9CA3AF' : '#9CA3AF'} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                          border: `2px solid ${isDarkMode ? '#6366F1' : '#4F46E5'}`,
                          borderRadius: '12px',
                          boxShadow: isDarkMode ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.1)'
                        }}
                        contentClassName={isDarkMode ? 'bg-gray-900' : 'bg-white'}
                        formatter={(value) => [`${formatCurrency(value)}`, 'Contract Value']}
                        labelFormatter={(label) => `📅 ${label}`}
                        cursor={{ strokeDasharray: '5 5', stroke: isDarkMode ? '#6366F1' : '#4F46E5', opacity: 0.8 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={isDarkMode ? '#6366F1' : '#4F46E5'}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorContract)"
                        dot={{ fill: isDarkMode ? '#6366F1' : '#4F46E5', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, fill: isDarkMode ? '#A78BFA' : '#6366F1', stroke: 'white', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={`h-80 flex items-center justify-center rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100/50'}`}>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No contract data yet</p>
                  </div>
                )}
              </div>

              {/* Contract Fulfillment Status */}
              <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-white via-violet-50/30 to-white border border-gray-200'} rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6`}>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Contract Status Overview</h3>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fulfillment tracking</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2 justify-end">
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                        ✓ {invoiceStats?.paidInvoices || 0}
                      </div>
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${isDarkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                        ⏳ {invoiceStats?.pendingInvoices || 0}
                      </div>
                    </div>
                    <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {activeContracts > 0
                        ? `${Math.round((invoiceStats?.paidInvoices || 0) / (activeContracts || 1) * 100)}%`
                        : '0%'}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Fulfillment rate</p>
                  </div>
                </div>
                {paymentFlowData.some(d => d.completed > 0 || d.pending > 0) ? (
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={paymentFlowData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorFulfilled" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isDarkMode ? '#10B981' : '#059669'} stopOpacity={0.9}/>
                          <stop offset="95%" stopColor={isDarkMode ? '#10B981' : '#059669'} stopOpacity={0.3}/>
                        </linearGradient>
                        <linearGradient id="colorInProgress" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isDarkMode ? '#F59E0B' : '#D97706'} stopOpacity={0.9}/>
                          <stop offset="95%" stopColor={isDarkMode ? '#F59E0B' : '#D97706'} stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke={isDarkMode ? '#374151' : '#E5E7EB'} opacity={0.5} />
                      <XAxis dataKey="name" stroke={isDarkMode ? '#9CA3AF' : '#9CA3AF'} style={{ fontSize: '12px', fontWeight: '500' }} />
                      <YAxis stroke={isDarkMode ? '#9CA3AF' : '#9CA3AF'} style={{ fontSize: '12px' }} label={{ value: 'Contracts', angle: -90, position: 'insideLeft' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                          border: `2px solid ${isDarkMode ? '#9CA3AF' : '#D1D5DB'}`,
                          borderRadius: '12px',
                          boxShadow: isDarkMode ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value, name) => {
                          if (name === 'Fulfilled ✓') return [`${value} fulfilled`, '✓'];
                          return [`${value} in progress`, '⏳'];
                        }}
                        labelFormatter={(label) => `📅 Week: ${label}`}
                        cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                      />
                      <Legend 
                        wrapperStyle={{
                          paddingTop: '16px',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                        iconType="rect"
                      />
                      <Bar
                        dataKey="completed"
                        fill="url(#colorFulfilled)"
                        radius={[8, 8, 0, 0]}
                        name="Fulfilled ✓"
                        animationDuration={800}
                      />
                      <Bar
                        dataKey="pending"
                        fill="url(#colorInProgress)"
                        radius={[8, 8, 0, 0]}
                        name="In Progress"
                        animationDuration={800}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={`h-80 flex items-center justify-center rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100/50'}`}>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No contract data yet</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
