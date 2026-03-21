import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 🔥 Added to support secure admin login

const firebaseConfig = {
  apiKey: "AIzaSyDu2-w10OYM3qoBGIPBm8D1G7mgho1rrQg",
  authDomain: "lab-booking-app-99bd7.firebaseapp.com",
  projectId: "lab-booking-app-99bd7",
  storageBucket: "lab-booking-app-99bd7.firebasestorage.app",
  messagingSenderId: "58926054159",
  appId: "1:58926054159:web:f02a1cc6ba64c6b2c05c7a"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// 🔥 Export Firestore (Database for tests and bookings)
export const db = getFirestore(app);

// 🔥 Export Auth (Security for Admin Login)
export const auth = getAuth(app);