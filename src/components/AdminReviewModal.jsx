import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  deleteAdminComment,
  deleteAdminLandmark,
  fetchAdminComments,
  fetchAdminLandmarks,
  fetchAdminProfiles,
  updateAdminLandmark,
  updateAdminLandmarkStatus,
  updateAdminProfileRole,
} from "../services/admin";
import { LANDMARK_STATUSES, PROFILE_ROLES, useChronoStore } from "../store/useStore";

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "landmarks", label: "Landmarks", icon: MapPin },
  { id: "users", label: "Users", icon: UserCog },
  { id: "comments", label: "Comments", icon: MessageSquare },
];

const emptyEditForm = {
  title: "",
  era: "",
  region: "",
  description: "",
  lat: "",
  lng: "",
  image_url: "",
  status: LANDMARK_STATUSES.pending,
};

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

function getLandmarkForm(landmark) {
  if (!landmark) {
    return emptyEditForm;
  }

  return {
    title: landmark.title || "",
    era: landmark.era || "",
    region: landmark.region || landmark.location || "",
    description: landmark.description || "",
    lat: Number.isFinite(landmark.lat) ? String(landmark.lat) : "",
    lng: Number.isFinite(landmark.lng) ? String(landmark.lng) : "",
    image_url: landmark.image_url || "",
    status: landmark.status || LANDMARK_STATUSES.pending,
  };
}

function getDisplayName(profile) {
  return profile.display_name || profile.username || "Community Explorer";
}

function getLandmarkRecordId(landmark) {
  return landmark.db_id || landmark.id;
}

export default function AdminReviewModal() {
  const isOpen = useChronoStore((state) => state.isAdminReviewOpen);
  const closeAdminReview = useChronoStore((state) => state.closeAdminReview);
  const updateLandmarkInStore = useChronoStore((state) => state.updateLandmark);
  const removeLandmarkFromStore = useChronoStore((state) => state.removeLandmark);
  const authUser = useChronoStore((state) => state.authUser);
  const showToast = useChronoStore((state) => state.showToast);

  const [activeTab, setActiveTab] = useState("overview");
  const [landmarks, setLandmarks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [comments, setComments] = useState([]);
  const [landmarkFilter, setLandmarkFilter] = useState("all");
  const [landmarkSearch, setLandmarkSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [commentSearch, setCommentSearch] = useState("");
  const [editingLandmarkId, setEditingLandmarkId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [isLoading, setIsLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isAdmin = authUser?.role === PROFILE_ROLES.admin;
  const editingLandmark = landmarks.find((landmark) => landmark.id === editingLandmarkId);

  const stats = useMemo(() => {
    const pending = landmarks.filter(
      (landmark) => landmark.status === LANDMARK_STATUSES.pending,
    ).length;
    const published = landmarks.filter(
      (landmark) => landmark.status === LANDMARK_STATUSES.published,
    ).length;
    const admins = profiles.filter((profile) => profile.role === PROFILE_ROLES.admin).length;

    return {
      pending,
      published,
      totalLandmarks: landmarks.length,
      users: profiles.length,
      admins,
      comments: comments.length,
    };
  }, [comments.length, landmarks, profiles]);

  const filteredLandmarks = useMemo(() => {
    const query = landmarkSearch.trim().toLowerCase();

    return landmarks.filter((landmark) => {
      const matchesStatus = landmarkFilter === "all" || landmark.status === landmarkFilter;
      const searchable = [
        landmark.title,
        landmark.region,
        landmark.location,
        landmark.era,
        landmark.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || searchable.includes(query));
    });
  }, [landmarkFilter, landmarkSearch, landmarks]);

  const filteredProfiles = useMemo(() => {
    const query = userSearch.trim().toLowerCase();

    return profiles.filter((profile) => {
      const searchable = [
        profile.username,
        profile.display_name,
        profile.home_region,
        profile.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !query || searchable.includes(query);
    });
  }, [profiles, userSearch]);

  const filteredComments = useMemo(() => {
    const query = commentSearch.trim().toLowerCase();

    return comments.filter((comment) => {
      const searchable = [
        comment.content,
        comment.authorName,
        comment.landmarkTitle,
        comment.landmarkStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !query || searchable.includes(query);
    });
  }, [commentSearch, comments]);

  const loadAdminData = async () => {
    if (!isAdmin) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      const [nextLandmarks, nextProfiles, nextComments] = await Promise.all([
        fetchAdminLandmarks(),
        fetchAdminProfiles(),
        fetchAdminComments(),
      ]);

      setLandmarks(nextLandmarks);
      setProfiles(nextProfiles);
      setComments(nextComments);
    } catch (error) {
      setErrorMessage(error.message || "Could not load admin data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadAdminData();
  }, [isOpen, isAdmin]);

  const updateLocalLandmark = (landmark) => {
    setLandmarks((current) =>
      current.map((currentLandmark) =>
        currentLandmark.id === landmark.id ? landmark : currentLandmark,
      ),
    );
    updateLandmarkInStore(landmark);
  };

  const removeLocalLandmark = (landmarkId) => {
    setLandmarks((current) => current.filter((landmark) => landmark.id !== landmarkId));
    removeLandmarkFromStore(landmarkId);

    if (editingLandmarkId === landmarkId) {
      setEditingLandmarkId(null);
      setEditForm(emptyEditForm);
    }
  };

  const handleStatusChange = async (landmark, status) => {
    const actionLabel = status === LANDMARK_STATUSES.published ? "publish" : "unpublish";

    try {
      setActionId(`${actionLabel}-${landmark.id}`);
      setErrorMessage("");
      const updatedLandmark = await updateAdminLandmarkStatus(
        getLandmarkRecordId(landmark),
        status,
      );

      updateLocalLandmark(updatedLandmark);
      showToast({
        title: status === LANDMARK_STATUSES.published ? "Landmark published" : "Landmark unpublished",
        description: updatedLandmark.title,
        variant: "success",
      });
    } catch (error) {
      setErrorMessage(error.message || `Could not ${actionLabel} this landmark.`);
    } finally {
      setActionId("");
    }
  };

  const handleDeleteLandmark = async (landmark) => {
    const label =
      landmark.status === LANDMARK_STATUSES.pending ? "Reject and delete" : "Delete";

    if (!window.confirm(`${label} "${landmark.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      setActionId(`delete-${landmark.id}`);
      setErrorMessage("");
      await deleteAdminLandmark(getLandmarkRecordId(landmark));
      removeLocalLandmark(landmark.id);
      showToast({
        title: landmark.status === LANDMARK_STATUSES.pending ? "Submission rejected" : "Landmark deleted",
        description: landmark.title,
        variant: "success",
      });
    } catch (error) {
      setErrorMessage(error.message || "Could not delete this landmark.");
    } finally {
      setActionId("");
    }
  };

  const handleEditLandmark = (landmark) => {
    setEditingLandmarkId(landmark.id);
    setEditForm(getLandmarkForm(landmark));
  };

  const updateEditField = (field, value) => {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
    setErrorMessage("");
  };

  const handleSaveLandmark = async (event) => {
    event.preventDefault();

    if (!editingLandmark) {
      return;
    }

    try {
      setActionId(`save-${editingLandmark.id}`);
      setErrorMessage("");
      const updatedLandmark = await updateAdminLandmark(
        getLandmarkRecordId(editingLandmark),
        editForm,
      );

      updateLocalLandmark(updatedLandmark);
      setEditForm(getLandmarkForm(updatedLandmark));
      showToast({
        title: "Landmark updated",
        description: updatedLandmark.title,
        variant: "success",
      });
    } catch (error) {
      setErrorMessage(error.message || "Could not save this landmark.");
    } finally {
      setActionId("");
    }
  };

  const handleRoleChange = async (profile, role) => {
    if (profile.id === authUser?.id && role !== PROFILE_ROLES.admin) {
      setErrorMessage("You cannot remove admin access from your current session.");
      return;
    }

    try {
      setActionId(`role-${profile.id}`);
      setErrorMessage("");
      const updatedProfile = await updateAdminProfileRole(profile.id, role);

      setProfiles((current) =>
        current.map((currentProfile) =>
          currentProfile.id === updatedProfile.id ? updatedProfile : currentProfile,
        ),
      );
      showToast({
        title: "User role updated",
        description: `${getDisplayName(updatedProfile)} is now ${updatedProfile.role}.`,
        variant: "success",
      });
    } catch (error) {
      setErrorMessage(error.message || "Could not update this user role.");
    } finally {
      setActionId("");
    }
  };

  const handleDeleteComment = async (comment) => {
    if (!window.confirm(`Delete this comment from "${comment.landmarkTitle}"?`)) {
      return;
    }

    try {
      setActionId(`comment-${comment.id}`);
      setErrorMessage("");
      await deleteAdminComment(comment.id);
      setComments((current) => current.filter((currentComment) => currentComment.id !== comment.id));
      showToast({
        title: "Comment deleted",
        description: comment.landmarkTitle,
        variant: "success",
      });
    } catch (error) {
      setErrorMessage(error.message || "Could not delete this comment.");
    } finally {
      setActionId("");
    }
  };

  const handleClose = () => {
    if (actionId) {
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
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 text-slate-950 shadow-panel backdrop-blur-xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  <ShieldCheck size={13} />
                  Admin Console
                </div>
                <h2 className="text-2xl font-black uppercase tracking-wide">
                  Website Management
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadAdminData}
                  disabled={isLoading || Boolean(actionId) || !isAdmin}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white/70 text-slate-600 transition hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Refresh admin data"
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
                  disabled={Boolean(actionId)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white/70 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close admin console"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="border-b border-slate-200 px-3 py-2 sm:px-5">
              <div className="flex gap-2 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-bold transition ${
                        isActive
                          ? "border-teal-500 bg-teal-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
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

              {isAdmin && isLoading && !landmarks.length && (
                <div className="grid min-h-48 place-items-center text-sm font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={17} className="animate-spin text-teal-600" />
                    Loading admin data
                  </span>
                </div>
              )}

              {isAdmin && activeTab === "overview" && (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    {[
                      ["Pending", stats.pending],
                      ["Published", stats.published],
                      ["Landmarks", stats.totalLandmarks],
                      ["Users", stats.users],
                      ["Admins", stats.admins],
                      ["Comments", stats.comments],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                      >
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          {label}
                        </p>
                        <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <section className="rounded-xl border border-slate-200 bg-white p-4">
                      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-900">
                        <ClipboardCheck size={16} className="text-amber-600" />
                        Pending Queue
                      </h3>
                      <div className="mt-3 space-y-2">
                        {landmarks
                          .filter((landmark) => landmark.status === LANDMARK_STATUSES.pending)
                          .slice(0, 5)
                          .map((landmark) => (
                            <button
                              key={landmark.id}
                              type="button"
                              onClick={() => {
                                setActiveTab("landmarks");
                                setLandmarkFilter(LANDMARK_STATUSES.pending);
                                handleEditLandmark(landmark);
                              }}
                              className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm transition hover:border-amber-300 hover:bg-amber-50"
                            >
                              <span className="min-w-0 truncate font-bold text-slate-800">
                                {landmark.title}
                              </span>
                              <span className="shrink-0 text-xs text-slate-500">
                                {formatDate(landmark.created_at)}
                              </span>
                            </button>
                          ))}
                        {stats.pending === 0 && (
                          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm font-semibold text-slate-500">
                            No pending submissions.
                          </p>
                        )}
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-4">
                      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-900">
                        <UserCog size={16} className="text-teal-600" />
                        Recent Users
                      </h3>
                      <div className="mt-3 space-y-2">
                        {profiles.slice(0, 5).map((profile) => (
                          <div
                            key={profile.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                          >
                            <span className="min-w-0 truncate font-bold text-slate-800">
                              {getDisplayName(profile)}
                            </span>
                            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold uppercase text-slate-500">
                              {profile.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              )}

              {isAdmin && activeTab === "landmarks" && (
                <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                  <section className="min-w-0 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
                        <Search size={16} className="shrink-0 text-slate-500" />
                        <input
                          value={landmarkSearch}
                          onChange={(event) => setLandmarkSearch(event.target.value)}
                          placeholder="Search landmarks"
                          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                        />
                      </label>
                      <select
                        value={landmarkFilter}
                        onChange={(event) => setLandmarkFilter(event.target.value)}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
                      >
                        <option value="all">All Statuses</option>
                        <option value={LANDMARK_STATUSES.pending}>Pending</option>
                        <option value={LANDMARK_STATUSES.published}>Published</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      {filteredLandmarks.map((landmark) => (
                        <article
                          key={landmark.id}
                          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                        >
                          <div className="grid gap-4 p-4 sm:grid-cols-[112px_1fr]">
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
                                <span
                                  className={`rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                                    landmark.status === LANDMARK_STATUSES.published
                                      ? "border-teal-200 bg-teal-50 text-teal-700"
                                      : "border-amber-200 bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {landmark.status}
                                </span>
                                <span className="text-xs font-medium text-slate-500">
                                  {formatDate(landmark.created_at)}
                                </span>
                              </div>
                              <h3 className="mt-2 truncate text-lg font-black text-slate-950">
                                {landmark.title}
                              </h3>
                              <p className="mt-1 truncate text-sm font-semibold text-slate-600">
                                {landmark.region || landmark.location}
                              </p>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                                {landmark.description}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {landmark.status === LANDMARK_STATUSES.pending ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStatusChange(landmark, LANDMARK_STATUSES.published)
                                    }
                                    disabled={Boolean(actionId)}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-teal-500 bg-teal-600 px-3 text-sm font-bold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {actionId === `publish-${landmark.id}` ? (
                                      <Loader2 size={15} className="animate-spin" />
                                    ) : (
                                      <CheckCircle2 size={15} />
                                    )}
                                    Approve
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStatusChange(landmark, LANDMARK_STATUSES.pending)
                                    }
                                    disabled={Boolean(actionId)}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Unpublish
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleEditLandmark(landmark)}
                                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                                >
                                  <Edit3 size={15} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLandmark(landmark)}
                                  disabled={Boolean(actionId)}
                                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {actionId === `delete-${landmark.id}` ? (
                                    <Loader2 size={15} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={15} />
                                  )}
                                  {landmark.status === LANDMARK_STATUSES.pending
                                    ? "Reject"
                                    : "Delete"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                      {!filteredLandmarks.length && (
                        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center text-sm font-semibold text-slate-500">
                          No landmarks match this filter.
                        </p>
                      )}
                    </div>
                  </section>

                  <form
                    onSubmit={handleSaveLandmark}
                    className="h-fit rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-900">
                      <Edit3 size={16} className="text-teal-600" />
                      Landmark Editor
                    </h3>
                    {editingLandmark ? (
                      <div className="mt-4 space-y-3">
                        <label className="block">
                          <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                            Title
                          </span>
                          <input
                            required
                            value={editForm.title}
                            onChange={(event) => updateEditField("title", event.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-400"
                          />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                              Era
                            </span>
                            <input
                              required
                              value={editForm.era}
                              onChange={(event) => updateEditField("era", event.target.value)}
                              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-400"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                              Status
                            </span>
                            <select
                              value={editForm.status}
                              onChange={(event) => updateEditField("status", event.target.value)}
                              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-400"
                            >
                              <option value={LANDMARK_STATUSES.pending}>Pending</option>
                              <option value={LANDMARK_STATUSES.published}>Published</option>
                            </select>
                          </label>
                        </div>
                        <label className="block">
                          <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                            Location
                          </span>
                          <input
                            value={editForm.region}
                            onChange={(event) => updateEditField("region", event.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-400"
                          />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                              Latitude
                            </span>
                            <input
                              required
                              type="number"
                              min="-90"
                              max="90"
                              step="0.00001"
                              value={editForm.lat}
                              onChange={(event) => updateEditField("lat", event.target.value)}
                              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-400"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                              Longitude
                            </span>
                            <input
                              required
                              type="number"
                              min="-180"
                              max="180"
                              step="0.00001"
                              value={editForm.lng}
                              onChange={(event) => updateEditField("lng", event.target.value)}
                              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-400"
                            />
                          </label>
                        </div>
                        <label className="block">
                          <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                            Image URL
                          </span>
                          <input
                            value={editForm.image_url}
                            onChange={(event) =>
                              updateEditField("image_url", event.target.value)
                            }
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-400"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                            Description
                          </span>
                          <textarea
                            required
                            rows={5}
                            value={editForm.description}
                            onChange={(event) =>
                              updateEditField("description", event.target.value)
                            }
                            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-teal-400"
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={Boolean(actionId)}
                          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-teal-500 bg-teal-600 px-4 text-sm font-black text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionId === `save-${editingLandmark.id}` && (
                            <Loader2 size={16} className="animate-spin" />
                          )}
                          Save Changes
                        </button>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-8 text-center text-sm font-semibold text-slate-500">
                        Select a landmark to edit details.
                      </p>
                    )}
                  </form>
                </div>
              )}

              {isAdmin && activeTab === "users" && (
                <section className="space-y-3">
                  <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
                    <Search size={16} className="shrink-0 text-slate-500" />
                    <input
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder="Search users"
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </label>

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {filteredProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="grid gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_160px_160px]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">
                            {getDisplayName(profile)}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            @{profile.username} · joined {formatDate(profile.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-xs font-bold uppercase ${
                              profile.role === PROFILE_ROLES.admin
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-slate-200 bg-slate-50 text-slate-500"
                            }`}
                          >
                            {profile.role}
                          </span>
                        </div>
                        <select
                          value={profile.role}
                          disabled={actionId === `role-${profile.id}`}
                          onChange={(event) => handleRoleChange(profile, event.target.value)}
                          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value={PROFILE_ROLES.user}>User</option>
                          <option value={PROFILE_ROLES.admin}>Admin</option>
                        </select>
                      </div>
                    ))}
                    {!filteredProfiles.length && (
                      <p className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                        No users match this search.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {isAdmin && activeTab === "comments" && (
                <section className="space-y-3">
                  <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
                    <Search size={16} className="shrink-0 text-slate-500" />
                    <input
                      value={commentSearch}
                      onChange={(event) => setCommentSearch(event.target.value)}
                      placeholder="Search comments"
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </label>

                  <div className="space-y-3">
                    {filteredComments.map((comment) => (
                      <article
                        key={comment.id}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black text-slate-950">
                                {comment.authorName}
                              </span>
                              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-500">
                                {comment.authorRole}
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatDate(comment.created_at)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                              {comment.landmarkTitle} · {comment.landmarkStatus}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {comment.content}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment)}
                            disabled={Boolean(actionId)}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionId === `comment-${comment.id}` ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                    {!filteredComments.length && (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center text-sm font-semibold text-slate-500">
                        No comments match this search.
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
