// src/utils/comboOrder.js — порядок строк таблицы очков. Единственный источник:
// его читают и экран игры, и бот (для бота порядок = раскладка маски состояния),
// и решатель на C++ (ORDER5/ORDER6 в solver/common.hpp — должны совпадать).

export const comboOrder5 = [
  'unit_1', 'unit_2', 'unit_3', 'unit_4', 'unit_5', 'unit_6',
  'pair', 'twoPairs', 'threeOfAKind', 'full',
  'smallStraight', 'largeStraight', 'fourOfAKind', 'general', 'chance',
]

export const comboOrder6 = [
  'unit_1', 'unit_2', 'unit_3', 'unit_4', 'unit_5', 'unit_6',
  'pair', 'twoPairs', 'threePairs', 'threeOfAKind', 'twoTriples',
  'full', 'secondFull', 'smallStraight', 'largeStraight', 'fullStraight',
  'fourOfAKind', 'general', 'marshal', 'chance',
]

export const comboOrderFor = diceCount => (diceCount === 6 ? comboOrder6 : comboOrder5)
