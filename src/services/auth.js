import { supabase } from "../lib/supabaseClient";

const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

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
  if (typeof window === "undefined") {
    return import.meta.env.VITE_AUTH_REDIRECT_URL;
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
  const errorCode =
    url.searchParams.get("error_code") || hashParams.get("error_code");
  const errorDescription =
    url.searchParams.get("error_description") || hashParams.get("error_description");
  const error = url.searchParams.get("error") || hashParams.get("error");

  if (!error && !errorDescription) {
    return null;
  }

  const message = errorDescription || error;
  return errorCode ? `${message} (${errorCode})` : message;
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

  // 1. Try to read the existing profile first — preserves any saved changes
  const { data: existingData, error: fetchError } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,bio,home_region,website_url,role,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  // If profile already exists in DB, return it as-is (don't overwrite saved fields)
  if (!fetchError && existingData) {
    return {
      ...profile,
      ...existingData,
      email: user.email ?? "",
      provider: user.app_metadata?.provider ?? "email",
      auth_created_at: user.created_at,
    };
  }

  // 2. Profile doesn't exist yet — create it for the first time
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

function loadGoogleIdentityScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google linking only works in the browser."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      `script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Could not load Google Identity Services.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("Could not load Google Identity Services."));
    document.head.appendChild(script);
  });
}

async function getGoogleOAuthClientId() {
  if (import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID;
  }

  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: {
      redirectTo: getAuthRedirectUrl(),
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  const providerUrl = data?.url;

  if (!providerUrl) {
    throw new Error("Supabase did not return a Google provider URL.");
  }

  const clientId = new URL(providerUrl).searchParams.get("client_id");

  if (!clientId) {
    throw new Error("Could not read the Google Client ID from Supabase.");
  }

  return clientId;
}

function getGoogleIdentityCredential(clientId) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Google linking timed out. Try again."));
      }
    }, 60000);

    const finish = (callback) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      callback();
    };

    window.google.accounts.id.cancel();
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        finish(() => {
          if (response?.credential) {
            resolve(response.credential);
          } else {
            reject(new Error("Google did not return an identity token."));
          }
        });
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      context: "use",
      ux_mode: "popup",
      use_fedcm_for_prompt: true,
    });

    window.google.accounts.id.prompt((notification) => {
      if (settled) {
        return;
      }

      if (notification.isNotDisplayed?.()) {
        const reason = notification.getNotDisplayedReason?.() || "unknown";
        finish(() =>
          reject(new Error(`Google prompt could not open: ${reason}.`)),
        );
        return;
      }

      if (notification.isSkippedMoment?.()) {
        const reason = notification.getSkippedReason?.() || "unknown";
        finish(() =>
          reject(new Error(`Google prompt was skipped: ${reason}.`)),
        );
        return;
      }

      if (notification.isDismissedMoment?.()) {
        const reason = notification.getDismissedReason?.() || "closed";
        finish(() =>
          reject(new Error(`Google prompt was dismissed: ${reason}.`)),
        );
      }
    });
  });
}

export async function linkGoogleAccountWithIdToken() {
  const clientId = await getGoogleOAuthClientId();
  await loadGoogleIdentityScript();
  const credential = await getGoogleIdentityCredential(clientId);
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    token: credential,
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
