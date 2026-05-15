import { supabase } from "../lib/supabaseClient";
import { toClientLandmark } from "./landmarks";

const LANDMARK_SELECT =
  "id,slug,title,description,lat,lng,era,region,image_url,author_id,status,created_at";

const PROFILE_SELECT =
  "id,username,display_name,avatar_url,bio,home_region,website_url,role,created_at,updated_at";

function toLandmarkRecord(updates) {
  const record = {};

  if ("title" in updates) {
    record.title = updates.title.trim();
  }

  if ("description" in updates) {
    record.description = updates.description.trim();
  }

  if ("era" in updates) {
    record.era = updates.era.trim();
  }

  if ("region" in updates) {
    record.region = updates.region.trim();
  }

  if ("lat" in updates) {
    record.lat = Number(updates.lat);
  }

  if ("lng" in updates) {
    record.lng = Number(updates.lng);
  }

  if ("image_url" in updates) {
    record.image_url = updates.image_url.trim() || null;
  }

  if ("status" in updates) {
    record.status = updates.status;
  }

  return record;
}

export async function fetchAdminLandmarks() {
  const { data, error } = await supabase
    .from("landmarks")
    .select(LANDMARK_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((record) => toClientLandmark(record));
}

export async function updateAdminLandmark(landmarkId, updates) {
  const record = toLandmarkRecord(updates);

  const { data, error } = await supabase
    .from("landmarks")
    .update(record)
    .eq("id", landmarkId)
    .select(LANDMARK_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return toClientLandmark(data);
}

export async function updateAdminLandmarkStatus(landmarkId, status) {
  return updateAdminLandmark(landmarkId, { status });
}

export async function deleteAdminLandmark(landmarkId) {
  const { error } = await supabase.from("landmarks").delete().eq("id", landmarkId);

  if (error) {
    throw error;
  }

  return landmarkId;
}

export async function fetchAdminProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function updateAdminProfileRole(profileId, role) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", profileId)
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchAdminComments() {
  const [commentsResult, profilesResult, landmarksResult] = await Promise.all([
    supabase
      .from("comments")
      .select("id,landmark_id,user_id,content,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("id,username,display_name,role"),
    supabase.from("landmarks").select("id,title,status"),
  ]);

  if (commentsResult.error) {
    throw commentsResult.error;
  }

  if (profilesResult.error) {
    throw profilesResult.error;
  }

  if (landmarksResult.error) {
    throw landmarksResult.error;
  }

  const profilesById = new Map(profilesResult.data.map((profile) => [profile.id, profile]));
  const landmarksById = new Map(
    landmarksResult.data.map((landmark) => [landmark.id, landmark]),
  );

  return commentsResult.data.map((comment) => {
    const profile = profilesById.get(comment.user_id);
    const landmark = landmarksById.get(comment.landmark_id);

    return {
      ...comment,
      authorName: profile?.display_name || profile?.username || "Unknown user",
      authorRole: profile?.role || "user",
      landmarkTitle: landmark?.title || "Deleted landmark",
      landmarkStatus: landmark?.status || "unknown",
    };
  });
}

export async function deleteAdminComment(commentId) {
  const { error } = await supabase.from("comments").delete().eq("id", commentId);

  if (error) {
    throw error;
  }

  return commentId;
}
