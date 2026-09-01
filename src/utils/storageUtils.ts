export interface SavedBlueprintItem {
  id: string;
  name: string;
  savedAt: string;
  data: any;
}

const STORAGE_KEY = "structurecraft_custom_blueprints";

export function getSavedBlueprints(): SavedBlueprintItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to load blueprints from storage:", err);
    return [];
  }
}

export function saveBlueprintToStorage(name: string, data: any): SavedBlueprintItem[] {
  const current = getSavedBlueprints();
  const newItem: SavedBlueprintItem = {
    id: "bp_" + Date.now(),
    name: name.trim() || data.title || "Untitled Blueprint",
    savedAt: new Date().toLocaleDateString(),
    data,
  };
  const updated = [newItem, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteBlueprintFromStorage(id: string): SavedBlueprintItem[] {
  const current = getSavedBlueprints();
  const updated = current.filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}