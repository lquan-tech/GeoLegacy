import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  CalendarClock,
  MapPin,
  MessageCircle,
  PencilLine,
  SendHorizontal,
  Share2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { selectIsLandmarkBookmarked, useChronoStore } from "../store/useStore";
import Tooltip from "./Tooltip";

const EMPTY_COMMENTS = [];

function getLandmarkImage(landmark) {
  return landmark.image_url || landmark.imageUrl;
}

function getShareUrl(landmarkId) {
  const url = new URL(window.location.href);
  url.searchParams.set("site", landmarkId);
  return url.toString();
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to the older selection API below.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getProfileDisplayName(profile) {
  return profile?.display_name || profile?.username || "Community Explorer";
}

function SkeletonLine({ className = "" }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

function CommentsSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((item) => (
        <div key={item} className="rounded-xl border border-slate-200 bg-white/70 p-3">
          <div className="flex items-center gap-3">
            <SkeletonLine className="h-8 w-8 rounded-full" />
            <div className="min-w-0 flex-1">
              <SkeletonLine className="h-3 w-28" />
              <SkeletonLine className="mt-2 h-2.5 w-20" />
            </div>
          </div>
          <SkeletonLine className="mt-3 h-3 w-full" />
          <SkeletonLine className="mt-2 h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

export default function SidePanel({ landmark, onClose }) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [areCommentsLoading, setAreCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");

  const profilesById = useChronoStore((state) => state.profilesById);
  const authUser = useChronoStore((state) => state.authUser);
  const comments = useChronoStore((state) =>
    landmark?.id ? state.commentsByLandmark[landmark.id] ?? EMPTY_COMMENTS : EMPTY_COMMENTS,
  );
  const isBookmarked = useChronoStore(selectIsLandmarkBookmarked(landmark?.id));
  const toggleBookmark = useChronoStore((state) => state.toggleBookmark);
  const addComment = useChronoStore((state) => state.addComment);
  const openAuthModal = useChronoStore((state) => state.openAuthModal);
  const showToast = useChronoStore((state) => state.showToast);

  const imageUrl = useMemo(() => (landmark ? getLandmarkImage(landmark) : ""), [landmark]);

  useEffect(() => {
    if (!landmark?.id) {
      return;
    }

    setIsImageLoaded(false);
    setAreCommentsLoading(true);
    setCommentDraft("");

    const timer = window.setTimeout(() => {
      setAreCommentsLoading(false);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [landmark?.id]);

  const handleBookmark = () => {
    if (!landmark) {
      return;
    }

    if (!authUser) {
      openAuthModal("Sign in to bookmark historical sites.");
      return;
    }

    toggleBookmark(landmark.id);
    showToast({
      title: isBookmarked ? "Bookmark removed" : "Site bookmarked",
      description: landmark.title,
      variant: isBookmarked ? "default" : "success",
    });
  };

  const handleShare = async () => {
    if (!landmark) {
      return;
    }

    const url = getShareUrl(landmark.id);
    const payload = {
      title: `GeoLegacy: ${landmark.title}`,
      text: landmark.description,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        showToast({ title: "Share sheet opened", description: landmark.title });
        return;
      }

      await copyToClipboard(url);
      showToast({
        title: "Link copied",
        description: "Permalink copied to clipboard.",
        variant: "success",
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      await copyToClipboard(url);
      showToast({
        title: "Link copied",
        description: "Native share was unavailable.",
        variant: "success",
      });
    }
  };

  const handleEdit = () => {
    if (!landmark) {
      return;
    }

    if (!authUser) {
      openAuthModal("Sign in to propose edits for this site.");
      return;
    }

    showToast({
      title: "Edit workflow queued",
      description: "Phase 4 will connect edits to Supabase moderation.",
    });
  };

  const handleCommentSubmit = (event) => {
    event.preventDefault();

    if (!landmark || !commentDraft.trim()) {
      return;
    }

    if (!authUser) {
      openAuthModal("Sign in to add field notes to this site.");
      return;
    }

    addComment(landmark.id, commentDraft);
    setCommentDraft("");
    showToast({
      title: "Comment added",
      description: `Added to ${landmark.title}.`,
      variant: "success",
    });
  };

  return (
    <AnimatePresence>
      {landmark && (
        <motion.aside
          key={landmark.id}
          initial={isMobile ? { y: "105%", opacity: 0 } : { x: "105%", opacity: 0 }}
          animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
          exit={isMobile ? { y: "105%", opacity: 0 } : { x: "105%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          className="pointer-events-auto fixed inset-x-3 bottom-3 z-30 max-h-[86vh] overflow-hidden rounded-xl border border-slate-200/80 bg-white/88 text-slate-950 shadow-panel backdrop-blur-xl md:inset-x-auto md:bottom-auto md:right-5 md:top-5 md:h-[calc(100vh-40px)] md:max-h-none md:w-[390px]"
        >
          <div className="flex h-full flex-col">
            <div className="relative h-52 shrink-0 overflow-hidden bg-slate-100 md:h-56">
              {imageUrl && !isImageLoaded && (
                <SkeletonLine className="absolute inset-0 h-full w-full" />
              )}
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={landmark.title}
                  onLoad={() => setIsImageLoaded(true)}
                  className={`h-full w-full object-cover transition duration-300 ${
                    isImageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                />
              )}
              {!imageUrl && (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
                  <MapPin size={38} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/18 to-transparent" />

              <div className="absolute right-3 top-3 flex items-center gap-2">
                <Tooltip label={isBookmarked ? "Remove bookmark" : "Bookmark"} side="bottom">
                  <button
                    type="button"
                    onClick={handleBookmark}
                    className={`grid h-9 w-9 place-items-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-teal-200 ${
                      isBookmarked
                        ? "border-teal-500 bg-teal-600 text-white"
                        : "border-white/70 bg-white/80 text-slate-700 hover:border-teal-300 hover:text-teal-800"
                    }`}
                    aria-label={isBookmarked ? "Remove bookmark" : "Bookmark site"}
                    aria-pressed={isBookmarked}
                  >
                    <Bookmark size={17} fill={isBookmarked ? "currentColor" : "none"} />
                  </button>
                </Tooltip>

                <Tooltip label="Share permalink" side="bottom">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/70 bg-white/80 text-slate-700 transition hover:border-teal-300 hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-200"
                    aria-label="Share landmark permalink"
                  >
                    <Share2 size={17} />
                  </button>
                </Tooltip>

                <Tooltip label="Edit site" side="bottom">
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/70 bg-white/80 text-slate-700 transition hover:border-amber-300 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    aria-label="Edit landmark"
                  >
                    <PencilLine size={17} />
                  </button>
                </Tooltip>

                <Tooltip label="Close panel" side="bottom">
                  <button
                    type="button"
                    onClick={onClose}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/70 bg-white/80 text-slate-700 transition hover:border-slate-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                    aria-label="Close landmark panel"
                  >
                    <X size={17} />
                  </button>
                </Tooltip>
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-teal-200 bg-white/86 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                  {landmark.status ?? "published"}
                </div>
                <h2 className="text-2xl font-black uppercase leading-tight tracking-wide text-white md:text-3xl">
                  {landmark.title}
                </h2>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-teal-700">
                    <MapPin size={14} />
                    Location
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{landmark.location}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                    <CalendarClock size={14} />
                    Era
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{landmark.era}</p>
                </div>
              </div>

              <section className="mt-3 rounded-xl border border-slate-200 bg-white/70 p-4">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <UserRound size={14} />
                  Curated by {landmark.author ?? "Community Explorer"}
                </div>
                <p className="text-sm leading-6 text-slate-600">{landmark.description}</p>
              </section>

              <section className="mt-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
                    <MessageCircle size={16} className="text-teal-600" />
                    Comments
                  </div>
                  <span className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                    {comments.length}
                  </span>
                </div>

                {areCommentsLoading ? (
                  <CommentsSkeleton />
                ) : comments.length ? (
                  <div className="space-y-3">
                    {comments.map((comment) => {
                      const profile = profilesById[comment.user_id];

                      return (
                        <article
                          key={comment.id}
                          className="rounded-xl border border-slate-200 bg-white/70 p-3 transition hover:border-teal-200 hover:bg-teal-50/60"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {getProfileDisplayName(profile)}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {formatDate(comment.created_at)}
                              </p>
                            </div>
                          </div>
                          <p className="mt-2 text-sm leading-5 text-slate-600">
                            {comment.content}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 text-center">
                    <p className="text-sm font-semibold text-slate-900">No comments yet.</p>
                    <p className="mt-1 text-xs text-slate-500">Be the first to add field notes.</p>
                  </div>
                )}

                {authUser ? (
                  <form onSubmit={handleCommentSubmit} className="mt-3 flex gap-2">
                    <input
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      placeholder="Add a field note..."
                      className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white/80 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                    />
                    <Tooltip label="Post comment" side="top">
                      <button
                        type="submit"
                        disabled={!commentDraft.trim()}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-teal-500 bg-teal-600 text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        aria-label="Post comment"
                      >
                        <SendHorizontal size={17} />
                      </button>
                    </Tooltip>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAuthModal("Sign in to add field notes to this site.")}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-sm font-bold text-teal-800 transition hover:border-teal-300 hover:bg-teal-100"
                  >
                    <UserRound size={16} />
                    Sign in to comment
                  </button>
                )}
              </section>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
