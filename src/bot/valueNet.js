// src/bot/valueNet.js — V(состояние) ≈ маленькая сеть, обученная на точной таблице
// (solver/fit_nn.cpp; признаки и архитектура — зеркало solver/nn.hpp). Для 6 кубиков
// точная таблица (67 млн состояний) в браузер не помещается, сеть — 13 тыс. чисел.

export class ValueNet {
  constructor(w) {
    this.D = w.D
    this.C = w.C
    this.IN = w.IN
    this.H1 = w.H1
    this.H2 = w.H2
    this.W1 = Float32Array.from(w.W1)
    this.b1 = Float32Array.from(w.b1)
    this.W2 = Float32Array.from(w.W2)
    this.b2 = Float32Array.from(w.b2)
    this.w3 = Float32Array.from(w.w3)
    this.b3 = w.b3
    this.f = new Float32Array(this.IN)
    this.h1 = new Float32Array(this.H1)
    this.h2 = new Float32Array(this.H2)
    this.cache = new Map()
  }

  features(um, sum, lm) {
    const { C, f } = this
    for (let i = 0; i < 6; i++) f[i] = (um >> i) & 1
    for (let i = 6; i < C; i++) f[i] = (lm >> (i - 6)) & 1
    f[C] = sum / 60
    const q = Math.max(-3, Math.min(6, Math.floor(sum / 10)))
    for (let i = 0; i < 10; i++) f[C + 1 + i] = q === i - 3 ? 1 : 0
    f[C + 11] = (((sum % 10) + 10) % 10) / 10
  }

  forward() {
    const { IN, H1, H2, W1, b1, W2, b2, w3, f, h1, h2 } = this
    for (let j = 0; j < H1; j++) {
      let s = b1[j]
      const off = j * IN
      for (let i = 0; i < IN; i++) s += W1[off + i] * f[i]
      h1[j] = s > 0 ? s : 0
    }
    for (let k = 0; k < H2; k++) {
      let s = b2[k]
      const off = k * H1
      for (let j = 0; j < H1; j++) s += W2[off + j] * h1[j]
      h2[k] = s > 0 ? s : 0
    }
    let y = this.b3
    for (let k = 0; k < H2; k++) y += w3[k] * h2[k]
    return y
  }

  /** Матожидание очков до конца партии; за ход бот спрашивает ≈60 состояний — кэшируем */
  get(um, sum, lm) {
    const key = (um * 256 + (sum + 128)) * 65536 + lm
    const hit = this.cache.get(key)
    if (hit !== undefined) return hit
    if (this.cache.size > 4096) this.cache.clear()
    this.features(um, sum, lm)
    const v = this.forward() * 100
    this.cache.set(key, v)
    return v
  }

  static async load(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Не удалось загрузить модель бота: ${res.status}`)
    return new ValueNet(await res.json())
  }
}
