import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { signInWithEmail, signUpWithEmail } from "../services/auth";
import { useChronoStore } from "../store/useStore";

const initialForm = {
  displayName: "",
  email: "",
  password: "",
};

export default function AuthModal() {
  const isOpen = useChronoStore((state) => state.isAuthModalOpen);
  const reason = useChronoStore((state) => state.authModalReason);
  const closeAuthModal = useChronoStore((state) => state.closeAuthModal);
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isSignup = mode === "signup";

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setErrorMessage("");
    setMessage("");
  };

  const resetAndClose = () => {
    if (isSubmitting) {
      return;
    }

    setForm(initialForm);
    setMode("signin");
    setMessage("");
    setErrorMessage("");
    closeAuthModal();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setMessage("");

    try {
      if (isSignup) {
        const data = await signUpWithEmail({
          email: form.email.trim(),
          password: form.password,
          displayName: form.displayName.trim(),
        });

        if (!data.session) {
          setMessage("Check your email to confirm the account, then come back to sign in.");
          setForm((current) => ({ ...current, password: "" }));
          return;
        }
      } else {
        await signInWithEmail(form.email.trim(), form.password);
      }

      setForm(initialForm);
      closeAuthModal();
    } catch (error) {
      setErrorMessage(error.message || "Authentication failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 px-4 py-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 18, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 230, damping: 24 }}
            className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 text-slate-950 shadow-panel backdrop-blur-xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                  <ShieldCheck size={13} />
                  Community Access
                </div>
                <h2 className="text-2xl font-black uppercase tracking-wide">
                  {isSignup ? "Create Account" : "Sign In"}
                </h2>
              </div>

              <button
                type="button"
                onClick={resetAndClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white/70 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
                aria-label="Close auth modal"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {reason && (
                <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm leading-5 text-teal-800">
                  {reason}
                </div>
              )}

              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
                Google can be linked after sign-in from Profile Center. Email/password stays
                as the primary account credential.
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {isSignup && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Display Name
                    </span>
                    <div className="relative">
                      <UserPlus
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                      <input
                        value={form.displayName}
                        onChange={(event) => updateField("displayName", event.target.value)}
                        placeholder="Community Explorer"
                        className="h-11 w-full rounded-lg border border-slate-200 bg-white/80 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                      />
                    </div>
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Email
                  </span>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      placeholder="you@example.com"
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white/80 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Password
                  </span>
                  <div className="relative">
                    <LockKeyhole
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      required
                      minLength={6}
                      type="password"
                      value={form.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      placeholder="Minimum 6 characters"
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white/80 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                    />
                  </div>
                </label>

                {message && (
                  <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm leading-5 text-teal-800">
                    {message}
                  </div>
                )}

                {errorMessage && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-teal-500 bg-teal-600 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_18px_rgba(13,148,136,0.24)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 size={17} className="animate-spin" />}
                  {isSignup ? "Create Account" : "Sign In"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setMode(isSignup ? "signin" : "signup");
                  setErrorMessage("");
                  setMessage("");
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
              >
                {isSignup ? "Already have an account? Sign in" : "New here? Create an account"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
