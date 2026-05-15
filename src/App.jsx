import AuthModal from "./components/AuthModal";
import AuthProvider from "./components/AuthProvider";
import AppShell from "./components/AppShell";
import GlobeComponent from "./components/GlobeComponent";
import ProfileModal from "./components/ProfileModal";
import SidePanel from "./components/SidePanel";
import UploadModal from "./components/UploadModal";
import { createPendingLandmark } from "./services/landmarks";
import { selectSelectedLandmark, useChronoStore } from "./store/useStore";

const uploadImages = [
  "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1400&q=80",
];

export default function App() {
  const landmarks = useChronoStore((state) => state.landmarks);
  const selectedLandmark = useChronoStore(selectSelectedLandmark);
  const isAddSiteOpen = useChronoStore((state) => state.isAddSiteOpen);
  const clearSelectedLandmark = useChronoStore((state) => state.clearSelectedLandmark);
  const addLandmark = useChronoStore((state) => state.addLandmark);
  const closeAddSite = useChronoStore((state) => state.closeAddSite);
  const authUser = useChronoStore((state) => state.authUser);
  const openAuthModal = useChronoStore((state) => state.openAuthModal);
  const showToast = useChronoStore((state) => state.showToast);

  const createLocalPendingLandmark = (payload, error) => {
    const fallbackImage = payload.imageFile
      ? URL.createObjectURL(payload.imageFile)
      : uploadImages[landmarks.length % uploadImages.length];

    return {
      id: `local-pending-${Date.now()}`,
      title: payload.title || "Community Archive Site",
      location: payload.location,
      region: payload.region || payload.location?.split(",").at(-1)?.trim() || "Global",
      lat: payload.lat,
      lng: payload.lng,
      era: payload.era || "Unverified Era",
      description: payload.description,
      image_url: fallbackImage,
      imageUrl: fallbackImage,
      author: authUser?.display_name || authUser?.username || "Community Explorer",
      author_id: authUser?.id,
      status: "pending",
      created_at: new Date().toISOString(),
      sync_error: error?.message,
    };
  };

  const handleCreateLandmark = async (payload) => {
    if (!authUser) {
      openAuthModal("Sign in to submit a historical site for review.");
      return;
    }

    try {
      const createdLandmark = await createPendingLandmark({
        ...payload,
        authorId: authUser.id,
        authorName: authUser.display_name || authUser.username,
      });

      addLandmark(createdLandmark);
      showToast({
        title: "Submitted for review",
        description: `${createdLandmark.title} is pending moderation.`,
        variant: "success",
      });
    } catch (error) {
      const localLandmark = createLocalPendingLandmark(payload, error);

      addLandmark(localLandmark);
      showToast({
        title: "Saved locally",
        description:
          "Supabase insert failed. Run supabase/schema.sql, then resubmit to persist it.",
        variant: "error",
      });
    }
  };

  return (
    <AuthProvider>
      <AppShell>
        <GlobeComponent />

        <SidePanel landmark={selectedLandmark} onClose={clearSelectedLandmark} />
        <UploadModal
          isOpen={isAddSiteOpen}
          onClose={closeAddSite}
          onCreate={handleCreateLandmark}
        />
        <ProfileModal />
        <AuthModal />
      </AppShell>
    </AuthProvider>
  );
}
