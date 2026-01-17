import asyncio
import asyncpg

async def test_connection():
    try:
        conn = await asyncpg.connect(
            host='62.60.217.189',
            port=5432,
            user='nyxion_vpn',
            password='NyxionVPN2026Secure',
            database='nyxion_vpn'
        )
        print("✅ Подключение к PostgreSQL успешно!")
        await conn.close()
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")
        print("\n🔧 Возможные решения:")
        print("1. Проверьте firewall на VPS: ufw status")
        print("2. Проверьте что PostgreSQL слушает на всех интерфейсах")
        print("3. Проверьте pg_hba.conf")

asyncio.run(test_connection())
