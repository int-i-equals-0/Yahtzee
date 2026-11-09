<!-- src/components/steps/GameOverStep.vue -->
<template>
  <div class="step step-over">
    <h1>Игра завершена!</h1>
    <div class="results">
      <h2>Результаты:</h2>
      <ol>
        <li v-for="(entry, idx) in rankedPlayers" :key="entry.name" :class="{ winner: idx === 0 }">
          {{ entry.name }} — {{ entry.score }} очков
        </li>
      </ol>
    </div>

    <div class="button-group">
      <button class="btn btn-primary" @click="onRestartSame">Сыграть этим же составом</button>
      <button class="btn" @click="onRestartNew">Сыграть новым составом</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  playerNames: { type: Array, required: true },
  finalScores: { type: Array, required: true },
})

const emit = defineEmits(['restart-same', 'restart-new'])

// ✅ Правильно: сортируем пары (имя + счёт)
const rankedPlayers = computed(() => {
  const players = props.playerNames.map((name, i) => ({
    name,
    score: props.finalScores[i],
  }))
  return players.sort((a, b) => b.score - a.score)
})

const onRestartSame = () => emit('restart-same')
const onRestartNew = () => emit('restart-new')
</script>
