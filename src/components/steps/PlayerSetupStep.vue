<!-- src/components/steps/PlayerSetupStep.vue -->
<template>
  <div class="step step-setup">
    <h1>Настройка игроков</h1>

    <div v-if="gameMode === 'bot'" class="bot-notice">
      <p>Играть с ботом.</p>
      <label>Ваше имя: </label>
      <input v-model="humanName" type="text" placeholder="Введите имя" class="name-input" />
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
    </div>

    <div class="button-group">
      <button class="btn" @click="onBack">Назад</button>
      <button class="btn btn-primary" :disabled="!canProceed" @click="onSubmit">
        Начать игру
      </button>
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

const playerCount = ref(2)
const names = ref(Array(6).fill(''))
const humanName = ref('Игрок')

const canProceed = computed(() => {
  if (props.gameMode === 'bot') {
    return humanName.value.trim()
  } else {
    return (
      playerCount.value >= 2 &&
      playerCount.value <= 6 &&
      names.value.slice(0, playerCount.value).every((n) => n.trim())
    )
  }
})

const onBack = () => emit('back')
const onSubmit = () => {
  if (props.gameMode === 'bot') {
    const finalNames = [humanName.value.trim() || 'Игрок', 'Bot']
    emit('submit', finalNames)
  } else {
    const finalNames = names.value
      .slice(0, playerCount.value)
      .map((n) => n.trim() || `Игрок ${names.value.indexOf(n) + 1}`)
    emit('submit', finalNames)
  }
}
</script>

<style scoped>
.bot-notice {
  background: rgba(2, 8, 8, 0.5);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}
.name-inputs {
  margin: 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.name-inputs label {
  font-weight: bold;
  color: var(--color-accent);
}
.name-input,
.input-number {
  margin-top: 0.5rem;
  padding: 0.5rem;
  font-size: 14pt;
  background: var(--color-bg-card);
  color: var(--color-accent);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-family: 'Lato', sans-serif;
  font-weight: bold;
  outline: none;
}
.input-number {
  width: 80px;
  text-align: center;
}
.button-group {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}
</style>