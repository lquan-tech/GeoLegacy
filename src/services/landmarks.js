import { LANDMARK_IMAGES_BUCKET, supabase } from "../lib/supabaseClient";

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function getFileExtension(file) {
  const extension = file.name.split(".").pop();
  return extension ? extension.toLowerCase() : "jpg";
}

export function toClientLandmark(record) {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    lat: Number(record.lat),
    lng: Number(record.lng),
    era: record.era,
    region: record.region,
    location: record.region,
    image_url: record.image_url,
    imageUrl: record.image_url,
    author_id: record.author_id,
    author: record.author ?? "Community Explorer",
    status: record.status,
    created_at: record.created_at,
  };
}

export async function uploadLandmarkImage(file, title, authorId) {
  if (!file) {
    return null;
  }

  if (!authorId) {
    throw new Error("Sign in before uploading landmark images.");
  }

  const extension = getFileExtension(file);
  const safeTitle = slugify(title) || "landmark";
  const filePath = `pending/${authorId}/${safeTitle}-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(LANDMARK_IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(LANDMARK_IMAGES_BUCKET).getPublicUrl(filePath);

  return data.publicUrl;
}

export async function createPendingLandmark(payload) {
  const {
    title,
    era,
    description,
    location,
    region,
    lat,
    lng,
    imageFile,
    authorId = null,
    authorName = "Community Explorer",
  } = payload;

  if (!authorId) {
    throw new Error("Sign in before submitting a historical site.");
  }

  const imageUrl = await uploadLandmarkImage(imageFile, title, authorId);

  const record = {
    title,
    era,
    description,
    lat,
    lng,
    region: location || region,
    image_url: imageUrl,
    author_id: authorId,
    status: "pending",
  };

  const { data, error } = await supabase
    .from("landmarks")
    .insert(record)
    .select(
      "id,title,description,lat,lng,era,region,image_url,author_id,status,created_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return toClientLandmark({ ...data, author: authorName });
}

export async function fetchPublishedLandmarks() {
  const { data, error } = await supabase
    .from("landmarks")
    .select("id,title,description,lat,lng,era,region,image_url,author_id,status,created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((record) => toClientLandmark(record));
}
