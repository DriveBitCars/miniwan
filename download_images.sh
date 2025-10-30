#!/bin/bash
# Скрипт для скачивания изображений Toyota Sienna

cd "$(dirname "$0")/images/cars"

echo "🔽 Скачиваю изображения Toyota Sienna..."

curl -o 025-1.jpg "https://cdn.rentride.ru/uploads/photos/cars/ddea5c48b1ed91bfd00c99bac887400b.jpg"
curl -o 025-2.jpg "https://cdn.rentride.ru/uploads/photos/cars/af87baada553214d388f99b541783219.jpg"
curl -o 025-3.jpg "https://cdn.rentride.ru/uploads/photos/cars/9140a7739466ed646579432ddd02cccb.jpg"
curl -o 025-4.jpg "https://cdn.rentride.ru/uploads/photos/cars/55cbf4a1b59b08bfd7be6d9f6bb32a98.jpg"
curl -o 025-5.jpg "https://cdn.rentride.ru/uploads/photos/cars/ae0ce3fc2c0137b34d9d18ddc33649ca.jpg"
curl -o 025-6.jpg "https://cdn.rentride.ru/uploads/photos/cars/cd372d522025ad958eaeb514c4ff6db2.jpg"
curl -o 025-7.jpg "https://cdn.rentride.ru/uploads/photos/cars/273a7a97d487ebb633a14cf0361e3b74.jpg"
curl -o 025-8.jpg "https://cdn.rentride.ru/uploads/photos/cars/b851d92940418a9fccaced3f36e82a30.jpg"
curl -o 025-9.jpg "https://cdn.rentride.ru/uploads/photos/cars/2f48170d32464a0dcbc1c420a45b5341.jpg"
curl -o 025-10.jpg "https://cdn.rentride.ru/uploads/photos/cars/5516ce835dc309308795c58456bc66ee.jpg"

echo ""
echo "✅ Готово! Скачано 10 изображений"
echo "Теперь запустите: python3 generate_thumbnails.py"

