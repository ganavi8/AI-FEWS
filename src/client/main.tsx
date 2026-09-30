import React, { Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LocationProvider } from './app/LocationContext.js';
import { AppShell } from './app/AppShell.js';
import './styles.css';

const DashboardPage = lazy(() => import('./pages/DashboardPage.js').then((module) => ({ default: module.DashboardPage })));
const LocationPage = lazy(() => import('./pages/LocationPage.js').then((module) => ({ default: module.LocationPage })));
const EnvironmentPage = lazy(() => import('./pages/EnvironmentPage.js').then((module) => ({ default: module.EnvironmentPage })));
const RiskPage = lazy(() => import('./pages/RiskPage.js').then((module) => ({ default: module.RiskPage })));
const AlertsPage = lazy(() => import('./pages/AlertsPage.js').then((module) => ({ default: module.AlertsPage })));
const MapPage = lazy(() => import('./pages/MapPage.js').then((module) => ({ default: module.MapPage })));
const CommunityPage = lazy(() => import('./pages/CommunityPage.js').then((module) => ({ default: module.CommunityPage })));
const TrendsPage = lazy(() => import('./pages/TrendsPage.js').then((module) => ({ default: module.TrendsPage })));
const PreparednessPage = lazy(() => import('./pages/PreparednessPage.js').then((module) => ({ default: module.PreparednessPage })));
const EmergencyPage = lazy(() => import('./pages/EmergencyPage.js').then((module) => ({ default: module.EmergencyPage })));
const SimulationPage = lazy(() => import('./pages/SimulationPage.js').then((module) => ({ default: module.SimulationPage })));
const DataQualityPage = lazy(() => import('./pages/DataQualityPage.js').then((module) => ({ default: module.DataQualityPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage.js').then((module) => ({ default: module.NotificationsPage })));
const SavedPlacesPage = lazy(() => import('./pages/SavedPlacesPage.js').then((module) => ({ default: module.SavedPlacesPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage.js').then((module) => ({ default: module.SettingsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage.js').then((module) => ({ default: module.PrivacyPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage.js').then((module) => ({ default: module.PrivacyPolicyPage })));
const AboutPage = lazy(() => import('./pages/AboutPage.js').then((module) => ({ default: module.AboutPage })));

function LoadingRoute() {
  return <div className="route-loading" role="status"><LoaderCircle size={20} className="spin" />Loading workspace…</div>;
}

function PageNotFound() {
  return <div className="not-found"><h1>Page not found</h1><p>This route is not part of the AI·FEWS workspace.</p><a className="button button-primary" href="/dashboard">Return to overview</a></div>;
}

function OfflineSyncBridge() {
  useEffect(() => {
    let disposed = false;
    let removeNetworkListener: (() => Promise<void>) | undefined;
    if (Capacitor.isNativePlatform()) {
      void import('@capacitor/network').then(async ({ Network }) => {
        if (disposed) return;
        const listener = await Network.addListener('networkStatusChange', ({ connected }) => {
          window.dispatchEvent(new Event(connected ? 'online' : 'offline'));
        });
        removeNetworkListener = () => listener.remove();
        const status = await Network.getStatus();
        window.dispatchEvent(new Event(status.connected ? 'online' : 'offline'));
      }).catch(() => undefined);
    }
    if (!Capacitor.isNativePlatform() && !import.meta.env.DEV && 'serviceWorker' in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
    }
    return () => { disposed = true; void removeNetworkListener?.(); };
  }, []);
  return null;
}

function App() {
  return <LocationProvider>
    <OfflineSyncBridge />
    <BrowserRouter>
      <Suspense fallback={<LoadingRoute />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="location" element={<LocationPage />} />
            <Route path="environment" element={<EnvironmentPage />} />
            <Route path="risk" element={<RiskPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="trends" element={<TrendsPage />} />
            <Route path="preparedness" element={<PreparednessPage />} />
            <Route path="emergency" element={<EmergencyPage />} />
            <Route path="simulation" element={<SimulationPage />} />
            <Route path="data-quality" element={<DataQualityPage />} />
            <Route path="sources" element={<Navigate to="/data-quality" replace />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="saved" element={<SavedPlacesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="*" element={<PageNotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  </LocationProvider>;
}

const root = document.getElementById('root');
if (!root) throw new Error('The AI·FEWS application root is missing.');
createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
