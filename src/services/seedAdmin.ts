import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export const seedDefaultAdmin = async () => {
  const adminEmail = "admin_aescion@aescion.com";
  const adminPassword = "AescionAdmin#@123";

  try {
    // Check if we can login (exists)
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log("Default admin already exists.");
      return;
    } catch (e: any) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        console.log("Creating default admin account...");
        const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        const user = userCredential.user;

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: "Super Admin",
          email: adminEmail,
          role: "admin",
          status: "approved",
          createdAt: new Date().toISOString()
        });
        console.log("Default admin account created successfully.");
      }
    }
  } catch (error) {
    console.error("Error seeding default admin:", error);
  }
};
