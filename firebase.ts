// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAzevYq22Tn5Q9KVynwyvFcxTOk-7RevE4",
  authDomain: "hcms-e0406.firebaseapp.com",
  projectId: "hcms-e0406",
  storageBucket: "hcms-e0406.firebasestorage.app",
  messagingSenderId: "636790050333",
  appId: "1:636790050333:web:a29d87a8cdfde1eb2cc0f4",
  measurementId: "G-D42C0X60LE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics (only in browser environment)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
export { analytics };