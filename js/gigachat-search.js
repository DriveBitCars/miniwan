// GigaChat Voice Search Component
// Интеграция голосового поиска с GigaChat API

class GigaChatSearch {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.config = typeof GigaChatConfig !== 'undefined' ? GigaChatConfig : null;
        this.carsData = [];
        this.initSpeechRecognition();
        this.loadConfig();
    }
    
    // Загрузка конфигурации
    loadConfig() {
        if (this.config) {
            if (typeof this.config.loadConfig === 'function') {
                this.config.loadConfig();
            }
            // Проверяем наличие credentials
            if (!this.config.hasCredentials()) {
                console.warn('GigaChat credentials не настроены, будет использоваться локальный поиск');
                this.config.useGigaChatAPI = false;
            }
        }
    }

    // Инициализация распознавания речи
    initSpeechRecognition() {
        // Проверка HTTPS (Web Speech API требует HTTPS или localhost)
        const isSecure = window.location.protocol === 'https:' || 
                        window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
        
        if (!isSecure) {
            console.warn('Web Speech API требует HTTPS. Текущий протокол:', window.location.protocol);
            this.showError('Голосовой поиск работает только по HTTPS. Пожалуйста, используйте защищенное соединение.');
            return;
        }

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'ru-RU';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('Распознанный текст:', transcript);
                this.handleVoiceInput(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('Ошибка распознавания речи:', event.error);
                let errorMessage = 'Ошибка распознавания речи. Попробуйте еще раз.';
                
                // Детальные сообщения об ошибках
                switch(event.error) {
                    case 'not-allowed':
                        errorMessage = 'Доступ к микрофону запрещен. Разрешите доступ в настройках браузера.';
                        break;
                    case 'no-speech':
                        errorMessage = 'Речь не обнаружена. Попробуйте говорить громче.';
                        break;
                    case 'audio-capture':
                        errorMessage = 'Микрофон недоступен. Проверьте подключение микрофона.';
                        break;
                    case 'network':
                        errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
                        break;
                }
                
                this.showError(errorMessage);
                this.isListening = false;
                this.updateButtonState();
            };

            this.recognition.onstart = () => {
                console.log('Распознавание речи запущено');
            };

            this.recognition.onend = () => {
                console.log('Распознавание речи завершено');
                this.isListening = false;
                this.updateButtonState();
            };
        } else {
            console.error('Браузер не поддерживает распознавание речи');
            this.showError('Ваш браузер не поддерживает голосовой ввод. Используйте Chrome, Edge или Яндекс Браузер.');
        }
    }

    // Запуск прослушивания
    startListening() {
        if (!this.recognition) {
            const isSecure = window.location.protocol === 'https:' || 
                            window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
            
            if (!isSecure) {
                this.showError('Голосовой поиск работает только по HTTPS. Пожалуйста, используйте защищенное соединение.');
            } else {
                this.showError('Ваш браузер не поддерживает голосовой ввод. Используйте Chrome, Edge или Яндекс Браузер.');
            }
            return;
        }

        if (this.isListening) {
            this.stopListening();
            return;
        }

        this.isListening = true;
        this.updateButtonState();
        this.showListeningIndicator();
        
        try {
            console.log('Запуск распознавания речи...');
            this.recognition.start();
        } catch (error) {
            console.error('Ошибка запуска распознавания:', error);
            this.isListening = false;
            this.updateButtonState();
            this.hideListeningIndicator();
            
            // Если ошибка "already started", просто останавливаем и запускаем заново
            if (error.message && error.message.includes('already started')) {
                console.log('Распознавание уже запущено, перезапускаем...');
                this.recognition.stop();
                setTimeout(() => {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        this.showError('Не удалось запустить распознавание речи. Попробуйте обновить страницу.');
                    }
                }, 100);
            } else {
                this.showError('Не удалось запустить распознавание речи. Проверьте разрешения микрофона в настройках браузера.');
            }
        }
    }

    // Остановка прослушивания
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
            this.updateButtonState();
            this.hideListeningIndicator();
        }
    }

    // Обработка голосового ввода
    async handleVoiceInput(transcript) {
        this.hideListeningIndicator();
        this.showProcessingIndicator(transcript);

        try {
            // Загружаем данные о машинах
            if (this.carsData.length === 0) {
                await this.loadCarsData();
                
                if (this.carsData.length === 0) {
                    throw new Error('Не удалось загрузить данные о машинах');
                }
            }

            // Отправляем запрос в GigaChat (или локальный поиск)
            const recommendations = await this.queryGigaChat(transcript);

            // Проверяем, что есть результаты
            if (!recommendations || !recommendations.recommended_ids || recommendations.recommended_ids.length === 0) {
                this.showError('Не найдено подходящих машин по вашему запросу. Попробуйте изменить критерии поиска.');
                return;
            }

            // Показываем результаты
            this.showRecommendations(recommendations, transcript);
        } catch (error) {
            console.error('Ошибка обработки запроса:', error);
            this.showError('Ошибка обработки запроса. Попробуйте еще раз.');
        }
    }

    // Загрузка данных о машинах
    async loadCarsData() {
        try {
            const response = await fetch('data/cars.json');
            this.carsData = await response.json();
        } catch (error) {
            console.error('Ошибка загрузки данных о машинах:', error);
            throw error;
        }
    }

    // Запрос к GigaChat API
    async queryGigaChat(userRequest) {
        // Проверяем, нужно ли использовать GigaChat API
        if (!this.config || !this.config.useGigaChatAPI || !this.config.hasCredentials()) {
            console.log('⚠️ GigaChat API не настроен, используется локальный поиск');
            const localResults = this.localSearch(userRequest);
            console.log('🔍 Локальный поиск. Запрос:', userRequest);
            console.log('📋 Найдено машин:', localResults.recommended_ids.length);
            return localResults;
        }
        
        console.log('🚀 Пытаемся использовать GigaChat API для запроса:', userRequest);

        // Получаем access token
        let accessToken;
        try {
            accessToken = await this.config.getAccessToken();
        } catch (error) {
            console.error('Ошибка получения access token, переключаемся на локальный поиск:', error);
            return this.localSearch(userRequest);
        }

        // Формируем контекст с информацией о машинах
        const carsContext = this.formatCarsForGigaChat();

        const systemPrompt = `Ты помощник по подбору автомобилей для аренды. 
Пользователь хочет арендовать минивэн. На основе его запроса, найди подходящие варианты из предоставленного каталога.

Правила подбора:
1. Анализируй запрос пользователя и находи релевантные характеристики (количество мест, тип топлива, коробка передач, цена, и т.д.)
2. Верни JSON массив с ID машин, которые подходят под запрос
3. Отсортируй по релевантности (самые подходящие первые)
4. Верни максимум 5-7 машин

Формат ответа (только JSON, без дополнительного текста):
{
  "recommended_ids": [9, 12, 15],
  "reason": "краткое объяснение выбора"
}`;

        const userPrompt = `Запрос пользователя: "${userRequest}"

Каталог автомобилей:
${carsContext}

Проанализируй запрос и верни JSON с ID рекомендуемых машин.`;

        try {
            // Определяем URL для запроса (прокси или прямой)
            const apiUrl = this.config.proxyUrl || this.config.apiUrl;
            
            // Подготовка запроса
            const requestBody = {
                model: this.config.model || 'GigaChat-Pro',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            };

            // Заголовки
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            // Если используем прокси, отправляем access token в теле запроса
            // Если прямой запрос - в заголовке Authorization
            if (this.config.proxyUrl) {
                requestBody.accessToken = accessToken;
            } else {
                headers['Authorization'] = `Bearer ${accessToken}`;
            }

            // Запрос к GigaChat API
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`GigaChat API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            console.log('✅ GigaChat API вернул ответ:', content.substring(0, 200));

            // Парсим JSON из ответа
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                console.log('📋 GigaChat рекомендовал машин:', result.recommended_ids?.length || 0);
                return result;
            } else {
                // Если не удалось распарсить, пробуем извлечь ID из текста
                console.log('⚠️ Не удалось распарсить JSON, извлекаем ID из текста');
                return this.extractIdsFromText(content);
            }
        } catch (error) {
            console.error('Ошибка запроса к GigaChat:', error);
            
            // Определяем тип ошибки
            let errorMessage = 'Ошибка подключения к GigaChat API';
            if (error.message && error.message.includes('CORS')) {
                errorMessage = 'CORS ошибка: требуется прокси-сервер для работы с GigaChat API';
            } else if (error.message && error.message.includes('token')) {
                errorMessage = 'Ошибка авторизации: проверьте credentials в конфигурации';
            }
            
            console.warn(`${errorMessage}. Используется локальный поиск.`);
            
            // Fallback: используем локальный поиск по ключевым словам
            const localResults = this.localSearch(userRequest);
            
            // Добавляем предупреждение в reason
            if (localResults.reason) {
                localResults.reason = `⚠️ ${errorMessage}. ${localResults.reason}`;
            }
            
            return localResults;
        }
    }

    // Форматирование данных машин для GigaChat
    formatCarsForGigaChat() {
        return this.carsData.map(car => {
            return `ID: ${car.id}
Марка и модель: ${car.brand} ${car.model}
Год: ${car.year}
Двигатель: ${car.engine}L
Топливо: ${car.fuelType}
Коробка: ${car.transmission === 'automatic' ? 'Автоматическая' : 'Механическая'}
Мест: ${car.seats}
Цена за день: от ${car.prices["21"]}₽
Залог: ${car.deposit}₽
Описание: ${car.description.substring(0, 200)}...
---
`;
        }).join('\n');
    }

    // Локальный поиск (fallback)
    localSearch(query) {
        const queryLower = query.toLowerCase();
        const keywords = queryLower.split(/\s+/).filter(k => k.length > 2); // Фильтруем короткие слова
        
        const scores = this.carsData.map(car => {
            let score = 0;
            const carText = `${car.brand} ${car.model} ${car.description || ''} ${car.fuelType} ${car.seats} мест ${car.year}`.toLowerCase();
            
            // Поиск по ключевым словам
            keywords.forEach(keyword => {
                if (carText.includes(keyword)) {
                    score += 1;
                }
            });

            // Бонусы за точные совпадения характеристик
            // Количество мест
            const seatsPatterns = [
                /(\d+)\s*мест[аеи]?/,
                /на\s*(\d+)\s*чел/,
                /для\s*(\d+)\s*чел/
            ];
            seatsPatterns.forEach(pattern => {
                const match = queryLower.match(pattern);
                if (match && parseInt(match[1]) === car.seats) {
                    score += 10; // Большой бонус за точное совпадение
                } else if (match && Math.abs(parseInt(match[1]) - car.seats) <= 1) {
                    score += 5; // Бонус за близкое значение
                }
            });

            // Тип топлива
            if (queryLower.includes('дизел') && car.fuelType && car.fuelType.toLowerCase().includes('дизел')) {
                score += 8;
            }
            if (queryLower.includes('бензин') && car.fuelType && car.fuelType.toLowerCase().includes('бензин')) {
                score += 8;
            }

            // Коробка передач
            if ((queryLower.includes('автомат') || queryLower.includes('авт')) && car.transmission === 'automatic') {
                score += 7;
            }
            if ((queryLower.includes('механика') || queryLower.includes('мех')) && car.transmission === 'manual') {
                score += 7;
            }

            // Марка
            const brands = ['mercedes', 'volkswagen', 'ford', 'toyota', 'hyundai', 'kia', 'peugeot', 'citroen'];
            brands.forEach(brand => {
                if (queryLower.includes(brand) && car.brand.toLowerCase().includes(brand)) {
                    score += 10;
                }
            });

            // Цена
            const pricePatterns = [
                /до\s*(\d+)\s*(тыс|руб|₽)/,
                /дешев/,
                /недорог/
            ];
            if (queryLower.includes('дешев') || queryLower.includes('недорог')) {
                // Сортируем по цене (ниже = лучше)
                score += Math.max(0, 100 - Math.floor(car.prices["21"] / 1000));
            }
            const priceMatch = queryLower.match(/до\s*(\d+)\s*(тыс|руб|₽)?/);
            if (priceMatch) {
                const maxPrice = parseInt(priceMatch[1]);
                if (maxPrice > 100) { // Скорее всего в тысячах
                    if (car.prices["21"] <= maxPrice * 1000) {
                        score += 8;
                    }
                } else if (car.prices["21"] <= maxPrice) {
                    score += 8;
                }
            }

            // Год выпуска
            if (queryLower.includes('новый') || queryLower.includes('нов')) {
                const currentYear = new Date().getFullYear();
                const carAge = currentYear - car.year;
                if (carAge <= 2) score += 8;
                else if (carAge <= 5) score += 4;
            }

            return { id: car.id, score, car };
        });

        // Сортируем по релевантности
        const sortedCars = scores
            .sort((a, b) => {
                // Сначала по score, потом случайно для разнообразия
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return Math.random() - 0.5;
            });

        // Если есть машины с score > 0, берем топ-5
        const topCars = sortedCars
            .filter(item => item.score > 0)
            .slice(0, 5)
            .map(item => item.id);

        // Если ничего не найдено по ключевым словам, пытаемся найти хоть что-то похожее
        if (topCars.length === 0) {
            console.log('⚠️ Ничего не найдено по ключевым словам, ищем альтернативы');
            
            // Берем машины с максимальным score (даже если он 0, но с приоритетом по разным критериям)
            const shuffledCars = [...this.carsData].sort(() => Math.random() - 0.5);
            
            // Популярные машины
            const popularCars = shuffledCars
                .filter(car => car.isPopular)
                .map(car => car.id)
                .slice(0, 3);
            
            // Остальные машины (разнообразные)
            const otherCars = shuffledCars
                .filter(car => !popularCars.includes(car.id))
                .map(car => car.id)
                .slice(0, 2);
            
            const allCars = [...popularCars, ...otherCars].slice(0, 5);
            
            if (allCars.length > 0) {
                return {
                    recommended_ids: allCars,
                    reason: 'Показаны доступные минивэны. Уточните запрос (например: "8 мест", "дизель", "автомат", "до 10000 рублей") для более точного подбора.'
                };
            } else {
                // Если все равно пусто, берем первые 5
                const firstCars = this.carsData
                    .slice(0, 5)
                    .map(car => car.id);
                
                return {
                    recommended_ids: firstCars,
                    reason: 'Показаны доступные минивэны из каталога.'
                };
            }
        }
        
        console.log(`✅ Локальный поиск нашел ${topCars.length} машин по запросу: "${query}"`);

        return {
            recommended_ids: topCars,
            reason: 'Подобрано на основе ключевых слов из вашего запроса'
        };
    }

    // Извлечение ID из текстового ответа
    extractIdsFromText(text) {
        const idMatches = text.match(/\b\d+\b/g);
        const ids = idMatches ? idMatches.map(Number).filter(id => 
            this.carsData.some(car => car.id === id)
        ).slice(0, 5) : [];
        
        return {
            recommended_ids: ids,
            reason: 'Найдены подходящие варианты'
        };
    }

    // Показ рекомендаций
    showRecommendations(recommendations, query) {
        const modal = document.getElementById('gigachatResultsModal');
        const queryText = document.getElementById('gigachatQueryText');
        const reasonText = document.getElementById('gigachatReasonText');
        const resultsGrid = document.getElementById('gigachatResultsGrid');

        if (!modal) {
            this.createResultsModal();
            return this.showRecommendations(recommendations, query);
        }

        queryText.textContent = `"${query}"`;
        
        // Показываем reason с информацией о типе поиска
        let reasonText_content = recommendations.reason || 'Подобрано для вас:';
        if (reasonText_content.includes('⚠️')) {
            reasonText_content = reasonText_content.replace('⚠️', '<span style="color: #f5576c;">⚠️</span>');
        }
        reasonText.innerHTML = reasonText_content;

        // Получаем рекомендуемые машины
        const recommendedCars = this.carsData.filter(car => 
            recommendations.recommended_ids.includes(car.id)
        );

        if (recommendedCars.length === 0) {
            resultsGrid.innerHTML = '<p style="color: #D4C4A8; text-align: center; padding: 20px;">К сожалению, подходящих вариантов не найдено. Попробуйте изменить критерии поиска.</p>';
        } else {
            resultsGrid.innerHTML = recommendedCars.map(car => this.renderCarCard(car)).join('');
        }

        modal.style.display = 'block';
        this.hideProcessingIndicator();
    }

    // Рендер карточки машины
    renderCarCard(car) {
        const thumbnailPath = car.images[0]?.replace('images/cars/', 'images/cars/thumbnails/').replace(/\.[^/.]+$/, '_thumb.jpg');
        
        return `
            <div class="gigachat-car-card" onclick="window.location.href='car-detail.html?id=${car.id}'">
                <div class="gigachat-car-image">
                    <img src="${thumbnailPath}" 
                         alt="${car.brand} ${car.model}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                    <div class="image-placeholder" style="display: none;">
                        ${car.brand} ${car.model}
                    </div>
                </div>
                <div class="gigachat-car-info">
                    <h3>${car.brand} ${car.model}</h3>
                    <p>${car.year} год • ${car.seats} мест • ${car.fuelType}</p>
                    <div class="gigachat-car-price">от ${car.prices["21"]} ₽/день</div>
                    <button class="btn btn-primary" onclick="event.stopPropagation(); window.location.href='booking.html?carId=${car.id}'">Забронировать</button>
                </div>
            </div>
        `;
    }

    // Создание модального окна результатов
    createResultsModal() {
        const modal = document.createElement('div');
        modal.id = 'gigachatResultsModal';
        modal.className = 'gigachat-modal';
        modal.innerHTML = `
            <div class="gigachat-modal-content">
                <div class="gigachat-modal-header">
                    <h2>Рекомендации GigaChat</h2>
                    <button class="gigachat-modal-close" onclick="document.getElementById('gigachatResultsModal').style.display='none'">&times;</button>
                </div>
                <div class="gigachat-modal-body">
                    <div class="gigachat-query">
                        <strong>Ваш запрос:</strong> <span id="gigachatQueryText"></span>
                    </div>
                    <div class="gigachat-reason" id="gigachatReasonText"></div>
                    <div class="gigachat-results-grid" id="gigachatResultsGrid"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Закрытие по клику вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Обновление состояния кнопки
    updateButtonState() {
        const button = document.getElementById('gigachatSearchBtn');
        if (!button) return;

        if (this.isListening) {
            button.classList.add('listening');
            button.innerHTML = '<span class="gigachat-icon">🎤</span> Слушаю...';
        } else {
            button.classList.remove('listening');
            button.innerHTML = '<span class="gigachat-icon">🤖</span> GigaChat Поиск';
        }
    }

    // Показ индикатора прослушивания
    showListeningIndicator() {
        let indicator = document.getElementById('gigachatListeningIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'gigachatListeningIndicator';
            indicator.className = 'gigachat-listening-indicator';
            indicator.innerHTML = '<div class="pulse"></div><p>Слушаю...</p>';
            document.body.appendChild(indicator);
        }
        indicator.style.display = 'flex';
    }

    // Скрытие индикатора прослушивания
    hideListeningIndicator() {
        const indicator = document.getElementById('gigachatListeningIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Показ индикатора обработки
    showProcessingIndicator(query) {
        let indicator = document.getElementById('gigachatProcessingIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'gigachatProcessingIndicator';
            indicator.className = 'gigachat-processing-indicator';
            indicator.innerHTML = '<div class="spinner"></div><p>Обрабатываю запрос...</p>';
            document.body.appendChild(indicator);
        }
        indicator.style.display = 'flex';
    }

    // Скрытие индикатора обработки
    hideProcessingIndicator() {
        const indicator = document.getElementById('gigachatProcessingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Показ ошибки
    showError(message) {
        alert(message); // В будущем можно заменить на красивое уведомление
        this.hideProcessingIndicator();
        this.hideListeningIndicator();
    }
}

// Инициализация при загрузке
let gigachatSearch = null;

// Функция инициализации
function initGigaChatSearch() {
    try {
        console.log('Инициализация GigaChat Search...');
        
        // Проверяем, что конфиг загружен
        if (typeof GigaChatConfig === 'undefined') {
            console.warn('GigaChatConfig не найден. Убедитесь, что js/gigachat-config.js загружен перед js/gigachat-search.js');
        }
        
        gigachatSearch = new GigaChatSearch();
        
        // Обработчик кнопки поиска
        const button = document.getElementById('gigachatSearchBtn');
        if (button) {
            console.log('Кнопка GigaChat найдена, добавляем обработчик');
            button.addEventListener('click', () => {
                console.log('Кнопка GigaChat нажата');
                if (gigachatSearch) {
                    // Проверяем наличие credentials
                    if (typeof GigaChatConfig !== 'undefined' && !GigaChatConfig.hasCredentials()) {
                        console.warn('GigaChat credentials не настроены, используется локальный поиск');
                    }
                    gigachatSearch.startListening();
                } else {
                    console.error('gigachatSearch не инициализирован');
                }
            });
        } else {
            console.error('Кнопка gigachatSearchBtn не найдена на странице');
        }
    } catch (error) {
        console.error('Ошибка инициализации GigaChat Search:', error);
    }
}

// Инициализация при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGigaChatSearch);
} else {
    // DOM уже загружен
    initGigaChatSearch();
}

