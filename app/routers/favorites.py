from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import BookStatus, Favorite, User
from app.schemas import FavoritePublic, Message
from app.services import get_book_or_404


router = APIRouter(prefix="/favorites", tags=["收藏模块"])


@router.post("/{book_id}", response_model=FavoritePublic, summary="收藏图书")
def add_favorite(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Favorite:
    book = get_book_or_404(db, book_id)
    if book.status == BookStatus.SOLD:
        raise HTTPException(status_code=400, detail="已售图书不可收藏。")

    existing = db.scalar(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.book_id == book_id,
        )
    )
    if existing:
        raise HTTPException(status_code=400, detail="该图书已收藏。")

    favorite = Favorite(user_id=current_user.id, book_id=book_id)
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


@router.get("/me", response_model=list[FavoritePublic], summary="查看我的收藏")
def list_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Favorite]:
    stmt = (
        select(Favorite)
        .where(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
    )
    return list(db.scalars(stmt).all())


@router.delete("/{book_id}", response_model=Message, summary="取消收藏")
def delete_favorite(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Message:
    favorite = db.scalar(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.book_id == book_id,
        )
    )
    if favorite is None:
        raise HTTPException(status_code=404, detail="收藏记录不存在。")

    db.delete(favorite)
    db.commit()
    return Message(message="已取消收藏。")
