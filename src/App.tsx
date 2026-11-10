import React, { lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Modals } from './components/Modals';
import { Wrench } from 'lucide-react';

const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const WatchPage = lazy(() => import('./pages/WatchPage').then(module => ({ default: module.WatchPage })));
const BrowsePage = lazy(() => import('./pages/BrowsePage').then(module => ({ default: module.BrowsePage })));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage').then(module => ({ default: module.WatchlistPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then(module => ({ default: module.AccountPage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then(module => ({ default: module.LegalPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(module => ({ default: module.AdminPage })));

const AppContent: React.FC = () => {
  const { currentView, toastMessage, themeOptions, isAdmin, navigateTo, openModal, currentUser } = useApp();

  // Render the dedicated administrator dashboard shell.
  if (currentView === 'admin') {
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-[#16181f] text-[#e9ecef] flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-bold text-white">Administrator sign in required</h1>
            <p className="text-sm text-[#b2b1ad]">Sign in with the administrator account configured for this server.</p>
            <button onClick={() => openModal('login')} className="px-5 py-3 rounded-xl bg-gradient-flixer text-white font-semibold">
              Sign in
            </button>
            {currentUser && <p className="text-xs text-[#b2b1ad]">This account does not have administrator access.</p>}
            <Modals />
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#16181f] text-[#e9ecef] flex flex-col font-['Poppins']">
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-[300] bg-[#292d38] border border-[#db6937] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
            <div className="w-2 h-2 rounded-full bg-[#db6937] animate-pulse" />
            <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
          </div>
        )}
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading administration…</div>}>
          <AdminPage />
        </Suspense>
      </div>
    );
  }

  // Maintenance Mode gate: if active and user is not admin, show maintenance screen
  if (themeOptions.general.maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#1e2129] text-[#e9ecef] flex flex-col items-center justify-center p-6 text-center font-['Poppins']">
        <div className="max-w-md bg-[#242832] border border-[#3e4555] rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#db6937]/20 text-[#db6937] flex items-center justify-center mx-auto">
            <Wrench className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Under Scheduled Maintenance</h2>
          <p className="text-xs text-[#b2b1ad] leading-relaxed">
            {themeOptions.general.siteName} is currently undergoing scheduled platform upgrades. We will be back online shortly!
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigateTo('admin')}
              className="text-xs text-[#4f83d3] hover:underline"
            >
              Administrator Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e2129] text-[#e9ecef] flex flex-col font-['Poppins']">
      {/* Toast Notification Banner (matching theme's #toast) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[200] bg-[#292d38] border border-[#db6937] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <div className="w-2 h-2 rounded-full bg-[#db6937] animate-pulse" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Global Navigation Header */}
      <Header />

      {/* Main View Router */}
      <div className="flex-1">
        <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-sm text-[#b2b1ad]">Loading…</div>}>
          {currentView === 'home' && <HomePage />}
          {currentView === 'watch' && <WatchPage />}
          {currentView === 'browse' && <BrowsePage />}
          {currentView === 'watchlist' && <WatchlistPage />}
          {currentView === 'account' && <AccountPage />}
          {currentView === 'privacy' && <LegalPage type="privacy" />}
          {currentView === 'terms' && <LegalPage type="terms" />}
          {currentView === 'not-found' && <NotFoundPage />}
        </Suspense>
      </div>

      {/* Modals Manager */}
      <Modals />

      {/* Global Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
