"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, AuthError, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Profile } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createSupabaseBrowser());

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabaseRef.current
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return data;
  };

  useEffect(() => {
    let mounted = true;

    const getUser = async () => {
      try {
        const { data: { user } } = await supabaseRef.current.auth.getUser();
        if (!mounted) return;
        setUser(user);

        if (user) {
          const profileData = await fetchProfile(user.id);
          if (mounted) setProfile(profileData);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabaseRef.current.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        try {
          const currentUser = session?.user ?? null;
          if (!mounted) return;
          setUser(currentUser);

          if (currentUser) {
            const profileData = await fetchProfile(currentUser.id);
            if (mounted) setProfile(profileData);
          } else {
            setProfile(null);
          }
        } catch (err) {
          console.error("Auth state change error:", err);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseRef.current.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabaseRef.current.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    return { error };
  };

  const signOut = async () => {
    try {
      await supabaseRef.current.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    }
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}