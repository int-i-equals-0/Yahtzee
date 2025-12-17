// src/bot/YahtzeeBot.js

import { calculateCombinations } from '@/utils/combinations.js';

export class YahtzeeBot {
  constructor(diceCount, playerName = 'Bot') {
    this.diceCount = diceCount;
    this.name = playerName;
    this.comboOrder = this.diceCount === 6 ? this.comboOrder6 : this.comboOrder5;
  }

  // Определение порядка комбинаций для внутренней логики
  comboOrder5 = [
    'unit_1', 'unit_2', 'unit_3', 'unit_4', 'unit_5', 'unit_6',
    'pair', 'twoPairs', 'threeOfAKind', 'full',
    'smallStraight', 'largeStraight', 'fourOfAKind', 'general', 'chance'
  ];

  comboOrder6 = [
    'unit_1', 'unit_2', 'unit_3', 'unit_4', 'unit_5', 'unit_6',
    'pair', 'twoPairs', 'threePairs', 'threeOfAKind', 'twoTriples',
    'full', 'secondFull', 'smallStraight', 'largeStraight', 'fullStraight',
    'fourOfAKind', 'general', 'marshal', 'chance'
  ];

  /**
   * Основной метод принятия решения ботом
   * @param {Object} gameState - Состояние игры, включая кубики, таблицу, текущего игрока и т.д.
   * @returns {Object} - Действие, которое должен выполнить компонент
   */
  makeDecision(gameState) {
    const { dice, rollsThisTurn, scorecard } = gameState;
    const currentDiceValues = dice.map(d => d.value);
    const combos = calculateCombinations(currentDiceValues, this.diceCount);
    const isFirstRoll = rollsThisTurn === 1;

    console.log(`[Bot] Ход ${rollsThisTurn}, isFirstRoll: ${isFirstRoll}, кубики: [${currentDiceValues.join(', ')}]`);
    console.log(`[Bot] Комбинации:`, combos);

    // 1. Если это первый бросок в раунде (rollsThisTurn === 0), то вызывается startTurn вручную, и бот не участвует
    if (rollsThisTurn === 0) {
      console.log(`[Bot] Решение: начать ход.`);
      return { action: 'startTurn' };
    }

    // 2. Проверяем, есть ли сразу доступная и очень выгодная комбинация (например, фулл, стрит, генерал) с первого броска
    if (isFirstRoll) {
      const immediateHighValue = this.findImmediateHighValueCombination(combos, scorecard);
      if (immediateHighValue) {
        console.log(`[Bot] Найдена высокая комбинация с 1-го броска: ${immediateHighValue}`);
        return { action: 'fillScore', combinationKey: immediateHighValue };
      }
    }

    // 3. Если броски ещё не все, оценим текущий бросок на предмет целей для заморозки и потенциальных заполнений
    if (rollsThisTurn < 3) {
      // Проверим, есть ли "цель для улучшения" (например, почти стрит, тройня)
      const targetForLocking = this.determineTargetForLocking(currentDiceValues, scorecard);
      if (targetForLocking) {
        const { indices, nextAction } = targetForLocking;
        if (nextAction === 'lockDice') {
          console.log(`[Bot] Цель для улучшения найдена. Замораживаем индексы [${indices.join(', ')}]`);
          return { action: 'lockDice', indices };
        }
      }

      // Если целей для улучшения нет, проверим, есть ли на этом броске что-то, что стоит заполнить
      // Оцениваем все возможные доступные комбинации и выбираем наилучшую
      const bestAvailable = this.evaluateBestAvailableCombination(combos, scorecard, rollsThisTurn);
      if (bestAvailable) {
        // Проверим, стоит ли брать её на этом броске или лучше перебросить
        if (this.shouldTakeCombinationNow(bestAvailable, rollsThisTurn, scorecard)) {
          console.log(`[Bot] Решение: заполнить доступную комбинацию ${bestAvailable.key} после ${rollsThisTurn} броска(ов).`);
          return { action: 'fillScore', combinationKey: bestAvailable.key };
        } else {
          // Если не берём, и целей для заморозки не было, просто бросаем дальше
          console.log(`[Bot] Решение: бросить кости.`);
          return { action: 'rollDice' };
        }
      }

      // Если нет целей для заморозки и выгодных комбинаций, просто бросаем дальше
      console.log(`[Bot] Решение: бросить кости.`);
      return { action: 'rollDice' };
    }

    // 4. Если броски закончились (rollsThisTurn === 3)
    // Выбираем наилучшую доступную комбинацию на последнем броске
    const finalBestAvailable = this.evaluateBestAvailableCombination(combos, scorecard, rollsThisTurn);
    if (finalBestAvailable) {
        console.log(`[Bot] Последний бросок, заполняем наилучшую доступную комбинацию: ${finalBestAvailable.key}.`);
        return { action: 'fillScore', combinationKey: finalBestAvailable.key };
    }

    // Если нет доступной, ищем "резервную" комбинацию для заполнения (это крайний случай)
    const fallbackTarget = this.findFallbackCombination(currentDiceValues, scorecard);
    if (fallbackTarget) {
      console.log(`[Bot] Последний бросок, нет доступных, заполняем резервную: ${fallbackTarget.combinationKey}`);
      return { action: 'fillScore', combinationKey: fallbackTarget.combinationKey };
    }

    // Это крайний случай, если всё занято (что маловероятно к концу игры)
    console.warn('[Bot] Нет доступных комбинаций для заполнения! Это ошибка.');
    return { action: 'fillScore', combinationKey: this.comboOrder[0] };
  }

  /**
   * Оценивает все доступные комбинации и возвращает ту, которая "лучше" всего подходит для заполнения
   */
  evaluateBestAvailableCombination(combos, scorecard, rollsThisTurn) {
    let bestOption = null;
    let bestScore = -Infinity;

    for (const [key, combo] of Object.entries(combos)) {
      if (scorecard[key] !== null) continue; // Уже занято

      let score = 0;

      // Основная логика оценки
      if (combo.available) {
        // Базовые очки
        score += combo.points + combo.bonus;
        // Учитываем множитель первого броска
        if (key !== 'chance' && rollsThisTurn === 1) {
          score = (combo.points * 2) + combo.bonus;
        }
      } else {
        // Если комбинация недоступна, можно дать штраф за вычёркивание
        // Но в данном случае мы ищем доступные, так что это не нужно
        continue;
      }

      // Бонус за верхнюю часть
      if (key.startsWith('unit_')) {
        const currentUpperSum = this.calculateUpperSum(scorecard);
        const newValue = combos[key].points;
        const potentialNewSum = currentUpperSum + newValue;
        const target = this.diceCount === 5 ? 10 : 20;
        // Оцениваем, как новое значение влияет на шанс получить бонус
        // Это упрощённая эвристика
        if (potentialNewSum >= target && currentUpperSum < target) {
          score += 50; // Добавим условный бонус
        }
        // Штраф за отрицательные значения, если цель уже достигнута
        if (newValue < 0 && currentUpperSum >= target) {
          score -= Math.abs(newValue) * 2; // Усиленный штраф
        }
      }

      // Приоритет для "ценных" нижних комбинаций
      const highValueCombos = ['marshal', 'general', 'fullStraight', 'largeStraight', 'smallStraight', 'full', 'fourOfAKind'];
      if (highValueCombos.includes(key)) {
        score += 20; // Условный бонус
      }

      if (score > bestScore) {
        bestScore = score;
        bestOption = { key, points: combo.points, bonus: combo.bonus, score: score };
      }
    }

    return bestOption;
  }

  /**
   * Принимает решение, брать ли комбинацию немедленно или пытаться улучшить
   */
  shouldTakeCombinationNow(option, rollsThisTurn, scorecard) {
    // Если это "очень высокая" комбинация, всегда берём
    const highValueCombos = ['marshal', 'general', 'fullStraight', 'largeStraight', 'smallStraight', 'full'];
    if (highValueCombos.includes(option.key)) {
      return true;
    }

    // Если остался 1 бросок, и комбинация "неплохая", берём
    if (rollsThisTurn >= 2 && option.score > 5) {
      return true;
    }

    // Если это верхняя часть, и цель не достигнута, и очки неотрицательные, можно брать
    const target = this.diceCount === 5 ? 10 : 20;
    const currentUpperSum = this.calculateUpperSum(scorecard);
    if (option.key.startsWith('unit_') && currentUpperSum < target && option.points >= 0) {
      return true;
    }

    // Если это верхняя часть, и она даёт отрицательные очки, и цель достигнута, НЕ БЕРЕМ
    if (option.key.startsWith('unit_') && currentUpperSum >= target && option.points < 0) {
        return false;
    }

    // В остальных случаях, если бросков осталось 2, можно подумать о переброске
    if (rollsThisTurn < 2) {
        return false;
    }

    // По умолчанию, если бросок последний, берём
    return rollsThisTurn === 3;
  }

  /**
   * Находит комбинацию, которую можно заполнить сразу с первого броска и которая очень выгодна
   */
  findImmediateHighValueCombination(combos, scorecard) {
    const highValueCombos = this.diceCount === 6
      ? ['marshal', 'general', 'fullStraight', 'largeStraight', 'smallStraight', 'full']
      : ['general', 'largeStraight', 'smallStraight', 'full'];

    for (const key of highValueCombos) {
      if (combos[key] && combos[key].available && scorecard[key] === null) {
        if (combos[key].points > 0 || combos[key].bonus > 0) {
          console.log(`[Bot] Найдена высокая комбинация: ${key}, очки: ${combos[key].points}, бонус: ${combos[key].bonus}`);
          return key;
        }
      }
    }
    return null;
  }

  /**
   * Определяет, какие кубики заморозить, или какую комбинацию заполнить
   */
  determineTargetForLocking(diceValues, scorecard) {
    // Считаем количество каждого значения
    const counts = [0, 0, 0, 0, 0, 0]; // индексы 0-5 для значений 1-6
    for (const val of diceValues) {
      counts[val - 1]++;
    }
    this.diceValues = diceValues; // Сохраняем для использования в findMaxOfAKindTarget

    // 1. Приоритет: стриты, если есть 4+ чисел из 5/6
    const straightTarget = this.findStraightTarget(diceValues, scorecard);
    if (straightTarget) {
      return straightTarget;
    }

    // 2. Приоритет: максимизация одинаковых, особенно если соответствующая строка в верхней части свободна
    const maxOfAKindTarget = this.findMaxOfAKindTarget(counts, scorecard);
    if (maxOfAKindTarget) {
      return maxOfAKindTarget;
    }

    // 3. Если нет хороших целей для заморозки
    return null;
  }

  findStraightTarget(diceValues, scorecard) {
    const uniqueValues = [...new Set(diceValues)].sort((a, b) => a - b);

    // Проверяем малый стрит (1-2-3-4-5)
    if (scorecard['smallStraight'] === null) {
        const neededForSmall = [1, 2, 3, 4, 5];
        const currentInStraight = diceValues.filter(val => neededForSmall.includes(val));
        const uniqueCurrent = [...new Set(currentInStraight)].sort((a, b) => a - b);

        if (uniqueCurrent.length === 5) { // Уже есть готовый стрит
            const indicesToKeep = diceValues.map((val, idx) => neededForSmall.includes(val) ? idx : -1).filter(idx => idx !== -1);
            console.log(`[Bot] Цель: готовый малый стрит. Замораживаем индексы [${indicesToKeep.join(', ')}]`);
            return { indices: indicesToKeep, nextAction: 'lockDice' };
        } else if (uniqueCurrent.length === 4) { // Если есть 4 из 5 -> почти стрит
            const indicesToKeep = diceValues.map((val, idx) => neededForSmall.includes(val) ? idx : -1).filter(idx => idx !== -1);
            // Найдём индексы костей, которые НЕ входят в стрит
            const indicesToReroll = diceValues.map((val, idx) => !neededForSmall.includes(val) ? idx : -1).filter(idx => idx !== -1);
            // Заморозим только те, что входят в стрит, оставим остальные для переброски
            console.log(`[Bot] Цель: почти малый стрит. Замораживаем индексы [${indicesToKeep.join(', ')}], перебрасываем [${indicesToReroll.join(', ')}]`);
            return { indices: indicesToKeep, nextAction: 'lockDice' };
        }
    }

    // Проверяем большой стрит (2-3-4-5-6)
    if (scorecard['largeStraight'] === null) {
        const neededForLarge = [2, 3, 4, 5, 6];
        const currentInStraight = diceValues.filter(val => neededForLarge.includes(val));
        const uniqueCurrent = [...new Set(currentInStraight)].sort((a, b) => a - b);

        if (uniqueCurrent.length === 5) { // Уже есть готовый стрит
            const indicesToKeep = diceValues.map((val, idx) => neededForLarge.includes(val) ? idx : -1).filter(idx => idx !== -1);
            console.log(`[Bot] Цель: готовый большой стрит. Замораживаем индексы [${indicesToKeep.join(', ')}]`);
            return { indices: indicesToKeep, nextAction: 'lockDice' };
        } else if (uniqueCurrent.length === 4) { // Если есть 4 из 5 -> почти стрит
            const indicesToKeep = diceValues.map((val, idx) => neededForLarge.includes(val) ? idx : -1).filter(idx => idx !== -1);
            const indicesToReroll = diceValues.map((val, idx) => !neededForLarge.includes(val) ? idx : -1).filter(idx => idx !== -1);
            console.log(`[Bot] Цель: почти большой стрит. Замораживаем индексы [${indicesToKeep.join(', ')}], перебрасываем [${indicesToReroll.join(', ')}]`);
            return { indices: indicesToKeep, nextAction: 'lockDice' };
        }
    }

    // Проверяем полный стрит (1-2-3-4-5-6) для 6 кубиков
    if (this.diceCount === 6 && scorecard['fullStraight'] === null) {
      if (uniqueValues.length === 6) { // если все 6 разных -> готов стрит
        const indicesToKeep = Array.from({length: this.diceCount}, (_, i) => i);
        console.log(`[Bot] Цель: готовый полный стрит. Замораживаем индексы [${indicesToKeep.join(', ')}]`);
        return { indices: indicesToKeep, nextAction: 'lockDice' };
      }
    }

    return null;
  }

  findMaxOfAKindTarget(counts, scorecard) {
    // Находим значение с максимальным количеством кубиков
    let maxCount = 0;
    let maxValue = -1;
    for (let i = 0; i < 6; i++) {
      if (counts[i] > maxCount) {
        maxCount = counts[i];
        maxValue = i + 1; // значение кубика (1-6)
      }
    }

    if (maxCount < 2) return null; // нет смысла замораживать одну кость

    const unitKey = `unit_${maxValue}`;
    // Приоритет: замораживаем кости, если соответствующая строка в верхней части свободна
    if (scorecard[unitKey] === null) {
      // Замораживаем все кости с этим значением
      const indicesToLock = [];
      for (let i = 0; i < this.diceCount; i++) {
        if (this.diceValues[i] === maxValue) {
          indicesToLock.push(i);
        }
      }
      console.log(`[Bot] Цель: максимизация ${maxValue} (верхняя часть). Замораживаем индексы [${indicesToLock.join(', ')}]`);
      return { indices: indicesToLock, nextAction: 'lockDice' };
    }

    // Если строка занята, ищем следующую по количеству
    let nextMaxCount = 0;
    let nextMaxValue = -1;
    for (let i = 0; i < 6; i++) {
      if (counts[i] > nextMaxCount && counts[i] < maxCount) {
        nextMaxCount = counts[i];
        nextMaxValue = i + 1;
      }
    }

    if (nextMaxValue !== -1) {
      const nextUnitKey = `unit_${nextMaxValue}`;
      if (scorecard[nextUnitKey] === null) {
        const indicesToLock = [];
        for (let i = 0; i < this.diceCount; i++) {
          if (this.diceValues[i] === nextMaxValue) {
            indicesToLock.push(i);
          }
        }
        console.log(`[Bot] Цель: максимизация ${nextMaxValue} (верхняя часть). Замораживаем индексы [${indicesToLock.join(', ')}]`);
        return { indices: indicesToLock, nextAction: 'lockDice' };
      }
    }

    // Если ищем для нижних комбинаций (тройня, каре, генерал)
    if (maxCount >= 3 && scorecard['threeOfAKind'] === null) {
      const indicesToLock = [];
      for (let i = 0; i < this.diceCount; i++) {
        if (this.diceValues[i] === maxValue) {
          indicesToLock.push(i);
        }
      }
      console.log(`[Bot] Цель: тройня ${maxValue}. Замораживаем индексы [${indicesToLock.join(', ')}]`);
      return { indices: indicesToLock, nextAction: 'lockDice' };
    }
    if (maxCount >= 4 && scorecard['fourOfAKind'] === null) {
      const indicesToLock = [];
      for (let i = 0; i < this.diceCount; i++) {
        if (this.diceValues[i] === maxValue) {
          indicesToLock.push(i);
        }
      }
      console.log(`[Bot] Цель: каре ${maxValue}. Замораживаем индексы [${indicesToLock.join(', ')}]`);
      return { indices: indicesToLock, nextAction: 'lockDice' };
    }

    return null;
  }

  findFallbackCombination(diceValues, scorecard) {
    // Используем calculateCombinations для получения всех возможных очков
    const combos = calculateCombinations(diceValues, this.diceCount);

    // Сначала ищем доступную комбинацию в нижней части, чтобы не вычёркивать сложные
    const lowerCombos = this.comboOrder.filter(key => !key.startsWith('unit_'));
    for (const key of lowerCombos) {
      if (combos[key] && combos[key].available && scorecard[key] === null) {
        // Проверим, дает ли она хоть какие-то очки
        if (combos[key].points + combos[key].bonus > 0) {
          console.log(`[Bot] Заполняем нижнюю резервную комбинацию: ${key}, очки: ${combos[key].points}, бонус: ${combos[key].bonus}`);
          return { combinationKey: key };
        }
      }
    }

    // Если нет хороших нижних, ищем в верхней части
    const upperCombos = ['unit_1', 'unit_2', 'unit_3', 'unit_4', 'unit_5', 'unit_6'];
    for (const key of upperCombos) {
      if (scorecard[key] === null) {
        const combo = combos[key];
        // Проверим сумму верхней части. Цель: 10 для 5, 20 для 6.
        const target = this.diceCount === 5 ? 10 : 20;
        const currentUpperSum = this.calculateUpperSum(scorecard);
        if (currentUpperSum < target) {
          // Если сумма ещё низкая, заполняем, даже если отрицательно
          console.log(`[Bot] Заполняем верхнюю резервную часть: ${key}, текущая сумма: ${currentUpperSum}, цель: ${target}`);
          return { combinationKey: key };
        } else {
          // Если сумма уже достигнута, можно заполнить 0, но не отрицательно, если можно
          if (combo.points >= 0) {
            console.log(`[Bot] Заполняем верхнюю резервную часть: ${key}, очки: ${combo.points}, сумма достигнута.`);
            return { combinationKey: key };
          }
        }
      }
    }

    // Если всё занято или только отрицательные варианты в верхней части при высокой сумме,
    // ищем наименее ценный вариант для вычёркивания
    // Просто выберем первую доступную, чтобы не вычёркивать
    for (const key of this.comboOrder) {
      if (combos[key] && combos[key].available && scorecard[key] === null) {
        console.log(`[Bot] Заполняем первую доступную резервную комбинацию: ${key}`);
        return { combinationKey: key };
      }
    }

    // Если нет доступных комбинаций, бот не должен вызывать этот метод
    // Но если вызвал, заполняем первую незаполненную, даже если 0
    for (const key of this.comboOrder) {
      if (scorecard[key] === null) {
        console.log(`[Bot] Нет доступных комбинаций, заполняем: ${key}`);
        return { combinationKey: key };
      }
    }

    return null; // Не должно произойти
  }

  calculateUpperSum(scorecard) {
    let sum = 0;
    for (let i = 1; i <= 6; i++) {
      const val = scorecard[`unit_${i}`];
      if (val !== null) sum += val;
    }
    return sum;
  }
}