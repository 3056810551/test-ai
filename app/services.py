import hashlib
from collections import defaultdict

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Book, BookStatus, CartItem, Order, OrderItem, OrderStatus, User


def hash_password(raw_password: str) -> str:
    return hashlib.sha256(raw_password.encode("utf-8")).hexdigest()


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="学生用户不存在。")
    return user


def get_book_or_404(db: Session, book_id: int) -> Book:
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="图书不存在。")
    return book


def get_order_or_404(db: Session, order_id: int) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="订单不存在。")
    return order


def ensure_book_can_be_bought(book: Book, buyer_id: int) -> None:
    if book.seller_id == buyer_id:
        raise HTTPException(status_code=400, detail="不能购买自己发布的图书。")
    if book.status != BookStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="当前图书不可下单。")


def release_order_books(order: Order) -> None:
    for item in order.items:
        if item.book.status == BookStatus.RESERVED:
            item.book.status = BookStatus.AVAILABLE


def create_order_for_books(
    db: Session,
    buyer_id: int,
    seller_id: int,
    books: list[Book],
    pickup_location: str,
    remark: str | None,
) -> Order:
    total_amount = sum(book.price for book in books)
    order = Order(
        buyer_id=buyer_id,
        seller_id=seller_id,
        total_amount=total_amount,
        pickup_location=pickup_location,
        remark=remark,
        status=OrderStatus.PENDING_PAYMENT,
    )
    db.add(order)
    db.flush()

    for book in books:
        ensure_book_can_be_bought(book, buyer_id)
        book.status = BookStatus.RESERVED
        order_item = OrderItem(
            order_id=order.id,
            book_id=book.id,
            title_snapshot=book.title,
            price_snapshot=book.price,
            quantity=1,
        )
        db.add(order_item)

    db.flush()
    db.refresh(order)
    return order


def group_cart_items_by_seller(cart_items: list[CartItem]) -> dict[int, list[Book]]:
    seller_books: dict[int, list[Book]] = defaultdict(list)
    for cart_item in cart_items:
        seller_books[cart_item.book.seller_id].append(cart_item.book)
    return seller_books
