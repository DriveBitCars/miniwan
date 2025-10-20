# Memory Monitor для Java процессов

Скрипт для автоматического мониторинга памяти и завершения Java процессов при критически низкой памяти.

## 🚀 Быстрый старт

### 1. Тестирование
```bash
# Проверить текущее состояние памяти
./memory_monitor.sh test

# Посмотреть статистику
./memory_monitor.sh stats
```

### 2. Запуск мониторинга
```bash
# Запустить в фоне
nohup ./memory_monitor.sh start > /dev/null 2>&1 &

# Или запустить в screen/tmux
screen -S memory_monitor
./memory_monitor.sh start
# Ctrl+A, D для выхода из screen
```

### 3. Установка как systemd сервис
```bash
# Скопировать сервис
sudo cp memory-monitor.service /etc/systemd/system/

# Перезагрузить systemd
sudo systemctl daemon-reload

# Включить автозапуск
sudo systemctl enable memory-monitor

# Запустить сервис
sudo systemctl start memory-monitor

# Проверить статус
sudo systemctl status memory-monitor

# Посмотреть логи
sudo journalctl -u memory-monitor -f
```

## ⚙️ Конфигурация

В скрипте можно изменить параметры:

```bash
MEMORY_THRESHOLD=85  # Порог использования памяти в процентах
CHECK_INTERVAL=30    # Интервал проверки в секундах
LOG_FILE="/tmp/memory_monitor.log"  # Файл логов
```

## 📊 Мониторинг

### Просмотр логов
```bash
# Последние записи
tail -f /tmp/memory_monitor.log

# Или через journalctl (если запущен как сервис)
sudo journalctl -u memory-monitor -f
```

### Проверка статуса
```bash
# Статистика памяти и процессов
./memory_monitor.sh stats

# Тестовая проверка
./memory_monitor.sh test
```

## 🔧 Управление сервисом

```bash
# Остановить
sudo systemctl stop memory-monitor

# Перезапустить
sudo systemctl restart memory-monitor

# Отключить автозапуск
sudo systemctl disable memory-monitor

# Удалить сервис
sudo systemctl stop memory-monitor
sudo systemctl disable memory-monitor
sudo rm /etc/systemd/system/memory-monitor.service
sudo systemctl daemon-reload
```

## 📝 Логи

Скрипт ведет подробные логи:
- Время проверки памяти
- Процент использования памяти
- Действия по завершению процессов
- Результаты операций

## ⚠️ Безопасность

- Скрипт завершает только Java процессы
- Сначала пытается мягко завершить процесс (SIGTERM)
- Принудительно завершает только если процесс не отвечает
- Логирует все действия для аудита

## 🎯 Принцип работы

1. **Мониторинг**: Каждые 30 секунд проверяет использование памяти
2. **Порог**: При превышении 85% памяти запускает процедуру освобождения
3. **Выбор цели**: Находит Java процесс с наибольшим использованием памяти
4. **Завершение**: Мягко завершает процесс, при необходимости принудительно
5. **Проверка**: Ждет 10 секунд и проверяет результат

## 📈 Примеры использования

### Разработка
```bash
# Запустить для тестирования
./memory_monitor.sh start
```

### Продакшн
```bash
# Установить как сервис
sudo systemctl enable memory-monitor
sudo systemctl start memory-monitor
```

### Отладка
```bash
# Проверить что происходит
./memory_monitor.sh stats
tail -f /tmp/memory_monitor.log
```
