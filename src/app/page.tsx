// src/app/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import the HeartbeatWidget to avoid SSR issues
const HeartbeatWidget = dynamic(() => import('../components/HeartbeatWidget'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-pulse">
        <div className="w-48 h-48 rounded-full bg-pink-500/20 flex items-center justify-center">
          <div className="w-16 h-16 bg-pink-500/40 rounded-full animate-ping" />
        </div>
      </div>
    </div>
  )
});

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Handle PWA installation
    let deferredPrompt: any;
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show custom install button or prompt
      setTimeout(() => {
        if (confirm('Install Heartbeat Widget for the best experience?')) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('User accepted the install prompt');
            }
            deferredPrompt = null;
          });
        }
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-48 h-48 rounded-full bg-pink-500/20 flex items-center justify-center">
            <div className="w-16 h-16 bg-pink-500/40 rounded-full animate-ping" />
          </div>
        </div>
      </div>
    );
  }

  return <HeartbeatWidget />;
}

// src/components/HeartbeatWidget.tsx
// (The component code we created earlier goes here - I'll create this as a separate file)
