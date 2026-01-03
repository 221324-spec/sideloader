import { useState } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

function BusinessModeSelector({ onModeSelect }) {
  const [selectedMode, setSelectedMode] = useState(null);
  const [hoveredMode, setHoveredMode] = useState(null);
  const { isDarkMode } = useDarkMode();

  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
    localStorage.setItem('businessMode', mode);
    onModeSelect(mode);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className={`relative z-10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl w-full max-w-4xl text-center border transition-colors duration-300 ${isDarkMode ? 'bg-gray-800/80 border-gray-700 text-gray-200' : 'bg-white/80 border-white/20 text-gray-800'}`}>
        {/* Header Section */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            SIDELOADER TRANSPORTS L.L.C
          </h1>
          <p className={`text-lg font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Select Your Business Operation Mode</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* B2C Operations Card */}
          <div
            onClick={() => handleModeSelect('b2c')}
            onMouseEnter={() => setHoveredMode('b2c')}
            onMouseLeave={() => setHoveredMode(null)}
            className={`group cursor-pointer p-8 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
              selectedMode === 'b2c'
                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-2xl shadow-blue-500/25'
                : hoveredMode === 'b2c'
                ? 'border-blue-300 bg-gradient-to-br from-blue-50/50 to-blue-100/50 shadow-xl shadow-blue-500/10'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-lg bg-white'
            }`}
          >
            <div className="flex items-center justify-center mb-6">
              <div className={`p-5 rounded-2xl transition-all duration-300 ${
                selectedMode === 'b2c'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg'
                  : 'bg-gradient-to-r from-blue-100 to-blue-200 group-hover:from-blue-200 group-hover:to-blue-300'
              }`}>
                <svg className={`w-10 h-10 transition-colors duration-300 ${
                  selectedMode === 'b2c' ? 'text-white' : 'text-blue-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
            <h3 className={`text-2xl font-bold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-800' : 'text-gray-800'}`}>B2C Operations</h3>
            <p className={`mb-6 font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-600' : 'text-gray-600'}`}>Direct customer transportation services</p>
            <ul className={`text-sm text-left space-y-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-600' : 'text-gray-600'}`}>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3"></div>
                Manage cargo and shipments
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3"></div>
                Handle customer relationships
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3"></div>
                Fleet and vehicle management
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3"></div>
                Invoice and billing
              </li>
            </ul>
            {selectedMode === 'b2c' && (
              <div className="mt-6 flex items-center justify-center">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* B2B Operations Card */}
          <div
            onClick={() => handleModeSelect('b2b')}
            onMouseEnter={() => setHoveredMode('b2b')}
            onMouseLeave={() => setHoveredMode(null)}
            className={`group cursor-pointer p-8 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
              selectedMode === 'b2b'
                ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-2xl shadow-emerald-500/25'
                : hoveredMode === 'b2b'
                ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/50 to-emerald-100/50 shadow-xl shadow-emerald-500/10'
                : 'border-gray-200 hover:border-emerald-300 hover:shadow-lg bg-white'
            }`}
          >
            <div className="flex items-center justify-center mb-6">
              <div className={`p-5 rounded-2xl transition-all duration-300 ${
                selectedMode === 'b2b'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg'
                  : 'bg-gradient-to-r from-emerald-100 to-emerald-200 group-hover:from-emerald-200 group-hover:to-emerald-300'
              }`}>
                <svg className={`w-10 h-10 transition-colors duration-300 ${
                  selectedMode === 'b2b' ? 'text-white' : 'text-emerald-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <h3 className={`text-2xl font-bold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-800' : 'text-gray-800'}`}>B2B Operations</h3>
            <p className={`mb-6 font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-600' : 'text-gray-600'}`}>External transporter partnerships</p>
            <ul className={`text-sm text-left space-y-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-600' : 'text-gray-600'}`}>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-3"></div>
                Manage transporter partners
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-3"></div>
                Contract and agreement handling
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-3"></div>
                External shipment coordination
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-3"></div>
                Partnership performance tracking
              </li>
            </ul>
            {selectedMode === 'b2b' && (
              <div className="mt-6 flex items-center justify-center">
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedMode && (
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-full font-medium shadow-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>
                Selected: {selectedMode === 'b2c' ? 'B2C Operations' : 'B2B Operations'}
              </span>
            </div>
            <div className="mt-6">
              <button
                onClick={() => onModeSelect(selectedMode)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-10 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
              >
                Continue to Dashboard
                <svg className="w-5 h-5 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className={`mt-8 p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'}`}>
          <p className={`text-sm flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Choose the business segment you want to work with. You can switch between modes anytime from the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

export default BusinessModeSelector;