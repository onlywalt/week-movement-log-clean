import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "../firebase";

export async function uploadEntryPhoto(file) {
  const safeName = file.name.replace(/\s+/g, "-").replace(/[^\w.-]/g, "");
  const fileName = `entries/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, fileName);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  return {
    url,
    path: fileName,
  };
}

export async function deleteEntryPhoto(path) {
  if (!path) return;

  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}