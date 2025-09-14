<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-btn to="/" text x-large class="large-btn">
        <span class="btn-text">LinguaFrançaise</span>
      </v-btn>
      <!-- <v-toolbar-title>LinguaFrançaise</v-toolbar-title> -->
      <v-spacer></v-spacer>

      <!-- Navigation buttons -->
      <v-btn to="/vocabulary" text v-if="isLoggedIn">My Vocabulary</v-btn>
      <v-btn to="/quiz" text v-if="isLoggedIn">Quiz</v-btn>
      <v-btn to="/situations" text v-if="isLoggedIn">Situations</v-btn>

      <!-- User section -->
      <v-menu v-if="isLoggedIn" offset-y :close-on-content-click="true">
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props" size="small">
            <v-avatar size="32" color="secondary">
              <span class="white--text text-caption">{{ userInitial }}</span>
            </v-avatar>
          </v-btn>
        </template>

        <v-card width="120" class="elevation-3">
          <v-list density="compact" class="py-0">
            <v-list-item
              @click="handleLogout"
              class="px-3"
              style="min-height: 36px"
            >
              <v-icon size="small" class="mr-2">mdi-logout</v-icon>
              <span class="text-caption">Logout</span>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>

      <!-- Login button for non-authenticated users -->
      <v-btn to="/login" text v-if="!isLoggedIn">Login</v-btn>
    </v-app-bar>

    <v-main>
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script>
import { computed, onMounted, ref } from "vue";
import { useUserStore } from "@/stores/user";
import { useRouter } from "vue-router";

export default {
  name: "App",
  setup() {
    const userStore = useUserStore();
    const router = useRouter();

    // Check for existing auth on app initialization
    onMounted(() => {
      // This will automatically check localStorage/sessionStorage
      // and populate userStore.user if auth exists
    });

    const isLoggedIn = computed(() => !!userStore.user);

    const userInitial = computed(() => {
      if (!userStore.user) return "";

      if (userStore.user.name) {
        return userStore.user.name.charAt(0).toUpperCase();
      } else if (userStore.user.email) {
        return userStore.user.email.charAt(0).toUpperCase();
      }
      return "U";
    });

    const handleLogout = async () => {
      try {
        await userStore.logout();
        router.push("/");
      } catch (error) {
        console.error("Logout error:", error);
      }
    };

    return {
      isLoggedIn,
      // userName,
      userInitial,
      handleLogout,
    };
  },
};
</script>

<style scoped>
.v-avatar {
  min-width: 32px;
}
.large-btn {
  font-size: 18px !important;
  padding: 16px 32px !important;
  height: auto !important;
}

.btn-text {
  font-weight: 700;
  letter-spacing: 0.5px;
}
</style>
