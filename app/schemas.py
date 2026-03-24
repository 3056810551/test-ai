from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import BookStatus, OrderStatus


class Message(BaseModel):
    message: str


class UserRegister(BaseModel):
    student_id: str = Field(..., description="学号")
    name: str
    campus: str
    major: str
    phone: str
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    student_id: str
    password: str


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: str
    name: str
    campus: str
    major: str
    phone: str
    credit_score: int
    created_at: datetime


class LoginResponse(BaseModel):
    message: str
    user_id: int
    header_hint: str


class BookCreate(BaseModel):
    title: str
    author: str
    isbn: str | None = None
    course_name: str | None = None
    category: str
    description: str
    price: float = Field(..., gt=0)
    condition_level: str
    cover_url: str | None = None
    pickup_location: str


class BookUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    isbn: str | None = None
    course_name: str | None = None
    category: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, gt=0)
    condition_level: str | None = None
    cover_url: str | None = None
    pickup_location: str | None = None


class BookPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    seller_id: int
    title: str
    author: str
    isbn: str | None
    course_name: str | None
    category: str
    description: str
    price: float
    condition_level: str
    cover_url: str | None
    pickup_location: str
    status: BookStatus
    created_at: datetime
    updated_at: datetime


class CartAdd(BaseModel):
    book_id: int


class FavoritePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    book: BookPublic


class CartItemPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    book: BookPublic


class OrderCreateDirect(BaseModel):
    book_id: int
    pickup_location: str
    remark: str | None = None


class OrderCreateFromCart(BaseModel):
    pickup_location: str
    remark: str | None = None
    selected_book_ids: list[int] | None = None


class OrderItemPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    book_id: int
    title_snapshot: str
    price_snapshot: float
    quantity: int


class OrderPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    buyer_id: int
    seller_id: int
    total_amount: float
    status: OrderStatus
    pickup_location: str
    remark: str | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemPublic]


class OrderBatchResponse(BaseModel):
    message: str
    orders: list[OrderPublic]


class ReviewCreate(BaseModel):
    order_id: int
    rating: int = Field(..., ge=1, le=5)
    content: str = Field(..., min_length=2, max_length=500)


class ReviewPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    book_id: int
    buyer_id: int
    seller_id: int
    rating: int
    content: str
    created_at: datetime
