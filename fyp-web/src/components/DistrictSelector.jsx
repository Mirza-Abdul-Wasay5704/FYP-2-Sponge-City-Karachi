import React from 'react';

const DISTRICTS = [
  { id: 'south', name: 'Karachi District', subtitle: '(Formerly Karachi South)' },
  { id: 'gulshan', name: 'Gulshan District', subtitle: '(Formerly Karachi East)' },
  { id: 'nazimabad', name: 'Nazimabad District', subtitle: '(Formerly Karachi Central)' },
  { id: 'orangi', name: 'Orangi District', subtitle: '(Formerly Karachi West)' },
  { id: 'korangi', name: 'Korangi District', subtitle: '' },
  { id: 'malir', name: 'Malir District', subtitle: '' },
  { id: 'keamari', name: 'Keamari District', subtitle: '' },
];

const DistrictSelector = ({ onDistrictSelect }) => {
  const [selectedDistrict, setSelectedDistrict] = React.useState('');

  const handleChange = (e) => {
    const district = e.target.value;
    setSelectedDistrict(district);
    onDistrictSelect(district);
  };

  return (
    <div className="w-full max-w-md animate-fadeIn">
      <label htmlFor="district-select" className="block text-lg font-medium mb-3 text-gray-200">
        Select District
      </label>
      <select
        id="district-select"
        value={selectedDistrict}
        onChange={handleChange}
        className="input-field cursor-pointer text-base"
      >
        <option value="">Choose a district...</option>
        {DISTRICTS.map((district) => (
          <option key={district.id} value={district.id}>
            {district.name} {district.subtitle}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DistrictSelector;
