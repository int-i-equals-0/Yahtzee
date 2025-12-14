<!-- src/components/steps/GameModeStep.vue -->
<template>
  <div class="step step-mode">
    <h1>Выберите версию игры</h1>

    <div class="options">
      <button
        v-for="opt in diceOptions"
        :key="opt.value"
        :class="['btn', { active: selectedDice === opt.value }]"
        @click="selectedDice = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>

    <h2>Режим игры</h2>
    <div class="options">
      <button
        v-for="mode in gameModes"
        :key="mode.value"
        :class="['btn', { active: selectedMode === mode.value }]"
        @click="selectedMode = mode.value"
      >
        {{ mode.label }}
      </button>
    </div>

    <button
      class="btn btn-primary"
      :disabled="!selectedDice || !selectedMode"
      @click="onSubmit"
    >
      Продолжить
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['select'])

const selectedDice = ref(null)
const selectedMode = ref(null)

const diceOptions = [
  { value: 5, label: '5 кубиков' },
  { value: 6, label: '6 кубиков' },
]

const gameModes = [
  { value: 'human', label: 'Играть с людьми' },
  { value: 'bot', label: 'Играть с ботом' },
]

const onSubmit = () => {
  emit('select', {
    mode: selectedMode.value,
    count: selectedDice.value
  })
}
</script>