import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import Dashboard from './pages/Dashboard';
import StaffDashboard from './pages/StaffDashboard';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Staff from './pages/Staff';
import Vehicles from './pages/Vehicles';
import Transporters from './pages/Transporters';
import Login from './pages/Login';
import BusinessModeSelector from './components/BusinessModeSelector';
import { DarkModeProvider, useDarkMode } from './contexts/DarkModeContext';
import Sidebar from './components/Sidebar';
import './App.css';

const queryClient = new QueryClient();

function AppContent() {
  const [user, setUser] = useState(null);
  const [businessMode, setBusinessMode] = useState(null);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const savedMode = localStorage.getItem('businessMode');
    const savedSidebarCollapsed = localStorage.getItem('sidebarCollapsed');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      if (savedMode) {
        setBusinessMode(savedMode);
      }
      if (savedSidebarCollapsed) {
        setSidebarCollapsed(JSON.parse(savedSidebarCollapsed));
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (user) {
      const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

      socket.on('cargo.created', () => {
        queryClient.invalidateQueries(['products']);
      });
      socket.on('cargo.updated', () => {
        queryClient.invalidateQueries(['products']);
      });
      socket.on('cargo.deleted', () => {
        queryClient.invalidateQueries(['products']);
      });

      socket.on('customer.created', () => {
        queryClient.invalidateQueries(['customers']);
      });
      socket.on('customer.updated', () => {
        queryClient.invalidateQueries(['customers']);
      });
      socket.on('customer.deleted', () => {
        queryClient.invalidateQueries(['customers']);
      });

      socket.on('invoice.created', () => {
        queryClient.invalidateQueries(['invoices']);
      });
      socket.on('invoice.updated', () => {
        queryClient.invalidateQueries(['invoices']);
      });
      socket.on('invoice.deleted', () => {
        queryClient.invalidateQueries(['invoices']);
      });

      socket.on('vehicle.created', () => {
        queryClient.invalidateQueries(['vehicles']);
      });
      socket.on('vehicle.updated', () => {
        queryClient.invalidateQueries(['vehicles']);
      });
      socket.on('vehicle.deleted', () => {
        queryClient.invalidateQueries(['vehicles']);
      });

      socket.on('transporter.created', () => {
        queryClient.invalidateQueries(['transporters']);
      });
      socket.on('transporter.updated', () => {
        queryClient.invalidateQueries(['transporters']);
      });
      socket.on('transporter.deleted', () => {
        queryClient.invalidateQueries(['transporters']);
      });

      socket.on('contract.created', () => {
        queryClient.invalidateQueries(['contracts']);
      });
      socket.on('contract.updated', () => {
        queryClient.invalidateQueries(['contracts']);
      });

      return () => socket.disconnect();
    }
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleModeSelect = (mode) => {
    setBusinessMode(mode);
    localStorage.setItem('businessMode', mode);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('businessMode');
    setUser(null);
    setBusinessMode(null);
    queryClient.clear();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
          {user ? (
            !businessMode ? (
              <BusinessModeSelector onModeSelect={handleModeSelect} />
            ) : (
              <>
                {/* Sidebar */}
                <Sidebar
                  businessMode={businessMode}
                  user={user}
                  onModeSwitch={() => setBusinessMode(null)}
                  isOpen={sidebarOpen}
                  onToggle={() => setSidebarOpen(!sidebarOpen)}
                  isCollapsed={sidebarCollapsed}
                  onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />

                {/* Header - Simplified */}
                <nav className={`fixed top-0 right-0 left-0 z-30 shadow-xl border-b backdrop-blur-sm transition-all duration-300 ${isDarkMode ? 'bg-gray-900/95 border-gray-700' : 'bg-white/95 border-gray-200'} ${sidebarCollapsed ? 'lg:left-16' : 'lg:left-64'}`}>
                  <div className="px-6 py-4">
                    <div className="flex justify-between items-center">
                      {/* Company/Dashboard Title */}
                      <div className="flex items-center space-x-4">
                        <div className="hidden lg:flex items-center space-x-3">
                          <div className="p-2 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div>
                            <h1 className={`text-lg font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent`}>
                              SIDELOADER TRANSPORTS L.L.C
                            </h1>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {businessMode === 'b2c' ? 'Business-to-Consumer Transport' : 'Business-to-Business Logistics'}
                            </p>
                          </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                          onClick={() => setSidebarOpen(true)}
                          className={`lg:hidden p-2 rounded-lg transition-colors ${
                            isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center space-x-4">
                        {/* Night Mode Toggle */}
                        <button
                          onClick={toggleDarkMode}
                          className={`p-2 rounded-lg transition-all duration-200 group ${isDarkMode ? 'text-yellow-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                          {isDarkMode ? (
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                          )}
                        </button>
                        {/* Switch Mode Button */}
                        <button
                          onClick={() => setBusinessMode(null)}
                          className={`p-2 rounded-lg transition-all duration-200 group ${isDarkMode ? 'text-indigo-400 hover:bg-gray-700' : 'text-indigo-600 hover:bg-indigo-50'}`}
                          title="Switch Business Mode"
                        >
                          <svg className="w-5 h-5 group-hover:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>

                        {/* User Profile & Logout */}
                        <div className={`flex items-center space-x-3 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                          <Link
                            to="/profile"
                            className="flex items-center space-x-2 group"
                            title="View profile"
                          >
                            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-left">
                              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{user.username}</p>
                              <p className={`text-xs capitalize ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user.role}</p>
                            </div>
                          </Link>
                          <button
                            onClick={handleLogout}
                            className={`p-2 rounded-lg transition-colors group ${isDarkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'}`}
                            title="Logout"
                          >
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </nav>

                {/* Main Content */}
                <main className={`main-content-layout transition-all duration-300 pt-20 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
                  <div className="w-full max-w-full overflow-hidden">
                    <Routes>
                      <Route path="/" element={user.role === 'admin' ? <Dashboard businessMode={businessMode} sidebarCollapsed={sidebarCollapsed} /> : <StaffDashboard businessMode={businessMode} sidebarCollapsed={sidebarCollapsed} />} />
                      {businessMode === 'b2c' ? (
                        // B2C Routes
                        <>
                          <Route path="/products" element={<Products sidebarCollapsed={sidebarCollapsed} />} />
                          <Route path="/customers" element={<Customers sidebarCollapsed={sidebarCollapsed} />} />
                          <Route path="/vehicles" element={<Vehicles sidebarCollapsed={sidebarCollapsed} />} />
                          <Route path="/invoices" element={<Invoices businessMode={businessMode} sidebarCollapsed={sidebarCollapsed} />} />
                        </>
                      ) : (
                        // B2B Routes
                        <>
                          <Route path="/transporters" element={<Transporters sidebarCollapsed={sidebarCollapsed} />} />
                          <Route path="/products" element={<Products sidebarCollapsed={sidebarCollapsed} />} />
                          <Route path="/invoices" element={<Invoices businessMode={businessMode} sidebarCollapsed={sidebarCollapsed} />} />
                        </>
                      )}
                      {user.role === 'admin' && (
                        <>
                          <Route path="/staff" element={<Staff />} />
                          <Route path="/settings" element={<Settings />} />
                        </>
                      )}
                      {/* Profile accessible to all roles */}
                      <Route path="/profile" element={<Profile />} />
                    </Routes>
                  </div>
                </main>
              </>
            )
          ) : (
            <Routes>
              <Route path="*" element={<Login onLogin={handleLogin} />} />
            </Routes>
          )}
        </div>
      </Router>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <DarkModeProvider>
      <AppContent />
    </DarkModeProvider>
  );
}

export default App;