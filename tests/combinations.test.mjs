// tests/combinations.test.mjs — запуск: npm test
// Примеры взяты из docs/rules-spec.md (§4, §6, §7a).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateCombinations } from '../src/utils/combinations.js'

// Короткая запись: score([2,2,5,5,6,6], 'twoPairs') → 22 или null, если недоступна
const score = (dice, key) => {
  const c = calculateCombinations(dice, dice.length)[key]
  return c.available ? c.points + c.bonus : null
}

test('пара, тройня, каре — старший номинал', () => {
  assert.equal(score([2, 2, 5, 5, 1], 'pair'), 10)
  assert.equal(score([6, 6, 6, 6, 1], 'pair'), 12)
  assert.equal(score([3, 3, 3, 6, 6, 6], 'threeOfAKind'), 18)
  assert.equal(score([4, 4, 4, 4, 2], 'fourOfAKind'), 16)
  assert.equal(score([1, 2, 3, 4, 5], 'pair'), null)
})

test('две пары — две старшие; каре считается за две пары', () => {
  assert.equal(score([2, 2, 5, 5, 6, 6], 'twoPairs'), 22) // было 14
  assert.equal(score([3, 3, 4, 4, 6, 6], 'twoPairs'), 20) // было 14
  assert.equal(score([5, 5, 5, 5, 3, 3], 'twoPairs'), 20) // было 16
  assert.equal(score([5, 5, 5, 5, 2], 'twoPairs'), 20)
  assert.equal(score([6, 6, 6, 6, 6, 6], 'twoPairs'), 24)
  assert.equal(score([2, 2, 5, 6, 1], 'twoPairs'), null)
})

test('три пары — каре + пара и шесть одинаковых тоже', () => {
  assert.equal(score([2, 2, 5, 5, 6, 6], 'threePairs'), 26)
  assert.equal(score([5, 5, 5, 5, 3, 3], 'threePairs'), 26)
  assert.equal(score([6, 6, 6, 6, 5, 5], 'threePairs'), 34)
  assert.equal(score([6, 6, 6, 6, 6, 6], 'threePairs'), 36)
  assert.equal(score([2, 2, 5, 5, 6, 1], 'threePairs'), null)
})

test('фулл — самое дорогое разложение; пять одинаковых = фулл', () => {
  assert.equal(score([3, 3, 3, 5, 5, 5], 'full'), 21) // было 19
  assert.equal(score([1, 1, 1, 6, 6, 6], 'full'), 20) // было 15
  assert.equal(score([2, 2, 2, 6, 6], 'full'), 18)
  assert.equal(score([6, 6, 6, 6, 6], 'full'), 30)
  assert.equal(score([6, 6, 6, 6, 6, 5], 'full'), 30)
  assert.equal(score([4, 4, 4, 4, 2], 'full'), null)
  assert.equal(score([4, 4, 4, 4, 2, 2], 'full'), 16)
})

test('второй фулл = сумма всех кубиков, доступен вместе с фуллом', () => {
  assert.equal(score([2, 2, 2, 6, 6, 1], 'secondFull'), 19)
  assert.equal(score([6, 6, 6, 6, 6, 6], 'secondFull'), 36)
  assert.equal(score([4, 4, 4, 4, 2, 1], 'secondFull'), null)
})

test('две тройни — шесть одинаковых считаются', () => {
  assert.equal(score([3, 3, 3, 5, 5, 5], 'twoTriples'), 24)
  assert.equal(score([6, 6, 6, 6, 6, 6], 'twoTriples'), 36)
  assert.equal(score([4, 4, 4, 4, 4, 2], 'twoTriples'), null)
})

test('генерал и маршал с надбавками', () => {
  assert.equal(score([5, 5, 5, 5, 5], 'general'), 75)
  assert.equal(score([6, 6, 6, 6, 6, 6], 'general'), 80)
  assert.equal(score([6, 6, 6, 6, 6, 6], 'marshal'), 136)
  assert.equal(score([6, 6, 6, 6, 6, 1], 'marshal'), null)
})

test('стриты вложены; полный стрит с надбавкой', () => {
  assert.equal(score([1, 2, 3, 4, 5], 'smallStraight'), 15)
  assert.equal(score([1, 2, 3, 4, 5], 'largeStraight'), null)
  assert.equal(score([2, 3, 4, 5, 6, 6], 'largeStraight'), 20)
  assert.equal(score([2, 3, 4, 5, 6, 6], 'smallStraight'), null)
  assert.equal(score([1, 2, 3, 4, 5, 6], 'smallStraight'), 15)
  assert.equal(score([1, 2, 3, 4, 5, 6], 'largeStraight'), 20)
  assert.equal(score([1, 2, 3, 4, 5, 6], 'fullStraight'), 46)
})

test('верх: (количество − 3) × номинал, может быть отрицательным', () => {
  assert.equal(score([6, 6, 6, 6, 6, 6], 'unit_6'), 18)
  assert.equal(score([6, 6, 6, 6, 6, 6], 'unit_1'), -3)
  assert.equal(score([1, 2, 3, 4, 5], 'unit_6'), -18)
  assert.equal(score([2, 2, 2, 5, 1], 'unit_2'), 0)
})

test('шанс — сумма, всегда доступен', () => {
  assert.equal(score([1, 2, 3, 4, 5], 'chance'), 15)
  assert.equal(score([6, 6, 6, 6, 6, 6], 'chance'), 36)
})

test('набор ключей соответствует режиму', () => {
  const keys5 = Object.keys(calculateCombinations([1, 1, 1, 1, 1], 5))
  const keys6 = Object.keys(calculateCombinations([1, 1, 1, 1, 1, 1], 6))
  assert.equal(keys5.length, 15)
  assert.equal(keys6.length, 20)
  for (const k of ['threePairs', 'twoTriples', 'secondFull', 'fullStraight', 'marshal']) {
    assert.ok(!keys5.includes(k), `${k} не должно быть при 5 кубиках`)
    assert.ok(keys6.includes(k), `${k} должно быть при 6 кубиках`)
  }
})

// Инварианты на всех возможных наборах: вложенность комбинаций
test('инварианты на полном переборе наборов', () => {
  const walk = (count, cb) => {
    const dice = Array(count).fill(1)
    const rec = (i, min) => {
      if (i === count) return cb(dice.slice())
      for (let v = min; v <= 6; v++) {
        dice[i] = v
        rec(i + 1, v)
      }
    }
    rec(0, 1)
  }
  let seen = 0
  for (const count of [5, 6]) {
    walk(count, dice => {
      seen++
      const c = calculateCombinations(dice, count)
      const sum = dice.reduce((s, d) => s + d, 0)
      assert.equal(c.chance.points, sum)
      if (c.general.available) assert.ok(c.fourOfAKind.available && c.full.available)
      if (c.fourOfAKind.available) assert.ok(c.threeOfAKind.available && c.twoPairs.available)
      if (c.threeOfAKind.available) assert.ok(c.pair.available)
      if (c.twoPairs.available) assert.ok(c.twoPairs.points >= c.pair.points)
      if (c.full.available) assert.ok(c.full.points >= c.threeOfAKind.points)
      if (count === 6) {
        assert.equal(c.secondFull.available, c.full.available)
        if (c.secondFull.available) assert.equal(c.secondFull.points, sum)
        if (c.twoTriples.available) assert.equal(c.twoTriples.points, sum)
        if (c.threePairs.available) assert.equal(c.threePairs.points, sum)
        if (c.marshal.available) assert.ok(c.general.available && c.twoTriples.available && c.threePairs.available)
        if (c.fullStraight.available) assert.ok(c.smallStraight.available && c.largeStraight.available)
      }
    })
  }
  assert.equal(seen, 252 + 462)
})
