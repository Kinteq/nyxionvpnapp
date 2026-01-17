#!/bin/bash
# Исправленный скрипт создания БД (простой пароль без спецсимволов)

echo "🔧 Создание пользователя и БД PostgreSQL..."

sudo -u postgres psql << 'EOSQL'
CREATE USER nyxion_vpn WITH PASSWORD 'NyxionVPN2026Secure';
CREATE DATABASE nyxion_vpn OWNER nyxion_vpn;
GRANT ALL PRIVILEGES ON DATABASE nyxion_vpn TO nyxion_vpn;
\q
EOSQL

echo "✅ Пользователь и БД созданы!"
echo "📝 Данные для подключения:"
echo "   Host: 62.60.217.189"
echo "   Port: 5432"
echo "   Database: nyxion_vpn"
echo "   User: nyxion_vpn"
echo "   Password: NyxionVPN2026Secure"
