import AuthModal from "./components/AuthModal";
import AuthProvider from "./components/AuthProvider";
import AppShell from "./components/AppShell";
import GlobeComponent from "./components/GlobeComponent";
import ProfileModal from "./components/ProfileModal";
import SidePanel from "./components/SidePanel";
import UploadModal from "./components/UploadModal";
import { useEffect } from "react";
import { createPendingLandmark, fetchVisibleLandmarks } from "./services/landmarks";
import { selectSelectedLandmark, useChronoStore } from "./store/useStore";

export default function App() {
  const selectedLandmark = useChronoStore(selectSelectedLandmark);
  const isAddSiteOpen = useChronoStore((state) => state.isAddSiteOpen);
  const clearSelectedLandmark = useChronoStore((state) => state.clearSelectedLandmark);
  const addLandmark = useChronoStore((state) => state.addLandmark);
  const loadLandmarks = useChronoStore((state) => state.loadLandmarks);
  const closeAddSite = useChronoStore((state) => state.closeAddSite);
  const authUser = useChronoStore((state) => state.authUser);
  const authStatus = useChronoStore((state) => state.authStatus);
  const openAuthModal = useChronoStore((state) => state.openAuthModal);
  const showToast = useChronoStore((state) => state.showToast);

  useEffect(() => {
    if (authStatus === "loading") {
      return undefined;
    }

    let isActive = true;

    async function loadVisibleLandmarks() {
      try {
        const visibleLandmarks = await fetchVisibleLandmarks();

        if (isActive) {
          loadLandmarks(visibleLandmarks);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        showToast({
          title: "Could not sync sites",
          description: error.message,
          variant: "error",
        });
      }
    }

    void loadVisibleLandmarks();

    return () => {
      isActive = false;
    };
  }, [authStatus, authUser?.id, loadLandmarks, showToast]);

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
      showToast({
        title: "Could not save site",
        description: error.message,
        variant: "error",
      });
      throw error;
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
