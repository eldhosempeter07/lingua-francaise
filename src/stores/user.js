import { defineStore } from "pinia";
import { ref } from "vue";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "@/firebase"; // Make sure you have firebase initialized

export const useUserStore = defineStore("user", () => {
  const user = ref(null);
  const isLoading = ref(false);

  const initializeAuth = () => {
    // Set up auth state listener
    onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        user.value = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
          emailVerified: firebaseUser.emailVerified,
        };

        // Check if we have stored auth data to determine persistence
        const savedAuth = localStorage.getItem("userAuth");
        const sessionAuth = sessionStorage.getItem("userAuth");

        if (savedAuth || sessionAuth) {
          const authData = savedAuth
            ? JSON.parse(savedAuth)
            : JSON.parse(sessionAuth);
          const authDataToStore = {
            user: user.value,
            timestamp: new Date().getTime(),
            remember: !!savedAuth, // If saved in localStorage, it's remembered
          };

          // Re-store the updated user data
          if (savedAuth) {
            localStorage.setItem(
              "userAuth",
              JSON.stringify(authDataToStore.user)
            );
          } else {
            sessionStorage.setItem(
              "userAuth",
              JSON.stringify(authDataToStore.user)
            );
          }
        }
      } else {
        // User is signed out
        user.value = null;
      }
    });
  };

  const register = async (email, password) => {
    isLoading.value = true;
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Extract user data from Firebase
      const firebaseUser = userCredential.user;
      user.value = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || email.split("@")[0],
        emailVerified: firebaseUser.emailVerified,
      };

      // Store authentication data
      const authData = {
        user: user.value,
        timestamp: new Date().getTime(),
        remember: true, // Default to remember for new registrations
      };

      localStorage.setItem("userAuth", JSON.stringify(authData));

      return { success: true, error: null };
    } catch (error) {
      let errorMessage = "Registration failed. Please try again.";

      // Handle specific Firebase error codes
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error.code === "auth/operation-not-allowed") {
        errorMessage = "Email/password accounts are not enabled.";
      }

      return { success: false, error: errorMessage };
    } finally {
      isLoading.value = false;
    }
  };

  const login = async (email, password, rememberMe = false) => {
    isLoading.value = true;
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Extract user data from Firebase
      const firebaseUser = userCredential.user;
      user.value = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || email.split("@")[0],
        emailVerified: firebaseUser.emailVerified,
      };

      // Store authentication data based on user's choice
      const authData = {
        user: user.value,
        timestamp: new Date().getTime(),
        remember: rememberMe,
      };

      if (rememberMe) {
        localStorage.setItem("userAuth", JSON.stringify(authData));
      } else {
        sessionStorage.setItem("userAuth", JSON.stringify(authData));
      }

      return { success: true, error: null };
    } catch (error) {
      let errorMessage = "Login failed. Please try again.";

      // Handle specific Firebase error codes
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password"
      ) {
        errorMessage = "Invalid email or password.";
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      }

      return { success: false, error: errorMessage };
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      user.value = null;
      localStorage.removeItem("userAuth");
      sessionStorage.removeItem("userAuth");
    } catch (error) {
      console.error("Logout error:", error);
      throw new Error("Logout failed");
    }
  };

  // Initialize auth when store is created
  initializeAuth();

  return {
    user,
    isLoading,
    register,
    login,
    logout,
    initializeAuth,
  };
});
