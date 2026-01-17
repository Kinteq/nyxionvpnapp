"""
Database models and connection for Nyxion VPN Bot
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, BigInteger, DateTime, Boolean, Text, JSON
from datetime import datetime, timezone
from typing import Optional
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://nyxion_vpn:NyxionVPN2026Secure@62.60.217.189:5432/nyxion_vpn")

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL query logging
    pool_size=20,
    max_overflow=40
)

# Session maker
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    """Пользователь бота"""
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)  # Telegram user ID
    username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    language_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Subscription(Base):
    """Подписка пользователя"""
    __tablename__ = "subscriptions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, index=True)  # Telegram user ID
    server_id: Mapped[int] = mapped_column(Integer, default=1)  # ID сервера для мультисервер поддержки
    vpn_username: Mapped[str] = mapped_column(String(255), unique=True)  # vpn_{user_id}
    vpn_uri: Mapped[str] = mapped_column(Text)  # Hysteria2 URI key
    traffic_gb: Mapped[int] = mapped_column(Integer, default=0)  # 0 = безлимит
    expiry_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Payment(Base):
    """История платежей"""
    __tablename__ = "payments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, index=True)
    invoice_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    currency: Mapped[str] = mapped_column(String(10))  # TON, USDT, BTC, etc.
    amount: Mapped[str] = mapped_column(String(50))  # Храним как строку для точности
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, paid, expired, cancelled
    subscription_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Связь с подпиской
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Дополнительные данные


class Server(Base):
    """Серверы VPN для мультисервер архитектуры"""
    __tablename__ = "servers"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))  # Название (Russia, USA, Germany, etc.)
    country_code: Mapped[str] = mapped_column(String(2))  # RU, US, DE, etc.
    api_url: Mapped[str] = mapped_column(String(512))  # Blitz API URL
    api_token: Mapped[str] = mapped_column(String(512))  # Blitz API token
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    max_users: Mapped[int] = mapped_column(Integer, default=1000)  # Максимум пользователей
    current_users: Mapped[int] = mapped_column(Integer, default=0)  # Текущее количество
    priority: Mapped[int] = mapped_column(Integer, default=0)  # Приоритет для балансировки
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class BotStats(Base):
    """Статистика бота"""
    __tablename__ = "bot_stats"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), unique=True, index=True)
    total_users: Mapped[int] = mapped_column(Integer, default=0)
    active_subscriptions: Mapped[int] = mapped_column(Integer, default=0)
    new_users: Mapped[int] = mapped_column(Integer, default=0)
    new_subscriptions: Mapped[int] = mapped_column(Integer, default=0)
    revenue: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # {currency: amount}
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


async def init_db():
    """Инициализация базы данных"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    """Получить сессию БД"""
    async with async_session_maker() as session:
        yield session
