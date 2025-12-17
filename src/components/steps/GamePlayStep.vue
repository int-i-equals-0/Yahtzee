<!-- src/components/steps/GamePlayStep.vue -->
<template>
  <div class="step step-play">
    <h1>Игра ({{ diceCount }} кубиков)</h1>

    <div class="game-layout">
      <!-- Левая колонка: таблица -->
      <div class="score-table-container">
        <h2>Результаты</h2>
        <table class="score-table">
          <thead>
            <tr>
              <th>Комбинация</th>
              <th
                v-for="(name, idx) in playerNames"
                :key="idx"
                :class="{ 'current-player-column': idx === currentPlayerIndex }"
              >
                {{ name }}
              </th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in comboKeys" :key="key">
              <td>
                <span class="combo-label" :title="getComboTooltip(key)">
                  {{ getComboName(key) }}
                </span>
              </td>
              <td
                v-for="(name, pIdx) in playerNames"
                :key="pIdx"
                :class="{ 'current-player-column': pIdx === currentPlayerIndex }"
              >
                {{ scorecards[pIdx][key] !== null ? scorecards[pIdx][key] : '' }}
              </td>
              <td>
                <template
                  v-if="scorecards[currentPlayerIndex][key] === null && isCurrentPlayerTurn && !isBotTurn"
                >
                  <button
                    class="btn small-btn"
                    :class="{
                      'btn-positive': currentCombos[key]?.available,
                      'btn-negative': !currentCombos[key]?.available,
                    }"
                    @click="recordScore(key)"
                  >
                    {{ currentCombos[key]?.available ? 'Заполнить' : 'Вычеркнуть' }}
                  </button>
                </template>
                <template v-else-if="scorecards[currentPlayerIndex][key] !== null">
                  <button class="btn small-btn btn-filled" disabled>Заполнено</button>
                </template>
                <template v-else>
                  <button class="btn small-btn btn-disabled" disabled>Недоступно</button>
                </template>
              </td>
            </tr>
            <!-- Итоги -->
            <tr class="summary-row">
              <td>
                <strong>
                  <span
                    class="summary-label"
                    title="Сумма очков за Ш1–Ш6. Рассчитывается как (количество – 3) × значение. Может быть отрицательной."
                  >
                    Сумма (верх)
                  </span>
                </strong>
              </td>
              <td
                v-for="(name, idx) in playerNames"
                :key="idx"
                :class="{ 'current-player-column': idx === currentPlayerIndex }"
              >
                {{ getUpperSum(idx) }}
              </td>
              <td></td>
            </tr>
            <tr class="summary-row">
              <td>
                <strong>
                  <span
                    class="summary-label"
                    title="Бонус за верхнюю часть: floor(сумма_верх / 10) × 50. Например: сумма = 47 → бонус = 200."
                  >
                    Бонус
                  </span>
                </strong>
              </td>
              <td
                v-for="(name, idx) in playerNames"
                :key="idx"
                :class="{ 'current-player-column': idx === currentPlayerIndex }"
              >
                {{ getUpperBonus(idx) }}
              </td>
              <td></td>
            </tr>
            <tr class="summary-row">
              <td>
                <strong>
                  <span
                    class="summary-label"
                    title="Сумма всех заполненных комбинаций из нижней части (от П до Шанс)."
                  >
                    Сумма (низ)
                  </span>
                </strong>
              </td>
              <td
                v-for="(name, idx) in playerNames"
                :key="idx"
                :class="{ 'current-player-column': idx === currentPlayerIndex }"
              >
                {{ getLowerSum(idx) }}
              </td>
              <td></td>
            </tr>
            <tr class="total-row">
              <td>
                <strong>
                  <span
                    class="summary-label"
                    title="Общий счёт: сумма (верх) + бонус + сумма (низ)."
                  >
                    ИТОГО
                  </span>
                </strong>
              </td>
              <td
                v-for="(name, idx) in playerNames"
                :key="idx"
                :class="{ 'current-player-column': idx === currentPlayerIndex }"
              >
                {{ getTotalScore(idx) }}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Правая колонка: кубики или ожидание -->
      <div v-if="isCurrentPlayerTurn" class="dice-panel">
        <div class="turn-info">
          <p>
            Ход игрока: <strong>{{ currentPlayerName }}</strong>
          </p>
          <p>Попыток осталось: {{ Math.max(0, maxRolls - rollsThisTurn) }}</p>
        </div>

        <div class="dice-container">
          <div
            v-for="(die, index) in dice"
            :key="index"
            class="die"
            :class="{ locked: die.locked }"
            @click="toggleLock(index)"
            :title="die.locked ? 'Разблокировать' : 'Заблокировать'"
          >
            <img
              :src="getDiceImage(die.value, die.locked)"
              :alt="`Кубик ${die.value}`"
              draggable="false"
            />
          </div>
        </div>

        <button
          v-if="!isBotTurn"
          class="btn roll-btn"
          :disabled="isRolling || rollsThisTurn >= maxRolls"
          @click="rollDice"
        >
          {{ rollButtonText }}
        </button>
        <div v-else class="bot-thinking">
          <p>Бот думает...</p>
        </div>
      </div>

      <div v-else class="dice-placeholder">
        <p>
          Ожидание хода игрока <strong>{{ currentPlayerName }}</strong>
        </p>
        <button v-if="!isBotTurn" class="btn" @click="startTurn">Начать мой ход</button>
        <div v-else class="bot-thinking">
          <p>Ход бота...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { calculateCombinations } from '@/utils/combinations'
import { YahtzeeBot } from '@/bot/YahtzeeBot.js'

const props = defineProps({
  diceCount: { type: Number, required: true },
  playerNames: { type: Array, required: true },
})

const emit = defineEmits(['finish'])

// Инициализация
const maxRolls = 3

const comboOrder5 = [
  'unit_1',
  'unit_2',
  'unit_3',
  'unit_4',
  'unit_5',
  'unit_6',
  'pair',
  'twoPairs',
  'threeOfAKind',
  'full',
  'smallStraight',
  'largeStraight',
  'fourOfAKind',
  'general',
  'chance',
]
const comboOrder6 = [
  'unit_1',
  'unit_2',
  'unit_3',
  'unit_4',
  'unit_5',
  'unit_6',
  'pair',
  'twoPairs',
  'threePairs',
  'threeOfAKind',
  'twoTriples',
  'full',
  'secondFull',
  'smallStraight',
  'largeStraight',
  'fullStraight',
  'fourOfAKind',
  'general',
  'marshal',
  'chance',
]
const comboKeys = props.diceCount === 6 ? comboOrder6 : comboOrder5

// Кубики (изначально пустые — заполнятся при первом ходе)
const dice = ref(
  Array(props.diceCount)
    .fill()
    .map(() => ({
      value: 1, // временно
      locked: false,
    })),
)

const scorecards = ref(
  props.playerNames.map(() => {
    const card = {}
    comboKeys.forEach((key) => {
      card[key] = null
    })
    return card
  }),
)

const currentPlayerIndex = ref(0)
const rollsThisTurn = ref(0)
const currentCombos = ref({})
const isRolling = ref(false)

// Бот
const botInstance = ref(null)
const isBotTurn = computed(() => props.playerNames[currentPlayerIndex.value] === 'Bot')

// Вычисляемые свойства
const currentPlayerName = computed(() => {
  return props.playerNames[currentPlayerIndex.value] || 'Игрок'
})

const isCurrentPlayerTurn = computed(() => {
  return rollsThisTurn.value > 0
})

const rollButtonText = computed(() => {
  if (rollsThisTurn.value >= maxRolls) {
    return 'Ход завершён'
  }
  const rollNames = ['Первый бросок', 'Второй бросок', 'Третий бросок']
  return rollNames[rollsThisTurn.value] || 'Бросок'
})

// Методы
const getDiceImage = (value, locked) => {
  const color = locked ? 'cyan' : 'white'
  return new URL(`../../assets/dice/${color}_${value}.svg`, import.meta.url).href
}

async function rollDice() {
  // console.log('[GamePlayStep] rollDice вызван. isRolling:', isRolling.value, 'isBotTurn:', isBotTurn.value);
  if (isRolling.value) {
    // console.warn('[GamePlayStep] rollDice заблокирован, так как isRolling === true');
    return
  }

  isRolling.value = true
  rollsThisTurn.value += 1

  // Анимация катания
  let ticks = 25
  const animate = () => {
    if (ticks <= 0) {
      // console.log('[GamePlayStep] Анимация завершена. Обновляем комбинации.');
      isRolling.value = false
      const diceValues = dice.value.map((d) => d.value)
      currentCombos.value = calculateCombinations(diceValues, props.diceCount)
      // console.log('[GamePlayStep] Комбинации обновлены:', currentCombos.value);

      // Если ход бота, запускаем его логику
      if (isBotTurn.value) {
        // console.log('[GamePlayStep] Это ход бота, вызываем executeBotTurn через 500мс.');
        setTimeout(() => {
          executeBotTurn()
        }, 500) // Небольшая задержка для "думания"
      } else {
        // console.log('[GamePlayStep] Это ход игрока, ожидаем действие.');
      }
      return
    }

    const CNT = Math.floor(Math.random() * 4) + 1
    for (let i = 0; i < CNT; i++) {
      const N = Math.floor(Math.random() * props.diceCount)
      if (!dice.value[N].locked) {
        dice.value[N].value = Math.floor(Math.random() * 6) + 1
      }
    }

    ticks--
    const delay = Math.floor(Math.random() * 20) + 25
    setTimeout(animate, delay)
  }

  animate()
}

function toggleLock(index) {
  // console.log('[GamePlayStep] toggleLock вызван для индекса:', index, 'isBotTurn:', isBotTurn.value);
  if (rollsThisTurn.value > 0 && rollsThisTurn.value < maxRolls && !isRolling.value && !isBotTurn.value) {
    dice.value[index].locked = !dice.value[index].locked
    // console.log('[GamePlayStep] Кубик', index, 'теперь', dice.value[index].locked ? 'заморожен' : 'разморожен');
  } else {
    // console.warn('[GamePlayStep] toggleLock заблокирован. Условия: rollsThisTurn > 0 && rollsThisTurn < maxRolls && !isRolling && !isBotTurn');
  }
}

function startTurn() {
  // console.log('[GamePlayStep] startTurn вызван. isBotTurn:', isBotTurn.value);
  // Генерируем начальные значения кубиков
  dice.value = dice.value.map(() => ({
    value: Math.floor(Math.random() * 6) + 1,
    locked: false,
  }))
  // console.log('[GamePlayStep] Начальные кубики:', dice.value);
  rollsThisTurn.value = 0
  rollDice() // делаем первый бросок
}

function recordScore(key) {
  // console.log('[GamePlayStep] recordScore вызван для ключа:', key);
  const combo = currentCombos.value[key]
  if (!combo) {
    // console.error('[GamePlayStep] recordScore: комбинация не найдена для ключа:', key);
    return
  }

  let points = combo.points
  const bonus = combo.bonus
  const multiplier = combo.multiplier
  const isFirstRoll = rollsThisTurn.value === 1

  // Шанс НИКОГДА не удваивается
  if (key === 'chance') {
    points = combo.points
  } else if (isFirstRoll) {
    points = points * multiplier
  }

  const total = points + bonus
  // console.log('[GamePlayStep] Записываем очки:', total, 'для комбинации', key, '(база:', combo.points, ', множитель:', (isFirstRoll && key !== 'chance' ? multiplier : 1), ', бонус:', bonus, ')');
  scorecards.value[currentPlayerIndex.value][key] = total

  const isComplete = scorecards.value.every((card) => Object.values(card).every((v) => v !== null))

  if (isComplete) {
    // console.log('[GamePlayStep] Игра завершена. Вызываем emit finish.');
    const finalScores = props.playerNames.map((_, idx) => getTotalScore(idx))
    emit('finish', finalScores)
    return
  }

  // Следующий игрок
  // console.log('[GamePlayStep] Ход завершён, передаём ход следующему игроку.');
  currentPlayerIndex.value = (currentPlayerIndex.value + 1) % props.playerNames.length
  rollsThisTurn.value = 0
  // Снимаем блокировку, но НЕ меняем значения
  dice.value.forEach((die) => {
    die.locked = false
  })
  currentCombos.value = {}
  // console.log('[GamePlayStep] Состояние сброшено для следующего хода.');

  // --- НАЧАЛО ДОБАВЛЕНИЯ ---
  if (isBotTurn.value) {
    // console.log('[GamePlayStep] Следующий игрок - бот. Автоматически начинаем его ход.');
    startTurn();
  }
  // --- КОНЕЦ ДОБАВЛЕНИЯ ---
}

// Вспомогательные функции
const comboLabels = {
  unit_1: 'Ш1',
  unit_2: 'Ш2',
  unit_3: 'Ш3',
  unit_4: 'Ш4',
  unit_5: 'Ш5',
  unit_6: 'Ш6',
  pair: 'P',
  twoPairs: '2P',
  threePairs: '3P',
  threeOfAKind: 'T',
  twoTriples: '2T',
  full: 'F',
  secondFull: 'F2',
  smallStraight: 'S1',
  largeStraight: 'S2',
  fullStraight: 'Sп',
  fourOfAKind: 'Car',
  general: 'Gen',
  marshal: 'Mar',
  chance: 'Шанс',
}

const getComboName = (key) => comboLabels[key] || key

const getComboTooltip = (key) => {
  const tooltips = {
    unit_1: 'Единицы: (количество – 3) × 1. Может быть отрицательным.',
    unit_2: 'Двойки: (количество – 3) × 2. Может быть отрицательным.',
    unit_3: 'Тройки: (количество – 3) × 3. Может быть отрицательным.',
    unit_4: 'Четвёрки: (количество – 3) × 4. Может быть отрицательным.',
    unit_5: 'Пятёрки: (количество – 3) × 5. Может быть отрицательным.',
    unit_6: 'Шестёрки: (количество – 3) × 6. Может быть отрицательным.',
    pair: 'Пара — две одинаковые кости. Даёт значение × 2. Удваивается при первом броске.',
    twoPairs: 'Две пары — две разные пары. Сумма значений × 2. Удваивается при первом броске.',
    threePairs:
      'Три пары (только с 6 кубиками). Сумма всех значений × 2. Удваивается при первом броске.',
    threeOfAKind:
      'Тройня — три одинаковые кости. Даёт значение × 3. Удваивается при первом броске.',
    twoTriples:
      'Две тройни (только с 6 кубиками). Сумма значений × 3. Удваивается при первом броске.',
    full: 'Фулл — тройня + пара. Сумма очков. Удваивается при первом броске.',
    secondFull:
      'Второй фулл — тройня + пара + одна кость (6 кубиков). Сумма всех кубиков. Удваивается при первом броске.',
    smallStraight: 'Малый стрит — 1-2-3-4-5. Даёт 15 очков. Удваивается при первом броске.',
    largeStraight: 'Большой стрит — 2-3-4-5-6. Даёт 20 очков. Удваивается при первом броске.',
    fullStraight:
      'Полный стрит — 1-2-3-4-5-6 (6 кубиков). База = 21 + бонус 25. Бонус не удваивается, база — да.',
    fourOfAKind:
      'Каре — четыре одинаковые кости. Даёт значение × 4. Удваивается при первом броске.',
    general:
      'Генерал — пять одинаковых. База = значение × 5 + бонус 50. Бонус не удваивается, база — да.',
    marshal:
      'Маршал — шесть одинаковых (6 кубиков). База = значение × 6 + бонус 100. Бонус не удваивается, база — да.',
    chance: 'Шанс — сумма всех кубиков. Никогда не удваивается.',
  }
  return tooltips[key] || 'Информация недоступна'
}

const getUpperSum = (playerIndex) => {
  let sum = 0
  for (let i = 1; i <= 6; i++) {
    const val = scorecards.value[playerIndex][`unit_${i}`]
    if (val !== null) sum += val
  }
  return sum
}

const getUpperBonus = (playerIndex) => {
  const sum = getUpperSum(playerIndex)
  return Math.floor(sum / 10) * 50
}

const getLowerSum = (playerIndex) => {
  let sum = 0
  for (const key in scorecards.value[playerIndex]) {
    if (key.startsWith('unit_')) continue
    if (scorecards.value[playerIndex][key] !== null) sum += scorecards.value[playerIndex][key]
  }
  return sum
}

const getTotalScore = (playerIndex) => {
  return getUpperSum(playerIndex) + getUpperBonus(playerIndex) + getLowerSum(playerIndex)
}

// Логика бота
onMounted(() => {
  console.log('[GamePlayStep] onMounted: инициализируем бота.');
  botInstance.value = new YahtzeeBot(props.diceCount, 'Bot')
  console.log('[GamePlayStep] Бот инициализирован:', botInstance.value.name);
})

// В executeBotTurn, после обработки известных действий, добавим логику для "безвыходных" ситуаций
async function executeBotTurn() {
  // console.log('[GamePlayStep] executeBotTurn вызван.');
  if (!isBotTurn.value) {
    // console.warn('[GamePlayStep] executeBotTurn: текущий игрок не бот. Выход.');
    return
  }
  if (isRolling.value) {
    // console.warn('[GamePlayStep] executeBotTurn: игра всё ещё в анимации. Выход.');
    return
  }

  const gameState = {
    dice: dice.value,
    rollsThisTurn: rollsThisTurn.value,
    scorecard: scorecards.value[currentPlayerIndex.value],
  };

  // console.log('[GamePlayStep] Передаём состояние боту:', gameState);
  const decision = botInstance.value.makeDecision(gameState);
  console.log('[GamePlayStep] Решение бота:', decision);

  if (decision.action === 'lockDice') {
    console.log('[GamePlayStep] Бот замораживает кости:', decision.indices);
    decision.indices.forEach(index => {
      dice.value[index].locked = true;
    });
    // После заморозки бот делает следующий бросок, если есть попытки
    if (rollsThisTurn.value < maxRolls) {
      console.log('[GamePlayStep] Бот бросает кости снова.');
      setTimeout(() => {
        rollDice();
      }, 500);
    } else {
      console.log('[GamePlayStep] Попытки бота закончились. Решение было lockDice, но бросков нет. Принудительно заполняем.');
      // Выбираем первую доступную комбинацию для заполнения
      const firstAvailable = Object.keys(currentCombos.value).find(key => 
        currentCombos.value[key].available && scorecards.value[currentPlayerIndex.value][key] === null
      );
      if (firstAvailable) {
        recordScore(firstAvailable);
      } else {
        // Если нет доступных, заполняем первую незаполненную
        const firstUnfilled = comboKeys.find(key => scorecards.value[currentPlayerIndex.value][key] === null);
        if (firstUnfilled) {
          recordScore(firstUnfilled);
        }
      }
    }
  } else if (decision.action === 'fillScore') {
    console.log('[GamePlayStep] Бот заполняет комбинацию:', decision.combinationKey);
    recordScore(decision.combinationKey);
  } else if (decision.action === 'rollDice') {
    console.log('[GamePlayStep] Бот решил бросить кости.');
    if (rollsThisTurn.value < maxRolls) {
      setTimeout(() => {
        rollDice();
      }, 500);
    } else {
      console.log('[GamePlayStep] Попытки бота закончились. Решение было rollDice, но бросков нет. Принудительно заполняем.');
      const firstAvailable = Object.keys(currentCombos.value).find(key => 
        currentCombos.value[key].available && scorecards.value[currentPlayerIndex.value][key] === null
      );
      if (firstAvailable) {
        recordScore(firstAvailable);
      } else {
        const firstUnfilled = comboKeys.find(key => scorecards.value[currentPlayerIndex.value][key] === null);
        if (firstUnfilled) {
          recordScore(firstUnfilled);
        }
      }
    }
  } else if (decision.action === 'startTurn') {
    console.log('[GamePlayStep] Бот должен начать ход. Это неожиданно для executeBotTurn.');
  } else {
    console.error('[GamePlayStep] executeBotTurn: неизвестное решение бота:', decision);
  }
}
</script>

<style scoped>
.game-layout {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
}

.score-table-container {
  flex: 2;
  max-width: 700px;
}

.dice-panel,
.dice-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.turn-info {
  background: rgba(2, 8, 8, 0.7);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  width: 100%;
  max-width: 300px;
}

.dice-container {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  justify-content: center;
}

.dice-placeholder {
  padding: 2rem;
  padding-top: 3rem;
  background: rgba(2, 8, 8, 0.5);
  border-radius: 12px;
  min-height: 200px;
  width: 100%;
  max-width: 500px;
}

.bot-thinking {
  padding: 1rem;
  font-style: italic;
  color: #3ccccc;
}

/* Подсказки */
.combo-label,
.summary-label {
  border-bottom: 1px dashed var(--color-accent);
  cursor: help;
  display: inline-block;
  padding-bottom: 2px;
}

.current-player-column {
  background: rgba(60, 204, 204, 0.12);
  border-left: 2px solid var(--color-accent);
  border-right: 2px solid var(--color-accent);
}
</style>