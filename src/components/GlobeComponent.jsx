import { useCallback, useEffect, useMemo, useRef } from "react";
import Globe from "react-globe.gl";
import { useWindowSize } from "../hooks/useWindowSize";
import { filterLandmarks, selectSelectedLandmark, useChronoStore } from "../store/useStore";

const globeImageUrl = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
const bumpImageUrl = "https://unpkg.com/three-globe/example/img/earth-topology.png";
const DEFAULT_VIEW = { lat: 18, lng: 12, altitude: 2.25 };
const FOCUSED_ALTITUDE = 1.55;

function getSiteParam() {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("site");
}

function syncSiteParam(siteId) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);

  if (siteId) {
    url.searchParams.set("site", siteId);
  } else {
    url.searchParams.delete("site");
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    window.history.replaceState({ siteId }, "", nextUrl);
  }
}

export default function GlobeComponent() {
  const globeRef = useRef(null);
  const hasInitializedView = useRef(false);
  const hasReadInitialSiteParam = useRef(false);
  const skipNextUrlSync = useRef(false);
  const { width, height } = useWindowSize();

  const landmarks = useChronoStore((state) => state.landmarks);
  const searchQuery = useChronoStore((state) => state.searchQuery);
  const activeEra = useChronoStore((state) => state.activeEra);
  const selectedLandmarkId = useChronoStore((state) => state.selectedLandmarkId);
  const selectedLandmark = useChronoStore(selectSelectedLandmark);
  const setSelectedLandmark = useChronoStore((state) => state.setSelectedLandmark);
  const clearSelectedLandmark = useChronoStore((state) => state.clearSelectedLandmark);

  const visibleLandmarks = useMemo(
    () => filterLandmarks(landmarks, searchQuery, activeEra),
    [activeEra, landmarks, searchQuery],
  );

  const arcsData = useMemo(() => {
    if (visibleLandmarks.length < 2) {
      return [];
    }

    return visibleLandmarks.map((landmark, index) => {
      const next = visibleLandmarks[(index + 1) % visibleLandmarks.length];

      return {
        id: `${landmark.id}-${next.id}`,
        startLat: landmark.lat,
        startLng: landmark.lng,
        endLat: next.lat,
        endLng: next.lng,
      };
    });
  }, [visibleLandmarks]);

  const focusLandmark = useCallback((landmark, duration = 1400) => {
    const globe = globeRef.current;

    if (!globe || !landmark) {
      return;
    }

    const controls = globe.controls();
    controls.autoRotate = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;

    globe.pointOfView(
      {
        lat: landmark.lat,
        lng: landmark.lng,
        altitude: FOCUSED_ALTITUDE,
      },
      duration,
    );
  }, []);

  useEffect(() => {
    const globe = globeRef.current;

    if (!globe || hasInitializedView.current) {
      return;
    }

    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;

    globe.pointOfView(DEFAULT_VIEW, 0);
    hasInitializedView.current = true;
  }, []);

  useEffect(() => {
    if (hasReadInitialSiteParam.current) {
      return;
    }

    const siteId = getSiteParam();

    if (!siteId) {
      hasReadInitialSiteParam.current = true;
      return;
    }

    if (!landmarks.length) {
      return;
    }

    const matchingLandmark = landmarks.find((landmark) => landmark.id === siteId);
    hasReadInitialSiteParam.current = true;

    if (matchingLandmark) {
      skipNextUrlSync.current = true;
      setSelectedLandmark(matchingLandmark.id);
    } else {
      syncSiteParam(null);
    }
  }, [landmarks, setSelectedLandmark]);

  useEffect(() => {
    const handlePopState = () => {
      const siteId = getSiteParam();
      const matchingLandmark = siteId
        ? landmarks.find((landmark) => landmark.id === siteId)
        : null;

      if (matchingLandmark) {
        setSelectedLandmark(matchingLandmark.id);
      } else {
        clearSelectedLandmark();
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [clearSelectedLandmark, landmarks, setSelectedLandmark]);

  useEffect(() => {
    if (!hasReadInitialSiteParam.current) {
      return;
    }

    if (skipNextUrlSync.current) {
      skipNextUrlSync.current = false;
      return;
    }

    syncSiteParam(selectedLandmarkId);
  }, [selectedLandmarkId]);

  useEffect(() => {
    if (selectedLandmark) {
      focusLandmark(selectedLandmark);
    }
  }, [focusLandmark, selectedLandmark]);

  const createMarker = useCallback(
    (landmark) => {
      const marker = document.createElement("button");
      const isActive = selectedLandmarkId === landmark.id;

      marker.type = "button";
      marker.className = `chrono-pin ${isActive ? "chrono-pin--active" : ""}`;
      marker.setAttribute("aria-label", `Open ${landmark.title}`);
      marker.title = landmark.title;

      const core = document.createElement("span");
      core.className = "chrono-pin__core";

      const halo = document.createElement("span");
      halo.className = "chrono-pin__halo";

      const label = document.createElement("span");
      label.className = "chrono-pin__label";
      label.textContent = landmark.title;

      marker.append(halo, core, label);
      marker.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelectedLandmark(landmark.id);
        focusLandmark(landmark);
      });

      return marker;
    },
    [focusLandmark, selectedLandmarkId, setSelectedLandmark],
  );

  return (
    <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_42%,#ffffff_0%,#e0f2fe_44%,#cbd5e1_100%)]">
      <Globe
        ref={globeRef}
        width={width}
        height={height}
        backgroundColor="rgba(248,250,252,0)"
        rendererConfig={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        globeImageUrl={globeImageUrl}
        bumpImageUrl={bumpImageUrl}
        showAtmosphere
        atmosphereColor="#38bdf8"
        atmosphereAltitude={0.16}
        htmlElementsData={visibleLandmarks}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.035}
        htmlElement={createMarker}
        ringsData={visibleLandmarks}
        ringLat="lat"
        ringLng="lng"
        ringColor={() => "rgba(13, 148, 136, 0.42)"}
        ringMaxRadius={4.2}
        ringPropagationSpeed={1.2}
        ringRepeatPeriod={1900}
        arcsData={arcsData}
        arcColor={() => ["rgba(13, 148, 136, 0.1)", "rgba(245, 158, 11, 0.5)"]}
        arcAltitude={0.16}
        arcStroke={0.3}
        arcDashLength={0.54}
        arcDashGap={2.2}
        arcDashAnimateTime={3400}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.08)_56%,rgba(248,250,252,0.64)_100%)]" />
      <div className="pointer-events-none absolute inset-0 scanline-overlay" />
    </div>
  );
}
