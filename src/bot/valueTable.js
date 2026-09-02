// src/bot/valueTable.js — таблица V(состояние) = матожидание очков до конца партии
// при оптимальной игре. Формат файла — см. solver/export_table.py: gzip поверх
// заголовка 'YV1' + D + L и int16-дельт вдоль суммы верха в раскладке
// (upperMask, lowerMask, sum). Значения хранятся ×10.

async function gunzip(bytes) {
  if (typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }
  // Node без DecompressionStream (тесты): zlib
  const { gunzipSync } = await import('node:zlib')
  return new Uint8Array(gunzipSync(bytes))
}

export class ValueTable {
  /**
   * @param {number} D
   * @param {Int16Array} values — абсолютные значения ×10 в раскладке (um, lm, sum)
   * @param {number[]} lo — нижняя граница суммы верха по маске
   * @param {number[]} n — число значений суммы по маске
   */
  constructor(D, values, lo, n) {
    this.D = D
    this.L = D === 6 ? 14 : 9
    this.values = values
    this.lo = lo
    this.n = n
    this.blockStart = new Array(64).fill(0)
    let acc = 0
    for (let um = 0; um < 64; um++) {
      this.blockStart[um] = acc
      acc += n[um] << this.L
    }
  }

  /** Матожидание очков до конца партии из состояния (маска верха, сумма верха, маска низа) */
  get(um, sum, lm) {
    return this.values[this.blockStart[um] + lm * this.n[um] + (sum - this.lo[um])] / 10
  }

  /** @param {Uint8Array|ArrayBuffer} gz — содержимое файла V<D>.bin */
  static async fromGzip(gz) {
    const raw = await gunzip(gz instanceof Uint8Array ? gz : new Uint8Array(gz))
    if (raw[0] !== 0x59 || raw[1] !== 0x56 || raw[2] !== 0x31) throw new Error('Неверный формат таблицы бота')
    const D = raw[3]
    const L = raw[4]
    const cap = D - 3
    const lo = new Array(64).fill(0)
    const n = new Array(64).fill(0)
    for (let m = 0; m < 64; m++) {
      let hi = 0
      for (let v = 1; v <= 6; v++) if (m >> (v - 1) & 1) { lo[m] -= 3 * v; hi += cap * v }
      n[m] = hi - lo[m] + 1
    }
    const deltas = new Int16Array(raw.slice(6).buffer) // копия: выровнять под int16
    const values = new Int16Array(deltas.length)
    let p = 0
    for (let um = 0; um < 64; um++) {
      for (let lm = 0; lm < 1 << L; lm++) {
        let acc = 0
        for (let s = 0; s < n[um]; s++, p++) {
          acc += deltas[p]
          values[p] = acc
        }
      }
    }
    return new ValueTable(D, values, lo, n)
  }

  static async load(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Не удалось загрузить таблицу бота: ${res.status}`)
    return ValueTable.fromGzip(await res.arrayBuffer())
  }
}
