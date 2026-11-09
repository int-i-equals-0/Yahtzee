// src/bot/createBot.js — фабрика ботов для игры: грузит источник значений
// (точная таблица для 5 кубиков, сеть для 6) и создаёт SolverBot нужного уровня.
import { SolverBot } from './SolverBot.js'
import { ValueTable } from './valueTable.js'
import { ValueNet } from './valueNet.js'

/**
 * Уровни бота: температура выбора (0 — строго лучший ход). Пока в игре один уровень —
 * оптимальный; «характеры» попроще появятся отдельно. Калибровка температур по
 * среднему счёту (tests/bench-bot.mjs): T=0,7 → 163 / 457, T=1,5 → 137 / 419 (5 / 6 кубиков).
 */
export const BOT_LEVELS = [
  { id: 'master', label: 'Мастер', temperature: 0, hint: 'Играет оптимально — каждое решение по точному расчёту' },
]

export const levelById = id => BOT_LEVELS.find(l => l.id === id) || BOT_LEVELS[0]

const sources = new Map()

/** Источник значений для режима — грузится один раз на сессию */
export function loadValues(diceCount) {
  if (!sources.has(diceCount)) {
    const url = diceCount === 6
      ? new URL('../assets/bot/nn6.json', import.meta.url)
      : new URL('../assets/bot/V5.bin', import.meta.url)
    sources.set(diceCount, diceCount === 6 ? ValueNet.load(url) : ValueTable.load(url))
  }
  return sources.get(diceCount)
}

/**
 * @param {5|6} diceCount
 * @param {{ name?: string, level?: string }} [opts]
 * @returns {Promise<SolverBot>}
 */
export async function createBot(diceCount, opts = {}) {
  const values = await loadValues(diceCount)
  const level = levelById(opts.level)
  return new SolverBot(diceCount, values, { name: opts.name, temperature: level.temperature })
}
