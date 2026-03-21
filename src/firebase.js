import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDu2-w10OYM3qoBGIPBm8D1G7mgho1rrQg",
  authDomain: "lab-booking-app-99bd7.firebaseapp.com",
  projectId: "lab-booking-app-99bd7",
  storageBucket: "lab-booking-app-99bd7.firebasestorage.app",
  messagingSenderId: "58926054159",
  appId: "1:58926054159:web:f02a1cc6ba64c6b2c05c7a"
};

const app = initializeApp(firebaseConfig);

// 🔥 IMPORTANT LINE
export const db = getFirestore(app);