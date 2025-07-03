// src/lib/database.types.ts
export interface Database {
  public: {
    Tables: {
      heartbeat_connections: {
        Row: {
          id: string
          user_id: string
          partner_id: string | null
          connection_code: string
          is_active: boolean
          last_seen: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          partner_id?: string | null
          connection_code: string
          is_active?: boolean
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          partner_id?: string | null
          connection_code?: string
          is_active?: boolean
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
      }
      heartbeat_pulses: {
        Row: {
          id: string
          from_user_id: string
          to_user_id: string
          pulse_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          from_user_id: string
          to_user_id: string
          pulse_data: Json
          created_at?: string
        }
        Update: {
          id?: string
          from_user_id?: string
          to_user_id?: string
          pulse_data?: Json
          created_at?: string
        }
      }
      heartbeat_settings: {
        Row: {
          id: string
          user_id: string
          color: string
          intensity: number
          pattern: string
          sound_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          color?: string
          intensity?: number
          pattern?: string
          sound_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          color?: string
          intensity?: number
          pattern?: string
          sound_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// SQL Schema to create in Supabase Dashboard
/*
-- Create tables
CREATE TABLE heartbeat_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    partner_id UUID,
    connection_code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE heartbeat_pulses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_user_id UUID NOT NULL,
    to_user_id UUID NOT NULL,
    pulse_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE heartbeat_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    color TEXT DEFAULT '#ff6b9d',
    intensity INTEGER DEFAULT 70,
    pattern TEXT DEFAULT 'gentle',
    sound_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE heartbeat_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE heartbeat_pulses ENABLE ROW LEVEL SECURITY;
ALTER TABLE heartbeat_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own connections" ON heartbeat_connections
    FOR SELECT USING (user_id = auth.uid() OR partner_id = auth.uid());

CREATE POLICY "Users can insert own connections" ON heartbeat_connections
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own connections" ON heartbeat_connections
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view own pulses" ON heartbeat_pulses
    FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Users can insert own pulses" ON heartbeat_pulses
    FOR INSERT WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Users can view own settings" ON heartbeat_settings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own settings" ON heartbeat_settings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own settings" ON heartbeat_settings
    FOR UPDATE USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_heartbeat_connections_user_id ON heartbeat_connections(user_id);
CREATE INDEX idx_heartbeat_connections_partner_id ON heartbeat_connections(partner_id);
CREATE INDEX idx_heartbeat_connections_code ON heartbeat_connections(connection_code);
CREATE INDEX idx_heartbeat_pulses_to_user ON heartbeat_pulses(to_user_id);
CREATE INDEX idx_heartbeat_pulses_created_at ON heartbeat_pulses(created_at);

-- Create function to generate connection codes
CREATE OR REPLACE FUNCTION generate_connection_code()
RETURNS TEXT AS $$
BEGIN
    RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_heartbeat_connections_updated_at
    BEFORE UPDATE ON heartbeat_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_heartbeat_settings_updated_at
    BEFORE UPDATE ON heartbeat_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
*/