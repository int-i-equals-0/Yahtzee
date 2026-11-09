// src/bot/SolverBot.js — бот на точном решении игры.
//
// Источник силы — таблица V(состояние): матожидание очков до конца партии при
// оптимальной игре (посчитана обратной индукцией в solver/solve.cpp). Внутри хода
// бот сам считает ожидание каждого варианта «записать ячейку» / «держать такие-то
// кубики и бросить» и выбирает лучший. Уровень «слабее оптимума» — softmax по
// ожиданиям с температурой: чем выше, тем чаще бот берёт не лучший, а близкий вариант.
import { gameTables, countsOf } from './gameTables.js'

export class SolverBot {
  /**
   * @param {5|6} diceCount
   * @param {{ get(um, sum, lm): number }} values — таблица/модель значений состояний
   * @param {{ name?: string, temperature?: number, rng?: () => number }} [opts]
   */
  constructor(diceCount, values, opts = {}) {
    this.t = gameTables(diceCount)
    this.values = values
    this.name = opts.name || 'BOT'
    this.temperature = opts.temperature || 0
    this.rng = opts.rng || Math.random
    this._turnKey = null
  }

  // ---- состояние партии из карточки очков ----
  stateOf(scorecard) {
    const { order } = this.t
    let um = 0, lm = 0, sum = 0
    order.forEach((key, i) => {
      const v = scorecard[key]
      if (v === null || v === undefined) return
      if (i < 6) { um |= 1 << i; sum += v } else lm |= 1 << (i - 6)
    })
    return { um, sum, lm }
  }

  // ---- ожидания внутри хода (E3, K2, E2, K1), как computeTurn в solver/policy.hpp ----
  computeTurn(um, sum, lm) {
    const key = `${um}:${sum}:${lm}`
    if (this._turnKey === key) return this._turn
    const t = this.t
    const F = t.fullCount, fs = t.fullStart, nKeep = t.ms.length
    const E3 = new Float64Array(F), E2 = new Float64Array(F)
    const K2 = new Float64Array(nKeep), K1 = new Float64Array(nKeep)

    for (let f = 0; f < F; f++) E3[f] = this.fillOptions(um, sum, lm, f, false)[0].value
    for (let k = 0; k < nKeep; k++) {
      let s = 0
      for (const [res, p] of t.completions[k]) s += p * E3[res - fs]
      K2[k] = s
    }
    for (let f = 0; f < F; f++) {
      let best = E3[f]
      for (const k of t.subs[f]) if (K2[k] > best) best = K2[k]
      E2[f] = best
    }
    for (let k = 0; k < nKeep; k++) {
      let s = 0
      for (const [res, p] of t.completions[k]) s += p * E2[res - fs]
      K1[k] = s
    }
    this._turnKey = key
    this._turn = { E3, E2, K2, K1 }
    return this._turn
  }

  /** Все открытые ячейки для набора f: [{ cat, key, reward, value }], по убыванию value */
  fillOptions(um, sum, lm, f, doubled) {
    const t = this.t
    const out = []
    for (let i = 0; i < t.C; i++) {
      const filled = i < 6 ? (um >> i & 1) : (lm >> (i - 6) & 1)
      if (filled) continue
      const r = t.reward(f, i, doubled)
      const v = i < 6
        ? this.values.get(um | (1 << i), sum + r, lm)
        : this.values.get(um, sum, lm | (1 << (i - 6)))
      out.push({ cat: i, key: t.order[i], reward: r, value: r + v })
    }
    out.sort((a, b) => b.value - a.value)
    return out
  }

  /**
   * Все варианты решения при наборе dice и rollsLeft (2 после первого броска, 1 после
   * второго, 0 после третьего): записи и заморозки, по убыванию ожидания.
   */
  options(scorecard, dice, rollsLeft) {
    const t = this.t
    const { um, sum, lm } = this.stateOf(scorecard)
    const f = t.index(countsOf(dice)) - t.fullStart
    const opts = this.fillOptions(um, sum, lm, f, rollsLeft === 2)
      .map(o => ({ action: 'fillScore', key: o.key, reward: o.reward, value: o.value }))
    if (rollsLeft > 0) {
      const turn = this.computeTurn(um, sum, lm)
      const K = rollsLeft === 2 ? turn.K1 : turn.K2
      for (const k of t.subs[f]) {
        if (k === t.fullStart + f) continue // держать всё = записать сейчас
        opts.push({ action: 'lockDice', keep: t.ms[k], value: K[k] })
      }
    }
    opts.sort((a, b) => b.value - a.value)
    return opts
  }

  /** Выбор с учётом температуры: 0 — строго лучший; иначе softmax по ожиданиям */
  pick(opts) {
    if (this.temperature <= 0 || opts.length === 1) return opts[0]
    const T = this.temperature
    const top = opts[0].value
    const weights = opts.map(o => Math.exp((o.value - top) / T))
    let r = this.rng() * weights.reduce((s, w) => s + w, 0)
    for (let i = 0; i < opts.length; i++) {
      r -= weights[i]
      if (r <= 0) return opts[i]
    }
    return opts[opts.length - 1]
  }

  /** Индексы кубиков, которые нужно заморозить, чтобы остался набор keep (счётчики) */
  lockIndices(dice, keep) {
    const need = keep.slice()
    const indices = []
    dice.forEach((d, i) => {
      if (need[d - 1] > 0) { need[d - 1]--; indices.push(i) }
    })
    return indices
  }

  // ---- интерфейс для GamePlayStep ----
  /** @param {{ dice: number[], rollsLeft: number, scorecard: Object }} gameState */
  makeDecision(gameState) {
    const { dice, rollsLeft, scorecard } = gameState
    const choice = this.pick(this.options(scorecard, dice, rollsLeft))
    if (choice.action === 'fillScore') return { action: 'fillScore', key: choice.key }
    return { action: 'lockDice', indices: this.lockIndices(dice, choice.keep) }
  }

  makeFinalDecision(dice, scorecard) {
    const choice = this.pick(this.options(scorecard, dice, 0))
    return { action: 'fillScore', key: choice.key }
  }
}
