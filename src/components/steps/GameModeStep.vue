<!-- src/components/steps/GameModeStep.vue -->
<template>
  <div class="step step-mode">
    <h1>Настройка игры</h1>

    <!-- Выбор версии -->
    <h2>Версия игры</h2>
    <div class="options">
      <button
        v-for="opt in diceOptions"
        :key="opt.value"
        :class="['btn', { active: diceCount === opt.value }]"
        @click="diceCount = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Список игроков -->
    <h2>Игроки</h2>
    <div class="players-list">
      <div v-for="(player, index) in players" :key="index" class="player-row">
        <input
          v-model="player.name"
          type="text"
          class="player-name-input"
          :placeholder="`Игрок ${index + 1}`"
        />
        <div class="player-type-buttons">
          <button
            :class="['btn small', { active: player.type === 'human' }]"
            @click="player.type = 'human'"
          >
            Человек
          </button>
          <button
            :class="['btn small', { active: player.type === 'bot' }]"
            @click="player.type = 'bot'"
          >
            Бот
          </button>
        </div>
        <button class="btn btn-negative small" @click="removePlayer(index)" :disabled="players.length <= 1">
          Удалить
        </button>
      </div>
    </div>

    <button class="btn" @click="addPlayer">➕ Добавить игрока</button>

    <button
      class="btn btn-primary"
      :disabled="!diceCount || players.length < 1"
      @click="onSubmit"
    >
      Начать игру
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['select'])

const diceCount = ref(6)

const players = ref([
  { name: 'Игрок 1', type: 'human' },
  { name: 'Бот 1', type: 'bot' }
])

const diceOptions = [
  { value: 5, label: '5 кубиков' },
  { value: 6, label: '6 кубиков' },
]

const addPlayer = () => {
  const num = players.value.length + 1
  players.value.push({
    name: players.value.some(p => p.type === 'bot') ? `Бот ${num}` : `Игрок ${num}`,
    type: 'bot'
  })
}

const removePlayer = (index) => {
  if (players.value.length > 1) {
    players.value.splice(index, 1)
  }
}

const onSubmit = () => {
  // Подготавливаем данные для GamePlayStep
  const playerNames = players.value.map(p => p.name)
  const isBot = players.value.map(p => p.type === 'bot')

  emit('select', {
    diceCount: diceCount.value,
    playerNames,
    isBot
  })
}
</script>

<style scoped>
.step {
  max-width: 800px;
  width: 100%;
  padding: 2rem;
  background: rgba(2, 8, 8, 0.7);
  border-radius: 12px;
  text-align: center;
}

.step h1 {
  color: var(--color-accent);
  margin-bottom: 1.5rem;
}

.step h2 {
  margin: 1.5rem 0 1rem;
  color: var(--color-accent);
}

.options {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin: 0.5rem 0 1.5rem;
}

/* Список игроков */
.players-list {
  margin: 1.5rem 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.player-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
}

.player-name-input {
  flex: 2;
  padding: 0.5rem;
  font-size: 1rem;
  background: var(--color-bg-card);
  color: var(--color-accent);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-family: 'Lato', sans-serif;
}

.player-type-buttons {
  display: flex;
  gap: 0.3rem;
  flex: 1.5;
}

.btn.small {
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
}

.btn.btn-negative {
  background: var(--color-error);
  color: var(--color-bg-card);
  border-color: var(--color-error);
}

.btn.btn-negative:hover:not(:disabled) {
  background: var(--color-error-light);
}

/* Кнопки */
.btn {
  padding: 0.6rem 1.2rem;
  font-size: 1rem;
  font-weight: bold;
  background: var(--color-bg-card);
  color: var(--color-accent);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.btn.active {
  background: #3ccccc;
  color: #020808;
  border-color: #3ccccc;
}

.btn:hover:not(:disabled) {
  background: var(--color-accent-dark);
  color: var(--color-bg-card);
}

.btn-primary {
  background: var(--color-accent);
  color: var(--color-bg-card);
  font-weight: bold;
  margin-top: 1.5rem;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-light);
}
</style>