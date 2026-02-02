import React from 'react';

const LoadingSpinner = ({ message = 'Loading geospatial data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 animate-fadeIn">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-blue-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      <p className="text-gray-300 text-lg font-medium">{message}</p>
      <div className="flex space-x-2">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span>
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
