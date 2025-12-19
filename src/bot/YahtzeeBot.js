// src/bot/YahtzeeBot.js
import strategy5 from '@/assets/YahtzeeBot5.json';
import strategy6 from '@/assets/YahtzeeBot6.json';
import { calculateCombinations } from '@/utils/combinations';

export class YahtzeeBot {
  constructor(diceCount, name = 'BOT') {
    this.diceCount = diceCount;
    this.name = name;
    this.strategy = diceCount === 5 ? strategy5 : strategy6;
    this.upperTarget = diceCount === 6 ? 20 : 10;
  }

  getDiceCountsKey(dice) {
    const counts = [0, 0, 0, 0, 0, 0];
    for (const value of dice) {
      if (value >= 1 && value <= 6) counts[value - 1]++;
    }
    return `[${counts.join(',')}]`;
  }

  makeDecision(gameState) {
    const { dice, rollsLeft, scorecard } = gameState;
    const key = this.getDiceCountsKey(dice);
    const plan = this.strategy[key];

    if (!plan) {
      console.warn(`[${this.name}] План не найден для кубиков:`, dice);
      return this.fallbackAction(scorecard);
    }

    const available = plan.targets.filter(t => scorecard[t.key] === null);
    if (available.length === 0) {
      return this.fallbackAction(scorecard);
    }

    // === ПРОВЕРКА УЛУЧШЕНИЯ ДОСТИГНУТОЙ КОМБИНАЦИИ ===
    if (rollsLeft < 3) {
      const currentCombos = calculateCombinations(dice, this.diceCount);
      const bestAvailable = available[0];
      
      if (currentCombos[bestAvailable.key]?.available) {
        const improvementTarget = this.getImprovementTarget(bestAvailable.key, scorecard);
        if (improvementTarget && scorecard[improvementTarget] === null) {
          console.group(`[${this.name}] Ход ${3 - rollsLeft}/3. Кубики: [${dice.join(', ')}]`);
          console.log('Решение: УЛУЧШИТЬ', bestAvailable.key, 'до', improvementTarget);
          console.log('Заморозка:', this.getLockIndices(bestAvailable.key, dice, scorecard));
          console.groupEnd();
          
          return {
            action: 'lockDice',
            indices: this.getLockIndices(bestAvailable.key, dice, scorecard)
          };
        }
      }
    }

    const ranked = this.rankTargetsStrategically(available, scorecard, dice, rollsLeft);
    const best = ranked[0];

    if (this.shouldFillNow(best.key, dice, rollsLeft, scorecard)) {
      console.group(`[${this.name}] Ход ${3 - rollsLeft}/3. Кубики: [${dice.join(', ')}]`);
      console.log('Решение: ЗАПОЛНИТЬ СЕЙЧАС (достигнута надёжная цель)');
      console.groupEnd();
      return { action: 'fillScore', key: best.key };
    }

    console.group(`[${this.name}] Ход ${3 - rollsLeft}/3. Кубики: [${dice.join(', ')}]`);
    console.log('Выбрано:', best.key, `(приоритет=${best.priority})`);
    console.log('Заморозка:', this.getLockIndices(best.key, dice, scorecard));
    console.groupEnd();

    return {
      action: 'lockDice',
      indices: this.getLockIndices(best.key, dice, scorecard)
    };
  }

  rankTargetsStrategically(targets, scorecard, dice, rollsLeft) {
    const upperSum = this.getUpperSum(scorecard);
    const needBonus = upperSum < this.upperTarget;
    const counts = [0,0,0,0,0,0];
    dice.forEach(d => counts[d-1]++);

    return targets.map(target => {
      let priority = 0;

      // Верхняя часть (если нужен бонус)
      if (target.key.startsWith('unit_') && needBonus) {
        const num = parseInt(target.key[5]) - 1;
        const potential = (counts[num] - 3) * (num + 1);
        if (potential > 0) priority += 1000;
        else if (potential === 0) priority += 100;
        else if (rollsLeft > 1) priority -= 1000;
      }

      // Надёжные комбинации
      if (this.isReliableCombo(target.key, dice)) {
        priority += 800;
      }

      // Редкие комбинации (штраф, но с проверкой реалистичности)
      if (this.isRareCombo(target.key, dice)) {
        priority -= 300;
      }

      // Резервные комбинации на финале
      if (rollsLeft === 1 && this.isReserveCombo(target.key)) {
        priority += 200;
      }

      return { ...target, priority };
    }).sort((a, b) => b.priority - a.priority);
  }

  shouldFillNow(comboKey, dice, rollsLeft, scorecard) {
    const combos = calculateCombinations(dice, this.diceCount);
    const combo = combos[comboKey];
    if (!combo || !combo.available) return false;

    const baseScore = combo.points + (combo.bonus || 0);
    
    if (comboKey === 'chance') return true;
    
    // На 1-м броске: сравниваем удвоение vs улучшение
    if (rollsLeft === 3) {
      const imm = (comboKey === 'chance') ? baseScore : baseScore * 2;
      const improvementPotential = this.getImprovementPotential(comboKey, dice, scorecard);
      return imm > improvementPotential;
    } 
    // На 2-м/3-м броске: не заполняем, если можно улучшить
    else if (this.canImproveCombo(comboKey, dice, scorecard)) {
      return false;
    }
    // Заполняем надёжные комбинации
    else if (this.isReliableCombo(comboKey, dice) && baseScore > 10) {
      return true;
    }
    
    // Верхняя часть: заполняем, если результат положительный
    if (comboKey.startsWith('unit_')) {
      const num = parseInt(comboKey[5]);
      const count = dice.filter(d => d === num).length;
      return (count - 3) * num > 0;
    }
    
    // Последний бросок — заполняем всё
    if (rollsLeft === 1) return true;
    
    return false;
  }

  // === КЛЮЧЕВАЯ ЛОГИКА УЛУЧШЕНИЯ ===
  canImproveCombo(comboKey, dice, scorecard) {
    const counts = [0,0,0,0,0,0];
    dice.forEach(d => counts[d-1]++);
    
    if (comboKey === 'fourOfAKind') {
      const hasFour = counts.some(c => c === 4);
      if (!hasFour) return false;
      return (scorecard['general'] === null) || (scorecard['marshal'] === null);
    }
    
    if (comboKey === 'general') {
      const hasFive = counts.some(c => c === 5);
      if (!hasFive) return false;
      return scorecard['marshal'] === null;
    }
    
    if (comboKey === 'largeStraight') {
      return scorecard['fullStraight'] === null && this.canGetFullStraight(dice);
    }
    
    if (comboKey === 'smallStraight') {
      return (scorecard['largeStraight'] === null || scorecard['fullStraight'] === null) 
             && this.canGetFullStraight(dice);
    }
    
    if (comboKey === 'full' && this.diceCount === 6) {
      return scorecard['secondFull'] === null;
    }
    
    return false;
  }

  getImprovementTarget(comboKey, scorecard) {
    if (comboKey === 'fourOfAKind') {
      return scorecard['marshal'] === null ? 'marshal' : 'general';
    }
    if (comboKey === 'largeStraight') {
      return 'fullStraight';
    }
    if (comboKey === 'smallStraight') {
      return scorecard['fullStraight'] === null ? 'fullStraight' : 'largeStraight';
    }
    if (comboKey === 'full' && this.diceCount === 6) {
      return 'secondFull';
    }
    return null;
  }

  getImprovementPotential(comboKey, dice, scorecard) {
    const counts = [0,0,0,0,0,0];
    dice.forEach(d => counts[d-1]++);
    
    if (comboKey === 'fourOfAKind') {
      const num = counts.findIndex(c => c >= 4) + 1;
      if (num === 0) return 0;
      let potential = 0;
      if (scorecard['general'] === null) potential += 0.2 * (num * 5 + 50);
      if (scorecard['marshal'] === null) potential += 0.02 * (num * 6 + 100);
      return potential;
    }
    
    if (comboKey === 'largeStraight') {
      if (scorecard['fullStraight'] === null) {
        return 0.1 * 46; // 10% шанс на полный стрит
      }
    }
    
    if (comboKey === 'smallStraight') {
      let potential = 0;
      if (scorecard['largeStraight'] === null) potential += 0.15 * 40;
      if (scorecard['fullStraight'] === null) potential += 0.05 * 46;
      return potential;
    }
    
    return 0;
  }

  // === ОПРЕДЕЛЕНИЕ ПАТТЕРНА ЗАМОРОЗКИ ===
  getLockIndices(comboKey, dice) {
    const counts = [0,0,0,0,0,0];
    dice.forEach(d => counts[d-1]++);
    const indices = [];

    if (comboKey.startsWith('unit_')) {
      const num = parseInt(comboKey[5]);
      for (let i = 0; i < dice.length; i++) {
        if (dice[i] === num) indices.push(i);
      }
    }
    else if (comboKey === 'pair' || comboKey === 'twoPairs' || comboKey === 'threeOfAKind') {
      for (let num = 6; num >= 1; num--) {
        const positions = dice.map((d, i) => d === num ? i : -1).filter(i => i !== -1);
        if (comboKey === 'threeOfAKind' && positions.length >= 3) {
          indices.push(...positions.slice(0, 3));
          break;
        }
        if ((comboKey === 'pair' || comboKey === 'twoPairs') && positions.length >= 2) {
          indices.push(...positions.slice(0, 2));
          if (comboKey === 'twoPairs') {
            for (let n = num - 1; n >= 1; n--) {
              const pos2 = dice.map((d, i) => d === n ? i : -1).filter(i => i !== -1);
              if (pos2.length >= 2) {
                indices.push(...pos2.slice(0, 2));
                break;
              }
            }
          }
          break;
        }
      }
    }
    else if (comboKey === 'full' || comboKey === 'secondFull') {
      for (let num = 6; num >= 1; num--) {
        if (counts[num-1] >= 3) {
          const triplePos = dice.map((d, i) => d === num ? i : -1).filter(i => i !== -1);
          indices.push(...triplePos.slice(0, 3));
          for (let n = 6; n >= 1; n--) {
            if (n !== num && counts[n-1] >= 2) {
              const pairPos = dice.map((d, i) => d === n ? i : -1).filter(i => i !== -1);
              indices.push(...pairPos.slice(0, 2));
              break;
            }
          }
          break;
        }
      }
    }
    else if (comboKey === 'fourOfAKind' || comboKey === 'general' || comboKey === 'marshal') {
      const targetCount = comboKey === 'marshal' ? 6 : (comboKey === 'general' ? 5 : 4);
      for (let num = 6; num >= 1; num--) {
        if (counts[num-1] >= targetCount - 1) {
          const positions = dice.map((d, i) => d === num ? i : -1).filter(i => i !== -1);
          indices.push(...positions);
          break;
        }
      }
    }
    else if (comboKey === 'smallStraight' || comboKey === 'largeStraight' || comboKey === 'fullStraight') {
      const needed = this.getStraightNeeded(comboKey);
      for (let i = 0; i < dice.length; i++) {
        if (needed.has(dice[i])) {
          indices.push(i);
          needed.delete(dice[i]);
        }
      }
    }

    return indices;
  }

  // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===
  isReliableCombo(comboKey, dice) {
    const counts = [0,0,0,0,0,0];
    dice.forEach(d => counts[d-1]++);
    
    if (comboKey === 'full') return this.hasFull(counts);
    if (comboKey === 'secondFull') return this.hasSecondFull(counts);
    if (comboKey === 'fourOfAKind') return counts.some(c => c >= 4);
    if (comboKey === 'general') return counts.some(c => c >= 5);
    if (comboKey === 'marshal') return counts.some(c => c === 6);
    if (comboKey.startsWith('unit_')) {
      const num = parseInt(comboKey[5]) - 1;
      return counts[num] >= 3;
    }
    return false;
  }

  isRareCombo(comboKey, dice) {
    if (!['twoTriples', 'threePairs', 'fullStraight', 'marshal', 'general'].includes(comboKey)) {
      return false;
    }
    // Проверяем реалистичность
    const counts = [0,0,0,0,0,0];
    dice.forEach(d => counts[d-1]++);
    
    if (comboKey === 'marshal') return counts.some(c => c < 5);
    if (comboKey === 'general') return counts.some(c => c < 4);
    if (comboKey === 'fullStraight') return new Set(dice).size < 4;
    return true;
  }

  isReserveCombo(comboKey) {
    return ['pair', 'twoPairs', 'threeOfAKind', 'chance'].includes(comboKey);
  }

  hasFull(counts) {
    let triple = -1;
    for (let i = 5; i >= 0; i--) {
      if (counts[i] >= 3) { triple = i; break; }
    }
    if (triple === -1) return false;
    for (let i = 5; i >= 0; i--) {
      if (i !== triple && counts[i] >= 2) return true;
    }
    return false;
  }

  hasSecondFull(counts) {
    let triple = -1;
    for (let i = 5; i >= 0; i--) {
      if (counts[i] >= 3) { triple = i; break; }
    }
    if (triple === -1) return false;
    let pairs = 0;
    for (let i = 0; i < 6; i++) {
      if (i !== triple && counts[i] >= 2) pairs++;
    }
    return pairs >= 1;
  }

  canGetFullStraight(dice) {
    const unique = new Set(dice);
    return unique.size >= 4;
  }

  getStraightNeeded(comboKey) {
    if (comboKey === 'smallStraight') return new Set([1,2,3,4,5]);
    if (comboKey === 'largeStraight') return new Set([2,3,4,5,6]);
    if (comboKey === 'fullStraight') return new Set([1,2,3,4,5,6]);
    return new Set();
  }

  getUpperSum(scorecard) {
    let sum = 0;
    for (let i = 1; i <= 6; i++) {
      const val = scorecard[`unit_${i}`];
      if (val !== null) sum += val;
    }
    return sum;
  }

  fallbackAction(scorecard) {
    const unfilled = Object.keys(scorecard).find(key => scorecard[key] === null);
    return unfilled ? { action: 'fillScore', key: unfilled } : { action: 'fillScore', key: 'chance' };
  }

  makeFinalDecision(dice, scorecard) {
    const combos = calculateCombinations(dice, this.diceCount);
    const available = Object.keys(combos).filter(key => scorecard[key] === null);
    
    if (available.length === 0) return this.fallbackAction(scorecard);

    const ranked = available.map(key => {
      const combo = combos[key];
      const score = combo.points + (combo.bonus || 0);
      let reliability = 0;
      
      if (this.isReliableCombo(key, dice)) reliability = 1000;
      if (this.isRareCombo(key, dice)) reliability = -300;
      if (key.startsWith('unit_')) {
        const num = parseInt(key[5]) - 1;
        const count = dice.filter(d => d === num+1).length;
        if ((count - 3) * (num+1) > 0) reliability += 800;
      }

      return { key, score, reliability };
    }).sort((a, b) => {
      if (b.reliability !== a.reliability) return b.reliability - a.reliability;
      return b.score - a.score;
    });

    const best = ranked[0];
    console.log(`[${this.name}] Финальное решение: ${best.key} (${best.score} очков)`);
    return { action: 'fillScore', key: best.key };
  }
}