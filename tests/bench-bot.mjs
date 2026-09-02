// tests/bench-bot.mjs — стенд: гоняет бота партиями в одиночку и печатает средний счёт.
//   node tests/bench-bot.mjs 5 [games=2000] [temperature=0] [--nn]
// --nn — использовать сеть (src/assets/bot/nn<D>.json) вместо точной таблицы; для 6 кубиков
// таблицы в репозитории нет, сеть берётся всегда.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { calculateCombinations } from '../src/utils/combinations.js'
import { comboOrderFor } from '../src/utils/comboOrder.js'
import { SolverBot } from '../src/bot/SolverBot.js'
import { ValueTable } from '../src/bot/valueTable.js'
import { ValueNet } from '../src/bot/valueNet.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const D = Number(process.argv[2] || 5)
const games = Number(process.argv[3] || 2000)
const temperature = Number(process.argv[4] || 0)
const useNN = process.argv.includes('--nn') || D === 6

// Простой детерминированный ГСЧ (mulberry32), чтобы прогоны повторялись
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function makeBot(random) {
  const values = useNN
    ? new ValueNet(JSON.parse(readFileSync(join(root, `src/assets/bot/nn${D}.json`), 'utf8')))
    : await ValueTable.fromGzip(readFileSync(join(root, `src/assets/bot/V${D}.bin`)))
  return new SolverBot(D, values, { temperature, rng: random })
}

// Партия по правилам GamePlayStep: до 3 бросков, запись после любого, удвоение на первом
function playGame(bot, random) {
  const order = comboOrderFor(D)
  const scorecard = Object.fromEntries(order.map(k => [k, null]))
  const roll = () => Math.floor(random() * 6) + 1
  let total = 0
  for (let round = 0; round < order.length; round++) {
    let dice = Array.from({ length: D }, roll)
    let rolls = 1
    let recorded = false
    while (!recorded) {
      const rollsLeft = 3 - rolls
      let decision
      if (rollsLeft === 0) decision = bot.makeFinalDecision(dice, scorecard)
      else decision = bot.makeDecision({ dice, locked: dice.map(() => false), rollsLeft, scorecard, diceCount: D })
      if (decision.action === 'lockDice' && rollsLeft > 0) {
        const lock = new Set(decision.indices)
        dice = dice.map((d, i) => (lock.has(i) ? d : roll()))
        rolls++
        continue
      }
      const combo = calculateCombinations(dice, D)[decision.key]
      let points = combo.points
      if (decision.key !== 'chance' && rolls === 1) points *= combo.multiplier
      scorecard[decision.key] = points + combo.bonus
      total += points + combo.bonus
      recorded = true
    }
  }
  const upper = order.slice(0, 6).reduce((s, k) => s + scorecard[k], 0)
  return { total: total + Math.floor(upper / 10) * 50, upper }
}

const random = rng(12345)
const bot = await makeBot(random)
const t0 = Date.now()
let sum = 0, sum2 = 0, upperSum = 0, bonus50 = 0
for (let i = 0; i < games; i++) {
  const { total, upper } = playGame(bot, random)
  sum += total; sum2 += total * total; upperSum += upper
  if (upper >= 10) bonus50++
}
const mean = sum / games
const sd = Math.sqrt(sum2 / games - mean * mean)
console.info(`SolverBot(${useNN ? 'сеть' : 'таблица'}) T=${temperature}, D=${D}, партий ${games}: среднее ${mean.toFixed(2)} ± ${(sd / Math.sqrt(games)).toFixed(2)} (σ ${sd.toFixed(1)}), верх в среднем ${(upperSum / games).toFixed(1)}, бонус ≥50 в ${(100 * bonus50 / games).toFixed(1)}%, ${((Date.now() - t0) / games).toFixed(1)} мс/партия`)
