import {
  ChevronDown,
  ClipboardCheck,
  Loader2,
  LogIn,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOutCurrentUser } from "../services/auth";
import { useChronoStore } from "../store/useStore";

function getInitials(name = "Explorer") {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getDisplayName(profile) {
  return profile?.display_name || profile?.username || "Community Explorer";
}

export default function UserMenu() {
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const authUser = useChronoStore((state) => state.authUser);
  const authStatus = useChronoStore((state) => state.authStatus);
  const openAuthModal = useChronoStore((state) => state.openAuthModal);
  const openProfileModal = useChronoStore((state) => state.openProfileModal);
  const openAdminReview = useChronoStore((state) => state.openAdminReview);
  const showToast = useChronoStore((state) => state.showToast);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOutCurrentUser();
      setIsOpen(false);
    } catch (error) {
      showToast({
        title: "Could not sign out",
        description: error.message,
        variant: "error",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  if (authStatus === "loading") {
    return (
      <div className="hidden h-10 w-[118px] animate-pulse rounded-lg border border-slate-200 bg-slate-100 sm:block" />
    );
  }

  if (!authUser) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal("Sign in to unlock submissions, comments, and bookmarks.")}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 text-sm font-bold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-200"
      >
        <LogIn size={17} />
        <span className="hidden sm:inline">Sign In</span>
      </button>
    );
  }

  const displayName = getDisplayName(authUser);
  const initials = getInitials(displayName);
  const needsBackendSetup = Boolean(authUser.sync_error);
  const isAdmin = authUser.role === "admin";

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`inline-flex h-10 items-center gap-2 rounded-lg border bg-white/70 px-2 text-sm font-bold text-slate-800 transition hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-200 sm:px-3 ${
          needsBackendSetup
            ? "border-amber-300 hover:border-amber-400"
            : "border-slate-200 hover:border-teal-300"
        }`}
        aria-expanded={isOpen}
        aria-label="Open user menu"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg border border-teal-200 bg-teal-50 text-xs text-teal-800">
          {authUser.avatar_url ? (
            <img src={authUser.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials || <UserRound size={15} />
          )}
        </span>
        <span className="hidden max-w-28 truncate sm:inline">{displayName}</span>
        <ChevronDown size={15} className={`transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-panel backdrop-blur-xl">
          <div className="border-b border-slate-200 px-3 py-3">
            <p className="truncate text-sm font-bold text-slate-950">{displayName}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {authUser.email || `@${authUser.username}`}
            </p>
            {needsBackendSetup && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs leading-5 text-amber-800">
                Signed in locally. Run supabase/schema.sql to create the community
                profile tables.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              openProfileModal();
            }}
            className="flex w-full items-center gap-2 border-b border-slate-200 px-3 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-teal-50 hover:text-teal-800"
          >
            <Settings size={16} />
            View Profile
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openAdminReview();
              }}
              className="flex w-full items-center gap-2 border-b border-slate-200 px-3 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-amber-50 hover:text-amber-700"
            >
              <ClipboardCheck size={16} />
              Review Submissions
            </button>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
