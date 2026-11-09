// src/utils/combinations.js
//
// Единое правило для всех «составных» комбинаций (две пары, три пары, две тройни,
// фулл): комбинация собирается из НЕПЕРЕСЕКАЮЩИХСЯ кубиков, а если разложений
// несколько — берётся самое дорогое. Отсюда: каре = две пары, каре + пара = три
// пары, пять одинаковых = фулл, шесть одинаковых = что угодно.

/**
 * Рассчитывает все возможные комбинации для заданного набора кубиков
 * @param {number[]} dice - массив значений кубиков (1–6)
 * @param {number} diceCount - 5 или 6
 * @returns {Object} объект с комбинациями
 */
export function calculateCombinations(dice, diceCount) {
  if (!Array.isArray(dice) || dice.length !== diceCount) {
    throw new Error(`Ожидалось ${diceCount} кубиков`)
  }

  // Счётчик количества каждого значения (1–6)
  const counts = [0, 0, 0, 0, 0, 0] // индекс 0 → значение 1 и т.д.
  let totalSum = 0
  for (const die of dice) {
    if (die < 1 || die > 6) throw new Error('Неверное значение кубика')
    counts[die - 1]++
    totalSum += die
  }

  const n = value => counts[value - 1]

  // Старший номинал, которого не меньше k штук (или null)
  const highestWithAtLeast = k => {
    for (let v = 6; v >= 1; v--) if (n(v) >= k) return v
    return null
  }

  // Все группы по k одинаковых, которые можно вырезать из кубиков, по убыванию
  // номинала: [6,6,6,6,5,5] по парам → [6, 6, 5]; шесть шестёрок по тройкам → [6, 6]
  const groupsOf = k => {
    const groups = []
    for (let v = 6; v >= 1; v--) {
      for (let j = 0; j < Math.floor(n(v) / k); j++) groups.push(v)
    }
    return groups
  }

  // Сумма m старших групп по k (или null, если групп меньше m)
  const bestGroups = (k, m) => {
    const groups = groupsOf(k)
    if (groups.length < m) return null
    return groups.slice(0, m).reduce((sum, v) => sum + v * k, 0)
  }

  const combo = (name, points, available, extra = {}) => ({
    name,
    points: available ? points : 0,
    available,
    isUpper: false,
    bonus: 0,
    multiplier: 2,
    ...extra,
  })

  // Обязательные (верхняя часть): Ш1–Ш6 — (количество − 3) × номинал, может быть < 0
  const upper = {}
  for (let v = 1; v <= 6; v++) {
    upper[`unit_${v}`] = {
      name: `Ш${v}`,
      points: (n(v) - 3) * v,
      available: true,
      isUpper: true,
      bonus: 0,
      multiplier: 1,
    }
  }

  // Нижняя часть
  const lower = {}

  // Пара — старший номинал
  const pairValue = highestWithAtLeast(2)
  lower.pair = combo('P', pairValue * 2, pairValue !== null)

  // Две пары — две старшие пары (каре считается за две пары)
  const twoPairs = bestGroups(2, 2)
  lower.twoPairs = combo('2P', twoPairs, twoPairs !== null)

  // Три пары (только для 6 кубиков)
  if (diceCount === 6) {
    const threePairs = bestGroups(2, 3)
    lower.threePairs = combo('3P', threePairs, threePairs !== null)
  }

  // Тройня — старший номинал
  const tripleValue = highestWithAtLeast(3)
  lower.threeOfAKind = combo('T', tripleValue * 3, tripleValue !== null)

  // Каре — старший номинал
  const fourValue = highestWithAtLeast(4)
  lower.fourOfAKind = combo('Car', fourValue * 4, fourValue !== null)

  // Генерал (5 одинаковых) — шесть одинаковых тоже считаются
  const generalValue = highestWithAtLeast(5)
  lower.general = combo('Gen', generalValue * 5, generalValue !== null, {
    bonus: generalValue ? 50 : 0, // бонус за сложность
  })

  // Маршал (6 одинаковых, только для 6 кубиков)
  if (diceCount === 6) {
    const marshalValue = highestWithAtLeast(6)
    lower.marshal = combo('Mar', marshalValue * 6, marshalValue !== null, {
      bonus: marshalValue ? 100 : 0, // бонус за сложность
    })
  }

  // Фулл (тройня + пара из разных кубиков; номиналы могут совпадать) — самый дорогой
  let fullPoints = null
  for (let t = 1; t <= 6; t++) {
    if (n(t) < 3) continue
    for (let p = 1; p <= 6; p++) {
      const left = p === t ? n(p) - 3 : n(p)
      if (left >= 2) fullPoints = Math.max(fullPoints ?? -Infinity, t * 3 + p * 2)
    }
  }
  lower.full = combo('F', fullPoints, fullPoints !== null)

  // Второй фулл: тройня + пара + один свободный кубик (только для 6 кубиков).
  // Любой фулл на шести кубиках оставляет ровно один свободный, так что
  // стоимость — сумма всех кубиков (сознательно: «удваиваемый шанс с условием»)
  if (diceCount === 6) {
    lower.secondFull = combo('F2', totalSum, fullPoints !== null)
  }

  // Две тройни (только для 6 кубиков) — шесть одинаковых считаются за две тройни
  if (diceCount === 6) {
    const twoTriples = bestGroups(3, 2)
    lower.twoTriples = combo('2T', twoTriples, twoTriples !== null)
  }

  // Малый стрит (1-2-3-4-5) — работает и для 6 кубиков
  const hasRun = (from, to) => {
    for (let v = from; v <= to; v++) if (n(v) < 1) return false
    return true
  }
  lower.smallStraight = combo('S1', 15, hasRun(1, 5))

  // Большой стрит (2-3-4-5-6)
  lower.largeStraight = combo('S2', 20, hasRun(2, 6))

  // Полный стрит (1-2-3-4-5-6) — только для 6 кубиков
  if (diceCount === 6) {
    const hasFullStraight = hasRun(1, 6)
    lower.fullStraight = combo('Sп', 21, hasFullStraight, {
      // база = 1+2+3+4+5+6 = 21
      bonus: hasFullStraight ? 25 : 0, // бонус за сложность
    })
  }

  // Шанс — сумма всех кубиков, всегда доступен, никогда не удваивается
  lower.chance = combo('Шанс', totalSum, true)

  // Объединяем
  return { ...upper, ...lower }
}
