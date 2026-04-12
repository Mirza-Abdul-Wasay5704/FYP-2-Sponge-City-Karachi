import React, { useState, useRef, useEffect } from 'react';
import { Map, ChevronDown, MapPin } from 'lucide-react';

const DISTRICTS = [
  { id: 'south', name: 'Karachi District', subtitle: '(Formerly Karachi South)' },
  { id: 'gulshan', name: 'Gulshan District', subtitle: '(Formerly Karachi East)' },
  { id: 'nazimabad', name: 'Nazimabad District', subtitle: '(Formerly Karachi Central)' },
  { id: 'orangi', name: 'Orangi District', subtitle: '(Formerly Karachi West)' },
  { id: 'korangi', name: 'Korangi District', subtitle: '' },
  { id: 'malir', name: 'Malir District', subtitle: '' },
  { id: 'keamari', name: 'Keamari District', subtitle: '' },
];

export default function DistrictSelector({ onDistrictSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (district) => {
    setSelected(district.id);
    setIsOpen(false);
    onDistrictSelect(district.id);
  };

  const currentSelection = DISTRICTS.find(d => d.id === selected);

  return (
    <div className="w-full relative z-20" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-gray-900/60 backdrop-blur-md border border-gray-600 hover:border-blue-400 text-white rounded-xl px-5 py-4 text-left shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 p-2 rounded-lg group-hover:bg-blue-500/30 transition-colors">
            <Map className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            {currentSelection ? (
              <>
                <p className="text-sm md:text-base font-bold text-white">{currentSelection.name}</p>
                {currentSelection.subtitle && <span className="text-xs text-gray-400">{currentSelection.subtitle}</span>}
              </>
            ) : (
              <span className="text-gray-400 text-sm md:text-base font-medium">Choose a district to explore...</span>
            )}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-blue-400" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      <div 
        className={`absolute top-full left-0 right-0 mt-3 bg-gray-900/90 backdrop-blur-xl border border-gray-700/80 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden transition-all duration-300 origin-top ${
          isOpen ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0 pointer-events-none"
        }`}
      >
        <div className="p-2 space-y-1 max-h-[350px] overflow-y-auto custom-scrollbar">
          {DISTRICTS.map((district) => {
            const isSelected = selected === district.id;
            return (
              <button
                key={district.id}
                onClick={() => handleSelect(district)}
                className={`w-full flex items-center justify-between text-left px-4 py-3 rounded-xl transition-all ${
                  isSelected 
                    ? "bg-blue-600/20 border border-blue-500/30" 
                    : "hover:bg-gray-800/80 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin className={`w-4 h-4 ${isSelected ? "text-blue-400" : "text-gray-500"}`} />
                  <div>
                    <h3 className={`font-semibold ${isSelected ? "text-blue-100" : "text-gray-200"}`}>{district.name}</h3>
                    {district.subtitle && <p className="text-[10px] text-gray-500">{district.subtitle}</p>}
                  </div>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );
}
