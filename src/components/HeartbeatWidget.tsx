import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, Settings, Palette, Volume2, VolumeX, Users, Copy, Check, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';

interface HeartbeatSettings {
  color: string;
  intensity: number;
  pattern: 'gentle' | 'steady' | 'sync';
  soundEnabled: boolean;
}

interface Connection {
  id: string;
  user_id: string;
  partner_id: string | null;
  connection_code: string;
  is_active: boolean;
  last_seen: string;
}

interface Pulse {
  id: string;
  from_user_id: string;
  to_user_id: string;
  pulse_data: {
    color: string;
    intensity: number;
    pattern: string;
    timestamp: number;
  };
  created_at: string;
}

const HeartbeatWidget: React.FC = () => {
  const [settings, setSettings] = useState<HeartbeatSettings>({
    color: '#ff6b9d',
    intensity: 70,
    pattern: 'gentle',
    soundEnabled: false
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showConnection, setShowConnection] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [lastPulse, setLastPulse] = useState(Date.now());
  
  // Connection state
  const [userId, setUserId] = useState<string>('');
  const [connection, setConnection] = useState<Connection | null>(null);
  const [connectionCode, setConnectionCode] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Real-time pulse effects
  const [receivedPulse, setReceivedPulse] = useState<Pulse | null>(null);
  const [pulseEffect, setPulseEffect] = useState(false);
  
  const pulseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize user and load data
  useEffect(() => {
    initializeUser();
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!userId) return;

    const pulsesSubscription = supabase
      .channel('heartbeat-pulses')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'heartbeat_pulses',
          filter: `to_user_id=eq.${userId}`
        },
        handleIncomingPulse
      )
      .subscribe();

    const connectionsSubscription = supabase
      .channel('heartbeat-connections')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'heartbeat_connections',
          filter: `user_id=eq.${userId}`
        },
        handleConnectionUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pulsesSubscription);
      supabase.removeChannel(connectionsSubscription);
    };
  }, [userId]);

  // Partner presence monitoring
  useEffect(() => {
    if (!connection?.partner_id) return;

    const checkPartnerPresence = async () => {
      const { data } = await supabase
        .from('heartbeat_connections')
        .select('last_seen')
        .eq('user_id', connection.partner_id)
        .single();

      if (data) {
        const lastSeen = new Date(data.last_seen);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
        setPartnerOnline(diffMinutes < 2); // Consider online if seen within 2 minutes
      }
    };

    checkPartnerPresence();
    const interval = setInterval(checkPartnerPresence, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [connection?.partner_id]);

  // Update user presence
  useEffect(() => {
    if (!userId) return;

    const updatePresence = async () => {
      await supabase
        .from('heartbeat_connections')
        .update({ last_seen: new Date().toISOString() })
        .eq('user_id', userId);
    };

    updatePresence();
    heartbeatIntervalRef.current = setInterval(updatePresence, 60000); // Update every minute

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [userId]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Register service worker for PWA and push support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const initializeUser = async () => {
    // Create anonymous user session
    const { data: { user } } = await supabase.auth.signInAnonymously();
    
    if (user) {
      setUserId(user.id);
      await loadUserData(user.id);
      await createOrUpdateConnection(user.id);
    }
  };

  const loadUserData = async (uid: string) => {
    // Load settings
    const { data: settingsData } = await supabase
      .from('heartbeat_settings')
      .select('*')
      .eq('user_id', uid)
      .single();

    if (settingsData) {
      setSettings({
        color: settingsData.color,
        intensity: settingsData.intensity,
        pattern: settingsData.pattern as any,
        soundEnabled: settingsData.sound_enabled
      });
    } else {
      // Create default settings
      await supabase
        .from('heartbeat_settings')
        .insert({
          user_id: uid,
          ...settings
        });
    }

    // Load connection
    const { data: connectionData } = await supabase
      .from('heartbeat_connections')
      .select('*')
      .eq('user_id', uid)
      .single();

    if (connectionData) {
      setConnection(connectionData);
      setConnectionCode(connectionData.connection_code);
      setIsConnected(!!connectionData.partner_id);
    }
  };

  const createOrUpdateConnection = async (uid: string) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from('heartbeat_connections')
      .upsert({
        user_id: uid,
        connection_code: code,
        is_active: true,
        last_seen: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (data && !error) {
      setConnection(data);
      setConnectionCode(data.connection_code);
    }
  };

  const connectToPartner = async () => {
    if (!partnerCode.trim() || !userId) return;

    // Find partner by connection code
    const { data: partnerConnection } = await supabase
      .from('heartbeat_connections')
      .select('*')
      .eq('connection_code', partnerCode.trim().toUpperCase())
      .single();

    if (!partnerConnection) {
      alert('Connection code not found!');
      return;
    }

    if (partnerConnection.user_id === userId) {
      alert('Cannot connect to yourself!');
      return;
    }

    // Update both connections
    const updates = [
      supabase
        .from('heartbeat_connections')
        .update({ partner_id: partnerConnection.user_id })
        .eq('user_id', userId),
      supabase
        .from('heartbeat_connections')
        .update({ partner_id: userId })
        .eq('user_id', partnerConnection.user_id)
    ];

    const results = await Promise.all(updates);
    
    if (results.every((result: { error: any }) => !result.error)) {
      setIsConnected(true);
      setShowConnection(false);
      setPartnerCode('');
      // Refresh connection data
      await loadUserData(userId);
    } else {
      alert('Failed to connect. Please try again.');
    }
  };

  const disconnectPartner = async () => {
    if (!connection?.partner_id || !userId) return;

    const updates = [
      supabase
        .from('heartbeat_connections')
        .update({ partner_id: null })
        .eq('user_id', userId),
      supabase
        .from('heartbeat_connections')
        .update({ partner_id: null })
        .eq('user_id', connection.partner_id)
    ];

    await Promise.all(updates);
    setIsConnected(false);
    setConnection(prev => prev ? { ...prev, partner_id: null } : null);
  };

  const handleIncomingPulse = (payload: any) => {
    const pulse = payload.new as Pulse;
    setReceivedPulse(pulse);
    // Apply partner's settings temporarily
    const partnerSettings = pulse.pulse_data;
    setSettings(prev => ({
      ...prev,
      color: partnerSettings.color,
      intensity: partnerSettings.intensity,
      pattern: partnerSettings.pattern as any
    }));
    // Trigger pulse effect
    setPulseEffect(true);
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    // Show notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Heartbeat received', {
        body: 'Your partner sent a heartbeat 💓',
        icon: '/icon-192x192.png',
      });
    }
    // Reset effect after animation
    if (pulseTimeoutRef.current) {
      clearTimeout(pulseTimeoutRef.current);
    }
    pulseTimeoutRef.current = setTimeout(() => {
      setPulseEffect(false);
      setReceivedPulse(null);
      // Settings will stay as partner's until user changes them
    }, 3000);
  };

  const handleConnectionUpdate = (payload: any) => {
    if (payload.eventType === 'UPDATE') {
      setConnection(payload.new);
      setIsConnected(!!payload.new.partner_id);
    }
  };

  const sendPulse = useCallback(async () => {
    if (!isConnected || !connection?.partner_id || !userId) {
      // Local pulse only
      setLastPulse(Date.now());
      setPulseEffect(true);
      
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
      }
      
      setTimeout(() => setPulseEffect(false), 1000);
      return;
    }

    // Send pulse to partner
    const pulseData = {
      color: settings.color,
      intensity: settings.intensity,
      pattern: settings.pattern,
      timestamp: Date.now()
    };

    const { error } = await supabase
      .from('heartbeat_pulses')
      .insert({
        from_user_id: userId,
        to_user_id: connection.partner_id,
        pulse_data: pulseData
      });

    if (!error) {
      setLastPulse(Date.now());
      setPulseEffect(true);
      
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
      }
      
      setTimeout(() => setPulseEffect(false), 1000);
    }
  }, [isConnected, connection, userId, settings]);

  const updateSettings = async (newSettings: Partial<HeartbeatSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    if (userId) {
      await supabase
        .from('heartbeat_settings')
        .upsert({
          user_id: userId,
          color: updated.color,
          intensity: updated.intensity,
          pattern: updated.pattern,
          sound_enabled: updated.soundEnabled
        }, {
          onConflict: 'user_id'
        });
    }
  };

  const copyConnectionCode = () => {
    navigator.clipboard.writeText(connectionCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getAnimationClass = () => {
    const baseClass = pulseEffect ? 'animate-pulse' : '';
    switch (settings.pattern) {
      case 'gentle': return `${baseClass} heartbeat-gentle`;
      case 'steady': return `${baseClass} heartbeat`;
      case 'sync': return `${baseClass} heartbeat-sync`;
      default: return `${baseClass} heartbeat-gentle`;
    }
  };

  const getAnimationDuration = () => {
    switch (settings.pattern) {
      case 'gentle': return '3s';
      case 'steady': return '2s';
      case 'sync': return '4s';
      default: return '3s';
    }
  };

  const colorPresets = [
    '#ff6b9d', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
    '#fd79a8', '#00b894', '#0984e3', '#a29bfe', '#e17055'
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background ambient glow */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at center, ${settings.color}40 0%, transparent 70%)`
        }}
      />
      
      {/* Received pulse indicator */}
      {receivedPulse && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/80 text-sm animate-bounce">
          💕 Heartbeat received
        </div>
      )}
      
      {/* Main heartbeat circle */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
            isActive ? getAnimationClass() : ''
          } ${pulseEffect ? 'scale-110' : ''}`}
          style={{
            background: `radial-gradient(circle, ${settings.color}${Math.round(settings.intensity * 2.55).toString(16).padStart(2, '0')} 0%, ${settings.color}20 70%, transparent 100%)`,
            boxShadow: `0 0 ${settings.intensity}px ${settings.color}60, inset 0 0 ${settings.intensity/2}px ${settings.color}40`,
            animationDuration: getAnimationDuration(),
            transform: pulseEffect ? 'scale(1.1)' : 'scale(1)'
          }}
          onClick={sendPulse}
        >
          <Heart 
            size={64} 
            className="text-white/80 fill-current" 
          />
          
          {/* Pulse rings */}
          <div 
            className="absolute inset-0 rounded-full border-2 opacity-30 animate-ping"
            style={{ 
              borderColor: settings.color,
              animationDuration: getAnimationDuration()
            }}
          />
          <div 
            className="absolute inset-2 rounded-full border opacity-20 animate-ping"
            style={{ 
              borderColor: settings.color,
              animationDelay: '0.5s',
              animationDuration: getAnimationDuration()
            }}
          />
        </div>
        
        {/* Connection status */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {isConnected ? (
              <>
                <div className={`w-2 h-2 rounded-full ${partnerOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                <p className="text-white/80 text-sm">
                  {partnerOnline ? 'Partner Online ❤️' : 'Partner Offline 💔'}
                </p>
              </>
            ) : (
              <>
                <WifiOff size={16} className="text-white/60" />
                <p className="text-white/60 text-sm">Not Connected</p>
              </>
            )}
          </div>
          <p className="text-white/40 text-xs font-mono">
            Code: {connectionCode}
          </p>
        </div>
      </div>

      {/* Connection panel */}
      {showConnection && (
        <div className="absolute inset-0 bg-black/90 z-20 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white text-xl font-semibold">Connect</h2>
              <button
                onClick={() => setShowConnection(false)}
                className="text-white/60 hover:text-white"
              >
                ×
              </button>
            </div>
            
            {!isConnected ? (
              <>
                <div className="mb-6">
                  <label className="text-white/80 text-sm block mb-2">Your Connection Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={connectionCode}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono"
                    />
                    <button
                      onClick={copyConnectionCode}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                    >
                      {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="text-white/60 text-xs mt-1">Share this with your partner</p>
                </div>
                
                <div className="mb-6">
                  <label className="text-white/80 text-sm block mb-2">Partner's Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={partnerCode}
                      onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                      placeholder="Enter partner's code"
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-white/40"
                      maxLength={6}
                    />
                    <button
                      onClick={connectToPartner}
                      disabled={!partnerCode.trim()}
                      className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 mx-auto mb-3 bg-green-600/20 rounded-full flex items-center justify-center">
                    <Users className="text-green-400" size={32} />
                  </div>
                  <p className="text-white text-lg mb-2">Connected! 💕</p>
                  <p className="text-white/60 text-sm">You can now share heartbeats</p>
                </div>
                
                <button
                  onClick={disconnectPartner}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/90 z-20 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white text-xl font-semibold">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-white/60 hover:text-white"
              >
                ×
              </button>
            </div>
            
            {/* Color selection */}
            <div className="mb-6">
              <label className="text-white/80 text-sm block mb-3">Color</label>
              <div className="grid grid-cols-5 gap-2">
                {colorPresets.map(color => (
                  <button
                    key={color}
                    onClick={() => updateSettings({ color })}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      settings.color === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="mt-3">
                <input
                  type="color"
                  value={settings.color}
                  onChange={(e) => updateSettings({ color: e.target.value })}
                  className="w-full h-10 rounded-lg bg-transparent border border-gray-700"
                />
              </div>
            </div>
            
            {/* Intensity */}
            <div className="mb-6">
              <label className="text-white/80 text-sm block mb-2">
                Intensity ({settings.intensity}%)
              </label>
              <input
                type="range"
                min="20"
                max="100"
                value={settings.intensity}
                onChange={(e) => updateSettings({ intensity: parseInt(e.target.value) })}
                className="w-full accent-pink-500"
              />
            </div>
            
            {/* Pattern */}
            <div className="mb-6">
              <label className="text-white/80 text-sm block mb-2">Pattern</label>
              <div className="flex gap-2">
                {['gentle', 'steady', 'sync'].map(pattern => (
                  <button
                    key={pattern}
                    onClick={() => updateSettings({ pattern: pattern as any })}
                    className={`px-3 py-2 rounded-lg text-sm capitalize transition-all ${
                      settings.pattern === pattern 
                        ? 'bg-pink-600 text-white' 
                        : 'bg-gray-800 text-white/60 hover:bg-gray-700'
                    }`}
                  >
                    {pattern}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Sound toggle */}
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Sound</span>
              <button
                onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                className="text-white/60 hover:text-white"
              >
                {settings.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control buttons */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
        <button
          onClick={() => setIsActive(!isActive)}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
        >
          {isActive ? '⏸️' : '▶️'}
        </button>
        
        <Button
          onClick={() => setShowSettings(true)}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
        >
          <Settings size={20} />
        </Button>
        
        <button
          onClick={() => setShowConnection(true)}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
        >
          <Users size={20} />
        </button>
        
        <button
          onClick={sendPulse}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg hover:scale-105 transition-all"
        >
          💓
        </button>
      </div>
      
      {/* Installation prompt */}
      <div className="absolute top-4 right-4 text-white/40 text-xs">
        Tap + to install
      </div>
    </div>
  );
};

export default HeartbeatWidget;