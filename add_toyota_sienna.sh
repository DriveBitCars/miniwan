#!/bin/bash
# Полностью автоматический скрипт для добавления Toyota Sienna

set -e  # Остановить при ошибке

cd "$(dirname "$0")"

echo "============================================================"
echo "🚗 Автоматическое добавление Toyota Sienna 2013"
echo "============================================================"
echo ""

# Проверяем/устанавливаем библиотеки
echo "📦 Проверяю библиотеки..."
if ! python3 -c "import requests" 2>/dev/null; then
    echo "📦 Устанавливаю requests..."
    pip3 install --break-system-packages requests 2>&1 | grep -v "Requirement already satisfied" || true
fi

if ! python3 -c "import bs4" 2>/dev/null; then
    echo "📦 Устанавливаю beautifulsoup4..."
    pip3 install --break-system-packages beautifulsoup4 2>&1 | grep -v "Requirement already satisfied" || true
fi

echo "✓ Библиотеки готовы"
echo ""

# Запускаем основной скрипт
echo "🚀 Запускаю добавление машины..."
python3 add_car_rentride.py

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================================"
    echo "✅ УСПЕШНО! Теперь делаю git commit..."
    echo "============================================================"
    
    git add .
    git commit -m "Добавлена Toyota Sienna 2013 - полный привод, 7 мест, с фотографиями

- Автоматически спарсены данные с RentRide
- Скачано 10 фотографий
- Созданы thumbnails
- Добавлена запись в cars.json"
    
    echo ""
    echo "============================================================"
    echo "🎉 ВСЁ ГОТОВО!"
    echo "============================================================"
    echo ""
    echo "✓ Toyota Sienna 2013 добавлена"
    echo "✓ Коммит создан"
    echo ""
    echo "Теперь можно сделать push или продолжить работу"
    echo ""
else
    echo ""
    echo "❌ Произошла ошибка при добавлении машины"
    exit 1
fi

