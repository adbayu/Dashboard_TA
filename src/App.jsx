import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useFarmStore } from './store/useFarmStore';
import { iotSimulator } from './services/iotSimulator';

// Layout Components
import Sidebar from './components/Sidebar';
import TopNavBar from './components/TopNavBar';
import RoleSwitchModal from './components/RoleSwitchModal';
import AddSensorModal from './components/AddSensorModal';

// Pages (All 10 Screens)
import Dasbor from './pages/Dasbor';
import MonitoringTanah from './pages/MonitoringTanah';
import MonitoringCuaca from './pages/MonitoringCuaca';
import Analitik from './pages/Analitik';
import Riwayat from './pages/Riwayat';
import ManajemenSensor from './pages/ManajemenSensor';
import Ensiklopedia from './pages/Ensiklopedia';
import Pengaturan from './pages/Pengaturan';
import Profil from './pages/Profil';
import AsistenAI from './pages/AsistenAI';

export default function App() {
  const store = useFarmStore();
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [addSensorModalOpen, setAddSensorModalOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col text-on-surface">
        {/* Navigation Sidebar */}
        <Sidebar onOpenAddSensor={() => setAddSensorModalOpen(true)} />

        {/* Top Header Bar */}
        <TopNavBar
          telemetry={store.telemetry}
          currentUser={store.currentUser}
          userRole={store.userRole}
          onOpenRoleModal={() => setRoleModalOpen(true)}
          theme={store.theme}
          onToggleTheme={store.toggleTheme}
          lang={store.lang}
          onToggleLanguage={store.toggleLanguage}
        />

        {/* Main Content Area */}
        <main className="sm:ml-20 md:ml-24 pt-24 px-4 sm:px-8 pb-16 min-h-screen max-w-7xl mx-auto w-full">
          <Routes>
            <Route
              path="/"
              element={
                <Dasbor
                  telemetry={store.telemetry}
                  currentUser={store.currentUser}
                  onSyncManual={() => iotSimulator.tick()}
                  onInjectAnomaly={(type) => iotSimulator.injectAnomaly(type)}
                />
              }
            />
            <Route
              path="/tanah"
              element={
                <MonitoringTanah
                  telemetry={store.telemetry}
                  onSelectSoilStation={(id) => iotSimulator.selectSoilStation(id)}
                />
              }
            />
            <Route
              path="/cuaca"
              element={
                <MonitoringCuaca
                  telemetry={store.telemetry}
                  onSelectWeatherStation={(id) => iotSimulator.selectWeatherStation(id)}
                />
              }
            />
            <Route
              path="/analitik"
              element={<Analitik />}
            />
            <Route
              path="/riwayat"
              element={<Riwayat logs={store.logs} />}
            />
            <Route
              path="/sensor"
              element={
                <ManajemenSensor
                  sensors={store.sensors}
                  onCalibrateSensor={store.calibrateSensor}
                  onAddSensor={store.addSensor}
                />
              }
            />
            <Route
              path="/ensiklopedia"
              element={<Ensiklopedia />}
            />
            <Route
              path="/pengaturan"
              element={
                <Pengaturan
                  thresholds={store.thresholds}
                  onUpdateThresholds={store.updateThresholds}
                  theme={store.theme}
                  onToggleTheme={store.toggleTheme}
                  lang={store.lang}
                  onToggleLanguage={store.toggleLanguage}
                  currentUser={store.currentUser}
                />
              }
            />
            <Route
              path="/profil"
              element={
                <Profil
                  currentUser={store.currentUser}
                  onOpenRoleModal={() => setRoleModalOpen(true)}
                />
              }
            />
            <Route
              path="/ai"
              element={
                <AsistenAI
                  telemetry={store.telemetry}
                  currentUser={store.currentUser}
                />
              }
            />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Global Modals */}
        <RoleSwitchModal
          isOpen={roleModalOpen}
          onClose={() => setRoleModalOpen(false)}
          currentRole={store.userRole}
          onSelectRole={store.switchRole}
        />

        <AddSensorModal
          isOpen={addSensorModalOpen}
          onClose={() => setAddSensorModalOpen(false)}
          onAdd={store.addSensor}
        />
      </div>
    </BrowserRouter>
  );
}
