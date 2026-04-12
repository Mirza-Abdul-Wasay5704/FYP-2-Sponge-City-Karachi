import React, { useState } from 'react';
import Sidebar from './Sidebar';
import MapViewer from './MapViewer';
import TwiAnalysisTab from './TwiAnalysisTab';
import DetectionTab from './DetectionTab';
import ClimateDashboard from './ClimateDashboard';
import DiagnosticPanel from './DiagnosticPanel';
import SmartInsightsTab from './SmartInsightsTab';

export default function Dashboard({ selectedDistrict, onBack }) {
  const [activeTab, setActiveTab] = useState('visualization');
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  
  // Share TWI Data across tabs
  const [twiData, setTwiData] = useState(null);

  // Persistent States
  const [detections, setDetections] = useState({});
  const [selectedPatch, setSelectedPatch] = useState(null);
  
  const [climateChatHistory, setClimateChatHistory] = useState([
    { role: 'assistant', content: 'Hello! I am your Karachi AI Climate Expert. I analyze 25 years of local data and real-time detection caches. How can I help you understand urban flooding or climate patterns in Karachi?' }
  ]);

  const renderContent = () => {
    switch (activeTab) {
      case 'visualization':
        return (
          <div className="h-full w-full p-4 bg-gray-950 animate-fadeIn overflow-auto flex justify-center items-center">
            <div className="w-full max-w-7xl h-[85vh] rounded-2xl overflow-hidden border border-gray-800 shadow-[0_0_40px_rgba(59,130,246,0.15)] relative">
              <MapViewer district={selectedDistrict} />
            </div>
          </div>
        );
      case 'twi':
        return (
          <div className="h-full w-full overflow-y-auto animate-fadeIn bg-gray-950">
            <TwiAnalysisTab district={selectedDistrict} twiData={twiData} setTwiData={setTwiData} onProceed={() => setActiveTab('detection')} />
          </div>
        );
      case 'detection':
        return (
          <div className="h-full w-full overflow-y-auto animate-fadeIn bg-gray-950">
          <DetectionTab district={selectedDistrict} twiData={twiData} onBack={() => setActiveTab('twi')} detections={detections} setDetections={setDetections} selectedPatch={selectedPatch} setSelectedPatch={setSelectedPatch} />
          </div>
        );
      case 'climate':
        return (
          <div className="h-full w-full overflow-hidden animate-fadeIn bg-gray-950">
            <ClimateDashboard messages={climateChatHistory} setMessages={setClimateChatHistory} district={selectedDistrict} />
          </div>
        );
      case 'insights':
        return (
          <div className="h-full w-full overflow-y-auto animate-fadeIn bg-gray-950">
            <SmartInsightsTab />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-950 overflow-hidden font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        selectedDistrict={selectedDistrict} 
        onBack={onBack}
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
      />
      
      <main className="flex-1 relative h-full">
        {renderContent()}

        {/* Global Diagnostic Button toggle - Absolute bottom right */}
        <button
          onClick={() => setShowDiagnostic(!showDiagnostic)}
          className="absolute bottom-4 right-4 z-[2000] px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded-md shadow-lg transition-colors"
        >
          {showDiagnostic ? 'Hide' : 'Show'} Diagnostic
        </button>
        {showDiagnostic && <DiagnosticPanel />}
      </main>
    </div>
  );
}
