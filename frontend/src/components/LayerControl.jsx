import React from 'react';

const LayerControl = ({ layers, onLayerToggle }) => {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Map Layers
        </h3>
      </div>
      
      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
        {layers.map((layer) => (
              <label
                key={layer.id}
                className="flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => onLayerToggle(layer.id)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                      {layer.name}
                    </span>
                    {layer.color && (
                      <span
                        className="w-4 h-4 rounded-full border border-gray-600"
                        style={{ backgroundColor: layer.color }}
                      ></span>
                    )}
                  </div>
                  {layer.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{layer.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default LayerControl;
