from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import BookStatus, CartItem, User
from app.schemas import CartAdd, CartItemPublic, Message
from app.services import get_book_or_404


router = APIRouter(prefix="/cart", tags=["购物车模块"])


@router.post("/items", response_model=CartItemPublic, summary="加入购物车")
def add_to_cart(
    payload: CartAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CartItem:
    book = get_book_or_404(db, payload.book_id)
    if book.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="不能把自己发布的图书加入购物车。")
    if book.status != BookStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="当前图书不可加入购物车。")

    existing = db.scalar(
        select(CartItem).where(
            CartItem.user_id == current_user.id,
            CartItem.book_id == payload.book_id,
        )
    )
    if existing:
        raise HTTPException(status_code=400, detail="该图书已在购物车中。")

    cart_item = CartItem(user_id=current_user.id, book_id=payload.book_id)
    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)
    return cart_item


@router.get("/items", response_model=list[CartItemPublic], summary="查看购物车")
def list_cart_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CartItem]:
    stmt = (
        select(CartItem)
        .where(CartItem.user_id == current_user.id)
        .order_by(CartItem.created_at.desc())
    )
    return list(db.scalars(stmt).all())


@router.delete("/items/{book_id}", response_model=Message, summary="移出购物车")
def remove_cart_item(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Message:
    cart_item = db.scalar(
        select(CartItem).where(
            CartItem.user_id == current_user.id,
            CartItem.book_id == book_id,
        )
    )
    if cart_item is None:
        raise HTTPException(status_code=404, detail="购物车记录不存在。")

    db.delete(cart_item)
    db.commit()
    return Message(message="已移出购物车。")
