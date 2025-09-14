<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">My Vocabulary</h1>

        <!-- Add Word Form -->
        <v-card class="mb-6">
          <v-card-title>Add New Word</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="addNewWord">
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="newWord.french"
                    label="French Word"
                    placeholder="Enter a French word"
                    required
                    @input="debouncedTranslate"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="newWord.english"
                    label="English Translation"
                    placeholder="English translation will appear here"
                    :loading="isTranslating"
                    :hint="
                      isAutoTranslated
                        ? 'Auto-translated from French (you can edit this)'
                        : 'Enter your own translation'
                    "
                    persistent-hint
                  >
                    <template v-slot:append>
                      <v-tooltip location="top">
                        <template v-slot:activator="{ props }">
                          <v-btn
                            icon
                            v-bind="props"
                            size="small"
                            @click="translateWord"
                            :disabled="!newWord.french.trim() || isTranslating"
                          >
                            <v-icon>mdi-auto-fix</v-icon>
                          </v-btn>
                        </template>
                        <span>Auto-translate</span>
                      </v-tooltip>
                    </template>
                  </v-text-field>
                </v-col>
              </v-row>
              <v-btn
                type="submit"
                color="primary"
                :disabled="
                  !newWord.french.trim() ||
                  !newWord.english.trim() ||
                  isTranslating
                "
                :loading="isTranslating"
                class="mt-4"
              >
                Add Word
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>

        <!-- Vocabulary List -->
        <v-card>
          <v-card-title>My Word List</v-card-title>
          <v-card-text>
            <v-list v-if="userVocabulary.length">
              <v-list-item
                v-for="word in userVocabulary"
                :key="word.id"
                class="mb-2"
              >
                <v-list-item-title>
                  <strong>{{ word.french }}</strong> - {{ word.english }}
                </v-list-item-title>
                <template v-slot:append>
                  <v-btn
                    class="mr-2"
                    icon
                    @click="speakWord(word.french)"
                    size="small"
                  >
                    <v-icon>mdi-volume-high</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    @click="deleteWord(word.id)"
                    size="small"
                    color="error"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
            <p v-else>No words in your vocabulary yet. Add some above!</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  deleteDoc,
  getDocs,
  doc,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useUserStore } from "@/stores/user";

// Reactive variables
const newWord = ref({
  french: "",
  english: "",
});
const userVocabulary = ref([]);
const isTranslating = ref(false);
const isAutoTranslated = ref(false);
let unsubscribeVocabulary = null;
let debounceTimer = null;

// Initialize user store
const userStore = useUserStore();

// Translation function
const translateWord = async () => {
  const frenchWord = newWord.value.french.trim();

  if (!frenchWord) {
    newWord.value.english = "";
    isAutoTranslated.value = false;
    return;
  }

  isTranslating.value = true;
  isAutoTranslated.value = true;

  try {
    // Use MyMemory Translation API
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        frenchWord
      )}&langpair=fr|en`
    );

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    newWord.value.english = data.responseData.translatedText;
  } catch (error) {
    console.error("Error translating word:", error);
    newWord.value.english = "Translation failed - please enter manually";
    isAutoTranslated.value = false;
  } finally {
    isTranslating.value = false;
  }
};

// Debounced translation to avoid too many API calls
const debouncedTranslate = () => {
  // Clear previous timeout
  clearTimeout(debounceTimer);

  const frenchWord = newWord.value.french.trim();

  // If empty, clear immediately
  if (!frenchWord) {
    newWord.value.english = "";
    isAutoTranslated.value = false;
    return;
  }

  // Only auto-translate if English field is empty or was previously auto-translated
  if (!newWord.value.english.trim() || isAutoTranslated.value) {
    isTranslating.value = true;
    isAutoTranslated.value = true;

    // Debounce the API call (800ms delay)
    debounceTimer = setTimeout(() => {
      translateWord();
    }, 800);
  }
};

// Watch for manual edits in English field
watch(
  () => newWord.value.english,
  (englishWord) => {
    // If user manually edits the English field, mark it as not auto-translated
    if (englishWord && !isTranslating.value) {
      isAutoTranslated.value = false;
    }
  }
);

// Function to add a new word
const addNewWord = async () => {
  const frenchWord = newWord.value.french.trim();
  const englishWord = newWord.value.english.trim();

  if (!frenchWord || !englishWord || !userStore.user) return;

  try {
    // Check locally first for immediate feedback
    const localDuplicate = userVocabulary.value.find(
      (word) => word.french.toLowerCase() === frenchWord.toLowerCase()
    );

    if (localDuplicate) {
      alert(`"${frenchWord}" is already in your vocabulary!`);
      return;
    }

    // Double-check with Firestore to ensure no duplicates
    const duplicateQuery = query(
      collection(db, "vocabulary"),
      where("userId", "==", userStore.user.uid),
      where("french", "==", frenchWord)
    );

    const querySnapshot = await getDocs(duplicateQuery);

    if (!querySnapshot.empty) {
      alert(`"${frenchWord}" is already in your vocabulary!`);
      return;
    }

    // Speak the word using the Browser's API
    speakWord(frenchWord);

    // Save to Firestore
    await addDoc(collection(db, "vocabulary"), {
      userId: userStore.user.uid,
      french: frenchWord,
      english: englishWord,
      createdAt: new Date(),
    });

    // Reset form
    newWord.value = { french: "", english: "" };
    isAutoTranslated.value = false;
  } catch (error) {
    console.error("Error adding word:", error);
    alert("Failed to add word. Please try again.");
  }
};

// Function to speak a word
const speakWord = (word) => {
  if ("speechSynthesis" in window) {
    const speech = new SpeechSynthesisUtterance(word);
    speech.lang = "fr-FR";
    window.speechSynthesis.speak(speech);
  }
};

// Function to delete a word
const deleteWord = async (wordId) => {
  try {
    await deleteDoc(doc(db, "vocabulary", wordId));
  } catch (error) {
    console.error("Error deleting word:", error);
    alert("Failed to delete word. Please try again.");
  }
};

// Function to fetch user's vocabulary
const fetchUserVocabulary = () => {
  if (!userStore.user) return;

  const q = query(
    collection(db, "vocabulary"),
    where("userId", "==", userStore.user.uid),
    orderBy("createdAt", "desc")
  );

  unsubscribeVocabulary = onSnapshot(q, (querySnapshot) => {
    userVocabulary.value = [];
    querySnapshot.forEach((doc) => {
      userVocabulary.value.push({ id: doc.id, ...doc.data() });
    });
  });
};

// Clean up timeouts on unmount
onUnmounted(() => {
  if (unsubscribeVocabulary) {
    unsubscribeVocabulary();
  }
  clearTimeout(debounceTimer);
});

// Lifecycle hooks
onMounted(() => {
  fetchUserVocabulary();
});
</script>
