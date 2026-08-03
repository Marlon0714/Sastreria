import type { Session } from "@supabase/supabase-js";

import type { Profile } from "../../features/auth/domain/profile";
import { getSupabaseClient } from "./client";

export interface AuthSession {
  userId: string;
  accessToken: string;
}

export interface SupabaseAuthRepositoryPort {
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
  hasValidSession(): Promise<boolean>;
  getProfile(userId: string): Promise<Profile | null>;
}

function toAuthSession(session: Session): AuthSession {
  return {
    userId: session.user.id,
    accessToken: session.access_token,
  };
}

export class SupabaseAuthRepository implements SupabaseAuthRepositoryPort {
  async signIn(email: string, password: string): Promise<AuthSession> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      // Sanitized error: do not expose email/password in message
      throw new Error("[auth] Sign in failed. Check credentials and try again.");
    }

    return toAuthSession(data.session);
  }

  async signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error("[auth] Sign out failed.");
    }
  }

  async getSession(): Promise<AuthSession | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      return null;
    }

    return toAuthSession(data.session);
  }

  async hasValidSession(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, is_shared_device")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      displayName: data.display_name,
      role: data.role,
      isSharedDevice: data.is_shared_device,
    };
  }
}
