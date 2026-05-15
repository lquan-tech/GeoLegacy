import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  approvePendingLandmark,
  fetchPendingLandmarks,
} from "../services/landmarks";
import { useChronoStore } from "../store/useStore";

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function AdminReviewModal() {
  const isOpen = useChronoStore((state) => state.isAdminReviewOpen);
  const closeAdminReview = useChronoStore((state) => state.closeAdminReview);
  const addLandmark = useChronoStore((state) => state.addLandmark);
  const authUser = useChronoStore((state) => state.authUser);
  const showToast = useChronoStore((state) => state.showToast);
  const [pendingLandmarks, setPendingLandmarks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const isAdmin = authUser?.role === "admin";
  const hasPendingLandmarks = pendingLandmarks.length > 0;

  const sortedPendingLandmarks = useMemo(
    () =>
      [...pendingLandmarks].sort(
        (first, second) => new Date(first.created_at) - new Date(second.created_at),
      ),
    [pendingLandmarks],
  );

  const loadPendingLandmarks = async () => {
    if (!isAdmin) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      const records = await fetchPendingLandmarks();
      setPendingLandmarks(records);
    } catch (error) {
      setErrorMessage(error.message || "Could not load pending submissions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadPendingLandmarks();
  }, [isOpen, isAdmin]);

  const handleApprove = async (landmark) => {
    try {
      setApprovingId(landmark.id);
      setErrorMessage("");

      const approvedLandmark = await approvePendingLandmark(landmark.id);
      addLandmark(approvedLandmark);
      setPendingLandmarks((current) =>
        current.filter((pendingLandmark) => pendingLandmark.id !== landmark.id),
      );
      showToast({
        title: "Landmark published",
        description: approvedLandmark.title,
        variant: "success",
      });
    } catch (error) {
      setErrorMessage(error.message || "Could not approve this submission.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleClose = () => {
    if (approvingId) {
      return;
    }

    setErrorMessage("");
    closeAdminReview();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 px-3 py-5 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 18, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 230, damping: 24 }}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 text-slate-950 shadow-panel backdrop-blur-xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  <ShieldCheck size={13} />
                  Admin Review
                </div>
                <h2 className="text-2xl font-black uppercase tracking-wide">
                  Pending Landmarks
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadPendingLandmarks}
                  disabled={isLoading || approvingId || !isAdmin}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white/70 text-slate-600 transition hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Refresh pending landmarks"
                >
                  {isLoading ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <RefreshCw size={17} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={Boolean(approvingId)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white/70 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close admin review"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {!isAdmin && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
                  This account does not have admin permission.
                </div>
              )}

              {errorMessage && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
                  {errorMessage}
                </div>
              )}

              {isAdmin && isLoading && !hasPendingLandmarks && (
                <div className="grid min-h-48 place-items-center text-sm font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={17} className="animate-spin text-teal-600" />
                    Loading submissions
                  </span>
                </div>
              )}

              {isAdmin && !isLoading && !hasPendingLandmarks && (
                <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 text-center">
                  <div>
                    <CheckCircle2 size={28} className="mx-auto text-teal-600" />
                    <p className="mt-3 text-sm font-bold text-slate-900">
                      No pending submissions
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      New landmarks will appear here after users submit them.
                    </p>
                  </div>
                </div>
              )}

              {isAdmin && hasPendingLandmarks && (
                <div className="space-y-3">
                  {sortedPendingLandmarks.map((landmark) => (
                    <article
                      key={landmark.id}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="grid gap-4 p-4 sm:grid-cols-[128px_1fr_auto]">
                        <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          {landmark.image_url ? (
                            <img
                              src={landmark.image_url}
                              alt={landmark.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-slate-400">
                              <MapPin size={24} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                              {landmark.status}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                              <CalendarClock size={13} />
                              {formatDate(landmark.created_at)}
                            </span>
                          </div>
                          <h3 className="mt-2 text-lg font-black text-slate-950">
                            {landmark.title}
                          </h3>
                          <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-600">
                            <MapPin size={14} className="shrink-0 text-teal-600" />
                            <span className="truncate">{landmark.location}</span>
                          </p>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                            {landmark.description}
                          </p>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {landmark.era}
                          </p>
                        </div>

                        <div className="flex items-end sm:items-start">
                          <button
                            type="button"
                            onClick={() => handleApprove(landmark)}
                            disabled={Boolean(approvingId)}
                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-teal-500 bg-teal-600 px-4 text-sm font-black text-white shadow-[0_0_18px_rgba(13,148,136,0.2)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 sm:w-auto"
                          >
                            {approvingId === landmark.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                            Approve
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
