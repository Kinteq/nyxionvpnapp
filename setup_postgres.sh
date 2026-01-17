#!/bin/bash
# Скрипт для настройки PostgreSQL на VPS

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

# Настройка доступа из вне
echo "host    nyxion_vpn    nyxion_vpn    0.0.0.0/0    md5" >> /etc/postgresql/*/main/pg_hba.conf
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/*/main/postgresql.conf

# Перезапуск PostgreSQL
systemctl restart postgresql

# Настройка firewall
ufw allow 5432/tcp

echo "✅ PostgreSQL настроен!"
echo "📝 Данные для подключения:"
echo "   Host: 62.60.217.189"
echo "   Port: 5432"
echo "   Database: nyxion_vpn"
echo "   User: nyxion_vpn"
echo "   Password: NyxionVPN2026!Secure"
