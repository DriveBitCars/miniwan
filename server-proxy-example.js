// Пример прокси-сервера для GigaChat API
// Запуск: node server-proxy-example.js
// Требуется: npm install express cors dotenv

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Кэш для токенов
let cachedToken = null;
let tokenExpiresAt = null;

// Генерация UUID для RqUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Получение access token
async function getAccessToken() {
    // Проверяем кэш
    if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
        console.log('Используется кэшированный токен');
        return cachedToken;
    }

    const GIGACHAT_CLIENT_ID = process.env.GIGACHAT_CLIENT_ID;
    const GIGACHAT_CLIENT_SECRET = process.env.GIGACHAT_CLIENT_SECRET;
    
    if (!GIGACHAT_CLIENT_ID || !GIGACHAT_CLIENT_SECRET) {
        throw new Error('GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET должны быть установлены в переменных окружения');
    }
    const GIGACHAT_SCOPE = process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS';

    const credentials = Buffer.from(`${GIGACHAT_CLIENT_ID}:${GIGACHAT_CLIENT_SECRET}`).toString('base64');
    const rqUID = generateUUID();

    try {
        const response = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json',
                'RqUID': rqUID
            },
            body: `scope=${encodeURIComponent(GIGACHAT_SCOPE)}`
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OAuth error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (data.access_token) {
            cachedToken = data.access_token;
            const expiresIn = (data.expires_in || 1800) - 60; // Вычитаем 60 сек для безопасности
            tokenExpiresAt = Date.now() + (expiresIn * 1000);
            console.log(`Токен получен, действителен ${expiresIn} секунд`);
            return cachedToken;
        } else {
            throw new Error('Токен не получен в ответе');
        }
    } catch (error) {
        console.error('Ошибка получения токена:', error);
        cachedToken = null;
        tokenExpiresAt = null;
        throw error;
    }
}

// Прокси для GigaChat API
app.post('/api/gigachat/proxy', async (req, res) => {
    try {
        const accessToken = await getAccessToken();
        const { model, messages, temperature, max_tokens, ...rest } = req.body;

        const response = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'GigaChat-Pro',
                messages: messages || [],
                temperature: temperature || 0.7,
                max_tokens: max_tokens || 500,
                ...rest
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('GigaChat API error:', response.status, errorText);
            return res.status(response.status).json({ 
                error: `GigaChat API error: ${response.status}`,
                details: errorText 
            });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Прокси ошибка:', error);
        res.status(500).json({ 
            error: error.message || 'Internal server error' 
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'GigaChat Proxy' });
});

app.listen(PORT, () => {
    console.log(`🚀 GigaChat Proxy сервер запущен на http://localhost:${PORT}`);
    console.log(`📡 Прокси endpoint: http://localhost:${PORT}/api/gigachat/proxy`);
});

