# 🔧 Инструкция по настройке PostgreSQL на VPS

## Шаг 1: Подключитесь к VPS

Откройте терминал и выполните:

```bash
ssh root@62.60.217.189
# Пароль: d62nIyNpFCEY
```

## Шаг 2: Скопируйте и выполните скрипт установки

После подключения выполните эти команды:

```bash
# Скачайте скрипт
cat > setup_postgres.sh << 'EOF'
#!/bin/bash
echo "🚀 Настройка PostgreSQL на VPS..."

# Обновление системы и установка PostgreSQL
apt update
apt install -y postgresql postgresql-contrib

# Запуск PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Создание пользователя и базы данных
sudo -u postgres psql -c "CREATE USER nyxion_vpn WITH PASSWORD 'NyxionVPN2026!Secure';"
sudo -u postgres psql -c "CREATE DATABASE nyxion_vpn OWNER nyxion_vpn;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nyxion_vpn TO nyxion_vpn;"

# Настройка доступа извне
echo "host    nyxion_vpn    nyxion_vpn    0.0.0.0/0    md5" >> /etc/postgresql/*/main/pg_hba.conf
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/*/main/postgresql.conf

# Перезапуск PostgreSQL
systemctl restart postgresql

# Настройка firewall (если используется)
ufw allow 5432/tcp 2>/dev/null || true

echo "✅ PostgreSQL настроен!"
echo ""
echo "📝 Данные для подключения:"
echo "   Host: 62.60.217.189"
echo "   Port: 5432"
echo "   Database: nyxion_vpn"
echo "   User: nyxion_vpn"
echo "   Password: NyxionVPN2026!Secure"
EOF

# Сделать исполняемым и запустить
chmod +x setup_postgres.sh
./setup_postgres.sh
```

## Шаг 3: Проверьте подключение

После завершения установки, проверьте что PostgreSQL работает:

```bash
systemctl status postgresql
```

Должно быть: `active (running)`

## Шаг 4: Выйдите из VPS

```bash
exit
```

## Шаг 5: Установите зависимости на Mac

В терминале на вашем Mac выполните:

```bash
cd "/Users/nevermore/Desktop/Nyxion_VPN_bot/Ver 2/ver2.2"
pip3 install -r requirements.txt
```

## Шаг 6: Проверьте подключение к БД

```bash
python3 -c "import asyncio; from database import init_db; asyncio.run(init_db()); print('✅ Подключение успешно!')"
```

## Шаг 7: Мигрируйте данные из JSON

```bash
python3 migrate_to_postgres.py
```

## ✅ Готово!

Теперь PostgreSQL настроен и готов к использованию.

---

## 🔒 Безопасность (опционально, но рекомендуется)

После настройки рекомендуется:

1. Изменить порт PostgreSQL (не 5432)
2. Настроить более строгие правила firewall
3. Использовать SSL для подключений

Нужна помощь с этим? Дайте знать!
