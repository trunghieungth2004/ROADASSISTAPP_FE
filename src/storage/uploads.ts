import { getStorage, ref, uploadBytes } from "firebase/storage";
import { app } from "../auth/firebase";

const MAX_BYTES = 800 * 1024;

async function compress(file: File): Promise<Blob> {
  if (file.size <= MAX_BYTES) return file;
  if (typeof createImageBitmap !== "function") return file;
  try {
    return await compressBitmap(file);
  } catch {
    return file;
  }
}

async function compressBitmap(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1080 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((value) => resolve(value), "image/jpeg", 0.65),
  );
  if (!blob) return file;
  if (blob.size <= MAX_BYTES) return blob;
  const smaller = document.createElement("canvas");
  const nextScale = 0.7;
  smaller.width = Math.round(canvas.width * nextScale);
  smaller.height = Math.round(canvas.height * nextScale);
  const smallCtx = smaller.getContext("2d");
  if (!smallCtx) return blob;
  smallCtx.drawImage(bitmap, 0, 0, smaller.width, smaller.height);
  const final = await new Promise<Blob | null>((resolve) =>
    smaller.toBlob((value) => resolve(value), "image/jpeg", 0.5),
  );
  return final ?? blob;
}

export async function uploadImages(files: File[], directory: string): Promise<string[]> {
  if (files.length === 0) return [];
  const storage = getStorage(app);
  const stamp = Date.now();
  const paths: string[] = [];
  for (let i = 0; i < files.slice(0, 5).length; i += 1) {
    const blob = await compress(files[i]);
    if (blob.size > MAX_BYTES) throw new Error("Photo is too large (max 800 KB).");
    const path = `${directory}/${stamp}-${i}.jpg`;
    await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
    paths.push(path);
  }
  return paths;
}
