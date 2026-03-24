from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import OrderStatus, Review, User
from app.schemas import ReviewCreate, ReviewPublic
from app.services import get_order_or_404


router = APIRouter(prefix="/reviews", tags=["评价模块"])


@router.post("", response_model=ReviewPublic, summary="提交交易评价")
def create_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Review:
    order = get_order_or_404(db, payload.order_id)
    if order.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="只有买家才能评价订单。")
    if order.status != OrderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="只有已完成订单才能评价。")

    existing_review = db.scalar(select(Review).where(Review.order_id == payload.order_id))
    if existing_review:
        raise HTTPException(status_code=400, detail="该订单已经评价过。")

    if not order.items:
        raise HTTPException(status_code=400, detail="订单中没有可评价图书。")

    review = Review(
        order_id=order.id,
        book_id=order.items[0].book_id,
        buyer_id=current_user.id,
        seller_id=order.seller_id,
        rating=payload.rating,
        content=payload.content,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/seller/{seller_id}", response_model=list[ReviewPublic], summary="查看卖家评价")
def list_seller_reviews(seller_id: int, db: Session = Depends(get_db)) -> list[Review]:
    stmt = (
        select(Review)
        .where(Review.seller_id == seller_id)
        .order_by(Review.created_at.desc())
    )
    return list(db.scalars(stmt).all())
