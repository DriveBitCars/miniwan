# GigaChat Голосовой Поиск

## Описание

Функционал голосового поиска автомобилей с использованием GigaChat AI. Клиент нажимает на кнопку, говорит голосом какую машину хочет арендовать, запрос обрабатывается через GigaChat API, и система показывает список рекомендуемых машин из `cars.json`.

## Как это работает

1. **Клиент нажимает кнопку "GigaChat Поиск"** — появляется в правом нижнем углу на страницах каталога и главной
2. **Запрос разрешения на микрофон** — браузер запрашивает разрешение (только при первом использовании)
3. **Клиент говорит запрос** — например: "Мне нужен минивэн на 8 мест с автоматической коробкой, дизельное топливо"
4. **Запрос отправляется в GigaChat API** — AI анализирует каталог и выбирает подходящие варианты
5. **Показываются результаты** — модальное окно с рекомендуемыми машинами

## Установка и настройка

### 1. Файлы добавлены

- `js/gigachat-search.js` - основной компонент
- `js/gigachat-config.js` - конфигурация API
- Кнопка добавлена на страницы: `index.html`, `catalog.html`

### 2. Настройка OAuth2 Credentials

⚠️ **Credentials необходимо настроить в `js/gigachat-config.js`:**
- Получите `clientId` и `clientSecret` на https://developers.sber.ru/gigachat
- Установите значения в `js/gigachat-config.js`:
  - `clientId`: 'YOUR_CLIENT_ID'
  - `scope`: 'GIGACHAT_API_PERS'
  - `clientSecret`: 'YOUR_CLIENT_SECRET'

Система автоматически получает access token через OAuth2 при первом запросе и кэширует его.

⚠️ **ВНИМАНИЕ**: В продакшене credentials НЕ должны храниться в клиентском коде! Используйте прокси-сервер.

### 3. Использование прокси-сервера (обязательно)

⚠️ **Проблема CORS:** Браузер блокирует прямые запросы к GigaChat API из-за политики CORS (Cross-Origin Resource Sharing). 

**Ошибка в консоли:**
```
Access to fetch at 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth' 
from origin 'http://127.0.0.1:8002' has been blocked by CORS policy
```

**Решение:** Создайте прокси-сервер на вашем бэкенде. Подробные инструкции см. в `PROXY_SETUP.md`.

**Быстрый старт:**
1. Используйте готовый пример: `server-proxy-example.js`
2. Запустите: `node server-proxy-example.js`
3. В `js/gigachat-config.js` укажите: `proxyUrl: 'http://localhost:3000/api/gigachat/proxy'`

**Пример Node.js/Express прокси:**

**Пример Node.js/Express прокси:**

```javascript
const GIGACHAT_CLIENT_ID = process.env.GIGACHAT_CLIENT_ID;
const GIGACHAT_CLIENT_SECRET = process.env.GIGACHAT_CLIENT_SECRET;
const GIGACHAT_SCOPE = process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS';

let cachedToken = null;
let tokenExpiresAt = null;

// Функция получения access token
async function getAccessToken() {
    if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    const credentials = Buffer.from(`${GIGACHAT_CLIENT_ID}:${GIGACHAT_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`,
            'Accept': 'application/json',
            'RqUID': generateUUID()
        },
        body: `scope=${encodeURIComponent(GIGACHAT_SCOPE)}`
    });

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + ((data.expires_at || 1800) - 60) * 1000;
    return cachedToken;
}

// Прокси для чата
app.post('/api/gigachat/proxy', async (req, res) => {
    const { model, messages, ...rest } = req.body;
    
    try {
        const accessToken = await getAccessToken();
        
        const response = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'GigaChat-Pro',
                messages: messages,
                ...rest
            })
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

Затем в `js/gigachat-config.js` укажите:
```javascript
proxyUrl: '/api/gigachat/proxy'
```

## Локальный поиск (Fallback механизм)

Система автоматически переключается на локальный поиск по ключевым словам в следующих случаях:

1. **GigaChat API не настроен** (нет credentials)
2. **Ошибка CORS** (нет прокси-сервера)
3. **Ошибка получения access token**
4. **Ошибка запроса к GigaChat API**

**Как это работает:**
- Локальный поиск анализирует ключевые слова из запроса пользователя
- Ищет совпадения в описаниях машин, характеристиках, марках
- Использует систему баллов для ранжирования результатов
- Возвращает до 5 наиболее релевантных машин

**Преимущества:**
- ✅ Работает без настройки API
- ✅ Не требует прокси-сервера
- ✅ Быстрый ответ
- ✅ Не зависит от внешних сервисов

**Недостатки:**
- ⚠️ Менее точный, чем GigaChat AI
- ⚠️ Не понимает сложные запросы
- ⚠️ Работает только по ключевым словам

**Пример работы fallback:**
```
🚀 Пытаемся использовать GigaChat API для запроса: "привет найти 20 машин"
❌ Ошибка получения access token: CORS error
⚠️ Переключаемся на локальный поиск
✅ Локальный поиск нашел 5 машин по запросу
```

## Особенности

### Распознавание речи

- Используется Web Speech API браузера
- Поддерживается только в современных браузерах (Chrome, Edge, Safari)
- Требуется разрешение на использование микрофона
- Работает только по HTTPS (или localhost для разработки)

### Обработка запросов

- GigaChat анализирует весь каталог машин
- Учитывает: количество мест, тип топлива, коробку передач, цену, характеристики
- Возвращает до 5-7 самых релевантных вариантов
- Сортирует по релевантности

### Показ результатов

- Модальное окно с рекомендуемыми машинами
- Карточки машин с основными характеристиками
- Кнопка "Забронировать" для каждой машины
- Возможность перейти к детальной странице

## Примеры запросов

Клиент может сказать:
- "Мне нужен минивэн на 8 мест"
- "Хочу арендовать автомобиль с дизельным двигателем и автоматической коробкой"
- "Покажи самые дешевые варианты минивэнов"
- "Нужна машина с большим багажником, до 10000 рублей в день"
- "Ищу Mercedes или Volkswagen, новый год выпуска"

## Требования

1. **Браузер** с поддержкой Web Speech API:
   - Chrome 25+
   - Edge 79+
   - Safari 14.1+
   
2. **Разрешения**:
   - Доступ к микрофону
   - HTTPS (или localhost для разработки)

3. **GigaChat API** (настроено):
   - OAuth2 credentials (client_id, client_secret, scope)
   - Автоматическое получение и кэширование access token
   - Прокси-сервер (рекомендуется для продакшена для обхода CORS)

## Отладка

Откройте консоль браузера (F12) для просмотра логов:
- Успешные запросы к API
- Ошибки распознавания речи
- Переключение на локальный поиск
- Ошибки API

## Безопасность

⚠️ **Важно для продакшена:**

1. **НЕ храните OAuth2 credentials (client_id, client_secret) в клиентском коде**
2. Используйте прокси-сервер на бэкенде для получения access token
3. Храните credentials в переменных окружения на сервере
4. Ограничьте количество запросов с одного IP
5. Используйте HTTPS для всего сайта
6. Access token кэшируется автоматически (действует ~30 минут)

## Поддержка

Если возникли проблемы:
- Проверьте консоль браузера на ошибки
- Убедитесь, что микрофон разрешен в браузере
- Проверьте, что API ключ установлен (если используете GigaChat)
- Проверьте CORS настройки (если используете прямой API)

