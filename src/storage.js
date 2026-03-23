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

        return {
          id: docItem.id,
          ...data,
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
    photoURL: entry.photoURL || "",
    photoPath: entry.photoPath || "",
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

  await updateDoc(refDoc, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedAtMs: Date.now(),
  });
}

export async function deleteEntry(id) {
  const refDoc = doc(db, ENTRIES_COLLECTION, id);
  await deleteDoc(refDoc);
}

export async function uploadEntryPhoto(file) {
  if (!file) return { photoURL: "", photoPath: "" };

  const cleanName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const storageRef = ref(storage, `daily-frame/${cleanName}`);

  await uploadBytes(storageRef, file);
  const photoURL = await getDownloadURL(storageRef);

  return {
    photoURL,
    photoPath: storageRef.fullPath,
  };
}

export async function deletePhotoByPath(photoPath) {
  if (!photoPath) return;
  try {
    const fileRef = ref(storage, photoPath);
    await deleteObject(fileRef);
  } catch (error) {
    console.warn("Could not delete photo from storage:", error);
  }
}