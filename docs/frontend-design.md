# 校园二手书前端设计方案

## 1. 目标

基于当前 FastAPI 后端，为校园二手书项目设计一个独立前端项目，满足以下目标：

- 对接现有全部 API。
- 尽量做到“一个接口一个页面”，便于课程演示和接口联调。
- 同时保留真实业务操作的流畅性，避免页面完全碎片化后无法使用。
- 先完成设计，再进入前端初始化与页面开发。

## 2. 后端现状总结

当前后端是一个完整的校园二手书交易闭环，核心模块包括：

- 用户：注册、登录、查看当前用户、查看指定用户资料
- 图书：发布、修改、下架、重新上架、搜索、查看我的图书、查看图书详情
- 收藏：收藏、查看我的收藏、取消收藏
- 购物车：加入购物车、查看购物车、移出购物车
- 订单：直接下单、购物车批量下单、查看我的订单、支付、发货、确认收货、取消
- 评价：提交评价、查看卖家评价

认证方式不是 JWT，而是：

- 登录后拿到 `user_id`
- 前端将 `user_id` 持久化到本地
- 后续请求统一在 Header 中带上 `X-User-Id`

这意味着前端需要优先设计好“简化登录态”。

## 3. 前端项目建议

建议采用：

- `React 18 + TypeScript`
- `Vite`
- `React Router`
- `TanStack Query`
- `Axios`
- `Ant Design` 或 `Arco Design`

本项目更偏“教学演示 + 表单联调”，所以不建议一开始上太重的状态管理。推荐：

- 服务端数据：`TanStack Query`
- 登录态和当前用户：轻量 `Context` 或 `Zustand`
- 表单：使用 UI 组件库自带表单

## 4. 视觉方向

建议前端视觉风格走“校园旧书交易站”路线，而不是纯后台管理台：

- 主色：书页米白 + 墨绿 + 暖橙点缀
- 背景：轻纹理纸张感，弱化纯白空页面
- 卡片：像公告栏和二手书卡片，突出封面、价格、成色、取书地点
- 字体：标题偏有识别度，正文保持清晰易读
- 首页强调“买书 / 卖书 / 订单流转”三个入口

这样既适合课程展示，也更像一个真实学生产品。

## 5. 信息架构

建议分成 4 个一级区域：

- 首页与身份区
- 图书交易区
- 我的资产区
- 订单与评价区

推荐导航：

- 首页
- 图书广场
- 发布图书
- 我的图书
- 我的收藏
- 我的购物车
- 我的订单
- 我的资料

## 6. 路由设计

下面按照“尽量一个接口一个页面”的原则设计。对于动作型接口，采用“确认页”或“操作页”承接，而不是只放一个按钮。

### 6.1 通用与用户模块

| 页面路由 | 对应接口 | 页面用途 |
| --- | --- | --- |
| `/` | `GET /` | 首页，展示项目简介、模块导航、演示账号入口 |
| `/register` | `POST /users/register` | 学生注册页 |
| `/login` | `POST /users/login` | 登录页，登录后保存 `user_id` |
| `/me` | `GET /users/me` | 当前用户资料页 |
| `/users/:userId` | `GET /users/{user_id}` | 指定学生资料页，通常从图书详情、卖家评价页跳转 |

### 6.2 图书模块

| 页面路由 | 对应接口 | 页面用途 |
| --- | --- | --- |
| `/books` | `GET /books` | 图书广场 / 搜索页 |
| `/books/new` | `POST /books` | 发布图书页 |
| `/books/:bookId` | `GET /books/{book_id}` | 图书详情页 |
| `/books/:bookId/edit` | `PUT /books/{book_id}` | 编辑图书页 |
| `/books/mine` | `GET /books/mine/items` | 我的发布页 |
| `/books/:bookId/offline` | `POST /books/{book_id}/offline` | 下架确认页 |
| `/books/:bookId/republish` | `POST /books/{book_id}/republish` | 重新上架确认页 |

### 6.3 收藏模块

| 页面路由 | 对应接口 | 页面用途 |
| --- | --- | --- |
| `/favorites` | `GET /favorites/me` | 我的收藏页 |
| `/favorites/:bookId/add` | `POST /favorites/{book_id}` | 收藏确认页，可从图书详情跳转 |
| `/favorites/:bookId/remove` | `DELETE /favorites/{book_id}` | 取消收藏确认页 |

### 6.4 购物车模块

| 页面路由 | 对应接口 | 页面用途 |
| --- | --- | --- |
| `/cart` | `GET /cart/items` | 购物车页 |
| `/cart/add/:bookId` | `POST /cart/items` | 加入购物车确认页 |
| `/cart/remove/:bookId` | `DELETE /cart/items/{book_id}` | 移出购物车确认页 |

### 6.5 订单模块

| 页面路由 | 对应接口 | 页面用途 |
| --- | --- | --- |
| `/orders` | `GET /orders/me` | 我的订单页，支持 `all / buyer / seller` 筛选 |
| `/orders/direct/:bookId` | `POST /orders/direct` | 直接下单页 |
| `/orders/from-cart` | `POST /orders/from-cart` | 从购物车批量下单页 |
| `/orders/:orderId/pay` | `POST /orders/{order_id}/pay` | 支付确认页 |
| `/orders/:orderId/ship` | `POST /orders/{order_id}/ship` | 卖家发货确认页 |
| `/orders/:orderId/confirm-receipt` | `POST /orders/{order_id}/confirm-receipt` | 买家确认收货页 |
| `/orders/:orderId/cancel` | `POST /orders/{order_id}/cancel` | 订单取消确认页 |

### 6.6 评价模块

| 页面路由 | 对应接口 | 页面用途 |
| --- | --- | --- |
| `/reviews/new/:orderId` | `POST /reviews` | 提交评价页 |
| `/reviews/seller/:sellerId` | `GET /reviews/seller/{seller_id}` | 卖家评价列表页 |

## 7. 页面组织原则

虽然按接口拆页面，但仍建议保留几个“主操作中心”页面，避免用户迷路：

- 图书广场页是所有买家操作入口
- 图书详情页承接收藏、加购物车、直接下单
- 我的图书页承接编辑、下架、重新上架
- 我的订单页承接支付、发货、确认收货、取消、评价

也就是说：

- 主页面负责浏览与跳转
- 操作页面负责确认与提交

这样既满足“一个接口一个页面”，也不会把所有动作都塞到弹窗里。

## 8. 关键页面设计

### 8.1 首页 `/`

模块：

- 项目简介卡片
- 演示账号快捷登录卡片
- 三个快捷入口：去买书、去卖书、看订单
- API 联调状态提示

特别建议：

- 首页直接展示 README 里的推荐账号
- 点击演示账号可一键填充登录表单

### 8.2 登录页 `/login`

字段：

- 学号
- 密码

交互：

- 登录成功后存储 `user_id`
- 立即拉取 `/users/me`
- 顶部全局显示当前登录用户名称、学号

本地存储建议：

- `book-campus-user-id`
- `book-campus-user-profile`

### 8.3 图书广场 `/books`

筛选项：

- 关键词 `q`
- 分类 `category`
- 课程名 `course_name`
- 最低价 `min_price`
- 最高价 `max_price`
- 状态 `status`

展示形式：

- 卡片网格
- 每张卡展示标题、作者、课程、分类、价格、成色、地点、状态

卡片操作：

- 查看详情
- 收藏
- 加入购物车
- 直接下单

### 8.4 图书详情 `/books/:bookId`

信息区：

- 图书完整信息
- 卖家资料入口
- 卖家评价入口

操作区根据身份与状态动态显示：

- 当前用户是卖家：编辑 / 下架 / 重新上架
- 当前用户是买家且图书可购买：收藏 / 加购物车 / 直接下单
- 已售或已预定：展示不可操作原因

### 8.5 我的订单 `/orders`

这个页面是整个业务闭环的核心页。

推荐设计：

- 顶部切换：全部订单 / 我买到的 / 我卖出的
- 订单卡片展示状态流转
- 每个订单按权限显示操作按钮

按钮规则：

- 买家 + `pending_payment`：支付 / 取消
- 卖家 + `paid`：发货 / 取消
- 买家 + `shipped`：确认收货
- 买家 + `completed`：去评价

## 9. 全局状态设计

建议只保留以下全局状态：

- `auth.userId`
- `auth.userProfile`
- `app.apiBaseUrl`

其余全部交给接口查询缓存。

推荐 Query Key：

- `['me']`
- `['books', filters]`
- `['book', bookId]`
- `['my-books']`
- `['favorites']`
- `['cart']`
- `['orders', role]`
- `['seller-reviews', sellerId]`

## 10. API 封装设计

建议目录：

```text
src/
  api/
    client.ts
    users.ts
    books.ts
    favorites.ts
    cart.ts
    orders.ts
    reviews.ts
```

约定：

- `client.ts` 统一注入 `baseURL`
- 请求拦截器自动带 `X-User-Id`
- 响应错误统一提取 `detail`
- 所有模块按后端 schema 写类型定义

## 11. 组件拆分建议

建议先做这些基础组件：

- `AppShell`：整体布局、导航栏、登录信息
- `PageHeader`：标题、说明、返回按钮
- `BookCard`：图书卡片
- `BookStatusTag`：图书状态标签
- `OrderStatusTag`：订单状态标签
- `UserSummaryCard`：用户摘要卡
- `EmptyState`：空状态
- `ActionConfirmPanel`：动作确认面板

## 12. 前端目录设计

```text
frontend/
  src/
    api/
    app/
    components/
    features/
      auth/
      users/
      books/
      favorites/
      cart/
      orders/
      reviews/
    pages/
      home/
      users/
      books/
      favorites/
      cart/
      orders/
      reviews/
    router/
    styles/
    utils/
```

说明：

- `api` 放接口请求
- `features` 放业务 hooks、类型、状态
- `pages` 放真正的路由页面
- `components` 放跨模块通用组件

## 13. 实施顺序建议

建议按以下顺序开发，边做边联调：

1. 初始化前端项目和路由框架
2. 完成 API Client、登录态、全局布局
3. 完成登录页、当前用户页
4. 完成图书广场、图书详情、发布图书、我的图书
5. 完成收藏和购物车
6. 完成直接下单、购物车下单、我的订单
7. 完成支付、发货、确认收货、取消订单
8. 完成评价相关页面
9. 完成首页视觉和演示账号快捷入口

## 14. 需要特别注意的后端约束

- 登录不是 token，而是 `X-User-Id`
- `GET /books` 默认只查 `available`
- 图书一旦进入订单，会变成 `reserved`
- 确认收货后图书变成 `sold`
- 取消订单会把 `reserved` 图书恢复成 `available`
- 买家才能支付、确认收货、评价
- 卖家才能发货
- 只有自己发布的图书才能编辑、下架、重新上架

这些规则必须映射到前端按钮显隐和禁用逻辑中。

## 15. 下一步建议

如果按这个设计继续实现，下一步我建议直接开始搭前端项目骨架，优先完成：

- `frontend` 工程初始化
- 路由与布局
- API 模块
- 登录页
- 图书广场页

这样很快就能进入真实联调状态。
