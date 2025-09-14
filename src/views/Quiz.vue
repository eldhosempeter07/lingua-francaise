<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <!-- Not Enough Words Screen -->
        <v-card v-if="userVocabulary.length === 0" class="pa-4 text-center">
          <v-card-title class="text-h4 mb-4">French Quiz</v-card-title>
          <v-card-text>
            <v-icon size="64" color="grey-lighten-1" class="mb-4"
              >mdi-book-off</v-icon
            >
            <p class="text-h6 mb-2">No vocabulary available</p>
            <p class="text-body-1 mb-4">
              You need to add words to your vocabulary before taking a quiz.
            </p>
          </v-card-text>
          <v-card-actions class="justify-center">
            <v-btn
              color="primary"
              size="large"
              @click="$router.push('/vocabulary')"
            >
              Add Words to Vocabulary
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- Quiz Intro Screen -->
        <v-card
          v-else-if="!quizStarted && !quizFinished"
          class="pa-4 text-center"
        >
          <v-card-title class="text-h4 mb-4">French Quiz</v-card-title>
          <v-card-text>
            <p class="text-h6 mb-2">
              Test your knowledge of {{ userVocabulary.length }} words
            </p>
            <p>This quiz includes multiple choice and spelling questions.</p>

            <!-- Dynamic question count selection -->
            <v-select
              v-model="selectedQuestionCount"
              :items="availableQuestionCounts"
              label="Number of questions"
              class="my-4"
              :hint="questionCountHint"
              persistent-hint
            ></v-select>

            <p
              v-if="userVocabulary.length < 5"
              class="text-caption text-warning"
            >
              * Add more words to unlock more questions
            </p>
          </v-card-text>
          <v-card-actions class="justify-center">
            <v-btn
              color="primary"
              size="large"
              @click="startQuiz"
              :disabled="userVocabulary.length === 0"
            >
              Start Quiz
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- Quiz In Progress -->
        <div v-else-if="quizStarted && !quizFinished">
          <!-- Progress Bar -->
          <v-progress-linear
            v-model="progress"
            color="primary"
            height="20"
            class="mb-4"
          >
            <template v-slot:default="{ value }">
              <strong>{{ Math.ceil(value) }}%</strong>
            </template>
          </v-progress-linear>

          <!-- Question Display -->
          <v-card class="pa-4">
            <!-- Multiple Choice Question -->
            <div v-if="currentQuestion.type === 'multiple-choice'">
              <v-card-title class="text-h5 mb-4">
                What is the English translation of "<strong>{{
                  currentQuestion.word
                }}</strong
                >"?
              </v-card-title>
              <v-card-text>
                <v-radio-group v-model="selectedAnswer">
                  <v-radio
                    v-for="(option, index) in currentQuestion.options"
                    :key="index"
                    :label="option"
                    :value="option"
                    class="my-2"
                  ></v-radio>
                </v-radio-group>
              </v-card-text>
            </div>

            <!-- Spelling Question -->
            <div v-if="currentQuestion.type === 'spelling'">
              <v-card-title class="text-h5 mb-4">
                Spell the word you hear
                <v-btn icon @click="playCurrentWord" class="ml-2">
                  <v-icon>mdi-volume-high</v-icon>
                </v-btn>
              </v-card-title>
              <v-card-text>
                <v-text-field
                  v-model="spellingAnswer"
                  label="Type the word"
                  outlined
                  @keyup.enter="checkAnswer"
                ></v-text-field>
              </v-card-text>
            </div>

            <!-- Navigation -->
            <v-card-actions class="justify-space-between">
              <v-btn
                @click="previousQuestion"
                :disabled="currentQuestionIndex === 0"
              >
                Previous
              </v-btn>
              <v-btn
                color="primary"
                @click="checkAnswer"
                :disabled="!isAnswerSelected"
              >
                {{
                  currentQuestionIndex === questions.length - 1
                    ? "Finish Quiz"
                    : "Next"
                }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </div>

        <!-- Quiz Results -->
        <v-card v-else-if="quizFinished" class="pa-4 text-center">
          <v-card-title class="text-h3 mb-4">Quiz Results</v-card-title>
          <v-card-text>
            <v-progress-circular
              :rotate="360"
              :size="150"
              :width="15"
              :value="scorePercentage"
              color="primary"
              class="mb-4"
            >
              <span class="text-h4">{{ score }}/{{ questions.length }}</span>
            </v-progress-circular>
            <p class="text-h6 mt-4">You scored {{ scorePercentage }}%</p>
            <p class="text-body-1" v-if="scorePercentage >= 80">
              Excellent work!
            </p>
            <p class="text-body-1" v-else-if="scorePercentage >= 60">
              Good effort!
            </p>
            <p class="text-body-1" v-else>Keep practicing!</p>
          </v-card-text>
          <v-card-actions class="justify-center">
            <v-btn color="primary" @click="restartQuiz">Try Again</v-btn>
            <v-btn @click="$router.push('/vocabulary')"
              >Back to Vocabulary</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useUserStore } from "@/stores/user";

const router = useRouter();

// Reactive variables
const quizStarted = ref(false);
const quizFinished = ref(false);
const questions = ref([]);
const currentQuestionIndex = ref(0);
const selectedAnswer = ref(null);
const spellingAnswer = ref("");
const userVocabulary = ref([]);
const selectedQuestionCount = ref(5); // Default to 5
const userAnswers = ref([]);
const score = ref(0);

// Initialize user store
const userStore = useUserStore();

// Computed properties
const availableQuestionCounts = computed(() => {
  const totalWords = userVocabulary.value.length;

  if (totalWords === 0) return [];
  if (totalWords < 5) return [totalWords];
  if (totalWords < 10) return [5, totalWords];
  if (totalWords < 15) return [5, 10, totalWords];
  if (totalWords < 20) return [5, 10, 15, totalWords];

  return [5, 10, 15, 20];
});

const questionCountHint = computed(() => {
  const total = userVocabulary.value.length;
  if (total < 5) return `Only ${total} word${total !== 1 ? "s" : ""} available`;
  if (total < 10) return `Up to ${total} questions available`;
  return "Choose number of questions";
});

const currentQuestion = computed(() => {
  return questions.value[currentQuestionIndex.value] || {};
});

const progress = computed(() => {
  return ((currentQuestionIndex.value + 1) / questions.value.length) * 100;
});

const isAnswerSelected = computed(() => {
  if (currentQuestion.value.type === "multiple-choice") {
    return selectedAnswer.value !== null;
  } else {
    return spellingAnswer.value.trim() !== "";
  }
});

const scorePercentage = computed(() => {
  return Math.round((score.value / questions.value.length) * 100);
});

// Methods
const startQuiz = () => {
  if (userVocabulary.value.length === 0) {
    return; // Shouldn't happen due to disabled button, but just in case
  }

  generateQuestions();
  quizStarted.value = true;
  quizFinished.value = false;
  currentQuestionIndex.value = 0;
  selectedAnswer.value = null;
  spellingAnswer.value = "";
  userAnswers.value = [];
  score.value = 0;
};

const generateQuestions = () => {
  const numQuestions = Math.min(
    selectedQuestionCount.value,
    userVocabulary.value.length
  );
  const shuffledWords = [...userVocabulary.value]
    .sort(() => Math.random() - 0.5)
    .slice(0, numQuestions);

  questions.value = shuffledWords.map((word, index) => {
    // Alternate between multiple choice and spelling questions
    const type = index % 2 === 0 ? "multiple-choice" : "spelling";

    if (type === "multiple-choice") {
      // Get random incorrect options (fewer options if not enough words)
      const availableWrongWords = userVocabulary.value.filter(
        (w) => w.id !== word.id
      );
      const numOptions = Math.min(3, availableWrongWords.length);
      const otherWords = availableWrongWords
        .sort(() => Math.random() - 0.5)
        .slice(0, numOptions)
        .map((w) => w.english);

      // Combine with correct answer and shuffle
      const options = [word.english, ...otherWords].sort(
        () => Math.random() - 0.5
      );

      return {
        id: word.id,
        type: "multiple-choice",
        word: word.french,
        correctAnswer: word.english,
        options: options,
      };
    } else {
      return {
        id: word.id,
        type: "spelling",
        word: word.french,
        correctAnswer: word.french,
      };
    }
  });
};

// ... rest of the methods remain the same ...

const checkAnswer = () => {
  const isCorrect =
    currentQuestion.value.type === "multiple-choice"
      ? selectedAnswer.value === currentQuestion.value.correctAnswer
      : spellingAnswer.value.toLowerCase() ===
        currentQuestion.value.correctAnswer.toLowerCase();

  // Record the answer
  userAnswers.value[currentQuestionIndex.value] = {
    question: currentQuestion.value,
    userAnswer:
      currentQuestion.value.type === "multiple-choice"
        ? selectedAnswer.value
        : spellingAnswer.value,
    isCorrect: isCorrect,
  };

  // Update score if correct
  if (isCorrect) {
    score.value++;

    // Update word mastery in Firestore
    updateWordMastery(currentQuestion.value.id, true);
  } else {
    updateWordMastery(currentQuestion.value.id, false);
  }

  // Move to next question or finish quiz
  if (currentQuestionIndex.value < questions.value.length - 1) {
    nextQuestion();
  } else {
    finishQuiz();
  }
};

const updateWordMastery = async (wordId, isCorrect) => {
  try {
    const wordDoc = doc(db, "vocabulary", wordId);
    const word = userVocabulary.value.find((w) => w.id === wordId);

    // Calculate new mastery score (simplified)
    const currentMastery = word.mastery || 0;
    const newMastery = isCorrect
      ? Math.min(100, currentMastery + 20)
      : Math.max(0, currentMastery - 10);

    await updateDoc(wordDoc, {
      mastery: newMastery,
      lastPracticed: new Date(),
    });
  } catch (error) {
    console.error("Error updating word mastery:", error);
  }
};

const nextQuestion = () => {
  currentQuestionIndex.value++;
  selectedAnswer.value = null;
  spellingAnswer.value = "";
};

const previousQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--;
    // Restore previous answer if exists
    if (userAnswers.value[currentQuestionIndex.value]) {
      const previousAnswer = userAnswers.value[currentQuestionIndex.value];
      if (previousAnswer.question.type === "multiple-choice") {
        selectedAnswer.value = previousAnswer.userAnswer;
      } else {
        spellingAnswer.value = previousAnswer.userAnswer;
      }
    }
  }
};

const finishQuiz = () => {
  quizFinished.value = true;
};

const restartQuiz = () => {
  startQuiz();
};

const playCurrentWord = () => {
  if ("speechSynthesis" in window && currentQuestion.value.word) {
    const speech = new SpeechSynthesisUtterance(currentQuestion.value.word);
    speech.lang = "fr-FR";
    window.speechSynthesis.speak(speech);
  }
};

// Fetch user's vocabulary
const fetchUserVocabulary = () => {
  if (!userStore.user) return;

  const q = query(
    collection(db, "vocabulary"),
    where("userId", "==", userStore.user.uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (querySnapshot) => {
    userVocabulary.value = [];
    querySnapshot.forEach((doc) => {
      userVocabulary.value.push({ id: doc.id, ...doc.data() });
    });
  });
};

// Lifecycle hooks
onMounted(() => {
  fetchUserVocabulary();
});

// Watch for user authentication
watch(
  () => userStore.user,
  (newUser) => {
    if (newUser) {
      fetchUserVocabulary();
    }
  }
);

// Watch vocabulary length to adjust selected question count
watch(
  () => userVocabulary.value.length,
  (newLength) => {
    if (newLength === 0) {
      selectedQuestionCount.value = 0;
    } else if (newLength < 5) {
      selectedQuestionCount.value = newLength;
    } else if (newLength < 10 && selectedQuestionCount.value > newLength) {
      selectedQuestionCount.value = 5;
    } else if (newLength < 15 && selectedQuestionCount.value > newLength) {
      selectedQuestionCount.value = 10;
    } else if (newLength < 20 && selectedQuestionCount.value > newLength) {
      selectedQuestionCount.value = 15;
    }
  }
);
</script>

<style scoped>
.v-progress-circular {
  transition: all 0.5s ease;
}
</style>
