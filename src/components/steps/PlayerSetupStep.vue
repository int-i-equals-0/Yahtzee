<!-- src/components/steps/PlayerSetupStep.vue -->
<template>
  <div class="step step-setup">
    <h1>Настройка игроков</h1>

    <div v-if="gameMode === 'bot'" class="bot-notice">
      <p>⚠️ Игра с ботом временно недоступна. Пожалуйста, выберите «Играть с людьми».</p>
      <button class="btn" @click="onBack">Назад</button>
    </div>

    <div v-else>
      <label>Количество игроков (2–6): </label>
      <input v-model.number="playerCount" type="number" min="2" max="6" class="input-number" />

      <div class="name-inputs">
        <label v-for="i in playerCount" :key="i">
          Игрок {{ i }}:
          <input
            v-model="names[i - 1]"
            type="text"
            :placeholder="`Имя игрока ${i}`"
            class="name-input"
          />
        </label>
      </div>

      <div class="button-group">
        <button class="btn" @click="onBack">Назад</button>
        <button class="btn btn-primary" :disabled="!canProceed" @click="onSubmit">
          Начать игру
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  diceCount: { type: Number, required: true },
  gameMode: { type: String, required: true },
})

const emit = defineEmits(['submit', 'back'])

const playerCount = ref(props.gameMode === 'human' ? 2 : 1)
const names = ref(Array(6).fill(''))

const canProceed = computed(() => {
  return (
    playerCount.value >= 2 &&
    playerCount.value <= 6 &&
    names.value.slice(0, playerCount.value).every((n) => n.trim())
  )
})

const onBack = () => emit('back')
const onSubmit = () => {
  const finalNames = names.value
    .slice(0, playerCount.value)
    .map((n) => n.trim() || `Игрок ${names.value.indexOf(n) + 1}`)
  emit('submit', finalNames)
}
</script>
