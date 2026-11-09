// tests/dump-combos.mjs — печатает подсчёт всех категорий для всех наборов кубиков
// в том же формате, что solver/verify.cpp. Использование: node tests/dump-combos.mjs 6
import { calculateCombinations } from '../src/utils/combinations.js'

const D = Number(process.argv[2] || 5)
const order5 = ['unit_1', 'unit_2', 'unit_3', 'unit_4', 'unit_5', 'unit_6',
  'pair', 'twoPairs', 'threeOfAKind', 'full', 'smallStraight', 'largeStraight', 'fourOfAKind', 'general', 'chance']
const order6 = ['unit_1', 'unit_2', 'unit_3', 'unit_4', 'unit_5', 'unit_6',
  'pair', 'twoPairs', 'threePairs', 'threeOfAKind', 'twoTriples', 'full', 'secondFull',
  'smallStraight', 'largeStraight', 'fullStraight', 'fourOfAKind', 'general', 'marshal', 'chance']
const order = D === 6 ? order6 : order5

// Перебор мультимножеств в том же порядке, что в C++ (по счётчикам 1..6 лексикографически)
const lines = []
const counts = [0, 0, 0, 0, 0, 0]
const gen = (v, left) => {
  if (v === 5) {
    counts[5] = left
    const dice = []
    for (let i = 0; i < 6; i++) for (let k = 0; k < counts[i]; k++) dice.push(i + 1)
    const c = calculateCombinations(dice, D)
    const parts = order.map(key => {
      const x = c[key]
      return `${key}:${x.available ? '' : 'x'}${x.points}+${x.bonus}`
    })
    lines.push(`[${dice.join(',')}] ${parts.join(' ')}`)
    return
  }
  for (let k = 0; k <= left; k++) { counts[v] = k; gen(v + 1, left - k) }
}
gen(0, D)
process.stdout.write(lines.join('\n') + '\n')
