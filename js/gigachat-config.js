// Конфигурация GigaChat API
// ВНИМАНИЕ: Для продакшена credentials должны храниться на сервере!

const GigaChatConfig = {
    // Использовать ли GigaChat API (если false - будет использоваться только локальный поиск)
    useGigaChatAPI: true,
    
    // URL прокси-сервера для GigaChat API (избегаем CORS)
    // В продакшене должен быть ваш собственный прокси-сервер
    proxyUrl: null, // Например: '/api/gigachat/proxy'
    
    // URL для получения access token (OAuth2)
    authUrl: 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
    
    // URL API для чата
    apiUrl: 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
    
    // OAuth2 credentials (НЕ храните их здесь в продакшене! Используйте переменные окружения на сервере)
    // Получите credentials на https://developers.sber.ru/gigachat
    clientId: 'YOUR_CLIENT_ID',
    scope: 'GIGACHAT_API_PERS',
    clientSecret: 'YOUR_CLIENT_SECRET',
    
    // Access token (кэшируется, обновляется автоматически)
    accessToken: null,
    tokenExpiresAt: null,
    
    // Модель для использования
    model: 'GigaChat-Pro'
};

// Получение access token через OAuth2
GigaChatConfig.getAccessToken = async function() {
    // Проверяем, есть ли валидный токен в кэше
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
        console.log('Используется кэшированный access token');
        return this.accessToken;
    }

    try {
        // Создаем Basic Auth header (client_id:client_secret в base64)
        const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
        const rqUID = this.generateRqUID();
        
        // Запрос токена через OAuth2
        const response = await fetch(this.authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json',
                'RqUID': rqUID // Уникальный идентификатор запроса
            },
            body: `scope=${encodeURIComponent(this.scope)}`
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка ответа от OAuth сервера:', errorText);
            throw new Error(`Ошибка получения токена: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.access_token) {
            this.accessToken = data.access_token;
            // Токен обычно действует expires_in секунд (обычно 1800 = 30 минут)
            // Вычитаем 60 секунд для безопасности
            const expiresIn = (data.expires_in || data.expires_at || 1800) - 60;
            this.tokenExpiresAt = Date.now() + (expiresIn * 1000);
            console.log(`Access token получен успешно, действителен ${expiresIn} секунд (до ${new Date(this.tokenExpiresAt).toLocaleTimeString()})`);
            return this.accessToken;
        } else {
            console.error('Ответ от OAuth сервера:', data);
            throw new Error('Токен не получен в ответе. Проверьте credentials.');
        }
    } catch (error) {
        console.error('Ошибка получения access token:', error);
        // Очищаем кэш токена при ошибке
        this.accessToken = null;
        this.tokenExpiresAt = null;
        throw error;
    }
};

// Генерация уникального идентификатора запроса
GigaChatConfig.generateRqUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Загрузка конфигурации из localStorage (если нужно)
GigaChatConfig.loadConfig = function() {
    try {
        // Можно загрузить сохраненные credentials, если они были изменены
        const savedConfig = localStorage.getItem('gigachat_config');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            if (config.clientId) this.clientId = config.clientId;
            if (config.clientSecret) this.clientSecret = config.clientSecret;
            if (config.scope) this.scope = config.scope;
        }
    } catch (e) {
        console.warn('Не удалось загрузить конфигурацию из localStorage');
    }
};

// Проверка наличия credentials
GigaChatConfig.hasCredentials = function() {
    return !!(this.clientId && this.clientSecret && this.scope);
};

