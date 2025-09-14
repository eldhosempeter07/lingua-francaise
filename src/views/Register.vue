<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="elevation-8">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>Register</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-icon class="mr-3">mdi-account-plus</v-icon>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="handleRegister">
              <v-text-field
                v-model="email"
                label="Email"
                name="email"
                prepend-icon="mdi-email"
                type="email"
                :error-messages="emailErrors"
                @input="clearErrors"
                required
              ></v-text-field>

              <v-text-field
                v-model="password"
                label="Password"
                name="password"
                prepend-icon="mdi-lock"
                :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                :type="showPassword ? 'text' : 'password'"
                :error-messages="passwordErrors"
                @click:append-inner="showPassword = !showPassword"
                @input="clearErrors"
                required
              ></v-text-field>

              <v-text-field
                v-model="confirmPassword"
                label="Confirm Password"
                name="confirmPassword"
                prepend-icon="mdi-lock-check"
                :append-inner-icon="
                  showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'
                "
                :type="showConfirmPassword ? 'text' : 'password'"
                :error-messages="confirmPasswordErrors"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
                @input="clearErrors"
                required
              ></v-text-field>

              <v-alert
                v-if="errorMessage"
                type="error"
                variant="tonal"
                class="mt-3"
                dismissible
                @click:close="errorMessage = ''"
              >
                {{ errorMessage }}
              </v-alert>

              <v-alert
                v-if="successMessage"
                type="success"
                variant="tonal"
                class="mt-3"
              >
                {{ successMessage }}
              </v-alert>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="secondary" :to="{ name: 'Login' }"> Login </v-btn>
            <v-btn
              color="primary"
              @click="handleRegister"
              :loading="loading"
              :disabled="loading"
            >
              Register
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";

// Reactive variables
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const loading = ref(false);

// Initialize store and router
const userStore = useUserStore();
const router = useRouter();

// Validation functions
const emailErrors = computed(() => {
  if (!email.value) return "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value))
    return "Please enter a valid email address";
  return "";
});

const passwordErrors = computed(() => {
  if (!password.value) return "";
  if (password.value.length < 6)
    return "Password must be at least 6 characters";
  return "";
});

const confirmPasswordErrors = computed(() => {
  if (!confirmPassword.value) return "";
  if (password.value !== confirmPassword.value) return "Passwords do not match";
  return "";
});

const isFormValid = computed(() => {
  return (
    email.value &&
    password.value &&
    confirmPassword.value &&
    !emailErrors.value &&
    !passwordErrors.value &&
    !confirmPasswordErrors.value
  );
});

// Clear error messages when user starts typing
const clearErrors = () => {
  errorMessage.value = "";
};

// Handle registration
const handleRegister = async () => {
  // Clear previous messages
  errorMessage.value = "";
  successMessage.value = "";

  // Validate form
  if (!isFormValid.value) {
    errorMessage.value = "Invalid Email or Password";
    return;
  }

  loading.value = true;

  try {
    const result = await userStore.register(email.value, password.value);

    // Check if result exists and has success property
    if (result && result.success) {
      successMessage.value = "Account created successfully! Redirecting...";
      // Wait a moment to show success message, then redirect
      setTimeout(() => {
        router.push({ name: "Home" });
      }, 1500);
    } else {
      // Handle case where result exists but success is false
      errorMessage.value =
        result?.error || "Registration failed. Please try again.";
    }
  } catch (error) {
    // Handle unexpected errors
    errorMessage.value = error.message || "An unexpected error occurred";
  } finally {
    loading.value = false;
  }
};
</script>
