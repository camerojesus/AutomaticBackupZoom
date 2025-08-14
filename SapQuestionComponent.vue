<template>
  <div class="sap-question-container">
    <div class="question-header">
      <p class="question-text">{{ question }}</p>
      <span class="answer-type">
        {{ correctAnswersCount > 1 ? 'Multiple Choice' : 'Single Choice' }}
      </span>
    </div>

    <div class="options-container">
      <div
        v-for="(option, index) in options"
        :key="index"
        class="option-item"
        :class="{ 'selected': selectedOptions.includes(index) }"
        @click="toggleOption(index)"
      >
        <div class="checkbox">
          <div v-if="selectedOptions.includes(index)" class="checkbox-inner"></div>
        </div>
        <span class="option-text">{{ option }}</span>
      </div>
    </div>

    <div class="feedback-message" v-if="showFeedback">
      {{ isCorrect ? 'Correct!' : 'Incorrect. Please try again.' }}
    </div>

    <button class="submit-button" @click="checkAnswer">Submit Answer</button>
  </div>
</template>

<script>
export default {
  name: 'SapQuestionComponent',
  props: {
    question: {
      type: String,
      required: true
    },
    correctAnswersCount: {
      type: Number,
      required: true
    },
    options: {
      type: Array,
      required: true
    },
    correctAnswers: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      selectedOptions: [],
      showFeedback: false,
      isCorrect: false
    }
  },
  methods: {
    toggleOption(index) {
      if (this.correctAnswersCount === 1) {
        // Single choice behavior
        this.selectedOptions = [index]
      } else {
        // Multiple choice behavior
        const optionIndex = this.selectedOptions.indexOf(index)
        if (optionIndex === -1) {
          this.selectedOptions.push(index)
        } else {
          this.selectedOptions.splice(optionIndex, 1)
        }
      }
      this.showFeedback = false
    },
    checkAnswer() {
      if (this.selectedOptions.length === 0) {
        return
      }

      if (this.correctAnswersCount === 1) {
        // Single choice validation
        this.isCorrect = this.correctAnswers.includes(this.selectedOptions[0])
      } else {
        // Multiple choice validation
        this.isCorrect = 
          this.selectedOptions.length === this.correctAnswers.length &&
          this.selectedOptions.every(option => this.correctAnswers.includes(option))
      }
      this.showFeedback = true
    }
  }
}
</script>

<style scoped>
.sap-question-container {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
  font-family: Arial, sans-serif;
}

.question-header {
  margin-bottom: 20px;
}

.question-text {
  font-size: 16px;
  color: #2c3e50;
  margin-bottom: 10px;
  line-height: 1.4;
}

.answer-type {
  display: inline-block;
  padding: 4px 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  font-size: 12px;
  color: #495057;
}

.options-container {
  margin-bottom: 20px;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-item:hover {
  background-color: #f8f9fa;
}

.option-item.selected {
  border-color: #007bff;
  background-color: #e7f1ff;
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #007bff;
  border-radius: 4px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox-inner {
  width: 12px;
  height: 12px;
  background-color: #007bff;
  border-radius: 2px;
}

.option-text {
  font-size: 14px;
  color: #2c3e50;
}

.feedback-message {
  margin: 10px 0;
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.submit-button {
  width: 100%;
  padding: 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.submit-button:hover {
  background-color: #0056b3;
}

.submit-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>