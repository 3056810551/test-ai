from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import BookStatus, CartItem, Order, OrderStatus, User
from app.schemas import (
    Message,
    OrderBatchResponse,
    OrderCreateDirect,
    OrderCreateFromCart,
    OrderPublic,
)
from app.services import (
    create_order_for_books,
    get_book_or_404,
    get_order_or_404,
    group_cart_items_by_seller,
    release_order_books,
)


router = APIRouter(prefix="/orders", tags=["订单交易模块"])


@router.post("/direct", response_model=OrderPublic, summary="直接下单")
def create_direct_order(
    payload: OrderCreateDirect,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Order:
    book = get_book_or_404(db, payload.book_id)
    order = create_order_for_books(
        db=db,
        buyer_id=current_user.id,
        seller_id=book.seller_id,
        books=[book],
        pickup_location=payload.pickup_location,
        remark=payload.remark,
    )
    db.commit()
    db.refresh(order)
    return order


@router.post("/from-cart", response_model=OrderBatchResponse, summary="从购物车批量下单")
def create_orders_from_cart(
    payload: OrderCreateFromCart,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderBatchResponse:
    stmt = select(CartItem).where(CartItem.user_id == current_user.id)
    cart_items = list(db.scalars(stmt).all())

    if payload.selected_book_ids:
        selected_set = set(payload.selected_book_ids)
        cart_items = [item for item in cart_items if item.book_id in selected_set]

    if not cart_items:
        raise HTTPException(status_code=400, detail="购物车中没有可下单的图书。")

    grouped = group_cart_items_by_seller(cart_items)
    created_orders: list[Order] = []

    for seller_id, books in grouped.items():
        order = create_order_for_books(
            db=db,
            buyer_id=current_user.id,
            seller_id=seller_id,
            books=books,
            pickup_location=payload.pickup_location,
            remark=payload.remark,
        )
        created_orders.append(order)

    for cart_item in cart_items:
        db.delete(cart_item)

    db.commit()
    for order in created_orders:
        db.refresh(order)

    return OrderBatchResponse(message="购物车下单成功。", orders=created_orders)


@router.get("/me", response_model=list[OrderPublic], summary="查看我的订单")
def list_my_orders(
    role: str = Query(default="all", pattern="^(all|buyer|seller)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Order]:
    if role == "buyer":
        stmt = select(Order).where(Order.buyer_id == current_user.id)
    elif role == "seller":
        stmt = select(Order).where(Order.seller_id == current_user.id)
    else:
        stmt = select(Order).where(
            or_(Order.buyer_id == current_user.id, Order.seller_id == current_user.id)
        )

    stmt = stmt.order_by(Order.created_at.desc())
    return list(db.scalars(stmt).all())


@router.post("/{order_id}/pay", response_model=Message, summary="支付订单")
def pay_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Message:
    order = get_order_or_404(db, order_id)
    if order.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="只有买家才能支付订单。")
    if order.status != OrderStatus.PENDING_PAYMENT:
        raise HTTPException(status_code=400, detail="当前订单状态不可支付。")

    order.status = OrderStatus.PAID
    db.commit()
    return Message(message="订单已支付，等待卖家发货。")


@router.post("/{order_id}/ship", response_model=Message, summary="卖家发货")
def ship_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Message:
    order = get_order_or_404(db, order_id)
    if order.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="只有卖家才能发货。")
    if order.status != OrderStatus.PAID:
        raise HTTPException(status_code=400, detail="只有已支付订单才能发货。")

    order.status = OrderStatus.SHIPPED
    db.commit()
    return Message(message="已发货，等待买家确认收货。")


@router.post("/{order_id}/confirm-receipt", response_model=Message, summary="确认收货")
def confirm_receipt(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Message:
    order = get_order_or_404(db, order_id)
    if order.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="只有买家才能确认收货。")
    if order.status != OrderStatus.SHIPPED:
        raise HTTPException(status_code=400, detail="只有已发货订单才能确认收货。")

    order.status = OrderStatus.COMPLETED
    for item in order.items:
        item.book.status = BookStatus.SOLD

    db.commit()
    return Message(message="订单已完成，买家可进行评价。")


@router.post("/{order_id}/cancel", response_model=Message, summary="取消订单")
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Message:
    order = get_order_or_404(db, order_id)
    if current_user.id not in {order.buyer_id, order.seller_id}:
        raise HTTPException(status_code=403, detail="无权取消该订单。")
    if order.status not in {OrderStatus.PENDING_PAYMENT, OrderStatus.PAID}:
        raise HTTPException(status_code=400, detail="当前订单状态不可取消。")

    order.status = OrderStatus.CANCELLED
    release_order_books(order)
    db.commit()
    return Message(message="订单已取消，相关图书已重新开放购买。")
