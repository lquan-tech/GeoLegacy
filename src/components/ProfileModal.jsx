import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarClock,
  Chrome,
  ExternalLink,
  Facebook,
  Globe2,
  Link2,
  Link2Off,
  Loader2,
  Mail,
  MessageCircle,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getLinkedIdentities,
  linkAccountProvider,
  unlinkAccountIdentity,
  updateUserProfile,
} from "../services/auth";
import { useChronoStore } from "../store/useStore";

const emptyForm = {
  display_name: "",
  avatar_url: "",
  bio: "",
  home_region: "",
  website_url: "",
};

const securityProviders = [
  {
    id: "google",
    label: "Google",
    Icon: Chrome,
    enabled: import.meta.env.VITE_ENABLE_GOOGLE_LINK === "true",
    accentClass: "border-teal-200 bg-teal-50 text-teal-700",
  },
  {
    id: "facebook",
    label: "Facebook",
    Icon: Facebook,
    enabled: import.meta.env.VITE_ENABLE_FACEBOOK_LINK === "true",
    accentClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    id: "discord",
    label: "Discord",
    Icon: MessageCircle,
    enabled: import.meta.env.VITE_ENABLE_DISCORD_LINK === "true",
    accentClass: "border-violet-200 bg-violet-50 text-violet-700",
  },
];

function getDisplayName(profile) {
  return profile?.display_name || profile?.username || "Community Explorer";
}

function getInitials(name = "Explorer") {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value) {
  if (!value) {
    return "New account";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ProfileModal() {
  const isOpen = useChronoStore((state) => state.isProfileModalOpen);
  const authUser = useChronoStore((state) => state.authUser);
  const authSession = useChronoStore((state) => state.authSession);
  const closeProfileModal = useChronoStore((state) => state.closeProfileModal);
  const updateAuthProfile = useChronoStore((state) => state.updateAuthProfile);
  const showToast = useChronoStore((state) => state.showToast);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingIdentities, setIsLoadingIdentities] = useState(false);
  const [identityAction, setIdentityAction] = useState("");
  const [linkedIdentities, setLinkedIdentities] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [identityError, setIdentityError] = useState("");
  const [isAvatarBroken, setIsAvatarBroken] = useState(false);

  const displayName = getDisplayName(authUser);
  const provider = authUser?.provider || authSession?.user?.app_metadata?.provider || "email";
  const createdAt = authUser?.created_at || authUser?.auth_created_at || authSession?.user?.created_at;
  const canPersist = Boolean(authUser && !authUser.sync_error);

  const stats = useMemo(
    () => [
      { label: "Role", value: authUser?.role || "user" },
      { label: "Provider", value: provider },
      { label: "Joined", value: formatDate(createdAt) },
    ],
    [authUser?.role, createdAt, provider],
  );

  useEffect(() => {
    if (!isOpen || !authUser) {
      return;
    }

    setForm({
      display_name: getDisplayName(authUser),
      avatar_url: authUser.avatar_url || "",
      bio: authUser.bio || "",
      home_region: authUser.home_region || "",
      website_url: authUser.website_url || "",
    });
    setErrorMessage("");
    setIdentityError("");
    setIsAvatarBroken(false);
  }, [authUser, isOpen]);

  useEffect(() => {
    if (!isOpen || !authUser) {
      return;
    }

    let isMounted = true;

    const loadIdentities = async () => {
      try {
        setIsLoadingIdentities(true);
        setIdentityError("");
        const identities = await getLinkedIdentities();

        if (isMounted) {
          setLinkedIdentities(identities);
        }
      } catch (error) {
        if (isMounted) {
          setIdentityError(error.message || "Could not load connected accounts.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingIdentities(false);
        }
      }
    };

    void loadIdentities();

    return () => {
      isMounted = false;
    };
  }, [authUser, isOpen]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    if (field === "avatar_url") {
      setIsAvatarBroken(false);
    }
    setErrorMessage("");
  };

  const handleClose = () => {
    if (!isSaving) {
      closeProfileModal();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!authUser) {
      return;
    }

    if (!form.display_name.trim()) {
      setErrorMessage("Display name is required.");
      return;
    }

    if (!canPersist) {
      setErrorMessage("Run supabase/schema.sql first, then refresh and save again.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      const updatedProfile = await updateUserProfile(authUser.id, form);

      updateAuthProfile(updatedProfile);
      showToast({
        title: "Profile updated",
        description: "Your community profile is synced.",
        variant: "success",
      });
      closeProfileModal();
    } catch (error) {
      setErrorMessage(error.message || "Could not update your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const findIdentity = (providerId) =>
    linkedIdentities.find((identity) => identity.provider === providerId);

  const handleLinkProvider = async (providerId) => {
    try {
      setIdentityAction(providerId);
      setIdentityError("");
      await linkAccountProvider(providerId);
    } catch (error) {
      setIdentityError(error.message || `Could not link ${providerId}.`);
      setIdentityAction("");
    }
  };

  const handleUnlinkProvider = async (identity) => {
    try {
      setIdentityAction(identity.provider);
      setIdentityError("");
      await unlinkAccountIdentity(identity);
      const identities = await getLinkedIdentities();
      setLinkedIdentities(identities);
      showToast({
        title: "Account unlinked",
        description: `${identity.provider} is no longer attached.`,
      });
    } catch (error) {
      setIdentityError(error.message || `Could not unlink ${identity.provider}.`);
    } finally {
      setIdentityAction("");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && authUser && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 px-3 py-5 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.form
            onSubmit={handleSubmit}
            initial={{ y: 26, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 18, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 230, damping: 24 }}
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 text-slate-950 shadow-panel backdrop-blur-xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                  <ShieldCheck size={13} />
                  Profile Center
                </div>
                <h2 className="text-2xl font-black uppercase tracking-wide">Community Identity</h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white/70 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close profile modal"
              >
                <X size={17} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
                <section className="rounded-xl border border-slate-200 bg-white/70 p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border border-teal-200 bg-teal-50 text-3xl font-black text-teal-800 shadow-[0_0_26px_rgba(13,148,136,0.16)]">
                      {form.avatar_url && !isAvatarBroken ? (
                        <img
                          src={form.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.removeAttribute("src");
                            setIsAvatarBroken(true);
                          }}
                        />
                      ) : (
                        getInitials(form.display_name || displayName) || <UserRound size={36} />
                      )}
                    </div>
                    <h3 className="mt-4 max-w-full truncate text-xl font-black text-slate-950">
                      {form.display_name || displayName}
                    </h3>
                    <p className="mt-1 max-w-full truncate text-sm text-slate-400">
                      @{authUser.username}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-2">
                    {stats.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2"
                      >
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          {item.label}
                        </span>
                        <span className="max-w-36 truncate text-sm font-semibold capitalize text-slate-900">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <ShieldCheck size={16} className="text-teal-600" />
                        Security Links
                      </div>
                      {isLoadingIdentities && (
                        <Loader2 size={15} className="animate-spin text-teal-600" />
                      )}
                    </div>
                    <div className="space-y-2">
                      {securityProviders.map((provider) => {
                        const identity = findIdentity(provider.id);
                        const isConnected = Boolean(identity);
                        const isBusy = identityAction === provider.id;
                        const Icon = provider.Icon;

                        return (
                          <div
                            key={provider.id}
                            className={`rounded-lg border px-3 py-2 ${provider.accentClass}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <Icon size={16} className="shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900">{provider.label}</p>
                                  <p className="truncate text-xs text-slate-400">
                                    {isConnected
                                      ? identity.email || identity.identity_data?.email || "Connected"
                                      : provider.enabled
                                        ? "Ready to link"
                                        : "Provider not configured"}
                                  </p>
                                </div>
                              </div>
                              {isConnected ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnlinkProvider(identity)}
                                  disabled={isBusy || linkedIdentities.length <= 1}
                                  title={
                                    linkedIdentities.length <= 1
                                      ? "Keep at least one login identity attached."
                                      : `Unlink ${provider.label}`
                                  }
                                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white/80 px-2 text-xs font-bold text-slate-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  {isBusy ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <Link2Off size={13} />
                                  )}
                                  Unlink
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleLinkProvider(provider.id)}
                                  disabled={!provider.enabled || isBusy}
                                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-teal-500 bg-teal-600 px-2 text-xs font-black text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  {isBusy ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <Link2 size={13} />
                                  )}
                                  Link
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {identityError && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                        {identityError}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail size={15} className="text-teal-600" />
                      <span className="min-w-0 truncate">{authUser.email || "No email"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CalendarClock size={15} className="text-amber-600" />
                      <span>{formatDate(createdAt)}</span>
                    </div>
                    {form.website_url && (
                      <a
                        href={/^https?:\/\//i.test(form.website_url) ? form.website_url : `https://${form.website_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm text-teal-700 transition hover:text-teal-900"
                      >
                        <ExternalLink size={15} />
                        <span className="min-w-0 truncate">{form.website_url}</span>
                      </a>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  {!canPersist && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={19} className="mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-950">Database setup needed</p>
                          <p className="mt-1 text-sm leading-5 text-amber-800">
                            Google login works, but Supabase has not created public.profiles yet.
                            Run supabase/schema.sql once in SQL Editor, then refresh.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Display Name
                      </span>
                      <input
                        required
                        value={form.display_name}
                        onChange={(event) => updateField("display_name", event.target.value)}
                        placeholder="Community Explorer"
                        className="h-11 w-full rounded-lg border border-slate-200 bg-white/80 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Home Region
                      </span>
                      <div className="relative">
                        <Globe2
                          size={16}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                        />
                        <input
                          value={form.home_region}
                          onChange={(event) => updateField("home_region", event.target.value)}
                          placeholder="Da Nang, Vietnam"
                          className="h-11 w-full rounded-lg border border-slate-200 bg-white/80 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                        />
                      </div>
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Avatar URL
                    </span>
                    <input
                      value={form.avatar_url}
                      onChange={(event) => updateField("avatar_url", event.target.value)}
                      placeholder="https://..."
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white/80 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Website
                    </span>
                    <input
                      value={form.website_url}
                      onChange={(event) => updateField("website_url", event.target.value)}
                      placeholder="geolegacy.dev"
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white/80 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Bio
                    </span>
                    <textarea
                      rows={5}
                      value={form.bio}
                      onChange={(event) => updateField("bio", event.target.value)}
                      maxLength={280}
                      placeholder="Tell other explorers what eras, places, or sources you care about."
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white/80 px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                    />
                    <span className="mt-1 block text-right text-xs text-slate-500">
                      {form.bio.length}/280
                    </span>
                  </label>

                  {errorMessage && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
                      {errorMessage}
                    </div>
                  )}
                </section>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !canPersist}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-teal-500 bg-teal-600 px-4 text-sm font-black text-white shadow-[0_0_18px_rgba(13,148,136,0.22)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                Save Profile
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
