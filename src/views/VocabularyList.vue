<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Vocabulary List</h1>

        <!-- Category Filter -->
        <v-card class="mb-6">
          <v-card-title>Filter by Category</v-card-title>
          <v-card-text>
            <v-select
              v-model="selectedCategory"
              :items="categories"
              item-title="name"
              item-value="id"
              label="Select a category"
              @update:modelValue="filterByCategory"
            ></v-select>
          </v-card-text>
        </v-card>

        <!-- Vocabulary List by Category -->
        <div v-if="selectedCategory">
          <v-card>
            <v-card-title>
              {{ getCategoryName(selectedCategory) }}
              <v-spacer></v-spacer>
              <v-btn
                v-if="showAllWords"
                @click="showAllWords = false"
                color="primary"
              >
                View Less
              </v-btn>
              <v-btn
                v-else
                v-if="filteredWords.length"
                @click="showAllWords = true"
                color="primary"
              >
                View All
              </v-btn>
            </v-card-title>
            <v-card-text>
              <v-list v-if="filteredWords.length">
                <v-list-item
                  v-for="word in displayedWords"
                  :key="word.id"
                  class="mb-2"
                >
                  <v-list-item-title>
                    <strong>{{ word.french }}</strong> - {{ word.english }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    Type: {{ getTypeName(word.type) }}
                  </v-list-item-subtitle>
                  <template v-slot:append>
                    <v-menu>
                      <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" icon class="mr-2">
                          <v-icon>mdi-volume-high</v-icon>
                        </v-btn>
                      </template>
                      <v-list>
                        <v-list-item @click="speakWord(word.french, 'fr', 0.5)">
                          <v-list-item-title>French (0.5x)</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="speakWord(word.french, 'fr', 0.8)">
                          <v-list-item-title>French (0.8x)</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="speakWord(word.french, 'fr', 1)">
                          <v-list-item-title>French (1x)</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="speakWord(word.french, 'fr', 1.2)">
                          <v-list-item-title>French (1.2x)</v-list-item-title>
                        </v-list-item>
                        <v-divider></v-divider>
                        <v-list-item
                          @click="speakWord(word.english, 'en', 0.5)"
                        >
                          <v-list-item-title>English (0.5x)</v-list-item-title>
                        </v-list-item>
                        <v-list-item
                          @click="speakWord(word.english, 'en', 0.8)"
                        >
                          <v-list-item-title>English (0.8x)</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="speakWord(word.english, 'en', 1)">
                          <v-list-item-title>English (1x)</v-list-item-title>
                        </v-list-item>
                        <v-list-item
                          @click="speakWord(word.english, 'en', 1.2)"
                        >
                          <v-list-item-title>English (1.2x)</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
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
              <p v-else>No words found in this category.</p>
            </v-card-text>
          </v-card>
        </div>

        <v-alert v-else type="info" class="mt-4">
          Please select a category to view words.
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/firebase";

export default {
  name: "VocabularyList",
  setup() {
    // Reactive variables
    const userVocabulary = ref([]);
    const categories = ref([]);
    const types = ref([]);
    const selectedCategory = ref(null);
    const filteredWords = ref([]);
    const showAllWords = ref(false);

    // Computed property for displayed words
    const displayedWords = computed(() => {
      if (showAllWords.value) {
        return filteredWords.value;
      }
      return filteredWords.value.slice(0, 5);
    });

    // Methods
    const filterByCategory = () => {
      if (!selectedCategory.value) {
        filteredWords.value = [];
        return;
      }

      filteredWords.value = userVocabulary.value.filter(
        (word) => word.category === selectedCategory.value
      );
      showAllWords.value = false;
    };

    const fetchCategoriesAndTypes = async () => {
      try {
        // Fetch categories
        const categoriesQuery = query(
          collection(db, "categories"),
          orderBy("name")
        );

        const categoriesSnapshot = await getDocs(categoriesQuery);
        categories.value = categoriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Fetch types
        const typesSnapshot = await getDocs(collection(db, "types"));
        types.value = typesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        console.error("Error fetching categories and types:", error);
      }
    };

    const getCategoryName = (categoryId) => {
      const category = categories.value.find((cat) => cat.id === categoryId);
      return category ? category.name : "Unknown";
    };

    const getTypeName = (typeId) => {
      const type = types.value.find((t) => t.id === typeId);
      return type ? type.name : "Unknown";
    };

    const deleteWord = async (wordId) => {
      try {
        await deleteDoc(doc(db, "vocabulary", wordId));
      } catch (error) {
        console.error("Error deleting word:", error);
      }
    };

    const speakWord = (word, lang = "en", rate = 1) => {
      if ("speechSynthesis" in window) {
        const speech = new SpeechSynthesisUtterance(word);
        speech.lang = lang == "en" ? "en-US" : "fr-FR";
        speech.rate = rate;
        window.speechSynthesis.speak(speech);
      }
    };

    const fetchUserVocabulary = () => {
      const q = query(
        collection(db, "vocabulary"),
        orderBy("createdAt", "desc")
      );

      onSnapshot(q, (querySnapshot) => {
        userVocabulary.value = [];
        querySnapshot.forEach((doc) => {
          userVocabulary.value.push({ id: doc.id, ...doc.data() });
        });

        // Set the first category as default if none is selected
        if (categories.value.length > 0 && !selectedCategory.value) {
          selectedCategory.value = categories.value[0].id;
          filterByCategory();
        }
      });
    };

    // Lifecycle hooks
    onMounted(async () => {
      await fetchCategoriesAndTypes();
      fetchUserVocabulary();
    });

    // Return all variables and methods
    return {
      userVocabulary,
      categories,
      types,
      selectedCategory,
      filteredWords,
      showAllWords,
      displayedWords,
      filterByCategory,
      getCategoryName,
      getTypeName,
      deleteWord,
      speakWord,
    };
  },
};
</script>

<style scoped>
.word-item {
  border-left: 4px solid #1976d2;
  padding-left: 12px;
  margin-bottom: 8px;
}
</style>
