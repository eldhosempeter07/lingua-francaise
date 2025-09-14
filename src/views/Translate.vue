<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>Translation Tool</span>
            <v-btn
              @click="swapLanguages"
              color="primary"
              variant="outlined"
              prepend-icon="mdi-swap-horizontal"
            >
              Swap Languages
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-row>
              <!-- Left Side (Source Language) -->
              <v-col cols="12" md="5">
                <v-select
                  v-model="sourceLanguage"
                  :items="languageOptions"
                  label="Translate from"
                  item-title="name"
                  item-value="code"
                  variant="outlined"
                ></v-select>
                <v-textarea
                  ref="sourceTextarea"
                  v-model="sourceText"
                  label="Enter text"
                  outlined
                  rows="8"
                  auto-grow
                  @input="debouncedTranslate"
                  @mouseup="updateSelection('source')"
                  @keyup="updateSelection('source')"
                ></v-textarea>
                <div class="d-flex align-center">
                  <v-btn
                    @click="
                      playSelectedText(
                        'source',
                        sourceLanguage,
                        sourceSpeechSpeed
                      )
                    "
                    :disabled="!sourceText"
                    color="primary"
                    variant="tonal"
                    prepend-icon="mdi-volume-high"
                    class="mr-2"
                  >
                    {{ sourceSelection ? "Play Selection" : "Play All" }}
                  </v-btn>
                  <v-select
                    v-model="sourceSpeechSpeed"
                    :items="speedOptions"
                    item-title="text"
                    item-value="value"
                    label="Speed"
                    density="compact"
                    style="max-width: 120px"
                    variant="outlined"
                    hide-details
                  ></v-select>
                </div>
                <!-- <div v-if="sourceSelection" class="text-caption text-info mt-1">
                  Selection: "{{ sourceSelection }}"
                </div> -->
              </v-col>

              <!-- Middle Column with Translate Button -->
              <v-col
                cols="12"
                md="2"
                class="text-center d-flex flex-column justify-center"
              >
                <v-btn
                  @click="translateText"
                  color="primary"
                  size="large"
                  :loading="translating"
                  class="my-4"
                >
                  Translate
                  <v-icon end>mdi-arrow-right</v-icon>
                </v-btn>
              </v-col>

              <!-- Right Side (Target Language) -->
              <v-col cols="12" md="5">
                <v-select
                  v-model="targetLanguage"
                  :items="languageOptions"
                  label="Translate to"
                  item-title="name"
                  item-value="code"
                  variant="outlined"
                ></v-select>
                <v-textarea
                  ref="targetTextarea"
                  v-model="translatedText"
                  label="Translation"
                  outlined
                  rows="8"
                  auto-grow
                  readonly
                  @mouseup="updateSelection('target')"
                  @keyup="updateSelection('target')"
                ></v-textarea>
                <div class="d-flex align-center">
                  <v-btn
                    @click="
                      playSelectedText(
                        'target',
                        targetLanguage,
                        destinationSpeechSpeed
                      )
                    "
                    :disabled="!translatedText"
                    color="primary"
                    variant="tonal"
                    prepend-icon="mdi-volume-high"
                    class="mr-2"
                  >
                    {{ targetSelection ? "Play Selection" : "Play All" }}
                  </v-btn>
                  <v-select
                    v-model="destinationSpeechSpeed"
                    :items="speedOptions"
                    item-title="text"
                    item-value="value"
                    label="Speed"
                    density="compact"
                    style="max-width: 120px"
                    variant="outlined"
                    hide-details
                  ></v-select>
                </div>
                <!-- <div v-if="targetSelection" class="text-caption text-info mt-1">
                  Selection: "{{ targetSelection }}"
                </div> -->
              </v-col>
            </v-row>

            <!-- Translation History -->
            <v-expansion-panels class="mt-6" v-if="translationHistory.length">
              <v-expansion-panel>
                <v-expansion-panel-title>
                  Translation History
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-list>
                    <v-list-item
                      v-for="(item, index) in translationHistory"
                      :key="index"
                      class="mb-2"
                    >
                      <v-list-item-title>
                        <strong>{{ getLanguageName(item.source) }}:</strong>
                        {{ item.sourceText }}
                      </v-list-item-title>
                      <v-list-item-subtitle>
                        <strong>{{ getLanguageName(item.target) }}:</strong>
                        {{ item.translatedText }}
                      </v-list-item-subtitle>
                      <template v-slot:append>
                        <v-btn
                          icon
                          @click="copyToClipboard(item.translatedText)"
                          size="small"
                        >
                          <v-icon>mdi-content-copy</v-icon>
                        </v-btn>
                      </template>
                    </v-list-item>
                  </v-list>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { useUserStore } from "@/stores/user";

// Reactive variables
const sourceLanguage = ref("fr");
const targetLanguage = ref("en");
const sourceText = ref("");
const translatedText = ref("");
const translating = ref(false);
const translationHistory = ref([]);
const sourceSpeechSpeed = ref(1.0);
const destinationSpeechSpeed = ref(1.0);
const sourceSelection = ref("");
const targetSelection = ref("");
const sourceTextarea = ref(null);
const targetTextarea = ref(null);
const sourceSelectionRange = ref({ start: 0, end: 0 });
const targetSelectionRange = ref({ start: 0, end: 0 });

// Language options
const languageOptions = ref([
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
]);

// Speed options
const speedOptions = ref([
  { value: 0.5, text: "0.5x" },
  { value: 0.8, text: "0.8x" },
  { value: 1.0, text: "1.0x" },
  { value: 1.2, text: "1.2x" },
]);

// User store
const userStore = useUserStore();

// Get language name from code
const getLanguageName = (code) => {
  const lang = languageOptions.value.find((l) => l.code === code);
  return lang ? `${lang.flag} ${lang.name}` : code;
};

// Update text selection
const updateSelection = (type) => {
  nextTick(() => {
    const textarea =
      type === "source" ? sourceTextarea.value : targetTextarea.value;
    if (!textarea) return;

    const textareaEl = textarea.$el.querySelector("textarea");
    if (!textareaEl) return;

    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;

    if (start !== end) {
      const selectedText = textareaEl.value.substring(start, end);
      if (type === "source") {
        sourceSelection.value = selectedText;
        sourceSelectionRange.value = { start, end };
      } else {
        targetSelection.value = selectedText;
        targetSelectionRange.value = { start, end };
      }
    } else {
      if (type === "source") {
        sourceSelection.value = "";
        sourceSelectionRange.value = { start: 0, end: 0 };
      } else {
        targetSelection.value = "";
        targetSelectionRange.value = { start: 0, end: 0 };
      }
    }
  });
};

// Restore text selection after playback
const restoreSelection = (type) => {
  nextTick(() => {
    const textarea =
      type === "source" ? sourceTextarea.value : targetTextarea.value;
    if (!textarea) return;

    const textareaEl = textarea.$el.querySelector("textarea");
    if (!textareaEl) return;

    const range =
      type === "source"
        ? sourceSelectionRange.value
        : targetSelectionRange.value;

    if (range.start !== range.end) {
      textareaEl.focus();
      textareaEl.setSelectionRange(range.start, range.end);
    }
  });
};

// Play selected text or all text if no selection
const playSelectedText = (type, langCode, speed) => {
  let textToPlay = "";

  if (type === "source") {
    textToPlay = sourceSelection.value || sourceText.value;
  } else {
    textToPlay = targetSelection.value || translatedText.value;
  }

  if (!textToPlay || !("speechSynthesis" in window)) return;

  // Stop any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(textToPlay);

  // Set speech speed
  utterance.rate = speed;

  // Set language based on code
  switch (langCode) {
    case "fr":
      utterance.lang = "fr-FR";
      break;
    default:
      utterance.lang = "en-US";
  }

  // Restore selection after speech completes
  utterance.onend = () => {
    restoreSelection(type);
  };

  window.speechSynthesis.speak(utterance);
};

// Swap languages function
const swapLanguages = () => {
  const tempLang = sourceLanguage.value;
  sourceLanguage.value = targetLanguage.value;
  targetLanguage.value = tempLang;

  const tempText = sourceText.value;
  sourceText.value = translatedText.value;
  translatedText.value = tempText;

  // Also swap selections
  const tempSelection = sourceSelection.value;
  sourceSelection.value = targetSelection.value;
  targetSelection.value = tempSelection;

  const tempRange = { ...sourceSelectionRange.value };
  sourceSelectionRange.value = { ...targetSelectionRange.value };
  targetSelectionRange.value = tempRange;
};

// Copy to clipboard function
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    // You could add a toast notification here
    console.log("Text copied to clipboard");
  });
};

// Translate function using MyMemory API
const translateText = async () => {
  translating.value = true;

  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        sourceText.value
      )}&langpair=${sourceLanguage.value}|${targetLanguage.value}`
    );

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();

    // Check if the API returned a successful response
    if (data.responseStatus === 200) {
      translatedText.value = data.responseData.translatedText;
    } else {
      throw new Error(`Translation API error: ${data.responseStatus}`);
    }

    // Save to history
    translationHistory.value.unshift({
      source: sourceLanguage.value,
      target: targetLanguage.value,
      sourceText: sourceText.value,
      translatedText: data.responseData.translatedText,
      timestamp: new Date(),
    });

    // Keep only last 10 translations
    if (translationHistory.value.length > 10) {
      translationHistory.value.pop();
    }
  } catch (error) {
    console.error("Translation error:", error);
    translatedText.value = "Translation failed. Please try again.";
  } finally {
    translating.value = false;
  }
};

// Debounced translation to avoid too many API calls
let debounceTimer;
const debouncedTranslate = () => {
  clearTimeout(debounceTimer);
  if (!sourceText.value.trim()) {
    translatedText.value = "";
    return;
  }
  // Only auto-translate for short texts
  if (sourceText.value.length > 0 && sourceText.value.length < 250) {
    debounceTimer = setTimeout(translateText, 800);
  }
};

// Save translation history to localStorage
const saveHistory = () => {
  if (userStore.user) {
    localStorage.setItem(
      `translationHistory_${userStore.user.uid}`,
      JSON.stringify(translationHistory.value)
    );
  }
};

// Load translation history from localStorage
const loadHistory = () => {
  if (userStore.user) {
    const saved = localStorage.getItem(
      `translationHistory_${userStore.user.uid}`
    );
    if (saved) {
      translationHistory.value = JSON.parse(saved);
    }
  }
};

onMounted(() => {
  loadHistory();
});
</script>

<style scoped>
.v-btn {
  text-transform: none;
}

.d-flex.align-center {
  margin-top: 8px;
}

.text-info {
  color: #1976d2;
  font-style: italic;
}
</style>
