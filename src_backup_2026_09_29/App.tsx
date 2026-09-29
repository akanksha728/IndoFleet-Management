import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ArchitectureGrid } from './components/ArchitectureGrid';
import { CapabilitiesAccordion } from './components/CapabilitiesAccordion';
import { InteractiveDemo } from './components/InteractiveDemo';
import { EcosystemSummary } from './components/EcosystemSummary';
import { SecuritySection } from './components/SecuritySection';
import { GcsSpotlight } from './components/GcsSpotlight';
import { AudienceMatrix } from './components/AudienceMatrix';
import { CtaBand } from './components/CtaBand';
import { Footer } from './components/Footer';
import { PlatformPage } from './pages/PlatformPage';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { GcsPage } from './pages/GcsPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { VersionsPage } from './pages/VersionsPage';
import { PlaceOrderPage } from './pages/PlaceOrderPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { DispatchPage } from './pages/DispatchPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { SupportPage } from './pages/SupportPage';
import { DocsPage } from './pages/DocsPage';
import { CompanyPage } from './pages/CompanyPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { LegalPage } from './pages/LegalPage';
import { CommandCenterModal } from './components/CommandCenterModal';
import { DemoBookingModal } from './components/DemoBookingModal';
import { FeedbackModal } from './components/FeedbackModal';
import { Chatbot } from './components/Chatbot';
import { apiClient } from './api/client';
import { AuthModal, DeliveryUser } from './components/AuthModal';
import { UserProfile } from './types';

type Page = 'home' | 'platform' | 'command-center' | 'gcs' | 'downloads' | 'versions' | 'order' | 'track' | 'dispatch' | 'login' | 'profile' | 'orders' | 'support' | 'docs' | 'company' | 'feedback' | 'legal';

const getInitialPage = (): Page => {
  if (typeof window === 'undefined') return 'home';
  const p = window.location.pathname;
  if (p.includes('/command-center')) return 'command-center';
  if (p.includes('/platform')) return 'platform';
  if (p.includes('/gcs')) return 'gcs';
  if (p.includes('/downloads')) return 'downloads';
  if (p.includes('/versions') || p.includes('/release-notes') || p.includes('/release_notes')) return 'versions';
  if (p.includes('/order')) return 'order';
  if (p.includes('/track')) return 'track';
  if (p.includes('/dispatch')) return 'dispatch';
  if (p.includes('/login')) return 'login';
  if (p.includes('/orders')) return 'orders';
  if (p.includes('/profile')) return 'profile';
  if (p.includes('/docs') || p.includes('/documentation')) return 'docs';
  if (p.includes('/company')) return 'company';
  if (p.includes('/feedback')) return 'feedback';
  if (p.includes('/legal') || p.includes('/privacy') || p.includes('/terms') || p.includes('/security-disclosure') || p.includes('/data-protection')) return 'legal';
  if (p.includes('/support') || p.includes('/guide') || p.includes('/fix')) return 'support';
  return 'home';
};

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [deliveryUser, setDeliveryUser] = useState<DeliveryUser | null>(null);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackOrder, setFeedbackOrder] = useState<any | null>(null);
  const [selectedDroneForDemo, setSelectedDroneForDemo] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);

  // Restore delivery session on load
  useEffect(() => {
    const token = localStorage.getItem('iw_delivery_token');
    const userStr = localStorage.getItem('iw_delivery_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as DeliveryUser;
        setDeliveryUser(user);
      } catch {}
    }
  }, []);

  // Browser back/forward
  useEffect(() => {
    const handlePopState = () => setCurrentPage(getInitialPage());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Old GCS session restore
  useEffect(() => {
    const token = localStorage.getItem('iw_token');
    if (token) {
      apiClient.getMe()
        .then(user => setCurrentUser(user))
        .catch(() => {
          localStorage.removeItem('iw_token');
          localStorage.removeItem('iw_refresh_token');
        });
    }
  }, []);

  const handleNavigate = (page: string) => setCurrentPage(page as Page);

  const handleDeliveryLogin = (user: DeliveryUser, token: string) => {
    setDeliveryUser(user);
    localStorage.setItem('iw_delivery_token', token);
    localStorage.setItem('iw_delivery_user', JSON.stringify(user));
    if (user.role !== 'customer') {
      localStorage.setItem('iw_token', token);
      apiClient.getMe().then(setCurrentUser).catch(() => {});
    }
  };

  const handleDeliveryLogout = () => {
    apiClient.logout().catch(() => {});
    setDeliveryUser(null);
    localStorage.removeItem('iw_delivery_token');
    localStorage.removeItem('iw_delivery_user');
    localStorage.removeItem('iw_token');
    localStorage.removeItem('iw_refresh_token');
  };

  const handleLoginSuccess = (user: UserProfile, token: string) => {
    setCurrentUser(user);
    localStorage.setItem('iw_token', token);
  };

  const handleLogout = () => {
    apiClient.logout().catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem('iw_token');
  };

  const handleOpenDemoBooking = (droneName?: string) => {
    setSelectedDroneForDemo(droneName);
    setIsDemoModalOpen(true);
  };

  // Automated One-Time Feedback Prompt on Order Completion
  useEffect(() => {
    const checkPendingFeedback = async () => {
      try {
        const token = localStorage.getItem('iw_token');
        if (!token) return;
        const orders = await apiClient.getOrders();
        if (Array.isArray(orders)) {
          // Find first delivered order not yet submitted and not yet prompted
          const deliveredOrder = orders.find((o: any) => 
            o.status === 'delivered' && 
            !o.feedback_submitted && 
            !localStorage.getItem(`iw_feedback_prompted_${o.id}`) &&
            !localStorage.getItem(`iw_feedback_submitted_${o.id}`)
          );
          if (deliveredOrder) {
            // Prompt only ONCE per order ("sirf ek baar dena hai")
            localStorage.setItem(`iw_feedback_prompted_${deliveredOrder.id}`, 'true');
            setFeedbackOrder(deliveredOrder);
            setIsFeedbackModalOpen(true);
          }
        }
      } catch {}
    };

    checkPendingFeedback();
    const interval = setInterval(checkPendingFeedback, 6000);
    return () => clearInterval(interval);
  }, [deliveryUser]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f4fb] text-[#171222] font-sans antialiased">
      {currentPage !== 'login' && (
        <Header
          currentUser={deliveryUser}
          onOpenCommandCenter={() => setIsCommandCenterOpen(true)}
          onOpenDemoBooking={() => handleOpenDemoBooking()}
          onOpenFeedback={() => { setFeedbackOrder(null); setIsFeedbackModalOpen(true); }}
          onNavigate={handleNavigate}
          onOpenAuth={() => { handleNavigate('login'); window.history.pushState({}, '', '/login'); }}
          onLogout={handleDeliveryLogout}
        />
      )}

      <main className="flex-1">
        {currentPage === 'login' ? (
          <LoginPage onNavigate={handleNavigate} onSuccess={handleDeliveryLogin} />
        ) : currentPage === 'profile' ? (
          <ProfilePage onNavigate={handleNavigate} currentUser={deliveryUser} onUpdateUser={setDeliveryUser} />
        ) : currentPage === 'orders' ? (
          <ProfilePage onNavigate={handleNavigate} currentUser={deliveryUser} onUpdateUser={setDeliveryUser} initialTab="orders" />
        ) : currentPage === 'platform' ? (
          <PlatformPage onOpenCommandCenter={() => setIsCommandCenterOpen(true)} onOpenDemoBooking={() => handleOpenDemoBooking()} />
        ) : currentPage === 'command-center' ? (
          <CommandCenterPage onNavigate={handleNavigate} onOpenCommandCenter={() => setIsCommandCenterOpen(true)} onOpenDemoBooking={() => handleOpenDemoBooking()} />
        ) : currentPage === 'gcs' ? (
          <GcsPage onNavigate={handleNavigate} onOpenCommandCenter={() => setIsCommandCenterOpen(true)} onOpenDemoBooking={() => handleOpenDemoBooking()} />
        ) : currentPage === 'downloads' ? (
          <DownloadsPage onNavigate={handleNavigate} onOpenCommandCenter={() => setIsCommandCenterOpen(true)} onOpenDemoBooking={() => handleOpenDemoBooking()} />
        ) : currentPage === 'versions' ? (
          <VersionsPage onNavigate={handleNavigate} onOpenDemoBooking={() => handleOpenDemoBooking()} />
        ) : currentPage === 'order' ? (
          <PlaceOrderPage onNavigate={handleNavigate} currentUser={deliveryUser} onOpenAuth={() => { handleNavigate('login'); window.history.pushState({}, '', '/login'); }} />
        ) : currentPage === 'track' ? (
          <TrackOrderPage onNavigate={handleNavigate} onOpenFeedback={(order) => { setFeedbackOrder(order); setIsFeedbackModalOpen(true); }} />
        ) : currentPage === 'dispatch' ? (
          <DispatchPage onNavigate={handleNavigate} currentUser={deliveryUser} />
        ) : currentPage === 'support' ? (
          <SupportPage onNavigate={handleNavigate} currentUser={deliveryUser} />
        ) : currentPage === 'docs' ? (
          <DocsPage onNavigate={handleNavigate} onOpenCommandCenter={() => setIsCommandCenterOpen(true)} onOpenDemoBooking={() => handleOpenDemoBooking()} />
        ) : currentPage === 'company' ? (
          <CompanyPage onNavigate={handleNavigate} onOpenCommandCenter={() => setIsCommandCenterOpen(true)} onOpenDemoBooking={() => handleOpenDemoBooking()} />
        ) : currentPage === 'feedback' ? (
          <FeedbackPage onNavigate={handleNavigate} currentUser={deliveryUser} />
        ) : currentPage === 'legal' ? (
          <LegalPage onNavigate={handleNavigate} section={window.location.hash.replace('#', '') || undefined} />
        ) : (
          <>
            <Hero onOpenCommandCenter={() => setIsCommandCenterOpen(true)} onOpenDemoBooking={() => handleOpenDemoBooking()} onNavigate={handleNavigate} />
          </>
        )}
      </main>

      {currentPage !== 'login' && (
        <Footer onNavigate={handleNavigate} onOpenFeedback={() => { setFeedbackOrder(null); setIsFeedbackModalOpen(true); }} />
      )}

      <CommandCenterModal isOpen={isCommandCenterOpen} onClose={() => setIsCommandCenterOpen(false)} currentUser={currentUser} onLoginSuccess={handleLoginSuccess} onLogout={handleLogout} />
      <DemoBookingModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} preselectedDrone={selectedDroneForDemo} />
      <FeedbackModal 
        isOpen={isFeedbackModalOpen} 
        onClose={() => { setIsFeedbackModalOpen(false); setFeedbackOrder(null); }} 
        currentUser={deliveryUser}
        prefilledOrder={feedbackOrder}
        onNavigate={handleNavigate}
      />
      <Chatbot onNavigate={handleNavigate} />
    </div>
  );
};

export default App;
