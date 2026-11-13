import { getDownloadURL, getStorage, ref } from "firebase/storage";
import { app } from "../auth/firebase";

const cache = new Map<string, Promise<string>>();

export function resolvePhotoUrl(path: string): Promise<string> {
  if (
    /^https?:\/\//i.test(path) ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return Promise.resolve(path);
  }
  const cached = cache.get(path);
  if (cached) return cached;
  const promise = getDownloadURL(ref(getStorage(app), path)).catch(() => path);
  cache.set(path, promise);
  return promise;
}
