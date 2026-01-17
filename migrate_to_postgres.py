"""
Миграция данных из JSON в PostgreSQL
"""
import asyncio
import json
from datetime import datetime
from database import init_db, async_session_maker, User, Subscription
import os

async def migrate_subscriptions():
    """Миграция подписок из subscriptions.json в PostgreSQL"""
    
    # Инициализация БД
    await init_db()
    print("✅ Database initialized")
    
    # Загрузка данных из JSON
    json_file = 'subscriptions.json'
    if not os.path.exists(json_file):
        print(f"❌ File {json_file} not found")
        return
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"📂 Loaded {len(data)} subscriptions from JSON")
    
    async with async_session_maker() as session:
        migrated = 0
        for user_id_str, sub in data.items():
            try:
                user_id = int(user_id_str)
                
                # Создаем пользователя если не существует
                user = await session.get(User, user_id)
                if not user:
                    user = User(
                        id=user_id,
                        username=sub.get('username', f'vpn_{user_id}'),
                        created_at=datetime.fromisoformat(sub.get('created_at')) if 'created_at' in sub else datetime.now()
                    )
                    session.add(user)
                
                # Создаем подписку
                subscription = Subscription(
                    user_id=user_id,
                    server_id=1,  # Основной сервер
                    vpn_username=sub.get('username', f'vpn_{user_id}'),
                    vpn_uri=sub.get('vpn_uri', ''),
                    traffic_gb=sub.get('traffic_gb', 0),
                    expiry_date=datetime.fromisoformat(sub.get('expiry_date')),
                    is_active=True,
                    created_at=datetime.fromisoformat(sub.get('created_at')) if 'created_at' in sub else datetime.now()
                )
                session.add(subscription)
                
                migrated += 1
                
            except Exception as e:
                print(f"❌ Error migrating user {user_id_str}: {e}")
        
        # Сохранение
        await session.commit()
        print(f"✅ Successfully migrated {migrated} subscriptions")

if __name__ == "__main__":
    print("🚀 Starting migration...")
    asyncio.run(migrate_subscriptions())
    print("✅ Migration completed!")
