import React from 'react';
import logo from '../assets/sponge_city_khi_logo.png';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, selectedDistrict, onBack, isExpanded, setIsExpanded }) {
  const tabs = [
    { id: 'visualization', name: 'Visualization', icon: '🗺️', description: 'Explore map layers' },
    { id: 'twi', name: 'TWI Analysis', icon: '🌊', description: 'Find flood-prone spots' },
    { id: 'detection', name: 'Detection Pipeline', icon: '🔍', description: 'LULC & Building detection' },
    { id: 'climate', name: 'Climate Insights', icon: '🌤️', description: '25 Years Rain & Climate Data' },
    { id: 'insights', name: 'Smart Solutions', icon: '💡', description: 'AI Green Analysis' }
  ];

  return (
    <div className={`${isExpanded ? 'w-80' : 'w-20'} transition-all duration-300 ease-in-out bg-gray-900 border-r border-gray-800 flex flex-col h-full shadow-2xl relative z-50 shrink-0`}>
      
      {/* Toggle Button */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-6 bg-gray-800 border border-gray-700 text-white p-1 rounded-full shadow-lg hover:bg-gray-700 z-50"
      >
        {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Header */}
      <div className={`p-6 border-b border-gray-800 shrink-0 ${!isExpanded && 'px-2 pb-4 pt-6'}`}>
        <div className={`flex items-center gap-3 mb-6 ${!isExpanded && 'justify-center'}`}>
          <img src={logo} alt="Logo" className={`${isExpanded ? 'w-10 h-10' : 'w-8 h-8'} drop-shadow-md transition-all`} />
          {isExpanded && (
            <div className="animate-fadeIn">
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight whitespace-nowrap">Sponge City</h1>
              <p className="text-xs text-blue-400 font-medium">Karachi</p>
            </div>
          )}
        </div>

        {/* Selected District Indicator & Back Button */}
        {isExpanded ? (
          <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/50 animate-fadeIn">
            <p className="text-xs text-gray-300 uppercase tracking-wider font-semibold mb-1">Active Region</p>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-lg capitalize">{selectedDistrict}</span>
              <button 
                onClick={onBack}
                className="text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-600 rounded-md p-1.5 transition-colors"
                title="Change District"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
           <button 
             onClick={onBack}
             className="w-full flex justify-center text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-700 rounded-lg p-2 transition-colors animate-fadeIn"
             title="Change District"
           >
             <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
             </svg>
           </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className={`flex-1 overflow-y-auto py-6 space-y-2 ${isExpanded ? 'px-4' : 'px-2'}`}>
        {isExpanded && <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Modules</p>}
        
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 text-left group overflow-hidden ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 text-white' 
                  : 'hover:bg-gray-800 text-gray-300'
              } ${isExpanded ? 'gap-4' : 'justify-center'}`}
              title={!isExpanded ? tab.name : ""}
            >
              <div className={`flex items-center justify-center rounded-lg text-lg flex-shrink-0 ${isExpanded ? 'w-10 h-10' : 'w-8 h-8'} ${
                isActive ? 'bg-white/20' : 'bg-gray-800 group-hover:bg-gray-700'
              }`}>
                {tab.icon}
              </div>
              
              {isExpanded && (
                <div className="min-w-0 flex-1 whitespace-nowrap animate-fadeIn">
                  <h3 className={`font-semibold truncate ${isActive ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>
                    {tab.name}
                  </h3>
                  <p className={`text-xs truncate ${isActive ? 'text-blue-100' : 'text-gray-300 group-hover:text-gray-200'}`}>
                    {tab.description}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-800 text-center shrink-0 animate-fadeIn">
          <p className="text-xs text-gray-400 font-mono">v1.3.0-beta</p>
        </div>
      )}

    </div>
  );
}
