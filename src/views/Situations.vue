<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">French Conversation Practice</h1>

        <!-- Custom Conversation Form -->
        <v-card class="mb-6" v-if="showCustomForm">
          <v-card-title>Create Custom Conversation</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="customSituationTitle"
              label="Situation Title"
              class="mb-4"
            ></v-text-field>

            <v-textarea
              v-model="customSituationScript"
              label="Conversation Script (JSON format)"
              hint='Format: [{"role": "customer/shopkeeper", "text": "message"}]'
              persistent-hint
              rows="6"
              class="mb-4"
            ></v-textarea>

            <div class="d-flex">
              <v-btn color="primary" @click="saveCustomSituation" class="mr-2">
                Save Custom Situation
              </v-btn>
              <v-btn color="secondary" @click="showCustomForm = false">
                Cancel
              </v-btn>
            </div>

            <v-alert v-if="customFormError" type="error" class="mt-4">
              {{ customFormError }}
            </v-alert>
          </v-card-text>
        </v-card>

        <!-- Conversation Setup -->
        <v-card class="mb-6">
          <v-card-title>Conversation Setup</v-card-title>
          <v-card-text>
            <div class="d-flex justify-space-between align-center mb-4">
              <v-select
                v-model="selectedSituation"
                :items="allSituations"
                label="Select a situation"
                item-title="title"
                return-object
                style="max-width: 70%"
              ></v-select>

              <v-btn color="secondary" @click="showCustomForm = true">
                <v-icon left>mdi-plus</v-icon>
                Custom
              </v-btn>
            </div>

            <v-radio-group v-model="userRole" inline>
              <v-radio label="Customer" value="customer"></v-radio>
              <v-radio label="Shopkeeper" value="shopkeeper"></v-radio>
            </v-radio-group>

            <v-btn
              color="primary"
              @click="startConversation"
              :disabled="!selectedSituation || !userRole"
            >
              Start Conversation
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- Active Conversation -->
        <v-card v-if="conversationActive">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>{{ selectedSituation.title }}</span>
            <v-btn color="error" @click="stopConversation"
              >End Conversation</v-btn
            >
          </v-card-title>

          <v-card-text>
            <!-- Conversation Display -->
            <div class="conversation-container mb-4">
              <div
                v-for="(line, index) in conversationHistory"
                :key="index"
                :class="[
                  'message',
                  line.role === userRole ? 'user-message' : 'bot-message',
                ]"
              >
                <strong
                  >{{
                    line.role === "customer" ? "Customer" : "Shopkeeper"
                  }}:</strong
                >
                {{ line.text }}
                <v-btn
                  v-if="line.role !== userRole"
                  icon
                  size="x-small"
                  @click="speakText(line.text, 'fr')"
                  class="ml-2"
                >
                  <v-icon>mdi-volume-high</v-icon>
                </v-btn>
              </div>
            </div>

            <!-- Current Prompt -->
            <div
              v-if="currentPrompt"
              class="current-prompt mb-4 pa-3 bg-grey-lighten-3 rounded"
            >
              <strong
                >Your turn to respond as
                {{
                  userRole === "customer" ? "Customer" : "Shopkeeper"
                }}:</strong
              >
              <p class="mb-2">{{ currentPrompt }}</p>
              <div class="d-flex align-center flex-wrap">
                <v-btn
                  color="primary"
                  @click="speakText(currentPrompt, 'fr')"
                  size="small"
                  class="mr-2 mb-2"
                >
                  <v-icon left>mdi-volume-high</v-icon>
                  Hear prompt
                </v-btn>

                <!-- Speed Control Dropdown -->
                <v-select
                  v-model="speechSpeed"
                  :items="speedOptions"
                  item-title="text"
                  item-value="value"
                  label="Speed"
                  density="compact"
                  style="max-width: 100px"
                  variant="outlined"
                  hide-details
                  class="mb-2"
                ></v-select>
              </div>
            </div>

            <!-- Speech Recognition Controls -->
            <div class="recognition-controls text-center">
              <v-btn
                v-if="!isListening"
                color="primary"
                @click="startListening"
                :loading="isLoading"
                class="mb-2"
              >
                <v-icon left>mdi-microphone</v-icon>
                Start Speaking
              </v-btn>

              <v-btn v-else color="error" @click="stopListening" class="mb-2">
                <v-icon left>mdi-microphone-off</v-icon>
                Stop Listening
              </v-btn>

              <p v-if="isListening" class="text-body-1 listening-indicator">
                <v-progress-circular
                  indeterminate
                  size="16"
                  class="mr-2"
                ></v-progress-circular>
                Listening... Speak now
              </p>

              <p
                v-if="interimTranscript"
                class="interim-transcript text-body-2 pa-2 bg-grey-lighten-3 rounded"
              >
                {{ interimTranscript }}
              </p>
            </div>
          </v-card-text>
        </v-card>

        <!-- Instructions -->
        <v-card v-else>
          <v-card-title>How to Practice</v-card-title>
          <v-card-text>
            <ol>
              <li>Select a conversation situation from the dropdown</li>
              <li>
                Choose whether you want to play the customer or shopkeeper role
              </li>
              <li>Click "Start Conversation" to begin</li>
              <li>Listen to the prompt and respond in French</li>
              <li>
                The app will transcribe your speech and continue the
                conversation
              </li>
              <li>Practice your pronunciation and conversation skills!</li>
            </ol>

            <v-alert type="info" class="mt-4">
              Note: Speech recognition works best in Chrome browser. Make sure
              you have a microphone connected.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
// Import Firestore functions (assuming you've set up Firebase)
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase"; // Adjust path to your Firebase config

// Reactive variables
const selectedSituation = ref(null);
const userRole = ref("customer");
const conversationActive = ref(false);
const conversationHistory = ref([]);
const currentPrompt = ref("");
const isListening = ref(false);
const isLoading = ref(false);
const interimTranscript = ref("");
const recognition = ref(null);
const speechSpeed = ref(1.0); // Default to normal speed
const showCustomForm = ref(false);
const customSituationTitle = ref("");
const customSituationScript = ref("");
const customFormError = ref("");
const customSituations = ref([]);
const userId = ref("");

// Speed options
const speedOptions = ref([
  { value: 0.5, text: "0.5x " },
  { value: 0.8, text: "0.8x" },
  { value: 1.0, text: "1.0x" },
  { value: 1.2, text: "1.2x" },
]);

// Sample conversation situations
const defaultSituations = ref([
  {
    title: "Coffee Shop Order",
    script: [
      { role: "shopkeeper", text: "Bonjour, que désirez-vous ?" },
      {
        role: "customer",
        text: "Bonjour, je voudrais un café au lait, s'il vous plaît.",
      },
      {
        role: "shopkeeper",
        text: "Bien sûr, quel format ? Petit, moyen ou grand ?",
      },
      { role: "customer", text: "Un moyen, s'il vous plaît." },
      {
        role: "shopkeeper",
        text: "Cela fera 3,50 euros. Sur place ou à emporter ?",
      },
      { role: "customer", text: "Sur place, merci." },
      {
        role: "shopkeeper",
        text: "Très bien, je vous apporte cela dans un instant.",
      },
    ],
  },
  {
    title: "Clothing Store",
    script: [
      { role: "shopkeeper", text: "Bonjour, puis-je vous aider ?" },
      { role: "customer", text: "Oui, je cherche un pull en laine." },
      { role: "shopkeeper", text: "Quelle taille faites-vous ?" },
      { role: "customer", text: "Je fais du medium." },
      { role: "shopkeeper", text: "Quelle couleur préférez-vous ?" },
      { role: "customer", text: "Je préfère le bleu marine." },
      {
        role: "shopkeeper",
        text: "Voici plusieurs modèles dans votre taille et couleur préférée.",
      },
    ],
  },
  {
    title: "Restaurant Booking",
    script: [
      {
        role: "shopkeeper",
        text: "Bonjour, restaurant Le Bon Goût, comment puis-je vous aider ?",
      },
      {
        role: "customer",
        text: "Bonjour, je voudrais réserver une table pour ce soir.",
      },
      {
        role: "shopkeeper",
        text: "Pour combien de personnes et à quelle heure ?",
      },
      { role: "customer", text: "Pour deux personnes, à 20 heures." },
      {
        role: "shopkeeper",
        text: "C'est parfait, nous avons une table disponible. À quel nom ?",
      },
      { role: "customer", text: "Au nom de Martin." },
      {
        role: "shopkeeper",
        text: "Très bien, nous vous attendons ce soir à 20 heures.",
      },
    ],
  },
]);

// Combined situations (default + custom)
const allSituations = computed(() => {
  return [...defaultSituations.value, ...customSituations.value];
});

// Initialize user ID
const initUserId = () => {
  let user = localStorage.getItem("userAuth");
  user = JSON.parse(user);
  userId.value = user.uid;
};

// Load custom situations from Firestore
const loadCustomSituations = async () => {
  console.log(userId);

  try {
    const q = query(
      collection(db, "situations"),
      where("userId", "==", userId.value),
      orderBy("timeCreated", "desc")
    );

    const querySnapshot = await getDocs(q);
    customSituations.value = [];
    console.log(2);
    console.log(querySnapshot.docs[0]);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(3);

      customSituations.value.push({
        id: doc.id,
        title: data.title,
        script: data.script,
      });
    });
  } catch (error) {
    console.error("Error loading custom situations:", error);
  }
};

// Save custom situation to Firestore
const saveCustomSituation = async () => {
  // Validate inputs
  if (!customSituationTitle.value.trim()) {
    customFormError.value = "Please enter a title for the situation";
    return;
  }

  if (!customSituationScript.value.trim()) {
    customFormError.value = "Please enter a conversation script";
    return;
  }

  // Try to parse the script
  try {
    const script = JSON.parse(customSituationScript.value);

    // Validate script structure
    if (!Array.isArray(script) || script.length === 0) {
      customFormError.value = "Script must be a non-empty array";
      return;
    }

    for (const item of script) {
      if (
        !item.role ||
        !item.text ||
        (item.role !== "customer" && item.role !== "shopkeeper")
      ) {
        customFormError.value =
          "Each script item must have a role (customer/shopkeeper) and text";
        return;
      }
    }

    // Save to Firestore
    try {
      const docRef = await addDoc(collection(db, "situations"), {
        title: customSituationTitle.value,
        script: script,
        userId: userId.value,
        timeCreated: new Date(),
      });

      // Add to local custom situations
      customSituations.value.unshift({
        id: docRef.id,
        title: customSituationTitle.value,
        script: script,
      });

      // Reset form
      customSituationTitle.value = "";
      customSituationScript.value = "";
      customFormError.value = "";
      showCustomForm.value = false;
    } catch (error) {
      console.error("Error saving custom situation:", error);
      customFormError.value = "Error saving situation: " + error.message;
    }
  } catch (error) {
    customFormError.value = "Invalid JSON format for script";
    return;
  }
};

console.log(customSituations);

// Initialize speech recognition
const initSpeechRecognition = () => {
  // Check if browser supports speech recognition
  if (
    !("webkitSpeechRecognition" in window) &&
    !("SpeechRecognition" in window)
  ) {
    alert(
      "Your browser doesn't support speech recognition. Please use Chrome."
    );
    return;
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition.value = new SpeechRecognition();
  recognition.value.continuous = false;
  recognition.value.interimResults = true;
  recognition.value.lang = "fr-FR";

  recognition.value.onstart = () => {
    isListening.value = true;
    interimTranscript.value = "";
  };

  recognition.value.onresult = (event) => {
    let finalTranscript = "";
    interimTranscript.value = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript.value += transcript;
      }
    }

    if (finalTranscript) {
      processUserResponse(finalTranscript);
    }
  };

  recognition.value.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    isListening.value = false;

    if (event.error === "not-allowed") {
      alert("Please allow microphone access to use speech recognition.");
    }
  };

  recognition.value.onend = () => {
    isListening.value = false;
  };
};

// Start conversation
const startConversation = () => {
  conversationActive.value = true;
  conversationHistory.value = [];
  currentPrompt.value = "";

  // Find the first line that's NOT the user's role
  const firstBotLine = selectedSituation.value.script.find(
    (line) => line.role !== userRole.value
  );

  if (firstBotLine) {
    conversationHistory.value.push(firstBotLine);
    speakText(firstBotLine.text, "fr");

    // Set the next prompt for the user
    setNextPrompt();
  }
};

// Stop conversation
const stopConversation = () => {
  conversationActive.value = false;
  if (isListening.value) {
    stopListening();
  }
};

// Set the next prompt for the user
const setNextPrompt = () => {
  const nextLineIndex = conversationHistory.value.length;

  if (nextLineIndex < selectedSituation.value.script.length) {
    const nextLine = selectedSituation.value.script[nextLineIndex];

    if (nextLine.role === userRole.value) {
      currentPrompt.value = nextLine.text;
    } else {
      // If it's not the user's turn, add the bot line and speak it
      conversationHistory.value.push(nextLine);
      speakText(nextLine.text, "fr");

      // Then set the next prompt (recursive)
      setTimeout(setNextPrompt, 1500); // Wait a bit before continuing
    }
  } else {
    // End of conversation
    currentPrompt.value =
      "La conversation est terminée. Merci d'avoir pratiqué !";
  }
};

// Process user response
const processUserResponse = (transcript) => {
  // Add user's response to conversation history
  conversationHistory.value.push({
    role: userRole.value,
    text: transcript,
  });

  // Set the next prompt
  setNextPrompt();
};

// Start listening
const startListening = () => {
  if (recognition.value) {
    recognition.value.start();
  }
};

// Stop listening
const stopListening = () => {
  if (recognition.value) {
    recognition.value.stop();
  }
};

// Text-to-speech function with speed control
const speakText = (text, langCode) => {
  if (!text || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode === "fr" ? "fr-FR" : "en-US";
  utterance.rate = speechSpeed.value; // Use the selected speed

  window.speechSynthesis.speak(utterance);
};

// Clean up on unmount
onUnmounted(() => {
  if (recognition.value) {
    recognition.value.stop();
  }
  window.speechSynthesis.cancel();
});

// Initialize when component mounts
onMounted(() => {
  initSpeechRecognition();
  initUserId();
  loadCustomSituations();
});
</script>

<style scoped>
.conversation-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 16px;
}

.message {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 18px;
  max-width: 80%;
}

.user-message {
  background-color: #e3f2fd;
  margin-left: auto;
  text-align: right;
}

.bot-message {
  background-color: #f5f5f5;
  margin-right: auto;
}

.listening-indicator {
  color: #1976d2;
  font-weight: bold;
}

.interim-transcript {
  font-style: italic;
  color: #666;
}

.current-prompt {
  border-left: 4px solid #1976d2;
}
</style>
