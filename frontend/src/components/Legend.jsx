import React from 'react';

const Legend = () => {
  return (
    <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-700 p-4">
      <h4 className="text-base font-semibold text-gray-100 mb-3 flex items-center">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        Flood Risk Legend
      </h4>
      <div className="space-y-2.5">
        <div className="flex items-center text-xs">
          <div className="w-8 h-4 mr-2 rounded" style={{ background: 'linear-gradient(to right, #0096ff, #64b5f6)' }}></div>
          <span className="text-gray-300">Very Low Risk</span>
        </div>
        <div className="flex items-center text-xs">
          <div className="w-8 h-4 mr-2 rounded" style={{ background: 'linear-gradient(to right, #00c853, #64dd17)' }}></div>
          <span className="text-gray-300">Low Risk</span>
        </div>
        <div className="flex items-center text-xs">
          <div className="w-8 h-4 mr-2 rounded" style={{ background: 'linear-gradient(to right, #ffd600, #ffea00)' }}></div>
          <span className="text-gray-300">Moderate Risk</span>
        </div>
        <div className="flex items-center text-xs">
          <div className="w-8 h-4 mr-2 rounded" style={{ background: 'linear-gradient(to right, #ff9100, #ff6d00)' }}></div>
          <span className="text-gray-300">High Risk</span>
        </div>
        <div className="flex items-center text-xs">
          <div className="w-8 h-4 mr-2 rounded" style={{ background: 'linear-gradient(to right, #d50000, #b71c1c)' }}></div>
          <span className="text-gray-300">Very High Risk</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-600">
        Higher TWI values indicate areas where water accumulates, making them more flood-prone
      </p>
    </div>
  );
};

export default Legend;
