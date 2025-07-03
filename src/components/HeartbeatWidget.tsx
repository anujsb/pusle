import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, Settings, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';

interface HeartbeatSettings {
  color: string;
  intensity: number;
  pattern: 'gentle' | 'steady' | 'sync';
  soundEnabled: boolean;
}

const defaultSettings: HeartbeatSettings = {
    color: '#ff6b9d',
    intensity: 70,
    pattern: 'gentle',
    soundEnabled: false
};

const colorPresets = [
  '#ff6b9d', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
  '#fd79a8', '#00b894', '#0984e3', '#a29bfe', '#e17055'
];

const HeartbeatWidget: React.FC = () => {
  const [settings, setSettings] = useState<HeartbeatSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [pulseEffect, setPulseEffect] = useState(false);
  const pulseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Subscribe to the global channel for real-time sync
  useEffect(() => {
    const channel = supabase.channel('heartbeat-global');

    channel.on('broadcast', { event: 'update' }, (payload) => {
      if (payload.payload.settings) {
        setSettings(payload.payload.settings);
      }
      if (typeof payload.payload.pulseEffect === 'boolean') {
        setPulseEffect(payload.payload.pulseEffect);
        if (payload.payload.pulseEffect) {
          if ('vibrate' in navigator) {
            navigator.vibrate([50, 30, 50]);
          }
          setTimeout(() => setPulseEffect(false), 1000);
        }
      }
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Broadcast changes to the global channel
  const broadcastChange = (newSettings: HeartbeatSettings, pulse: boolean = false) => {
    supabase.channel('heartbeat-global').send({
      type: 'broadcast',
      event: 'update',
      payload: {
        settings: newSettings,
        pulseEffect: pulse
      }
    });
  };

  // Handle local changes and broadcast
  const updateSettings = (newSettings: Partial<HeartbeatSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    broadcastChange(updated);
  };

  const sendPulse = useCallback(() => {
    setPulseEffect(true);
    broadcastChange(settings, true);
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
    }
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => setPulseEffect(false), 1000);
  }, [settings]);

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

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background ambient glow */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at center, ${settings.color}40 0%, transparent 70%)`
        }}
      />
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
      </div>
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