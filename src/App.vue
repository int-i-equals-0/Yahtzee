<!-- src/App.vue -->
<template>
  <div id="app">
    <!-- Кнопка "Как играть" -->
    <button class="help-btn" @click="showHelp = true">?</button>

    <!-- Основной контент -->
    <GameFlow />

    <!-- Модальное окно -->
    <div v-if="showHelp" class="modal-overlay" @click="showHelp = false">
      <div class="modal-content" @click.stop>
        <h2>Как играть?</h2>
        <p>
          <strong>1. Бросок кубиков:</strong> Нажмите «Первый бросок», затем — «Второй» или «Третий»
          (максимум 3 попытки).
        </p>
        <p>
          <strong>2. Заморозка:</strong> Кликните по кубику, чтобы заблокировать его (он станет
          синим). Заблокированные кубики не перебрасываются.
        </p>
        <p>
          <strong>3. Выбор комбинации:</strong> После бросков нажмите «Заполнить» напротив
          подходящей строки в таблице, чтобы записать очки.
        </p>
        <p>
          <strong>4. Вычеркивание:</strong> Если комбинации нет — нажмите «Вычеркнуть», чтобы
          поставить 0 и освободить ход.
        </p>
        <p><strong>5. Конец хода:</strong> После выбора начинается ход следующего игрока.</p>
        <button class="btn btn-primary" @click="showHelp = false">Понятно!</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GameFlow from './components/GameFlow.vue'

const showHelp = ref(false)
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #0f2d2d;
  font-family: 'Lato', Tahoma, Geneva, Verdana, sans-serif;
  color: #e0f7f7;
}

#app {
  min-height: 100vh;
  padding: 1rem;
}

/* Кнопка помощи */
.help-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  width: 36px;
  height: 36px;
  font-size: 18px;
  font-weight: bold;
  background: #020808;
  color: #3ccccc;
  border: 2px solid #187878;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.help-btn:hover {
  background: #145050;
  color: #020808;
}

/* Модальное окно */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
}

.modal-content {
  background: #020808;
  color: #e0f7f7;
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  text-align: left;
  box-shadow: 0 0 50px #93b8b8;
}

.modal-content h2 {
  color: #3ccccc;
  margin-bottom: 1rem;
  text-align: center;
}

.modal-content p {
  margin: 0.6rem 0;
  line-height: 1.5;
}

.modal-content .btn {
  margin-top: 1.5rem;
  display: block;
  width: 100%;
}
</style>
