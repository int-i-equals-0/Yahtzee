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
  let twoPairsPoints = 0
  let twoPairsAvailable = false
  const pairValues = []
  for (let i = 1; i <= 6; i++) {
    if (counts[i - 1] >= 2) {
      pairValues.push(i)
    }
  }
  // Для "две пары" нужно минимум 2 значения с >= 2 кубиками
  // Это покрывает случаи: 5-5, 5-5 (4 кубика) или 5-5, 4-4 (4 кубика) и т.д.
  // Мы просто берём 2 самых старших значения и умножаем их на 2
  if (pairValues.length >= 2) {
    twoPairsPoints = (pairValues[0] + pairValues[1]) * 2 // Берём 2 самых старших номинала
    twoPairsAvailable = true
  } else if (pairValues.length === 1 && counts[pairValues[0] - 1] >= 4) {
    // Случай, когда у нас 4 одинаковых: 5-5-5-5 -> это 2 пары по 5
    twoPairsPoints = pairValues[0] * 4 // 5*2 + 5*2 = 5*4
    twoPairsAvailable = true
  }
  lower.twoPairs = {
    name: '2P',
    points: twoPairsPoints,
    available: twoPairsAvailable,
    isUpper: false,
    bonus: 0,
    multiplier: 2,
  }

  // Три пары (только для 6 кубиков)
  if (diceCount === 6) {
    let threePairsPoints = 0
    let threePairsAvailable = false
    const pairValues6 = []
    for (let i = 1; i <= 6; i++) {
      if (counts[i - 1] >= 2) {
        // Учитываем, что 4 одинаковых = 2 пары, 6 одинаковых = 3 пары
        const numPairsOfThisValue = Math.floor(counts[i - 1] / 2)
        for (let j = 0; j < numPairsOfThisValue; j++) {
          pairValues6.push(i)
        }
      }
    }
    // Нужно минимум 3 пары
    if (pairValues6.length >= 3) {
      // Берём 3 самых старших номинала пар
      const topThreePairs = pairValues6.slice(0, 3).sort((a, b) => b - a)
      threePairsPoints = topThreePairs.reduce((sum, val) => sum + val * 2, 0)
      threePairsAvailable = true
    }
    lower.threePairs = {
      name: '3P',
      points: threePairsPoints,
      available: threePairsAvailable,
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
  // Ищем тройню и пару, допуская совпадение номинала
  for (let i = 1; i <= 6; i++) {
    if (counts[i - 1] >= 3) { // Нашли тройню (или больше)
      for (let j = 1; j <= 6; j++) {
        // Проверяем, хватает ли кубиков для пары, учитывая, что 3 уже "заняты" тройней
        const remainingCountForPair = j === i ? counts[j - 1] - 3 : counts[j - 1]
        if (j !== i || remainingCountForPair >= 2) { // Если номинал другой ИЛИ номинал тот же, но кубиков хватает (>=2 после отсчёта 3 для тройни)
          if (remainingCountForPair >= 2) {
            hasFull = true
            fullPoints = i * 3 + j * 2
            break // Нашли первый возможный фулл (с самой старшей тройней, потом парой)
          }
        }
      }
      if (hasFull) break // Нашли фулл, выходим из внешнего цикла
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
    // Ищем тройню
    for (let i = 1; i <= 6; i++) {
      if (counts[i - 1] >= 3) { // Нашли тройню (номинал i)
        // Копируем counts, чтобы "отметить" использованные кубики
        const remaining = [...counts]
        remaining[i - 1] -= 3 // Отнимаем 3 кубика для тройни

        // Ищем пару среди оставшихся
        for (let j = 1; j <= 6; j++) {
          // Проверяем, хватает ли кубиков для пары, учитывая, что 3 уже "заняты" тройней
          const remainingCountForPair = j === i ? remaining[j - 1] : counts[j - 1] // Берём из остатка или из исходного, если номинал другой
          if (remainingCountForPair >= 2) { // Нашли пару
            remaining[j - 1] = j === i ? remaining[j - 1] - 2 : remaining[j - 1] // Отнимаем 2 кубика для пары (если номинал как у тройни) или не трогаем (если другой)
            if (j !== i) remaining[j - 1] = counts[j - 1] - 2 // Если пара другого номинала, корректируем остаток

            // Подсчитываем оставшиеся кости (их должно быть 1 после тройни и пары)
            const leftoverDiceSum = remaining.reduce((sum, count, idx) => sum + (idx + 1) * count, 0)
            // Общая сумма для второго фулла
            secondFullPoints = i * 3 + j * 2 + leftoverDiceSum
            hasSecondFull = true
            break // Нашли первый возможный второй фулл
          }
        }
        if (hasSecondFull) break // Нашли второй фулл, выходим из внешнего цикла
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
  if (diceCount === 6) {
    let twoTriplesPoints = 0
    let twoTriplesAvailable = false
    const tripleValues6 = []
    for (let i = 1; i <= 6; i++) {
      if (counts[i - 1] >= 3) {
        // Учитываем, что 6 одинаковых = 2 тройни
        const numTriplesOfThisValue = Math.floor(counts[i - 1] / 3)
        for (let j = 0; j < numTriplesOfThisValue; j++) {
          tripleValues6.push(i)
        }
      }
    }
    // Нужно минимум 2 тройни
    if (tripleValues6.length >= 2) {
      // Берём 2 самых старших номинала троек
      const topTwoTriples = tripleValues6.slice(0, 2).sort((a, b) => b - a)
      twoTriplesPoints = topTwoTriples.reduce((sum, val) => sum + val * 3, 0)
      twoTriplesAvailable = true
    }
    lower.twoTriples = {
      name: '2T',
      points: twoTriplesPoints,
      available: twoTriplesAvailable,
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
