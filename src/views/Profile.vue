<template>
  <v-container>
    <v-row>
      <v-cols cols="12">
        <h1 class="text-h4 mb-4">Profile</h1>
        <v-card>
          <v-card-text>
            <v-form @submit.prevent="handleRegister">
              <!-- Name Field -->
              <v-text-field
                v-model="name"
                label="Full Name"
                name="name"
                prepend-icon="mdi-account"
                type="text"
                :error-messages="nameErrors"
                @input="clearErrors"
                required
              ></v-text-field>

              <!-- Username Field -->
              <v-text-field
                v-model="username"
                label="Username"
                name="username"
                prepend-icon="mdi-at"
                type="text"
              ></v-text-field>

              <!-- Date of Birth Field -->
              <v-menu
                ref="menu"
                v-model="menu"
                :close-on-content-click="false"
                transition="scale-transition"
                offset-y
                min-width="auto"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="dateOfBirth"
                    label="Date of Birth"
                    prepend-icon="mdi-calendar"
                    readonly
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-date-picker
                  v-model="dateOfBirth"
                  :max="new Date().toISOString().substr(0, 10)"
                  min="1950-01-01"
                  @change="saveDate"
                ></v-date-picker>
              </v-menu>

              <!-- Email Field -->
              <v-text-field
                v-model="email"
                label="Email"
                name="email"
                prepend-icon="mdi-email"
                type="email"
              ></v-text-field>
            </v-form>
          </v-card-text>
        </v-card>
      </v-cols>
    </v-row>
  </v-container>
</template>

<script>
// Reactive variables
const name = ref("");
const username = ref("");
const dateOfBirth = ref("");
const email = ref("");
</script>
