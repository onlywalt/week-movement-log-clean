import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCRdRt_hEeo_JdThLy13Plw8KVbvphVr1Y",
  authDomain: "daily-frame-web.firebaseapp.com",
  projectId: "daily-frame-web",
  storageBucket: "daily-frame-web.firebasestorage.app",
  messagingSenderId: "443474485868",
  appId: "1:443474485868:web:878134a3f008969f29ee49",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;