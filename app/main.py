from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.routers import books, cart, favorites, orders, reviews, users


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="校园二手书交易 API",
    version="1.0.0",
    summary="覆盖学生、发布、搜索、购物车、订单、评价等业务闭环的校园二手书后台。",
    lifespan=lifespan,
)

app.include_router(users.router)
app.include_router(books.router)
app.include_router(favorites.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(reviews.router)

frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/app", StaticFiles(directory=frontend_dir, html=True), name="frontend")


@app.get("/", summary="系统概览")
def root() -> dict[str, object]:
    return {
        "project": "校园二手书交易 API",
        "modules": [
            "学生用户模块",
            "二手书发布模块",
            "二手书搜索模块",
            "收藏模块",
            "购物车模块",
            "订单交易模块",
            "评价模块",
        ],
        "business_closed_loop": [
            "学生注册/登录",
            "发布二手书",
            "搜索和收藏图书",
            "加入购物车并下单",
            "支付、发货、确认收货",
            "交易完成后评价",
        ],
        "docs": "/docs",
        "frontend": "/app/",
    }
