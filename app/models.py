from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BookStatus(str, enum.Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    SOLD = "sold"
    OFFLINE = "offline"


class OrderStatus(str, enum.Enum):
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    SHIPPED = "shipped"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(50))
    campus: Mapped[str] = mapped_column(String(50))
    major: Mapped[str] = mapped_column(String(80))
    phone: Mapped[str] = mapped_column(String(20), unique=True)
    password: Mapped[str] = mapped_column(String(100))
    credit_score: Mapped[int] = mapped_column(Integer, default=100)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    books: Mapped[list["Book"]] = relationship("Book", back_populates="seller")
    favorites: Mapped[list["Favorite"]] = relationship("Favorite", back_populates="user")
    cart_items: Mapped[list["CartItem"]] = relationship("CartItem", back_populates="user")


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(100), index=True)
    author: Mapped[str] = mapped_column(String(80), index=True)
    isbn: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True)
    course_name: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(50), index=True)
    description: Mapped[str] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Float)
    condition_level: Mapped[str] = mapped_column(String(30))
    cover_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pickup_location: Mapped[str] = mapped_column(String(100))
    status: Mapped[BookStatus] = mapped_column(
        Enum(BookStatus),
        default=BookStatus.AVAILABLE,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    seller: Mapped["User"] = relationship("User", back_populates="books")
    favorites: Mapped[list["Favorite"]] = relationship("Favorite", back_populates="book")
    cart_items: Mapped[list["CartItem"]] = relationship("CartItem", back_populates="book")
    order_items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="book")


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "book_id", name="uq_favorite_user_book"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="favorites")
    book: Mapped["Book"] = relationship("Book", back_populates="favorites")


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("user_id", "book_id", name="uq_cart_user_book"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="cart_items")
    book: Mapped["Book"] = relationship("Book", back_populates="cart_items")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    total_amount: Mapped[float] = mapped_column(Float)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus),
        default=OrderStatus.PENDING_PAYMENT,
        index=True,
    )
    pickup_location: Mapped[str] = mapped_column(String(100))
    remark: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), index=True)
    title_snapshot: Mapped[str] = mapped_column(String(100))
    price_snapshot: Mapped[float] = mapped_column(Float)
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    order: Mapped["Order"] = relationship("Order", back_populates="items")
    book: Mapped["Book"] = relationship("Book", back_populates="order_items")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("order_id", name="uq_review_order"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), index=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    rating: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
