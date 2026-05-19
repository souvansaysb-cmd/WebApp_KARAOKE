import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDsbNWZgfGCP62DNaJXhQGKCR3bv58LjFs",
  authDomain: "karaoke-project-6ec46.firebaseapp.com",
  projectId: "karaoke-project-6ec46",
  storageBucket: "karaoke-project-6ec46.firebasestorage.app",
  messagingSenderId: "776867741431",
  appId: "1:776867741431:web:2fd0d03247d08f8a395df2",
  measurementId: "G-QGK3ZJT6CW",
};

const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.warn("Firebase initialization failed:", error);
  }
}

export { app, auth, googleProvider, isConfigured };