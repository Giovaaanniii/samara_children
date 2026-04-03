/**
 * Инициализация Firebase Web SDK (FCM и при необходимости Auth).
 * Заполните VITE_FIREBASE_* в .env по данным из консоли Firebase.
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return null;
  }
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

/** FCM в браузере доступен не во всех окружениях */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!(await isSupported())) return null;
  return getMessaging(a);
}
