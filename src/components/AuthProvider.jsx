import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  cleanAuthCallbackUrl,
  completeOAuthCallback,
  ensureUserProfile,
  getOAuthCallbackError,
} from "../services/auth";
import { useChronoStore } from "../store/useStore";

export default function AuthProvider({ children }) {
  const setAuthState = useChronoStore((state) => state.setAuthState);
  const closeAuthModal = useChronoStore((state) => state.closeAuthModal);
  const showToast = useChronoStore((state) => state.showToast);

  useEffect(() => {
    let isMounted = true;

    const applySession = async (session, eventName = "INITIAL_SESSION") => {
      const profile = session?.user ? await ensureUserProfile(session.user) : null;

      if (!isMounted) {
        return;
      }

      setAuthState({
        session,
        profile,
        status: "ready",
      });

      if (session?.user && eventName === "SIGNED_IN") {
        closeAuthModal();
        showToast({
          title: "Signed in",
          description: `Welcome back, ${profile?.username ?? "Explorer"}.`,
          variant: "success",
        });
      }

      if (session?.user && profile?.sync_error) {
        showToast({
          title: "Signed in, setup needed",
          description:
            "Auth works, but public.profiles is missing. Run supabase/schema.sql.",
          variant: "error",
        });
      }

      if (!session && eventName === "SIGNED_OUT") {
        showToast({
          title: "Signed out",
          description: "Community actions are locked until you sign back in.",
        });
      }
    };

    const initializeAuth = async () => {
      setAuthState({ session: null, profile: null, status: "loading" });

      const callbackError = getOAuthCallbackError();

      if (callbackError) {
        cleanAuthCallbackUrl();
        throw new Error(callbackError);
      }

      const callbackSession = await completeOAuthCallback();

      if (callbackSession) {
        await applySession(callbackSession, "SIGNED_IN");
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      await applySession(data.session);
    };

    initializeAuth().catch(async (error) => {
      if (!isMounted) {
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (data?.session) {
        await applySession(data.session, "SIGNED_IN");
        return;
      }

      setAuthState({ session: null, profile: null, status: "ready" });
      showToast({
        title: "Auth callback failed",
        description: error.message,
        variant: "error",
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((eventName, session) => {
      window.setTimeout(() => {
        void applySession(session, eventName);
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [closeAuthModal, setAuthState, showToast]);

  return children;
}
