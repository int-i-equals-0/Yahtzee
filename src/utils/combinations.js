// src/utils/combinations.js

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

  // Обязательные (верхняя часть): Ш1–Ш6
  const upper = {}
  for (let i = 1; i <= 6; i++) {
    const points = (counts[i - 1] - 3) * i // как в твоём оригинале
    upper[`unit_${i}`] = {
      name: `Ш${i}`,
      points,
      available: true,
      isUpper: true,
      bonus: 0,
      multiplier: 1,
    }
  }

  // Нижняя часть
  const lower = {}

  // Пара (максимальная)
  let maxPairValue = null
  for (let i = 6; i >= 1; i--) {
    if (counts[i - 1] >= 2) {
      maxPairValue = i
      break
    }
  }
  lower.pair = {
    name: 'П',
    points: maxPairValue ? maxPairValue * 2 : 0,
    available: maxPairValue !== null,
    isUpper: false,
    bonus: 0,
    multiplier: 2,
  }

  // Две пары
  const pairs = []
  for (let i = 1; i <= 6; i++) {
    if (counts[i - 1] >= 2) pairs.push(i)
  }
  lower.twoPairs = {
    name: '2P',
    points: pairs.length >= 2 ? pairs.slice(0, 2).reduce((s, v) => s + v * 2, 0) : 0,
    available: pairs.length >= 2,
    isUpper: false,
    bonus: 0,
    multiplier: 2,
  }

  // Три пары (только для 6 кубиков)
  if (diceCount === 6) {
    lower.threePairs = {
      name: '3P',
      points: pairs.length === 3 ? pairs.reduce((s, v) => s + v * 2, 0) : 0,
      available: pairs.length === 3,
      isUpper: false,
      bonus: 0,
      multiplier: 2,
    }
  }

  // Тройня
  let tripleValue = null
  for (let i = 6; i >= 1; i--) {
    if (counts[i - 1] >= 3) {
      tripleValue = i
      break
    }
  }
  lower.threeOfAKind = {
    name: 'T',
    points: tripleValue ? tripleValue * 3 : 0,
    available: tripleValue !== null,
    isUpper: false,
    bonus: 0,
    multiplier: 2,
  }

  // Каре
  let fourValue = null
  for (let i = 6; i >= 1; i--) {
    if (counts[i - 1] >= 4) {
      fourValue = i
      break
    }
  }
  lower.fourOfAKind = {
    name: 'Car',
    points: fourValue ? fourValue * 4 : 0,
    available: fourValue !== null,
    isUpper: false,
    bonus: 0,
    multiplier: 2,
  }

  // Генерал (5 одинаковых)
  let generalValue = null
  for (let i = 1; i <= 6; i++) {
    if (counts[i - 1] >= 5) {
      generalValue = i
      break
    }
  }
  lower.general = {
    name: 'Gen',
    points: generalValue ? generalValue * 5 : 0,
    available: generalValue !== null,
    isUpper: false,
    bonus: generalValue ? 50 : 0, // бонус за сложность
    multiplier: 2,
  }

  // Маршал (6 одинаковых, только для 6 кубиков)
  if (diceCount === 6) {
    let marshalValue = null
    for (let i = 1; i <= 6; i++) {
      if (counts[i - 1] === 6) {
        marshalValue = i
        break
      }
    }
    lower.marshal = {
      name: 'Мар',
      points: marshalValue ? marshalValue * 6 : 0,
      available: marshalValue !== null,
      isUpper: false,
      bonus: marshalValue ? 100 : 0, // бонус за сложность
      multiplier: 2,
    }
  }

  // Фулл (тройня + пара)
  let hasFull = false
  let fullPoints = 0
  if (tripleValue !== null) {
    for (let i = 1; i <= 6; i++) {
      if (i !== tripleValue && counts[i - 1] >= 2) {
        hasFull = true
        fullPoints = tripleValue * 3 + i * 2
        break
      }
    }
  }
  lower.full = {
    name: 'F',
    points: fullPoints,
    available: hasFull,
    isUpper: false,
    bonus: 0,
    multiplier: 2,
  }

  // Второй фулл: тройня + пара + одна кость (только для 6 кубиков)
  if (diceCount === 6) {
    let hasSecondFull = false
    let secondFullPoints = 0
    if (tripleValue !== null) {
      const remaining = [...counts]
      remaining[tripleValue - 1] -= 3
      // Ищем пару среди оставшихся
      for (let i = 1; i <= 6; i++) {
        if (remaining[i - 1] >= 2) {
          hasSecondFull = true
          secondFullPoints = tripleValue * 3 + i * 2 + remaining.reduce((sum, cnt, idx) => {
            if (idx + 1 !== tripleValue && idx + 1 !== i) {
              return sum + (idx + 1) * cnt
            }
            return sum
          }, 0)
          break
        }
      }
    }
    lower.secondFull = {
      name: 'F2',
      points: secondFullPoints,
      available: hasSecondFull,
      isUpper: false,
      bonus: 0,
      multiplier: 2,
    }
  }

  // Две тройни (только для 6 кубиков)
  const triples = []
  for (let i = 1; i <= 6; i++) {
    if (counts[i - 1] >= 3) triples.push(i)
  }
  if (diceCount === 6) {
    lower.twoTriples = {
      name: '2T',
      points: triples.length >= 2 ? triples.slice(0, 2).reduce((s, v) => s + v * 3, 0) : 0,
      available: triples.length >= 2,
      isUpper: false,
      bonus: 0,
      multiplier: 2,
    }
  }

  // Малый стрит (1-2-3-4-5) — работает и для 6 кубиков
  const hasSmallStraight = counts[0] >= 1 && counts[1] >= 1 && counts[2] >= 1 && counts[3] >= 1 && counts[4] >= 1
  lower.smallStraight = {
    name: 'S1',
    points: hasSmallStraight ? 15 : 0,
    available: hasSmallStraight,
    isUpper: false,
    bonus: 0,
    multiplier: 2,
  }

  // Большой стрит (2-3-4-5-6)
  const hasLargeStraight = counts[1] >= 1 && counts[2] >= 1 && counts[3] >= 1 && counts[4] >= 1 && counts[5] >= 1
  lower.largeStraight = {
    name: 'S2',
    points: hasLargeStraight ? 20 : 0,
    available: hasLargeStraight,
    isUpper: false,
    bonus: 0,
    multiplier: 2,
  }

  // Полный стрит (1-2-3-4-5-6) — только для 6 кубиков
  if (diceCount === 6) {
    const hasFullStraight = counts.every(c => c >= 1)
    lower.fullStraight = {
      name: 'FS',
      points: hasFullStraight ? 21 : 0, // база = 1+2+3+4+5+6 = 21
      available: hasFullStraight,
      isUpper: false,
      bonus: hasFullStraight ? 25 : 0, // бонус за сложность
      multiplier: 2,
    }
  }

  // Шанс
  lower.chance = {
    name: 'Шанс',
    points: totalSum,
    available: true,
    isUpper: false,
    bonus: 0,
    multiplier: 2,
  }

  // Объединяем
  const all = { ...upper, ...lower }

  // Для отладки: можно раскомментировать
  // console.log('Комбинации:', all)

  return all
}