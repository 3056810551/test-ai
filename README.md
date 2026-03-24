# 校园二手书 API 后台

这是一个基于 Python + FastAPI + SQLite 的校园二手书交易后台示例，满足“至少 5 个模块且业务闭环”的要求。

## 已实现模块

1. 学生用户模块：注册、登录、个人资料查看。
2. 二手书发布模块：发布、编辑、下架、重新上架。
3. 二手书搜索模块：按关键词、课程、分类、价格、状态筛选。
4. 收藏模块：收藏图书、查看收藏、取消收藏。
5. 购物车模块：加入购物车、查看购物车、移出购物车。
6. 订单交易模块：直接下单、购物车批量下单、支付、发货、确认收货、取消订单。
7. 评价模块：订单完成后买家评价卖家。

## 业务闭环

1. 学生注册并登录。
2. 卖家发布二手书。
3. 买家搜索图书，可先收藏或加入购物车。
4. 买家直接下单或从购物车批量下单。
5. 买家支付订单，卖家发货。
6. 买家确认收货，图书状态变为已售。
7. 买家对已完成订单进行评价。

## 技术方案

- Web 框架：FastAPI
- 数据库：SQLite
- ORM：SQLAlchemy 2.x
- API 文档：Swagger UI (`/docs`)
- 前端：原生 `HTML + CSS + JavaScript`，样式使用 `Tailwind CSS CDN`

## 运行方式

```bash
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

如果你本机同时装了多个 Python，建议直接使用虚拟环境解释器启动，避免把依赖装到别的环境里：

```bash
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

启动后除了 Swagger 文档，也可以直接打开前端页面：

```text
http://127.0.0.1:8000/app/
```

说明：

- 前端静态页面已经挂载到 FastAPI 内，不需要额外起前端服务
- 前端通过同域方式直接调用后端 API，因此不需要单独处理跨域
- 当前 Tailwind 使用 CDN 方式加载，适合课程演示和快速联调

说明：本项目使用的是 Python 内置的 SQLite 驱动配合 SQLAlchemy 访问 `SQLite` 数据库，因此即使你系统里有单独的 `sqlite3.exe`，也不需要额外改配置。

如果需要切换到别的数据库文件进行测试，可以通过环境变量覆盖默认数据库地址：

```bash
set DATABASE_URL=sqlite:///./demo_seed.db
```

## 初始化测试数据

项目附带了一份完整种子数据脚本，覆盖学生账号、图书、收藏、购物车、订单与评价，方便直接演示完整业务闭环。

安全初始化（数据库必须为空）：

```bash
.venv\Scripts\python.exe scripts\seed_data.py
```

重置并重新生成演示数据：

```bash
.venv\Scripts\python.exe scripts\seed_data.py --reset
```

默认演示账号统一密码为：

```text
123456
```

推荐账号：

- 张书铭：`20260001`，适合演示卖家视角
- 王若溪：`20260003`，适合演示买家视角、收藏、购物车与评价
- 周可欣：`20260006`，适合演示待收货订单和批量下单

## 认证说明

为了让教学示例更聚焦业务流程，本项目采用简化认证：

1. 先调用 `POST /users/login`
2. 拿到返回的 `user_id`
3. 后续需要登录态的接口，在 Header 中传 `X-User-Id`

示例：

```http
X-User-Id: 1
```

## 关键接口示例

### 注册学生

`POST /users/register`

```json
{
  "student_id": "20260001",
  "name": "张三",
  "campus": "主校区",
  "major": "计算机科学与技术",
  "phone": "13800000001",
  "password": "123456"
}
```

### 发布二手书

`POST /books`

```json
{
  "title": "高等数学",
  "author": "同济大学数学系",
  "isbn": "9787040396638",
  "course_name": "高等数学A",
  "category": "教材",
  "description": "九成新，几乎无笔记",
  "price": 18.5,
  "condition_level": "9成新",
  "cover_url": null,
  "pickup_location": "一食堂门口"
}
```

### 搜索图书

`GET /books?q=高数&category=教材`

### 从购物车下单

`POST /orders/from-cart`

```json
{
  "pickup_location": "图书馆门口",
  "remark": "晚上 7 点后可交易",
  "selected_book_ids": [1]
}
```
