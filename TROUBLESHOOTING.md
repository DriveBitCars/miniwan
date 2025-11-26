# Устранение проблем с GigaChat Voice Search

## Проблема: Кнопка не работает, не запрашивается разрешение микрофона

### 1. Проверка HTTPS

**Web Speech API требует HTTPS!** (кроме localhost)

Проверьте в консоли браузера (F12):
```javascript
console.log('Протокол:', window.location.protocol);
// Должно быть: https:
```

**Решение:**
- Убедитесь, что сайт доступен по HTTPS
- Если используете Vercel/Netlify - они автоматически предоставляют HTTPS
- Если используете свой сервер - настройте SSL сертификат (Let's Encrypt)

### 2. Проверка загрузки скриптов

Откройте консоль браузера (F12) и проверьте:

**Ошибки загрузки:**
```
Failed to load resource: js/gigachat-config.js
Failed to load resource: js/gigachat-search.js
```

**Решение:**
- Проверьте пути к файлам (должны быть `js/gigachat-config.js` и `js/gigachat-search.js`)
- Убедитесь, что файлы загружены (Network tab в DevTools)
- Проверьте порядок загрузки: сначала `gigachat-config.js`, потом `gigachat-search.js`

### 3. Проверка инициализации

В консоли браузера должны быть сообщения:
```
Инициализация GigaChat Search...
Кнопка GigaChat найдена, добавляем обработчик
```

Если их нет:
- Проверьте, что скрипты загружены
- Проверьте, что кнопка с `id="gigachatSearchBtn"` есть на странице

### 4. Проверка поддержки браузера

В консоли проверьте:
```javascript
console.log('SpeechRecognition:', 'SpeechRecognition' in window);
console.log('webkitSpeechRecognition:', 'webkitSpeechRecognition' in window);
```

**Поддерживаемые браузеры:**
- ✅ Chrome 25+
- ✅ Edge 79+ (Chromium)
- ✅ Яндекс Браузер
- ✅ Opera 27+
- ⚠️ Safari 14.1+ (только macOS/iOS)
- ❌ Firefox (не поддерживается)

### 5. Проверка разрешений микрофона

**В Chrome/Edge:**
1. Нажмите на иконку замка в адресной строке
2. Проверьте разрешения для микрофона
3. Убедитесь, что микрофон разрешен

**Программная проверка:**
```javascript
navigator.permissions.query({name: 'microphone'}).then(result => {
    console.log('Разрешение микрофона:', result.state);
    // Должно быть: 'granted' или 'prompt'
});
```

### 6. Диагностика в консоли

Добавьте в консоль браузера для проверки:

```javascript
// Проверка инициализации
console.log('gigachatSearch:', typeof gigachatSearch);
console.log('GigaChatConfig:', typeof GigaChatConfig);

// Проверка кнопки
const btn = document.getElementById('gigachatSearchBtn');
console.log('Кнопка найдена:', !!btn);

// Проверка HTTPS
console.log('Протокол:', window.location.protocol);
console.log('HTTPS:', window.location.protocol === 'https:');

// Проверка API
console.log('SpeechRecognition:', 'SpeechRecognition' in window);
console.log('webkitSpeechRecognition:', 'webkitSpeechRecognition' in window);
```

### 7. Типичные ошибки и решения

#### Ошибка: "Голосовой поиск работает только по HTTPS"
**Причина:** Сайт открыт по HTTP  
**Решение:** Используйте HTTPS

#### Ошибка: "Ваш браузер не поддерживает голосовой ввод"
**Причина:** Браузер не поддерживает Web Speech API  
**Решение:** Используйте Chrome, Edge или Яндекс Браузер

#### Ошибка: "Доступ к микрофону запрещен"
**Причина:** Пользователь заблокировал доступ к микрофону  
**Решение:** 
1. Нажмите на иконку замка в адресной строке
2. Разрешите доступ к микрофону
3. Обновите страницу

#### Ошибка: "Кнопка gigachatSearchBtn не найдена"
**Причина:** Кнопка не загружена или имеет другой ID  
**Решение:** Проверьте HTML, убедитесь что есть `<button id="gigachatSearchBtn">`

#### Ошибка: "GigaChatConfig не найден"
**Причина:** Скрипт `gigachat-config.js` не загружен  
**Решение:** Проверьте, что скрипт подключен перед `gigachat-search.js`

### 8. Проверка на продакшене (miniwan.store)

1. Откройте https://miniwan.store
2. Откройте консоль браузера (F12)
3. Проверьте вкладку Console на ошибки
4. Проверьте вкладку Network:
   - Загружаются ли `gigachat-config.js` и `gigachat-search.js`?
   - Есть ли ошибки 404?
5. Проверьте вкладку Security:
   - Есть ли HTTPS?
   - Есть ли проблемы с сертификатом?

### 9. Быстрая проверка

Выполните в консоли браузера на странице:

```javascript
// Полная диагностика
(function() {
    console.log('=== Диагностика GigaChat Search ===');
    console.log('1. HTTPS:', window.location.protocol === 'https:' || window.location.hostname === 'localhost');
    console.log('2. Кнопка:', !!document.getElementById('gigachatSearchBtn'));
    console.log('3. gigachatSearch:', typeof gigachatSearch);
    console.log('4. GigaChatConfig:', typeof GigaChatConfig);
    console.log('5. SpeechRecognition:', 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    console.log('6. Протокол:', window.location.protocol);
    console.log('===============================');
})();
```

### 10. Решение для продакшена

Если проблема на продакшене:

1. **Проверьте HTTPS:**
   ```bash
   curl -I https://miniwan.store
   # Должен вернуть 200 OK
   ```

2. **Проверьте загрузку файлов:**
   ```bash
   curl -I https://miniwan.store/js/gigachat-config.js
   curl -I https://miniwan.store/js/gigachat-search.js
   # Оба должны вернуть 200 OK
   ```

3. **Проверьте порядок скриптов в HTML:**
   ```html
   <script src="js/gigachat-config.js"></script>
   <script src="js/gigachat-search.js"></script>
   ```

4. **Проверьте консоль браузера на ошибки**

### 11. Логи для отладки

После обновления кода, в консоли будут появляться логи:
- `Инициализация GigaChat Search...`
- `Кнопка GigaChat найдена, добавляем обработчик`
- `Кнопка GigaChat нажата`
- `Запуск распознавания речи...`
- `Распознавание речи запущено`

Если этих логов нет - значит проблема в инициализации.

### 12. Контакты для поддержки

Если проблема не решена:
1. Сделайте скриншот консоли браузера с ошибками
2. Проверьте Network tab - какие файлы не загружаются
3. Проверьте, работает ли на localhost (http://localhost:8000)

