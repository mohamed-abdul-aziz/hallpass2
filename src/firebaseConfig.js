import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// !! IMPORTANT: REPLACE THE CONTENTS BELOW WITH YOUR OWN FIREBASE CONFIG KEYS !!
const firebaseConfig = {
  apiKey: "AIzaSyBjGC9EXgNDdB2BV7oMPtX_CRAosbP1s-U",
  authDomain: "hallpass-hackathon.firebaseapp.com",
  projectId: "hallpass-hackathon",
  storageBucket: "hallpass-hackathon.firebasestorage.app",
  messagingSenderId: "754962393526",
  appId: "1:754962393526:web:f227ba3682f59ab0aab917"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);