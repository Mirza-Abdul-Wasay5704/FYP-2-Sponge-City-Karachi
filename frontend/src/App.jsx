import { useState } from 'react'
import LandingPage from './components/LandingPage'
import Dashboard from './components/Dashboard'

function App() {
  const [selectedDistrict, setSelectedDistrict] = useState('')

  if (!selectedDistrict) {
    return <LandingPage onDistrictSelect={setSelectedDistrict} />
  }

  return <Dashboard selectedDistrict={selectedDistrict} onBack={() => setSelectedDistrict('')} />
}

export default App
