import { supabase } from "../lib/supabaseClient";

function sanitizeUsername(value) {
  const normalized = (value || "explorer")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "explorer";
}

function normalizeWebsiteUrl(value) {
  const trimmed = (value || "").trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function getAuthRedirectUrl() {
  const configuredUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}${window.location.pathname}`;
}

export function cleanAuthCallbackUrl() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  const authParams = [
    "code",
    "error",
    "error_code",
    "error_description",
    "state",
    "provider",
  ];

  authParams.forEach((param) => url.searchParams.delete(param));
  const cleanUrl = `${url.pathname}${url.search}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

export function getOAuthCallbackError() {
  if (typeof window === "undefined") {
    return null;
  }

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const errorDescription =
    url.searchParams.get("error_description") || hashParams.get("error_description");
  const error = url.searchParams.get("error") || hashParams.get("error");

  if (!error && !errorDescription) {
    return null;
  }

  return errorDescription || error;
}

export async function completeOAuthCallback() {
  if (typeof window === "undefined") {
    return null;
  }

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = url.searchParams.get("code");

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    cleanAuthCallbackUrl();

    if (error) {
      throw error;
    }

    return data.session;
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    cleanAuthCallbackUrl();

    if (error) {
      throw error;
    }

    return data.session;
  }

  return null;
}

export function userToProfile(user) {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata ?? {};
  const displayName =
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    user.email?.split("@")[0] ||
    "Community Explorer";

  return {
    id: user.id,
    username: displayName,
    display_name: displayName,
    avatar_url: metadata.avatar_url || metadata.picture || "",
    bio: "",
    home_region: "",
    website_url: "",
    role: "user",
    email: user.email ?? "",
    provider: user.app_metadata?.provider ?? "email",
    created_at: user.created_at,
  };
}

export async function ensureUserProfile(user) {
  const profile = userToProfile(user);

  if (!profile) {
    return null;
  }

  const username = `${sanitizeUsername(profile.username).slice(0, 44)}-${user.id.slice(0, 8)}`;

  const upsertRecord = {
    id: user.id,
    username,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url || null,
  };

  let { data, error } = await supabase
    .from("profiles")
    .upsert(upsertRecord, { onConflict: "id" })
    .select(
      "id,username,display_name,avatar_url,bio,home_region,website_url,role,created_at,updated_at",
    )
    .single();

  if (error?.code === "PGRST204" || error?.message?.includes("display_name")) {
    const legacyResult = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          username,
          avatar_url: profile.avatar_url || null,
        },
        { onConflict: "id" },
      )
      .select("id,username,avatar_url,role,created_at")
      .single();

    data = legacyResult.data
      ? {
          ...legacyResult.data,
          display_name: profile.display_name,
          bio: "",
          home_region: "",
          website_url: "",
        }
      : null;
    error = legacyResult.error
      ? {
          ...legacyResult.error,
          message: `${legacyResult.error.message}. Update supabase/schema.sql for profile fields.`,
        }
      : {
          message: "Update supabase/schema.sql for profile fields.",
          code: "PROFILE_SCHEMA_OUTDATED",
        };
  }

  if (error) {
    return {
      ...profile,
      sync_error: error.message,
      sync_error_code: error.code,
    };
  }

  return {
    ...profile,
    ...data,
    display_name: data.display_name || profile.display_name,
    username: data.username || profile.username,
    email: user.email ?? "",
    provider: user.app_metadata?.provider ?? "email",
    auth_created_at: user.created_at,
  };
}

export async function updateUserProfile(userId, updates) {
  const record = {
    display_name: updates.display_name.trim(),
    bio: updates.bio.trim(),
    home_region: updates.home_region.trim(),
    website_url: normalizeWebsiteUrl(updates.website_url),
    avatar_url: updates.avatar_url.trim() || null,
  };

  if (!record.display_name) {
    throw new Error("Display name is required.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(record)
    .eq("id", userId)
    .select("id,username,display_name,avatar_url,bio,home_region,website_url,role,created_at,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function signInWithOAuthProvider(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function getLinkedIdentities() {
  const { data, error } = await supabase.auth.getUserIdentities();

  if (error) {
    throw error;
  }

  return data.identities ?? [];
}

export async function linkAccountProvider(provider) {
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: {
      redirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function unlinkAccountIdentity(identity) {
  const { error } = await supabase.auth.unlinkIdentity(identity);

  if (error) {
    throw error;
  }
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithEmail({ email, password, displayName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: displayName || email.split("@")[0],
      },
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOutCurrentUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
