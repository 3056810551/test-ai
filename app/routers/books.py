from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Book, BookStatus, User
from app.schemas import BookCreate, BookPublic, BookUpdate, Message
from app.services import get_book_or_404


router = APIRouter(prefix="/books", tags=["二手书发布与搜索模块"])


@router.post("", response_model=BookPublic, summary="发布二手书")
def create_book(
    payload: BookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Book:
    book = Book(seller_id=current_user.id, **payload.model_dump())
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@router.put("/{book_id}", response_model=BookPublic, summary="修改图书信息")
def update_book(
    book_id: int,
    payload: BookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Book:
    book = get_book_or_404(db, book_id)
    if book.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能修改自己发布的图书。")
    if book.status in {BookStatus.RESERVED, BookStatus.SOLD}:
        raise HTTPException(status_code=400, detail="当前状态下不可编辑图书。")

    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(book, field_name, value)

    db.commit()
    db.refresh(book)
    return book


@router.post("/{book_id}/offline", response_model=Message, summary="下架图书")
def offline_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Message:
    book = get_book_or_404(db, book_id)
    if book.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能下架自己发布的图书。")
    if book.status == BookStatus.SOLD:
        raise HTTPException(status_code=400, detail="已售图书不能下架。")

    book.status = BookStatus.OFFLINE
    db.commit()
    return Message(message="图书已下架。")


@router.post("/{book_id}/republish", response_model=BookPublic, summary="重新上架图书")
def republish_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Book:
    book = get_book_or_404(db, book_id)
    if book.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能操作自己发布的图书。")
    if book.status != BookStatus.OFFLINE:
        raise HTTPException(status_code=400, detail="只有已下架图书才能重新上架。")

    book.status = BookStatus.AVAILABLE
    db.commit()
    db.refresh(book)
    return book


@router.get("", response_model=list[BookPublic], summary="搜索/浏览二手书")
def search_books(
    q: str | None = Query(default=None, description="关键词，可匹配书名、作者、课程名"),
    category: str | None = None,
    course_name: str | None = None,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    status: BookStatus | None = BookStatus.AVAILABLE,
    db: Session = Depends(get_db),
) -> list[Book]:
    stmt = select(Book)

    if q:
        keyword = f"%{q}%"
        stmt = stmt.where(
            (Book.title.like(keyword))
            | (Book.author.like(keyword))
            | (Book.course_name.like(keyword))
        )
    if category:
        stmt = stmt.where(Book.category == category)
    if course_name:
        stmt = stmt.where(Book.course_name == course_name)
    if min_price is not None:
        stmt = stmt.where(Book.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Book.price <= max_price)
    if status is not None:
        stmt = stmt.where(Book.status == status)

    stmt = stmt.order_by(Book.created_at.desc())
    return list(db.scalars(stmt).all())


@router.get("/mine/items", response_model=list[BookPublic], summary="查看我发布的图书")
def my_books(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Book]:
    stmt = (
        select(Book)
        .where(Book.seller_id == current_user.id)
        .order_by(Book.created_at.desc())
    )
    return list(db.scalars(stmt).all())


@router.get("/{book_id}", response_model=BookPublic, summary="查看图书详情")
def get_book_detail(book_id: int, db: Session = Depends(get_db)) -> Book:
    return get_book_or_404(db, book_id)
