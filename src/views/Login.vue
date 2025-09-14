<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>Login</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="handleLogin">
              <v-text-field
                label="Email"
                name="email"
                prepend-icon="mdi-email"
                type="email"
                v-model="email"
                @input="clearErrors"
                required
              ></v-text-field>
              <v-text-field
                label="Password"
                name="password"
                prepend-icon="mdi-lock"
                type="password"
                v-model="password"
                @input="clearErrors"
                required
              ></v-text-field>
              <!-- <v-checkbox
                v-model="rememberMe"
                label="Remember me"
                color="primary"
              ></v-checkbox> -->
              <v-alert v-if="loginError" type="error" dense class="mt-3">
                {{ loginError }}
              </v-alert>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              @click="handleLogin"
              :loading="userStore.isLoading"
              :disabled="userStore.isLoading"
            >
              Login
            </v-btn>
          </v-card-actions>
        </v-card>
        <p class="text-center mt-4">
          Don't have an account?
          <router-link to="/register">Register here</router-link>
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "@/stores/user";

const email = ref("");
const password = ref("");
const rememberMe = ref(true);
const loginError = ref("");
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// Check if user is already logged in
onMounted(() => {
  if (userStore.user) {
    redirectUser();
  }
});

const clearErrors = () => {
  loginError.value = "";
};

const handleLogin = async () => {
  clearErrors();

  // Basic validation
  if (!email.value || !password.value) {
    loginError.value = "Please fill all the fields";
    return;
  }

  const result = await userStore.login(
    email.value,
    password.value,
    rememberMe.value
  );

  if (result.success) {
    redirectUser();
  } else {
    loginError.value = result.error;
  }
};

const redirectUser = () => {
  const redirectTo = route.query.redirect;
  if (redirectTo) {
    router.push(redirectTo);
  } else {
    router.push("/");
  }
};
</script>
