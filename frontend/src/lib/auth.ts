import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "anonymous_id";

export function getAnonymousId(): string {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function clearAnonymousId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function regenerateAnonymousId(): string {
  const id = uuidv4();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}
