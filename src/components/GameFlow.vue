<!-- src/components/GameFlow.vue -->
<template>
  <div class="game-flow">
    <!-- Шаг 1: Настройка игры -->
    <GameModeStep
      v-if="currentStep === 'mode'"
      @select="handleModeSelect"
    />

    <!-- Шаг 2: Игровой процесс -->
    <GamePlayStep
      v-else-if="currentStep === 'play'"
      :dice-count="diceCount"
      :player-names="playerNames"
      :is-bot="isBot"
      @finish="handleGameFinish"
    />

    <!-- Шаг 3: Экран победителя -->
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
import { ref } from 'vue'
import GameModeStep from './steps/GameModeStep.vue'
import GamePlayStep from './steps/GamePlayStep.vue'
import GameOverStep from './steps/GameOverStep.vue'

const currentStep = ref('mode')
const diceCount = ref(null)
const playerNames = ref([])
const isBot = ref([])
const finalScores = ref([])

const handleModeSelect = ({ diceCount: count, playerNames: names, isBot: bots }) => {
  diceCount.value = count;
  playerNames.value = names;
  isBot.value = bots;
  currentStep.value = 'play';
}

const handleGameFinish = (scores) => {
  finalScores.value = scores;
  currentStep.value = 'over';
}

const handleRestartSame = () => {
  currentStep.value = 'play';
}

const handleRestartNew = () => {
  currentStep.value = 'mode';
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