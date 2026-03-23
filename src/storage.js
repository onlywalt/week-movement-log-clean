import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "./firebase";

const ENTRIES_COLLECTION = "dailyFrames";

function safeIso(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return null;
}

function normalizePhotos(data) {
  if (Array.isArray(data.photos) && data.photos.length > 0) {
    return data.photos
      .filter(Boolean)
      .map((photo) => ({
        url: photo.url || "",
        path: photo.path || "",
      }))
      .filter((photo) => photo.url);
  }

  if (data.photoURL) {
    return [
      {
        url: data.photoURL,
        path: data.photoPath || "",
      },
    ];
  }

  return [];
}

export function subscribeToEntries(callback, onError) {
  const q = query(
    collection(db, ENTRIES_COLLECTION),
    orderBy("createdAtMs", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map((docItem) => {
        const data = docItem.data();
        const photos = normalizePhotos(data);

        return {
          id: docItem.id,
          ...data,
          photos,
          photoURL: photos[0]?.url || "",
          photoPath: photos[0]?.path || "",
          createdAt: safeIso(data.createdAt),
          updatedAt: safeIso(data.updatedAt),
        };
      });

      callback(entries);
    },
    (error) => {
      console.error("Realtime Firestore listener failed:", error);
      if (onError) onError(error);
    }
  );
}

export async function addEntry(entry) {
  const nowMs = Date.now();

  const payload = {
    type: entry.type || "Ride",
    title: entry.title || "",
    note: entry.note || "",
    date: entry.date || "",
    time: entry.time || "",
    place: entry.place || "",
    photos: Array.isArray(entry.photos) ? entry.photos : [],
    photoURL: entry.photos?.[0]?.url || "",
    photoPath: entry.photos?.[0]?.path || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };

  const docRef = await addDoc(collection(db, ENTRIES_COLLECTION), payload);
  return docRef.id;
}

export async function updateEntry(id, updates) {
  const refDoc = doc(db, ENTRIES_COLLECTION, id);
  const photos = Array.isArray(updates.photos) ? updates.photos : [];

  await updateDoc(refDoc, {
    ...updates,
    photos,
    photoURL: photos[0]?.url || "",
    photoPath: photos[0]?.path || "",
    updatedAt: serverTimestamp(),
    updatedAtMs: Date.now(),
  });
}

export async function deleteEntry(id) {
  const refDoc = doc(db, ENTRIES_COLLECTION, id);
  await deleteDoc(refDoc);
}

export async function uploadEntryPhotos(files) {
  if (!files || files.length === 0) return [];

  const uploaded = await Promise.all(
    files.map(async (file, index) => {
      const cleanName = `${Date.now()}-${index}-${file.name.replace(/\s+/g, "-")}`;
      const storageRef = ref(storage, `daily-frame/${cleanName}`);

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      return {
        url,
        path: storageRef.fullPath,
      };
    })
  );

  return uploaded;
}

export async function deletePhotosByPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) return;

  await Promise.allSettled(
    paths
      .filter(Boolean)
      .map(async (photoPath) => {
        const fileRef = ref(storage, photoPath);
        await deleteObject(fileRef);
      })
  );
}