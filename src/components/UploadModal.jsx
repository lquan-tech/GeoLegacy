import { AnimatePresence, motion } from "framer-motion";
import {
  ImagePlus,
  Loader2,
  LocateFixed,
  MapPin,
  Plus,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { geocodeLocation } from "../services/geocoding";

const initialForm = {
  title: "",
  era: "Ancient",
  description: "",
  locationQuery: "",
  location: "",
  region: "",
  lat: "",
  lng: "",
  imageFile: null,
};

const eraOptions = ["Ancient", "Classical", "Medieval", "Early Modern"];

function toCoordinateValue(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  return Number(value).toFixed(5);
}

export default function UploadModal({ isOpen, onClose, onCreate }) {
  const [form, setForm] = useState(initialForm);
  const [locationResults, setLocationResults] = useState([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(
    () =>
      form.title.trim() &&
      form.era &&
      form.description.trim() &&
      (form.location.trim() || form.locationQuery.trim()) &&
      form.lat !== "" &&
      form.lng !== "" &&
      !isSubmitting,
    [
      form.description,
      form.era,
      form.lat,
      form.lng,
      form.location,
      form.locationQuery,
      form.title,
      isSubmitting,
    ],
  );

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setErrorMessage("");
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const query = form.locationQuery.trim();

    if (query.length < 3) {
      setLocationResults([]);
      setIsGeocoding(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setIsGeocoding(true);
        const results = await geocodeLocation(query, controller.signal);
        setLocationResults(results);
      } catch (error) {
        if (error.name !== "AbortError") {
          setLocationResults([]);
          setErrorMessage(error.message);
        }
      } finally {
        setIsGeocoding(false);
      }
    }, 420);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [form.locationQuery, isOpen]);

  const handleLocationSelect = (result) => {
    setForm((current) => ({
      ...current,
      locationQuery: result.name,
      location: result.name,
      region: result.region,
      lat: toCoordinateValue(result.lat),
      lng: toCoordinateValue(result.lng),
    }));
    setLocationResults([]);
    setErrorMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      setErrorMessage("Please complete the required fields and select a location.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onCreate({
        title: form.title.trim(),
        era: form.era,
        description: form.description.trim(),
        location: form.location.trim() || form.locationQuery.trim(),
        region:
          form.region.trim() ||
          (form.location.trim() || form.locationQuery.trim()).split(",").at(-1)?.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        imageFile: form.imageFile,
      });

      setForm(initialForm);
      setLocationResults([]);
      onClose();
    } catch (error) {
      setErrorMessage(error.message || "Could not submit this site. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    setForm(initialForm);
    setLocationResults([]);
    setErrorMessage("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40 grid place-items-center bg-slate-900/30 px-4 py-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.form
            onSubmit={handleSubmit}
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 18, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 text-slate-950 shadow-panel backdrop-blur-xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  <Plus size={13} />
                  Pending Review
                </div>
                <h2 className="text-2xl font-black uppercase tracking-wide">Add Site</h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white/70 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close upload modal"
              >
                <X size={17} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-[1.3fr_0.7fr]">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Name
                  </span>
                  <input
                    required
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder="Library of Alexandria"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white/80 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Era
                  </span>
                  <select
                    required
                    value={form.era}
                    onChange={(event) => updateField("era", event.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white/80 px-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]"
                  >
                    {eraOptions.map((era) => (
                      <option key={era} value={era} className="bg-white text-slate-900">
                        {era}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Description
                </span>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Add historical context, source notes, or what makes this site worth reviewing."
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white/80 px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                />
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Location Search
                  </span>
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      required
                      value={form.locationQuery}
                      onChange={(event) => {
                        updateField("locationQuery", event.target.value);
                        updateField("location", "");
                      }}
                      placeholder="Search a city, monument, or address"
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white/90 pl-9 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                    />
                    {isGeocoding && (
                      <Loader2
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-teal-600"
                      />
                    )}
                  </div>
                </label>

                {locationResults.length > 0 && (
                  <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white/95">
                    {locationResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => handleLocationSelect(result)}
                        className="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 transition last:border-b-0 hover:bg-teal-50 hover:text-teal-800"
                      >
                        <MapPin size={15} className="mt-0.5 shrink-0 text-teal-600" />
                        <span className="min-w-0">
                          <span className="line-clamp-2 block">{result.name}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="block sm:col-span-1">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                      Latitude
                    </span>
                    <input
                      required
                      type="number"
                      min="-90"
                      max="90"
                      step="0.00001"
                      value={form.lat}
                      onChange={(event) => updateField("lat", event.target.value)}
                      placeholder="31.20010"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400"
                    />
                  </label>
                  <label className="block sm:col-span-1">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                      Longitude
                    </span>
                    <input
                      required
                      type="number"
                      min="-180"
                      max="180"
                      step="0.00001"
                      value={form.lng}
                      onChange={(event) => updateField("lng", event.target.value)}
                      placeholder="29.91870"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400"
                    />
                  </label>
                  <div className="flex items-end">
                    <div className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 text-xs text-slate-500">
                      <LocateFixed size={15} className="text-teal-600" />
                      {form.location
                        ? "Coordinates set"
                        : form.locationQuery && form.lat && form.lng
                          ? "Manual coordinates"
                          : "Select a result"}
                    </div>
                  </div>
                </div>
              </div>

              <label className="group block cursor-pointer rounded-xl border border-dashed border-teal-300 bg-teal-50/70 px-5 py-5 text-center transition hover:border-teal-400 hover:bg-teal-100/70">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) =>
                    updateField("imageFile", event.target.files?.[0] ?? null)
                  }
                />
                <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg border border-teal-200 bg-white text-teal-700 transition group-hover:scale-105">
                  {form.imageFile ? <ImagePlus size={22} /> : <UploadCloud size={22} />}
                </span>
                <span className="block text-sm font-semibold text-slate-900">
                  {form.imageFile?.name || "Upload source image"}
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  PNG, JPG, or WebP. Stored in Supabase Storage.
                </span>
              </label>

              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-teal-500 bg-teal-600 px-4 text-sm font-black text-white shadow-[0_0_18px_rgba(13,148,136,0.22)] transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Submit for Review
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
