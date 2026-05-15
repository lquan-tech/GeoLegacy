import { create } from "zustand";
import { initialLandmarks } from "../data/landmarks";

export const ERA_FILTERS = [
  { id: "all", label: "All" },
  { id: "ancient", label: "Ancient" },
  { id: "classical", label: "Classical" },
  { id: "medieval", label: "Medieval" },
  { id: "early-modern", label: "Early Modern" },
];

export const LANDMARK_STATUSES = {
  pending: "pending",
  published: "published",
};

export const PROFILE_ROLES = {
  user: "user",
  admin: "admin",
};

const initialProfilesById = {
  "archivist-kai": {
    id: "archivist-kai",
    username: "Archivist Kai",
    display_name: "Archivist Kai",
    avatar_url: "",
    role: PROFILE_ROLES.admin,
  },
  "mira-stone": {
    id: "mira-stone",
    username: "Mira Stone",
    display_name: "Mira Stone",
    avatar_url: "",
    role: PROFILE_ROLES.user,
  },
  "atlas-lab": {
    id: "atlas-lab",
    username: "Atlas Lab",
    display_name: "Atlas Lab",
    avatar_url: "",
    role: PROFILE_ROLES.user,
  },
};

const initialCommentsByLandmark = {
  colosseum: [
    {
      id: "comment-colosseum-1",
      landmark_id: "colosseum",
      user_id: "archivist-kai",
      content: "Cross-reference scan found matching imperial route fragments.",
      created_at: "2026-05-12T09:30:00.000Z",
    },
    {
      id: "comment-colosseum-2",
      landmark_id: "colosseum",
      user_id: "mira-stone",
      content: "The amphitheater context pairs well with the urban water network layer.",
      created_at: "2026-05-12T10:15:00.000Z",
    },
  ],
  giza: [
    {
      id: "comment-giza-1",
      landmark_id: "giza",
      user_id: "archivist-kai",
      content: "Astronomical alignment notes should be attached to this record.",
      created_at: "2026-05-12T11:10:00.000Z",
    },
  ],
  "machu-picchu": [
    {
      id: "comment-machu-picchu-1",
      landmark_id: "machu-picchu",
      user_id: "atlas-lab",
      content: "Terrace data looks strong; hydrology references would make this richer.",
      created_at: "2026-05-12T12:40:00.000Z",
    },
  ],
};

/**
 * @typedef {Object} Landmark
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {number} lat
 * @property {number} lng
 * @property {string} era
 * @property {string=} region
 * @property {string=} image_url
 * @property {string=} imageUrl
 * @property {string=} author_id
 * @property {string=} author
 * @property {"pending"|"published"=} status
 * @property {string=} created_at
 */

/**
 * @typedef {Object} Comment
 * @property {string} id
 * @property {string} landmark_id
 * @property {string} user_id
 * @property {string} content
 * @property {string} created_at
 */

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string} username
 * @property {string=} display_name
 * @property {string=} avatar_url
 * @property {string=} bio
 * @property {string=} home_region
 * @property {string=} website_url
 * @property {"user"|"admin"} role
 */

export function getEraPeriod(era = "") {
  const normalized = era.toLowerCase();
  const centuryMatch = normalized.match(/(\d+)(?:st|nd|rd|th)?\s*c\./);
  const yearMatch = normalized.match(/\d{2,4}/);
  const isBc = normalized.includes("bc") || normalized.includes("bce");
  const isAd = normalized.includes("ad") || normalized.includes("ce");

  let year = null;

  if (centuryMatch) {
    const century = Number(centuryMatch[1]);
    year = (century - 1) * 100 + 50;
  } else if (yearMatch) {
    year = Number(yearMatch[0]);
  }

  if (year === null) {
    return "ancient";
  }

  if (isBc) {
    year *= -1;
  } else if (!isAd && normalized.includes("modern")) {
    year = 1600;
  }

  if (year <= -500) {
    return "ancient";
  }

  if (year <= 500) {
    return "classical";
  }

  if (year <= 1500) {
    return "medieval";
  }

  return "early-modern";
}

export function filterLandmarks(landmarks, searchQuery, activeEra) {
  const query = searchQuery.trim().toLowerCase();

  return landmarks.filter((landmark) => {
    const matchesEra = activeEra === "all" || getEraPeriod(landmark.era) === activeEra;

    if (!matchesEra) {
      return false;
    }

    if (!query) {
      return true;
    }

    const searchable = [
      landmark.title,
      landmark.location,
      landmark.region,
      landmark.era,
      landmark.description,
      landmark.author,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });
}

export const selectFilteredLandmarks = (state) =>
  filterLandmarks(state.landmarks, state.searchQuery, state.activeEra);

export const selectSelectedLandmark = (state) =>
  state.landmarks.find((landmark) => landmark.id === state.selectedLandmarkId) ?? null;

export const selectLandmarkById = (id) => (state) =>
  state.landmarks.find((landmark) => landmark.id === id) ?? null;

export const selectCommentsForLandmark = (landmarkId) => (state) =>
  state.commentsByLandmark[landmarkId] ?? [];

export const selectIsLandmarkBookmarked = (landmarkId) => (state) =>
  Boolean(landmarkId && state.bookmarkedIds.includes(landmarkId));

export const useChronoStore = create((set) => ({
  landmarks: initialLandmarks.map((landmark) => ({
    status: LANDMARK_STATUSES.published,
    region: landmark.location?.split(",").at(-1)?.trim() ?? "Global",
    ...landmark,
  })),
  profilesById: initialProfilesById,
  commentsByLandmark: initialCommentsByLandmark,
  bookmarkedIds: [],
  authSession: null,
  authUser: null,
  authStatus: "loading",
  isAuthModalOpen: false,
  authModalReason: "",
  isProfileModalOpen: false,
  toast: null,
  searchQuery: "",
  activeEra: "all",
  selectedLandmarkId: null,
  isAddSiteOpen: false,

  setAuthState: ({ session = null, profile = null, status = "ready" }) =>
    set((state) => ({
      authSession: session,
      authUser: profile,
      authStatus: status,
      profilesById: profile
        ? {
            ...state.profilesById,
            [profile.id]: profile,
          }
        : state.profilesById,
    })),
  openAuthModal: (reason = "Sign in to join the GeoLegacy community.") =>
    set({
      isAuthModalOpen: true,
      authModalReason: reason,
    }),
  closeAuthModal: () =>
    set({
      isAuthModalOpen: false,
      authModalReason: "",
    }),
  openProfileModal: () => set({ isProfileModalOpen: true }),
  closeProfileModal: () => set({ isProfileModalOpen: false }),
  updateAuthProfile: (profileUpdates) =>
    set((state) => {
      if (!state.authUser) {
        return state;
      }

      const nextProfile = {
        ...state.authUser,
        ...profileUpdates,
      };

      return {
        authUser: nextProfile,
        profilesById: {
          ...state.profilesById,
          [nextProfile.id]: nextProfile,
        },
      };
    }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveEra: (activeEra) => set({ activeEra }),
  setSelectedLandmark: (landmarkOrId) =>
    set({
      selectedLandmarkId:
        typeof landmarkOrId === "string" ? landmarkOrId : landmarkOrId?.id ?? null,
    }),
  clearSelectedLandmark: () => set({ selectedLandmarkId: null }),
  openAddSite: () =>
    set((state) =>
      state.authUser
        ? { isAddSiteOpen: true }
        : {
            isAuthModalOpen: true,
            authModalReason: "Sign in to submit a historical site for review.",
          },
    ),
  closeAddSite: () => set({ isAddSiteOpen: false }),
  addLandmark: (landmark) =>
    set((state) => ({
      landmarks: [...state.landmarks, landmark],
      selectedLandmarkId: landmark.id,
    })),
  addComment: (landmarkId, content) =>
    set((state) => {
      const trimmedContent = content.trim();

      if (!landmarkId || !trimmedContent) {
        return state;
      }

      if (!state.authUser) {
        return {
          isAuthModalOpen: true,
          authModalReason: "Sign in to add field notes to this site.",
        };
      }

      const comment = {
        id: `comment-${landmarkId}-${Date.now()}`,
        landmark_id: landmarkId,
        user_id: state.authUser.id,
        content: trimmedContent,
        created_at: new Date().toISOString(),
      };

      return {
        commentsByLandmark: {
          ...state.commentsByLandmark,
          [landmarkId]: [...(state.commentsByLandmark[landmarkId] ?? []), comment],
        },
      };
    }),
  toggleBookmark: (landmarkId) =>
    set((state) => {
      if (!state.authUser) {
        return {
          isAuthModalOpen: true,
          authModalReason: "Sign in to bookmark historical sites.",
        };
      }

      const isBookmarked = state.bookmarkedIds.includes(landmarkId);

      return {
        bookmarkedIds: isBookmarked
          ? state.bookmarkedIds.filter((id) => id !== landmarkId)
          : [...state.bookmarkedIds, landmarkId],
      };
    }),
  showToast: ({ title, description, variant = "default" }) =>
    set({
      toast: {
        id: `${Date.now()}`,
        title,
        description,
        variant,
      },
    }),
  dismissToast: () => set({ toast: null }),
}));
