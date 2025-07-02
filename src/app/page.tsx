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

// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'heartbeat': 'heartbeat 2s ease-in-out infinite',
        'heartbeat-gentle': 'heartbeat-gentle 3s ease-in-out infinite',
        'heartbeat-sync': 'heartbeat-sync 4s ease-in-out infinite',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { 
            transform: 'scale(1)',
            opacity: '0.7'
          },
          '50%': { 
            transform: 'scale(1.05)',
            opacity: '1'
          }
        },
        'heartbeat-gentle': {
          '0%, 100%': { 
            transform: 'scale(1)',
            opacity: '0.6',
            filter: 'blur(0px)'
          },
          '50%': { 
            transform: 'scale(1.02)',
            opacity: '0.9',
            filter: 'blur(1px)'
          }
        },
        'heartbeat-sync': {
          '0%, 100%': { 
            transform: 'scale(1)',
            opacity: '0.5'
          },
          '25%': { 
            transform: 'scale(1.03)',
            opacity: '0.8'
          },
          '75%': { 
            transform: 'scale(1.01)',
            opacity: '0.6'
          }
        }
      }
    },
  },
  plugins: [],
}

// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/sw.js',
        destination: '/api/sw',
      },
    ];
  },
};

module.exports = nextConfig;