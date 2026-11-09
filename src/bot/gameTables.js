// src/bot/gameTables.js — таблицы для бота: все наборы кубиков (как счётчики
// номиналов), переходы «держим k → выпало d», подмножества, вероятности и очки
// за каждую ячейку на каждом наборе. Зеркало Multisets/Game из solver/common.hpp.
import { calculateCombinations } from '../utils/combinations.js'
import { comboOrderFor } from '../utils/comboOrder.js'

const FACT = [1, 1, 2, 6, 24, 120, 720]
const cache = new Map()

export function encodeCounts(counts) {
  let code = 0
  for (let i = 0; i < 6; i++) code = code * 7 + counts[i]
  return code
}

export function countsOf(dice) {
  const counts = [0, 0, 0, 0, 0, 0]
  for (const d of dice) counts[d - 1]++
  return counts
}

/**
 * @param {5|6} D
 * @returns {{ D, order, C, L, ms, size, sizeStart, lookup, prob, completions, subs,
 *             fullStart, fullCount, base, avail, bonusOf, lo, hi, doubles }}
 */
export function gameTables(D) {
  if (cache.has(D)) return cache.get(D)

  const order = comboOrderFor(D)
  const C = order.length
  const L = C - 6

  // Все мультимножества размера 0..D в том же порядке, что в C++
  const ms = []
  const size = []
  const sizeStart = new Array(D + 2).fill(0)
  const gen = (c, v, left) => {
    if (v === 5) {
      c[5] = left
      ms.push(c.slice())
      size.push(c.reduce((s, x) => s + x, 0))
      return
    }
    for (let k = 0; k <= left; k++) {
      c[v] = k
      gen(c, v + 1, left - k)
    }
  }
  for (let s = 0; s <= D; s++) {
    sizeStart[s] = ms.length
    gen([0, 0, 0, 0, 0, 0], 0, s)
  }
  sizeStart[D + 1] = ms.length

  const lookup = new Int32Array(117649).fill(-1)
  ms.forEach((c, i) => { lookup[encodeCounts(c)] = i })
  const index = c => lookup[encodeCounts(c)]

  const prob = ms.map((c, i) => {
    let ways = FACT[size[i]]
    for (const x of c) ways /= FACT[x]
    return ways / 6 ** size[i]
  })

  const completions = ms.map((k, ki) => {
    const need = D - size[ki]
    const out = []
    for (let r = sizeStart[need]; r < sizeStart[need + 1]; r++) {
      const c = k.map((x, v) => x + ms[r][v])
      out.push([index(c), prob[r]])
    }
    return out
  })

  const fullStart = sizeStart[D]
  const fullCount = ms.length - fullStart
  const subs = []
  for (let d = fullStart; d < ms.length; d++) {
    const out = []
    const c = [0, 0, 0, 0, 0, 0]
    const rec = v => {
      if (v === 6) { out.push(index(c)); return }
      for (let k = 0; k <= ms[d][v]; k++) { c[v] = k; rec(v + 1) }
    }
    rec(0)
    subs.push(out)
  }

  // Очки: base[f*C+i], avail[f*C+i], bonusOf[i]
  const base = new Int16Array(fullCount * C)
  const avail = new Uint8Array(fullCount * C)
  const bonusOf = new Array(C).fill(0)
  for (let f = 0; f < fullCount; f++) {
    const dice = []
    ms[fullStart + f].forEach((x, v) => { for (let k = 0; k < x; k++) dice.push(v + 1) })
    const combos = calculateCombinations(dice, D)
    order.forEach((key, i) => {
      const cb = combos[key]
      base[f * C + i] = cb.points
      avail[f * C + i] = cb.available ? 1 : 0
      if (cb.available) bonusOf[i] = cb.bonus
    })
  }
  const doubles = order.map(key => !key.startsWith('unit_') && key !== 'chance')

  // Диапазон суммы верха по маске заполненного верха
  const cap = D - 3
  const lo = new Array(64).fill(0)
  const hi = new Array(64).fill(0)
  for (let m = 0; m < 64; m++) {
    for (let v = 1; v <= 6; v++) {
      if (m >> (v - 1) & 1) { lo[m] -= 3 * v; hi[m] += cap * v }
    }
  }

  const tables = {
    D, order, C, L, ms, size, sizeStart, lookup, index, prob, completions, subs,
    fullStart, fullCount, base, avail, bonusOf, lo, hi, doubles,
    /** Что получает игрок за запись ячейки i на полном наборе f (индекс среди полных) */
    reward(f, i, doubled) {
      const k = f * C + i
      if (!avail[k]) return 0
      let b = base[k]
      if (doubled && doubles[i]) b *= 2
      return b + bonusOf[i]
    },
    /** Итоговый бонус верха: floor(sum / 10) × 50, со штрафом при отрицательной сумме */
    finalBonus: sum => Math.floor(sum / 10) * 50,
  }
  cache.set(D, tables)
  return tables
}
