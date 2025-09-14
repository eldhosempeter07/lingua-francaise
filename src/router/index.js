import { createRouter, createWebHistory } from "vue-router";
import Login from "../views/Login.vue";
import Register from "../views/Register.vue";
import MyVocabulary from "../views/MyVocabulary.vue";
import Quiz from "../views/Quiz.vue";
import Translate from "../views/Translate.vue";
import { useUserStore } from "@/stores/user";
import Situations from "../views/Situations.vue";
import NotFound from "../views/NotFound.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Translate,
    meta: { requiresAuth: false }, // Public route
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: { requiresAuth: false }, // Public route
  },
  {
    path: "/register",
    name: "Register",
    component: Register,
    meta: { requiresAuth: false }, // Public route
  },
  {
    path: "/vocabulary",
    name: "Vocabulary",
    component: MyVocabulary,
    meta: { requiresAuth: true }, // Protected route
  },
  {
    path: "/quiz",
    name: "Quiz",
    component: Quiz,
    meta: { requiresAuth: true }, // Protected route
  },
  {
    path: "/situations",
    name: "Situations",
    component: Situations,
    meta: { requiresAuth: true }, // Protected route
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: NotFound,
    meta: { requiresAuth: false },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard to check authentication
router.beforeEach((to, from, next) => {
  const userStore = useUserStore();

  // Check if the route requires authentication
  if (to.meta.requiresAuth) {
    // Check if user is authenticated in store OR in storage
    const savedAuth = localStorage.getItem("userAuth");
    const sessionAuth = sessionStorage.getItem("userAuth");
    console.log(userStore.user);

    if (userStore.user || savedAuth || sessionAuth) {
      // If auth exists in storage but not in store, restore it
      if (!userStore.user && (savedAuth || sessionAuth)) {
        try {
          const authData = savedAuth
            ? JSON.parse(savedAuth)
            : JSON.parse(sessionAuth);
          userStore.user = authData.user;
        } catch (error) {
          console.error("Error parsing stored auth data:", error);
          // Clear invalid storage
          localStorage.removeItem("userAuth");
          sessionStorage.removeItem("userAuth");
          next({ name: "Translate" });
          return;
        }
      }
      // User is authenticated, allow access
      next();
    } else {
      console.log("next");

      // User is not authenticated, redirect to login with return url
      next({
        name: "Home",
      });
    }
  } else {
    // Route doesn't require authentication, allow access
    next();
  }
});
export default router;
