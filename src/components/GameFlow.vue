<!-- src/components/GameFlow.vue -->
<template>
  <div class="game-flow">
    <!-- Шаг 1: Выбор версии и режима -->
    <GameModeStep
      v-if="currentStep === 'mode'"
      @select="handleModeSelect"
    />

    <!-- Шаг 2: Ввод имён -->
    <PlayerSetupStep
      v-else-if="currentStep === 'setup'"
      :dice-count="diceCount"
      :game-mode="gameMode"
      @submit="handleSetupSubmit"
      @back="currentStep = 'mode'"
    />

    <!-- Шаг 3: Игровой процесс -->
    <GamePlayStep
      v-else-if="currentStep === 'play'"
      :dice-count="diceCount"
      :player-names="playerNames"
      @finish="handleGameFinish"
    />

    <!-- Шаг 4: Экран победителя -->
    <GameOverStep
      v-else-if="currentStep === 'over'"
      :dice-count="diceCount"
      :player-names="playerNames"
      :final-scores="finalScores"
      @restart-same="handleRestartSame"
      @restart-new="handleRestartNew"
    />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import GameModeStep from './steps/GameModeStep.vue'
import PlayerSetupStep from './steps/PlayerSetupStep.vue'
import GamePlayStep from './steps/GamePlayStep.vue'
import GameOverStep from './steps/GameOverStep.vue'

const currentStep = ref('mode')
const diceCount = ref(null)
const gameMode = ref(null)
const playerNames = ref([])
const finalScores = reactive([])

const handleModeSelect = ({ mode, count }) => {
  gameMode.value = mode
  diceCount.value = count
  currentStep.value = 'setup'
}

const handleSetupSubmit = (names) => {
  playerNames.value = names
  currentStep.value = 'play'
}

const handleGameFinish = (scores) => {
  finalScores.splice(0, finalScores.length, ...scores)
  currentStep.value = 'over'
}

const handleRestartSame = () => {
  currentStep.value = 'play'
}

const handleRestartNew = () => {
  currentStep.value = 'mode'
}
</script>

<style scoped>
.game-flow {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem 1rem;
}
</style>