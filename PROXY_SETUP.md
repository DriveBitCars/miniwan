# Настройка прокси-сервера для GigaChat API

## Проблема CORS

Браузер блокирует прямые запросы к GigaChat API из-за политики CORS (Cross-Origin Resource Sharing). Это стандартная защита браузера.

**Ошибка в консоли:**
```
Access to fetch at 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth' 
from origin 'http://127.0.0.1:8002' has been blocked by CORS policy
```

## Решение: Прокси-сервер

Прокси-сервер работает на вашем сервере и делает запросы к GigaChat API от своего имени, обходя ограничения CORS.

## Вариант 1: Node.js/Express прокси (локально)

### 1. Установка зависимостей

```bash
npm init -y
npm install express cors dotenv
```

### 2. Создание файла `.env`

```env
GIGACHAT_CLIENT_ID=019a93c0-331a-7505-804a-9d79be86e49b
GIGACHAT_CLIENT_SECRET=MDE5YTkzYzAtMzMxYS03NTA1LTgwNGEtOWQ3OWJlODZlNDliOmM3ZDRlNWZkLTUyZGMtNGVjYi1iN2JjLTA5ZTI0Njc0MTE5Ng==
GIGACHAT_SCOPE=GIGACHAT_API_PERS
PORT=3000
```

### 3. Запуск прокси-сервера

```bash
node server-proxy-example.js
```

### 4. Обновление конфигурации

В `js/gigachat-config.js` измените:

```javascript
proxyUrl: 'http://localhost:3000/api/gigachat/proxy'
```

## Вариант 2: Vercel Serverless Functions

Если проект размещен на Vercel, создайте файл:

**`api/gigachat-proxy.js`:**

```javascript
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GIGACHAT_CLIENT_ID = process.env.GIGACHAT_CLIENT_ID;
    const GIGACHAT_CLIENT_SECRET = process.env.GIGACHAT_CLIENT_SECRET;
    const GIGACHAT_SCOPE = process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS';

    // Получение токена
    const credentials = Buffer.from(`${GIGACHAT_CLIENT_ID}:${GIGACHAT_CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`,
            'Accept': 'application/json',
            'RqUID': generateUUID()
        },
        body: `scope=${encodeURIComponent(GIGACHAT_SCOPE)}`
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Запрос к GigaChat API
    const { model, messages, ...rest } = req.body;
    
    const apiResponse = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
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

    const data = await apiResponse.json();
    res.json(data);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
```

В `js/gigachat-config.js`:

```javascript
proxyUrl: '/api/gigachat-proxy'
```

## Вариант 3: Python Flask прокси

**`proxy_server.py`:**

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import base64
import uuid
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# Кэш токена
cached_token = None
token_expires_at = None

def get_access_token():
    global cached_token, token_expires_at
    
    if cached_token and token_expires_at and datetime.now() < token_expires_at:
        return cached_token
    
    client_id = os.getenv('GIGACHAT_CLIENT_ID', '019a93c0-331a-7505-804a-9d79be86e49b')
    client_secret = os.getenv('GIGACHAT_CLIENT_SECRET', 'MDE5YTkzYzAtMzMxYS03NTA1LTgwNGEtOWQ3OWJlODZlNDliOmM3ZDRlNWZkLTUyZGMtNGVjYi1iN2JjLTA5ZTI0Njc0MTE5Ng==')
    scope = os.getenv('GIGACHAT_SCOPE', 'GIGACHAT_API_PERS')
    
    credentials = base64.b64encode(f'{client_id}:{client_secret}'.encode()).decode()
    rq_uid = str(uuid.uuid4())
    
    response = requests.post(
        'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
        headers={
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': f'Basic {credentials}',
            'Accept': 'application/json',
            'RqUID': rq_uid
        },
        data=f'scope={scope}'
    )
    
    data = response.json()
    cached_token = data['access_token']
    expires_in = (data.get('expires_in', 1800) - 60) * 1000
    token_expires_at = datetime.now() + timedelta(milliseconds=expires_in)
    
    return cached_token

@app.route('/api/gigachat/proxy', methods=['POST'])
def proxy():
    try:
        access_token = get_access_token()
        payload = request.json
        
        response = requests.post(
            'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json'
            },
            json={
                'model': payload.get('model', 'GigaChat-Pro'),
                'messages': payload.get('messages', []),
                'temperature': payload.get('temperature', 0.7),
                'max_tokens': payload.get('max_tokens', 500)
            }
        )
        
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=3000, debug=True)
```

Запуск:
```bash
pip install flask flask-cors requests
python proxy_server.py
```

## Обновление конфигурации

После настройки прокси, обновите `js/gigachat-config.js`:

```javascript
proxyUrl: 'http://localhost:3000/api/gigachat/proxy'  // для локального сервера
// или
proxyUrl: '/api/gigachat/proxy'  // для Vercel/serverless
```

## Проверка работы

1. Запустите прокси-сервер
2. Откройте консоль браузера
3. Нажмите кнопку "GigaChat Поиск"
4. Проверьте, что запросы идут на ваш прокси, а не напрямую к GigaChat API

## Безопасность

⚠️ **Важно для продакшена:**

1. **НЕ храните credentials в клиентском коде**
2. Используйте переменные окружения на сервере
3. Ограничьте количество запросов с одного IP
4. Используйте HTTPS для всего сайта
5. Добавьте rate limiting на прокси

## Текущее состояние

Сейчас система работает с **локальным поиском** как fallback, что позволяет показывать результаты даже при ошибках API. Это хорошее решение для разработки, но для продакшена рекомендуется настроить прокси для полноценной работы с GigaChat API.

