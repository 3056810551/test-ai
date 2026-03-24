from __future__ import annotations

import argparse
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import func, select

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.database import Base, DATABASE_URL, SessionLocal, engine
from app.models import (
    Book,
    BookStatus,
    CartItem,
    Favorite,
    Order,
    OrderItem,
    OrderStatus,
    Review,
    User,
)
from app.services import hash_password


DEMO_PASSWORD = "123456"
BASE_TIME = datetime.now(UTC).replace(tzinfo=None)


def make_time(days_ago: int, hours: int = 0) -> datetime:
    return BASE_TIME - timedelta(days=days_ago, hours=hours)


USER_SPECS = [
    {
        "key": "zhang_shuming",
        "student_id": "20260001",
        "name": "张书铭",
        "campus": "主校区",
        "major": "计算机科学与技术",
        "phone": "13800000001",
        "credit_score": 100,
        "created_at": make_time(40),
    },
    {
        "key": "li_yanqiu",
        "student_id": "20260002",
        "name": "李研秋",
        "campus": "主校区",
        "major": "数学与应用数学",
        "phone": "13800000002",
        "credit_score": 98,
        "created_at": make_time(38),
    },
    {
        "key": "wang_ruoxi",
        "student_id": "20260003",
        "name": "王若溪",
        "campus": "南校区",
        "major": "金融学",
        "phone": "13800000003",
        "credit_score": 99,
        "created_at": make_time(36),
    },
    {
        "key": "zhao_xinghe",
        "student_id": "20260004",
        "name": "赵星河",
        "campus": "主校区",
        "major": "汉语言文学",
        "phone": "13800000004",
        "credit_score": 96,
        "created_at": make_time(35),
    },
    {
        "key": "chen_zhiyuan",
        "student_id": "20260005",
        "name": "陈知远",
        "campus": "东校区",
        "major": "软件工程",
        "phone": "13800000005",
        "credit_score": 100,
        "created_at": make_time(33),
    },
    {
        "key": "zhou_kexin",
        "student_id": "20260006",
        "name": "周可欣",
        "campus": "南校区",
        "major": "会计学",
        "phone": "13800000006",
        "credit_score": 97,
        "created_at": make_time(31),
    },
]


BOOK_SPECS = [
    {
        "key": "calculus",
        "seller_key": "zhang_shuming",
        "title": "高等数学（第七版）上册",
        "author": "同济大学数学系",
        "isbn": "9787040396638",
        "course_name": "高等数学A",
        "category": "教材",
        "description": "有少量铅笔笔记，书皮完整，适合新生接手。",
        "price": 18.5,
        "condition_level": "8成新",
        "pickup_location": "主图书馆门口",
        "status": BookStatus.AVAILABLE,
        "created_at": make_time(18),
    },
    {
        "key": "physics",
        "seller_key": "zhang_shuming",
        "title": "大学物理学（力学与热学）",
        "author": "张三慧",
        "isbn": "9787301299685",
        "course_name": "大学物理A",
        "category": "教材",
        "description": "成色很好，重点章节贴了便利贴。",
        "price": 22.0,
        "condition_level": "9成新",
        "pickup_location": "一食堂东门",
        "status": BookStatus.SOLD,
        "created_at": make_time(26),
    },
    {
        "key": "c_language",
        "seller_key": "zhang_shuming",
        "title": "C 程序设计语言",
        "author": "Kernighan / Ritchie",
        "isbn": "9787111128069",
        "course_name": "程序设计基础",
        "category": "教材",
        "description": "英文原版影印，适合进阶练习。",
        "price": 25.0,
        "condition_level": "8成新",
        "pickup_location": "创新楼大厅",
        "status": BookStatus.SOLD,
        "created_at": make_time(25),
    },
    {
        "key": "python_basic",
        "seller_key": "zhang_shuming",
        "title": "Python 程序设计基础",
        "author": "董付国",
        "isbn": "9787302606086",
        "course_name": "Python 程序设计",
        "category": "教材",
        "description": "书内几乎没有笔记，适合零基础入门。",
        "price": 20.0,
        "condition_level": "9成新",
        "pickup_location": "主校区教学楼 A 座",
        "status": BookStatus.RESERVED,
        "created_at": make_time(14),
    },
    {
        "key": "discrete_math",
        "seller_key": "zhang_shuming",
        "title": "离散数学",
        "author": "屈婉玲",
        "isbn": "9787040462395",
        "course_name": "离散数学",
        "category": "教材",
        "description": "已经包书皮，附带往年作业答案。",
        "price": 16.0,
        "condition_level": "7成新",
        "pickup_location": "二号宿舍楼下",
        "status": BookStatus.OFFLINE,
        "created_at": make_time(20),
    },
    {
        "key": "linear_algebra",
        "seller_key": "li_yanqiu",
        "title": "线性代数辅导讲义",
        "author": "李永乐",
        "isbn": "9787569313383",
        "course_name": "线性代数",
        "category": "考研",
        "description": "刷题痕迹很少，适合期末复习和考研过渡。",
        "price": 15.5,
        "condition_level": "9成新",
        "pickup_location": "数学学院门口",
        "status": BookStatus.AVAILABLE,
        "created_at": make_time(13),
    },
    {
        "key": "probability",
        "seller_key": "li_yanqiu",
        "title": "概率论与数理统计",
        "author": "盛骤",
        "isbn": "9787040515565",
        "course_name": "概率论与数理统计",
        "category": "教材",
        "description": "重点题型都做了标记，适合考前冲刺。",
        "price": 19.0,
        "condition_level": "8成新",
        "pickup_location": "南门快递站旁",
        "status": BookStatus.RESERVED,
        "created_at": make_time(12),
    },
    {
        "key": "math_exam",
        "seller_key": "li_yanqiu",
        "title": "考研数学真题精讲",
        "author": "汤家凤",
        "isbn": "9787576406795",
        "course_name": None,
        "category": "考研",
        "description": "2020-2025 真题齐全，几乎全新。",
        "price": 28.0,
        "condition_level": "95新",
        "pickup_location": "研究生院门口",
        "status": BookStatus.AVAILABLE,
        "created_at": make_time(10),
    },
    {
        "key": "data_structure",
        "seller_key": "chen_zhiyuan",
        "title": "数据结构（C语言版）",
        "author": "严蔚敏",
        "isbn": "9787302147510",
        "course_name": "数据结构",
        "category": "教材",
        "description": "附带老师课堂补充题，适合计科专业。",
        "price": 23.0,
        "condition_level": "8成新",
        "pickup_location": "软件学院一楼",
        "status": BookStatus.RESERVED,
        "created_at": make_time(11),
    },
    {
        "key": "computer_network",
        "seller_key": "chen_zhiyuan",
        "title": "计算机网络：自顶向下方法",
        "author": "Kurose / Ross",
        "isbn": "9787111544937",
        "course_name": "计算机网络",
        "category": "教材",
        "description": "无明显折痕，带章节思维导图。",
        "price": 30.0,
        "condition_level": "9成新",
        "pickup_location": "东校区操场入口",
        "status": BookStatus.AVAILABLE,
        "created_at": make_time(9),
    },
    {
        "key": "os_intro",
        "seller_key": "chen_zhiyuan",
        "title": "操作系统导论",
        "author": "Remzi H. Arpaci-Dusseau",
        "isbn": "9787111625605",
        "course_name": "操作系统",
        "category": "教材",
        "description": "英文版，配套实验笔记另送。",
        "price": 27.0,
        "condition_level": "85新",
        "pickup_location": "软件学院机房门口",
        "status": BookStatus.AVAILABLE,
        "created_at": make_time(8),
    },
    {
        "key": "ancient_literature",
        "seller_key": "zhao_xinghe",
        "title": "中国古代文学史",
        "author": "袁行霈",
        "isbn": "9787040423983",
        "course_name": "中国古代文学",
        "category": "教材",
        "description": "文学院课堂笔记版，内容很全。",
        "price": 21.0,
        "condition_level": "8成新",
        "pickup_location": "文学院大楼门口",
        "status": BookStatus.AVAILABLE,
        "created_at": make_time(7),
    },
    {
        "key": "cet6_vocab",
        "seller_key": "zhao_xinghe",
        "title": "英语六级核心词汇",
        "author": "新东方考试研究中心",
        "isbn": "9787572243363",
        "course_name": None,
        "category": "英语",
        "description": "背过一轮，适合六级冲刺。",
        "price": 12.0,
        "condition_level": "8成新",
        "pickup_location": "外语角旁边",
        "status": BookStatus.AVAILABLE,
        "created_at": make_time(6),
    },
]


FAVORITE_SPECS = [
    ("wang_ruoxi", "linear_algebra", 5),
    ("wang_ruoxi", "computer_network", 4),
    ("zhao_xinghe", "math_exam", 3),
    ("zhou_kexin", "calculus", 2),
    ("zhou_kexin", "ancient_literature", 2),
]


CART_SPECS = [
    ("wang_ruoxi", "linear_algebra", 2),
    ("wang_ruoxi", "ancient_literature", 2),
    ("zhou_kexin", "math_exam", 1),
    ("zhou_kexin", "cet6_vocab", 1),
]


ORDER_SPECS = [
    {
        "buyer_key": "wang_ruoxi",
        "seller_key": "zhang_shuming",
        "book_keys": ["physics", "c_language"],
        "status": OrderStatus.COMPLETED,
        "pickup_location": "主图书馆服务台",
        "remark": "已线下面交并确认图书无误。",
        "created_at": make_time(5, 6),
        "updated_at": make_time(4, 18),
    },
    {
        "buyer_key": "zhao_xinghe",
        "seller_key": "zhang_shuming",
        "book_keys": ["python_basic"],
        "status": OrderStatus.PENDING_PAYMENT,
        "pickup_location": "主校区教学楼 A 座",
        "remark": "等晚自习后交易。",
        "created_at": make_time(3, 8),
        "updated_at": make_time(3, 8),
    },
    {
        "buyer_key": "wang_ruoxi",
        "seller_key": "li_yanqiu",
        "book_keys": ["probability"],
        "status": OrderStatus.PAID,
        "pickup_location": "数学学院门口",
        "remark": "买家已支付，等待卖家发货。",
        "created_at": make_time(2, 12),
        "updated_at": make_time(2, 10),
    },
    {
        "buyer_key": "zhou_kexin",
        "seller_key": "chen_zhiyuan",
        "book_keys": ["data_structure"],
        "status": OrderStatus.SHIPPED,
        "pickup_location": "软件学院一楼",
        "remark": "卖家已发货，等待买家确认收货。",
        "created_at": make_time(1, 20),
        "updated_at": make_time(1, 12),
    },
    {
        "buyer_key": "zhou_kexin",
        "seller_key": "chen_zhiyuan",
        "book_keys": ["os_intro"],
        "status": OrderStatus.CANCELLED,
        "pickup_location": "软件学院机房门口",
        "remark": "买家时间冲突，订单取消。",
        "created_at": make_time(1, 8),
        "updated_at": make_time(1, 6),
    },
]


REVIEW_SPECS = [
    {
        "order_index": 0,
        "rating": 5,
        "content": "卖家沟通很快，书和描述一致，还额外分享了期末重点，交易体验很好。",
        "created_at": make_time(4, 16),
    }
]


def recreate_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def ensure_database_is_empty() -> None:
    with SessionLocal() as db:
        user_count = db.scalar(select(func.count()).select_from(User)) or 0
        if user_count:
            raise SystemExit(
                "检测到数据库中已经存在数据。为了避免覆盖，请使用 --reset 后再执行种子脚本。"
            )


def create_users(db) -> dict[str, User]:
    users: dict[str, User] = {}
    for spec in USER_SPECS:
        user = User(
            student_id=spec["student_id"],
            name=spec["name"],
            campus=spec["campus"],
            major=spec["major"],
            phone=spec["phone"],
            password=hash_password(DEMO_PASSWORD),
            credit_score=spec["credit_score"],
            created_at=spec["created_at"],
        )
        db.add(user)
        db.flush()
        users[spec["key"]] = user
    return users


def create_books(db, users: dict[str, User]) -> dict[str, Book]:
    books: dict[str, Book] = {}
    for spec in BOOK_SPECS:
        created_at = spec["created_at"]
        book = Book(
            seller_id=users[spec["seller_key"]].id,
            title=spec["title"],
            author=spec["author"],
            isbn=spec["isbn"],
            course_name=spec["course_name"],
            category=spec["category"],
            description=spec["description"],
            price=spec["price"],
            condition_level=spec["condition_level"],
            cover_url=None,
            pickup_location=spec["pickup_location"],
            status=spec["status"],
            created_at=created_at,
            updated_at=created_at + timedelta(hours=2),
        )
        db.add(book)
        db.flush()
        books[spec["key"]] = book
    return books


def create_favorites(db, users: dict[str, User], books: dict[str, Book]) -> None:
    for user_key, book_key, days_ago in FAVORITE_SPECS:
        db.add(
            Favorite(
                user_id=users[user_key].id,
                book_id=books[book_key].id,
                created_at=make_time(days_ago),
            )
        )


def create_cart_items(db, users: dict[str, User], books: dict[str, Book]) -> None:
    for user_key, book_key, days_ago in CART_SPECS:
        db.add(
            CartItem(
                user_id=users[user_key].id,
                book_id=books[book_key].id,
                created_at=make_time(days_ago),
            )
        )


def apply_book_status_for_order(order_status: OrderStatus, book: Book) -> None:
    if order_status == OrderStatus.COMPLETED:
        book.status = BookStatus.SOLD
    elif order_status in {
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAID,
        OrderStatus.SHIPPED,
    }:
        book.status = BookStatus.RESERVED
    elif order_status == OrderStatus.CANCELLED:
        book.status = BookStatus.AVAILABLE


def create_orders(db, users: dict[str, User], books: dict[str, Book]) -> list[Order]:
    orders: list[Order] = []
    for spec in ORDER_SPECS:
        order_books = [books[book_key] for book_key in spec["book_keys"]]
        total_amount = sum(book.price for book in order_books)
        order = Order(
            buyer_id=users[spec["buyer_key"]].id,
            seller_id=users[spec["seller_key"]].id,
            total_amount=total_amount,
            status=spec["status"],
            pickup_location=spec["pickup_location"],
            remark=spec["remark"],
            created_at=spec["created_at"],
            updated_at=spec["updated_at"],
        )
        db.add(order)
        db.flush()

        for book in order_books:
            apply_book_status_for_order(spec["status"], book)
            db.add(
                OrderItem(
                    order_id=order.id,
                    book_id=book.id,
                    title_snapshot=book.title,
                    price_snapshot=book.price,
                    quantity=1,
                )
            )

        orders.append(order)
    return orders


def create_reviews(db, orders: list[Order]) -> None:
    for spec in REVIEW_SPECS:
        order = orders[spec["order_index"]]
        db.flush()
        db.add(
            Review(
                order_id=order.id,
                book_id=order.items[0].book_id,
                buyer_id=order.buyer_id,
                seller_id=order.seller_id,
                rating=spec["rating"],
                content=spec["content"],
                created_at=spec["created_at"],
            )
        )


def print_summary(db) -> None:
    user_count = db.scalar(select(func.count()).select_from(User)) or 0
    book_count = db.scalar(select(func.count()).select_from(Book)) or 0
    order_count = db.scalar(select(func.count()).select_from(Order)) or 0
    review_count = db.scalar(select(func.count()).select_from(Review)) or 0

    print("初始化测试数据完成。")
    print(f"DATABASE_URL: {DATABASE_URL}")
    print(f"学生用户: {user_count}")
    print(f"图书记录: {book_count}")
    print(f"订单记录: {order_count}")
    print(f"评价记录: {review_count}")
    print()
    print("推荐登录账号（统一密码 123456）:")
    for spec in USER_SPECS:
        print(f"- {spec['name']} / 学号 {spec['student_id']} / {spec['major']}")
    print()
    print("推荐演示路径:")
    print("- 王若溪(20260003) 查看收藏、购物车、买家订单和已完成评价。")
    print("- 张书铭(20260001) 查看已发布图书、卖家订单和已售图书。")
    print("- 周可欣(20260006) 查看待收货订单与批量下单候选购物车。")


def seed() -> None:
    with SessionLocal() as db:
        users = create_users(db)
        books = create_books(db, users)
        create_favorites(db, users, books)
        create_cart_items(db, users, books)
        orders = create_orders(db, users, books)
        db.flush()
        create_reviews(db, orders)
        db.commit()
        print_summary(db)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="初始化校园二手书项目测试数据。")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="清空现有数据库后重新写入完整测试数据。",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    Base.metadata.create_all(bind=engine)

    if args.reset:
        recreate_database()
    else:
        ensure_database_is_empty()

    seed()


if __name__ == "__main__":
    main()
