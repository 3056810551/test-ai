import { api } from "./api.js";
import { authStore } from "./store.js";

const appRoot = document.querySelector("#app");
const headerTitle = document.querySelector("#header-title");
const headerSubtitle = document.querySelector("#header-subtitle");
const authStatus = document.querySelector("#auth-status");
const apiStatus = document.querySelector("#api-status");
const authEntryLink = document.querySelector("#auth-entry-link");
const logoutButton = document.querySelector("#logout-btn");
const toastElement = document.querySelector("#toast");
const navContainer = document.querySelector("#main-nav");

const DEMO_ACCOUNTS = [
  { name: "张书铭", studentId: "20260001", role: "卖家视角", password: "123456" },
  { name: "王若溪", studentId: "20260003", role: "买家视角", password: "123456" },
  { name: "周可欣", studentId: "20260006", role: "待收货与批量下单", password: "123456" },
];

const BOOK_STATUS_META = {
  available: { label: "在售", className: "bg-emerald-100 text-emerald-700" },
  reserved: { label: "已预定", className: "bg-amber-100 text-amber-700" },
  sold: { label: "已售出", className: "bg-stone-200 text-stone-700" },
  offline: { label: "已下架", className: "bg-rose-100 text-rose-700" },
};

const ORDER_STATUS_META = {
  pending_payment: { label: "待支付", className: "bg-amber-100 text-amber-700" },
  paid: { label: "已支付", className: "bg-sky-100 text-sky-700" },
  shipped: { label: "已发货", className: "bg-violet-100 text-violet-700" },
  completed: { label: "已完成", className: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "已取消", className: "bg-stone-200 text-stone-700" },
};

const routes = [
  createRoute("/", renderHomePage),
  createRoute("/login", renderLoginPage),
  createRoute("/register", renderRegisterPage),
  createRoute("/me", renderMyProfilePage),
  createRoute("/users/:userId", renderUserDetailPage),
  createRoute("/books", renderBooksPage),
  createRoute("/books/new", renderBookCreatePage),
  createRoute("/books/mine", renderMyBooksPage),
  createRoute("/books/:bookId/edit", renderBookEditPage),
  createRoute("/books/:bookId/offline", (ctx) =>
    renderBookActionPage({
      ...ctx,
      title: "下架图书",
      description: "确认后，这本书会从公开购买列表中移除，直到你重新上架。",
      actionLabel: "确认下架",
      successRedirect: "/books/mine",
      action: (bookId) => api.offlineBook(bookId),
    }),
  ),
  createRoute("/books/:bookId/republish", (ctx) =>
    renderBookActionPage({
      ...ctx,
      title: "重新上架图书",
      description: "确认后，这本书会回到图书广场，可以再次被收藏、加入购物车和下单。",
      actionLabel: "确认上架",
      successRedirect: "/books/mine",
      action: (bookId) => api.republishBook(bookId),
    }),
  ),
  createRoute("/books/:bookId", renderBookDetailPage),
  createRoute("/favorites", renderFavoritesPage),
  createRoute("/favorites/:bookId/add", (ctx) =>
    renderBookActionPage({
      ...ctx,
      title: "收藏图书",
      description: "这会把图书保存到“我的收藏”，方便你之后继续比较和下单。",
      actionLabel: "确认收藏",
      successRedirect: "/favorites",
      action: (bookId) => api.addFavorite(bookId),
    }),
  ),
  createRoute("/favorites/:bookId/remove", (ctx) =>
    renderBookActionPage({
      ...ctx,
      title: "取消收藏",
      description: "确认后，这本书将从你的收藏列表中移除。",
      actionLabel: "确认取消收藏",
      successRedirect: "/favorites",
      action: (bookId) => api.removeFavorite(bookId),
    }),
  ),
  createRoute("/cart", renderCartPage),
  createRoute("/cart/add/:bookId", (ctx) =>
    renderBookActionPage({
      ...ctx,
      title: "加入购物车",
      description: "这本书会进入你的购物车，之后可以和其他书一起批量下单。",
      actionLabel: "确认加入购物车",
      successRedirect: "/cart",
      action: (bookId) => api.addToCart(bookId),
    }),
  ),
  createRoute("/cart/remove/:bookId", (ctx) =>
    renderBookActionPage({
      ...ctx,
      title: "移出购物车",
      description: "确认后，这本书会从购物车中移除，但仍可在图书广场中继续浏览。",
      actionLabel: "确认移出",
      successRedirect: "/cart",
      action: (bookId) => api.removeCartItem(bookId),
    }),
  ),
  createRoute("/orders", renderOrdersPage),
  createRoute("/orders/direct/:bookId", renderDirectOrderPage),
  createRoute("/orders/from-cart", renderOrderFromCartPage),
  createRoute("/orders/:orderId/pay", (ctx) =>
    renderOrderActionPage({
      ...ctx,
      title: "支付订单",
      description: "确认支付后，订单会进入“已支付”状态，等待卖家发货。",
      actionLabel: "确认支付",
      successRedirect: "/orders?role=buyer",
      action: (orderId) => api.payOrder(orderId),
    }),
  ),
  createRoute("/orders/:orderId/ship", (ctx) =>
    renderOrderActionPage({
      ...ctx,
      title: "卖家发货",
      description: "确认发货后，订单会进入“已发货”状态，等待买家确认收货。",
      actionLabel: "确认发货",
      successRedirect: "/orders?role=seller",
      action: (orderId) => api.shipOrder(orderId),
    }),
  ),
  createRoute("/orders/:orderId/confirm-receipt", (ctx) =>
    renderOrderActionPage({
      ...ctx,
      title: "确认收货",
      description: "确认收货后，订单会完成，图书状态也会更新为“已售出”。",
      actionLabel: "确认收货",
      successRedirect: "/orders?role=buyer",
      action: (orderId) => api.confirmReceipt(orderId),
    }),
  ),
  createRoute("/orders/:orderId/cancel", (ctx) =>
    renderOrderActionPage({
      ...ctx,
      title: "取消订单",
      description: "取消后，若图书此前处于预定状态，会恢复为可购买。",
      actionLabel: "确认取消订单",
      successRedirect: "/orders",
      action: (orderId) => api.cancelOrder(orderId),
    }),
  ),
  createRoute("/reviews/new/:orderId", renderReviewCreatePage),
  createRoute("/reviews/seller/:sellerId", renderSellerReviewsPage),
];

let renderVersion = 0;

boot();

async function boot() {
  apiStatus.textContent = `API Base: ${api.baseUrl}`;
  logoutButton.addEventListener("click", () => {
    authStore.clear();
    toast("已退出当前账号。");
    updateAuthUi();
    navigate("/login");
  });
  window.addEventListener("hashchange", renderCurrentRoute);
  await restoreSession();
  if (!window.location.hash) {
    navigate("/");
    return;
  }
  await renderCurrentRoute();
}

async function restoreSession() {
  const userId = authStore.getUserId();
  if (!userId) {
    updateAuthUi();
    return;
  }

  try {
    const profile = await api.me();
    authStore.setSession({ userId, profile });
  } catch {
    authStore.clear();
    toast("本地登录态已失效，请重新登录。", "error");
  }
  updateAuthUi();
}

function createRoute(pattern, handler) {
  return { pattern, handler };
}

function normalizePath(path) {
  if (!path || path === "#") {
    return "/";
  }
  let normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function getRouteState() {
  const rawHash = window.location.hash.replace(/^#/, "") || "/";
  const [pathPart, queryPart = ""] = rawHash.split("?");
  return {
    path: normalizePath(pathPart),
    query: new URLSearchParams(queryPart),
  };
}

function matchRoute(pathname) {
  const pathSegments = pathname.split("/").filter(Boolean);

  for (const route of routes) {
    const patternSegments = route.pattern.split("/").filter(Boolean);
    if (pathSegments.length !== patternSegments.length) {
      continue;
    }

    const params = {};
    let matched = true;
    for (let index = 0; index < patternSegments.length; index += 1) {
      const currentPattern = patternSegments[index];
      const currentValue = pathSegments[index];
      if (currentPattern.startsWith(":")) {
        params[currentPattern.slice(1)] = decodeURIComponent(currentValue);
        continue;
      }
      if (currentPattern !== currentValue) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { route, params };
    }
  }

  return null;
}

async function renderCurrentRoute() {
  const currentVersion = ++renderVersion;
  const { path, query } = getRouteState();
  const matched = matchRoute(path);

  updateNav(path);
  appRoot.innerHTML = loadingView();

  try {
    const view = matched
      ? await matched.route.handler({ params: matched.params, query, path })
      : renderNotFoundPage();

    if (currentVersion !== renderVersion) {
      return;
    }

    if (typeof view === "string") {
      appRoot.innerHTML = view;
    } else {
      appRoot.innerHTML = view.html;
      if (typeof view.onMount === "function") {
        view.onMount();
      }
    }
  } catch (error) {
    if (currentVersion !== renderVersion) {
      return;
    }
    appRoot.innerHTML = renderErrorPage(error);
  }

  updateAuthUi();
}

function setHeader(title, subtitle) {
  headerTitle.textContent = title;
  headerSubtitle.textContent = subtitle;
}

function updateAuthUi() {
  const profile = authStore.getProfile();
  if (profile) {
    authStatus.innerHTML = `${escapeHtml(profile.name)} <span class="text-paper/70">(${escapeHtml(
      profile.student_id,
    )})</span>`;
    authEntryLink.textContent = "查看我的资料";
    authEntryLink.setAttribute("href", "#/me");
    logoutButton.classList.remove("hidden");
  } else {
    authStatus.textContent = "未登录";
    authEntryLink.textContent = "去登录";
    authEntryLink.setAttribute("href", "#/login");
    logoutButton.classList.add("hidden");
  }
}

function updateNav(path) {
  const links = navContainer.querySelectorAll("a");
  links.forEach((link) => {
    link.classList.remove("nav-link-active");
    const target = link.getAttribute("href")?.replace(/^#/, "") || "/";
    const normalizedTarget = normalizePath(target);
    const shouldActivate =
      normalizedTarget === "/"
        ? path === "/"
        : path === normalizedTarget || path.startsWith(`${normalizedTarget}/`);
    if (shouldActivate) {
      link.classList.add("nav-link-active");
    }
  });
}

function navigate(path) {
  const finalPath = path.startsWith("#") ? path : `#${path}`;
  window.location.hash = finalPath;
}

function toast(message, type = "success") {
  if (!toastElement) {
    return;
  }

  toastElement.textContent = message;
  toastElement.className =
    "pointer-events-none fixed right-4 top-4 z-50 max-w-sm rounded-2xl border px-4 py-3 text-sm shadow-card";
  toastElement.classList.remove("hidden");

  if (type === "error") {
    toastElement.classList.add("border-rose-200", "bg-rose-50", "text-rose-700");
  } else {
    toastElement.classList.add("border-emerald-200", "bg-white", "text-pine");
  }

  window.clearTimeout(toastElement.hideTimer);
  toastElement.hideTimer = window.setTimeout(() => {
    toastElement.classList.add("hidden");
  }, 2600);
}

function loadingView() {
  return pageShell({
    eyebrow: "加载中",
    title: "正在整理页面内容",
    description: "稍等一下，正在和后端接口同步数据。",
    content: `
      <div class="paper-card fade-in p-8">
        <div class="grid gap-4 md:grid-cols-3">
          ${Array.from({ length: 3 })
            .map(
              () => `
                <div class="h-36 rounded-[24px] bg-gradient-to-br from-white to-mist/80 animate-pulse"></div>
              `,
            )
            .join("")}
        </div>
      </div>
    `,
  });
}

function renderNotFoundPage() {
  setHeader("页面未找到", "这个路由还没有对应页面，或者地址写错了。");
  return pageShell({
    eyebrow: "404",
    title: "这页暂时不在公告栏上",
    description: "你可以从首页、图书广场或我的订单重新进入。",
    content: `
      <div class="paper-card p-8 text-center">
        <p class="text-sm text-ink/70">当前地址没有匹配到前端路由。</p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          ${linkButton("回到首页", "#/")}
          ${linkButton("去图书广场", "#/books", "primary")}
        </div>
      </div>
    `,
  });
}

function renderErrorPage(error) {
  setHeader("页面加载失败", "接口请求出了点状况，但我们还在同一个上下文里。");
  return pageShell({
    eyebrow: "接口异常",
    title: "这一步没有顺利跑通",
    description: error.message || "未知错误",
    content: `
      <div class="paper-card p-8">
        <p class="text-sm leading-7 text-ink/75">
          这通常是因为当前账号没有权限、请求头缺少 <code class="rounded bg-black/5 px-1 py-0.5">X-User-Id</code>，
          或者该资源已经不存在。
        </p>
        <div class="mt-6 flex flex-wrap gap-3">
          ${linkButton("去登录", "#/login")}
          ${linkButton("打开 Swagger", "/docs", "primary", true)}
        </div>
      </div>
    `,
  });
}

function renderAuthRequiredPage(title, description) {
  setHeader(title, description);
  return pageShell({
    eyebrow: "需要登录",
    title,
    description,
    content: `
      <div class="paper-card p-8">
        <p class="text-sm leading-7 text-ink/75">
          当前页面会调用需要登录态的接口。你可以先登录演示账号，再回来继续操作。
        </p>
        <div class="mt-6 flex flex-wrap gap-3">
          ${linkButton("前往登录", "#/login", "primary")}
          ${linkButton("回到首页", "#/")}
        </div>
      </div>
    `,
  });
}

async function renderHomePage() {
  setHeader("校园旧书交易站", "一个贴近后端业务闭环的纯静态前端，直接挂载在 FastAPI 项目里。");
  const overview = await api.overview();
  const profile = authStore.getProfile();

  return pageShell({
    eyebrow: "首页",
    title: "像公告栏一样打开，像业务系统一样跑通",
    description: "当前前端按“尽量一个接口一个页面”的原则组织，同时保留真实交易流程的入口。",
    content: `
      <div class="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <section class="paper-card overflow-hidden">
          <div class="dot-grid bg-pine px-8 py-8 text-paper">
            <p class="text-xs uppercase tracking-[0.3em] text-paper/70">Front + API</p>
            <h2 class="mt-3 font-display text-4xl leading-tight">
              从登录、发布、下单到评价，这套前端已经按后端闭环来排版。
            </h2>
            <p class="mt-4 max-w-2xl text-sm leading-7 text-paper/82">
              你可以直接从这里进入图书广场、发布页或订单页。前端会在同域下调用现有 FastAPI 接口，
              不需要单独配跨域。
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              ${linkButton("进入图书广场", "#/books", "primary")}
              ${linkButton(profile ? "查看我的订单" : "先去登录", profile ? "#/orders" : "#/login")}
            </div>
          </div>
          <div class="grid gap-4 px-8 py-8 md:grid-cols-3">
            ${overview.modules
              .map(
                (item) => `
                  <div class="rounded-[24px] border border-black/5 bg-white/75 p-5">
                    <p class="text-sm font-medium text-pine">${escapeHtml(item)}</p>
                    <p class="mt-2 text-xs leading-6 text-ink/65">对应页面已在侧边导航或业务流入口中提供。</p>
                  </div>
                `,
              )
              .join("")}
          </div>
        </section>

        <section class="space-y-6">
          <div class="paper-card p-6">
            <p class="text-xs uppercase tracking-[0.25em] text-ink/45">演示账号</p>
            <div class="mt-4 space-y-3">
              ${DEMO_ACCOUNTS.map(
                (account) => `
                  <a
                    href="#/login?student_id=${encodeURIComponent(account.studentId)}&password=${encodeURIComponent(
                      account.password,
                    )}"
                    class="block rounded-[22px] border border-black/5 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:shadow-card"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <p class="font-medium text-pine">${escapeHtml(account.name)}</p>
                        <p class="mt-1 text-xs text-ink/60">${escapeHtml(account.role)}</p>
                      </div>
                      <div class="text-right text-xs text-ink/55">
                        <p>${escapeHtml(account.studentId)}</p>
                        <p>密码 123456</p>
                      </div>
                    </div>
                  </a>
                `,
              ).join("")}
            </div>
          </div>

          <div class="paper-card p-6">
            <p class="text-xs uppercase tracking-[0.25em] text-ink/45">快速入口</p>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              ${quickEntry("发布一本旧书", "#/books/new")}
              ${quickEntry("查看我的图书", "#/books/mine")}
              ${quickEntry("打开购物车", "#/cart")}
              ${quickEntry("查看卖家评价", "#/reviews/seller/1")}
            </div>
          </div>
        </section>
      </div>
    `,
  });
}

async function renderLoginPage({ query }) {
  setHeader("登录", "后端采用简化登录态：登录后保存 user_id，后续请求头自动携带 X-User-Id。");
  const defaultStudentId = query.get("student_id") || "";
  const defaultPassword = query.get("password") || "";

  return {
    html: pageShell({
      eyebrow: "用户模块",
      title: "登录一个学生账号",
      description: "适合演示业务流：先登录，再进入图书、购物车、订单和评价模块。",
      content: `
        <div class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section class="paper-card p-8">
            <form id="login-form" class="space-y-5">
              ${fieldInput("学号", "student_id", defaultStudentId, { required: true, placeholder: "例如 20260003" })}
              ${fieldInput("密码", "password", defaultPassword, { required: true, type: "password", placeholder: "至少 6 位" })}
              <button class="${buttonClass("primary")} w-full justify-center" type="submit">登录并同步资料</button>
            </form>
            <p class="mt-4 text-xs leading-6 text-ink/60">
              登录成功后，前端会自动请求 <code class="rounded bg-black/5 px-1 py-0.5">GET /users/me</code>
              并将当前账号信息缓存在本地。
            </p>
          </section>

          <section class="paper-card p-8">
            <p class="text-xs uppercase tracking-[0.25em] text-ink/45">推荐演示路径</p>
            <div class="mt-5 space-y-3">
              ${DEMO_ACCOUNTS.map(
                (account) => `
                  <button
                    class="demo-fill-btn flex w-full items-center justify-between rounded-[24px] border border-black/5 bg-white/80 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card"
                    type="button"
                    data-student-id="${escapeHtml(account.studentId)}"
                    data-password="${escapeHtml(account.password)}"
                  >
                    <span>
                      <span class="block font-medium text-pine">${escapeHtml(account.name)}</span>
                      <span class="mt-1 block text-xs text-ink/60">${escapeHtml(account.role)}</span>
                    </span>
                    <span class="text-xs text-ink/55">${escapeHtml(account.studentId)}</span>
                  </button>
                `,
              ).join("")}
            </div>
            <div class="mt-6 flex flex-wrap gap-3">
              ${linkButton("没有账号？去注册", "#/register")}
              ${linkButton("先逛图书广场", "#/books", "primary")}
            </div>
          </section>
        </div>
      `,
    }),
    onMount() {
      const form = document.querySelector("#login-form");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);
        const payload = {
          student_id: String(formData.get("student_id") || "").trim(),
          password: String(formData.get("password") || "").trim(),
        };

        await withButtonLoading(submitButton, async () => {
          const result = await api.login(payload);
          authStore.setUserId(result.user_id);
          const profile = await api.me();
          authStore.setSession({ userId: result.user_id, profile });
          updateAuthUi();
          toast("登录成功，已经带上当前用户请求头。");
          navigate("/me");
        });
      });

      document.querySelectorAll(".demo-fill-btn").forEach((button) => {
        button.addEventListener("click", () => {
          form.querySelector('[name="student_id"]').value = button.dataset.studentId || "";
          form.querySelector('[name="password"]').value = button.dataset.password || "";
        });
      });
    },
  };
}

async function renderRegisterPage() {
  setHeader("注册", "对应 POST /users/register，用来创建新的学生用户账号。");
  return {
    html: pageShell({
      eyebrow: "用户模块",
      title: "注册一个新学生",
      description: "注册成功后不会自动登录，你可以直接跳转到登录页继续。",
      content: `
        <div class="paper-card mx-auto max-w-4xl p-8">
          <form id="register-form" class="grid gap-5 md:grid-cols-2">
            ${fieldInput("学号", "student_id", "", { required: true, placeholder: "20260007" })}
            ${fieldInput("姓名", "name", "", { required: true, placeholder: "例如 林知夏" })}
            ${fieldInput("校区", "campus", "", { required: true, placeholder: "主校区 / 南校区" })}
            ${fieldInput("专业", "major", "", { required: true, placeholder: "软件工程" })}
            ${fieldInput("手机号", "phone", "", { required: true, placeholder: "13800000007" })}
            ${fieldInput("密码", "password", "", { required: true, type: "password", placeholder: "至少 6 位" })}
            <div class="md:col-span-2 flex flex-wrap gap-3 pt-2">
              <button class="${buttonClass("primary")}" type="submit">提交注册</button>
              ${linkButton("已有账号，去登录", "#/login")}
            </div>
          </form>
        </div>
      `,
    }),
    onMount() {
      const form = document.querySelector("#register-form");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        await withButtonLoading(submitButton, async () => {
          await api.register(payload);
          toast("注册成功，请使用新账号登录。");
          navigate("/login");
        });
      });
    },
  };
}

async function renderMyProfilePage() {
  if (!authStore.getUserId()) {
    return renderAuthRequiredPage("我的资料", "查看当前学生信息需要先登录。");
  }

  setHeader("我的资料", "对应 GET /users/me，用来确认当前登录态和个人信息。");
  const profile = await api.me();
  authStore.setProfile(profile);

  return pageShell({
    eyebrow: "用户模块",
    title: `你好，${profile.name}`,
    description: "当前用户信息已经和本地登录态同步，后续所有需要认证的接口都会自动带上 X-User-Id。",
    content: `
      <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section class="paper-card p-8">
          <div class="grid gap-5 md:grid-cols-2">
            ${infoBlock("学号", profile.student_id)}
            ${infoBlock("姓名", profile.name)}
            ${infoBlock("校区", profile.campus)}
            ${infoBlock("专业", profile.major)}
            ${infoBlock("手机号", profile.phone)}
            ${infoBlock("信用分", String(profile.credit_score))}
            ${infoBlock("注册时间", formatDate(profile.created_at), true)}
          </div>
        </section>

        <section class="space-y-4">
          <div class="paper-card p-6">
            <p class="text-xs uppercase tracking-[0.25em] text-ink/45">下一步</p>
            <div class="mt-4 grid gap-3">
              ${quickEntry("去图书广场找书", "#/books")}
              ${quickEntry("发布一本新图书", "#/books/new")}
              ${quickEntry("查看我的订单", "#/orders")}
              ${quickEntry("查看购物车", "#/cart")}
            </div>
          </div>
          <div class="paper-card p-6">
            <p class="text-sm leading-7 text-ink/70">
              当前账号 ID 为 <code class="rounded bg-black/5 px-1 py-0.5">${escapeHtml(String(profile.id))}</code>，
              这也是后端要求放进 <code class="rounded bg-black/5 px-1 py-0.5">X-User-Id</code> 请求头里的值。
            </p>
          </div>
        </section>
      </div>
    `,
  });
}

async function renderUserDetailPage({ params }) {
  const user = await api.userDetail(params.userId);
  setHeader("学生资料", "对应 GET /users/{user_id}，适合从图书详情页和评价页进入。");

  return pageShell({
    eyebrow: "用户模块",
    title: user.name,
    description: "这里展示的是指定学生的公开资料。",
    content: `
      <div class="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section class="paper-card p-8">
          <div class="grid gap-5 md:grid-cols-2">
            ${infoBlock("学号", user.student_id)}
            ${infoBlock("校区", user.campus)}
            ${infoBlock("专业", user.major)}
            ${infoBlock("手机号", user.phone)}
            ${infoBlock("信用分", String(user.credit_score))}
            ${infoBlock("注册时间", formatDate(user.created_at), true)}
          </div>
        </section>
        <section class="paper-card p-8">
          <p class="text-sm leading-7 text-ink/75">
            这类页面常常从图书详情和卖家评价页跳转过来，用来帮助买家快速判断卖家的可靠性。
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            ${linkButton("查看卖家评价", `#/reviews/seller/${user.id}`, "primary")}
            ${linkButton("浏览图书广场", "#/books")}
          </div>
        </section>
      </div>
    `,
  });
}

async function renderBooksPage({ query }) {
  const filters = {
    q: query.get("q") || "",
    category: query.get("category") || "",
    course_name: query.get("course_name") || "",
    min_price: query.get("min_price") || "",
    max_price: query.get("max_price") || "",
    status: query.get("status") || "available",
  };
  const requestFilters = { ...filters };
  if (!requestFilters.status) {
    delete requestFilters.status;
  }

  const books = await api.searchBooks(requestFilters);
  setHeader("图书广场", "对应 GET /books，支持关键词、课程、分类、价格和状态筛选。");

  return {
    html: pageShell({
      eyebrow: "图书模块",
      title: "所有图书都先经过这里",
      description: "图书广场是买家入口，也是收藏、加购和直接下单的起点。",
      content: `
        <section class="paper-card p-6">
          <form id="books-filter-form" class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            ${fieldInput("关键词", "q", filters.q, { placeholder: "书名 / 作者 / 课程名" })}
            ${fieldInput("分类", "category", filters.category, { placeholder: "教材 / 考研 / 英语" })}
            ${fieldInput("课程名", "course_name", filters.course_name, { placeholder: "高等数学A" })}
            ${fieldInput("最低价", "min_price", filters.min_price, { type: "number", placeholder: "0" })}
            ${fieldInput("最高价", "max_price", filters.max_price, { type: "number", placeholder: "50" })}
            ${fieldSelect("状态", "status", filters.status, [
              { value: "available", label: "仅在售" },
              { value: "reserved", label: "仅已预定" },
              { value: "sold", label: "仅已售" },
              { value: "offline", label: "仅已下架" },
              { value: "", label: "全部状态" },
            ])}
            <div class="md:col-span-2 xl:col-span-6 flex flex-wrap gap-3">
              <button class="${buttonClass("primary")}" type="submit">应用筛选</button>
              ${linkButton("清空筛选", "#/books")}
              ${linkButton("发布新图书", "#/books/new")}
            </div>
          </form>
        </section>

        <section class="mt-6 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          ${
            books.length
              ? books.map((book) => bookCard(book)).join("")
              : `
                <div class="paper-card col-span-full p-8 text-center">
                  <p class="text-sm text-ink/70">当前筛选下没有匹配图书，可以换个关键词试试。</p>
                </div>
              `
          }
        </section>
      `,
    }),
    onMount() {
      const form = document.querySelector("#books-filter-form");
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const nextQuery = new URLSearchParams();
        formData.forEach((value, key) => {
          if (String(value).trim() !== "") {
            nextQuery.set(key, String(value).trim());
          }
        });
        const suffix = nextQuery.toString();
        navigate(suffix ? `/books?${suffix}` : "/books");
      });
    },
  };
}

async function renderBookDetailPage({ params }) {
  const book = await api.bookDetail(params.bookId);
  const seller = await api.userDetail(book.seller_id);
  const currentUserId = authStore.getUserId();
  const isSeller = currentUserId === book.seller_id;

  setHeader("图书详情", "对应 GET /books/{book_id}，也是发起收藏、加购和下单的核心页面。");

  return pageShell({
    eyebrow: "图书模块",
    title: book.title,
    description: "你可以在这里完整查看图书信息，并根据当前身份选择相应动作。",
    content: `
      <div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section class="paper-card p-8">
          <div class="flex flex-col gap-6 md:flex-row">
            <div class="flex h-56 w-full items-center justify-center rounded-[28px] bg-gradient-to-br from-pine via-pineSoft to-ember text-center text-paper md:w-48">
              <div>
                <p class="font-display text-5xl">${escapeHtml((book.title || "书").slice(0, 1))}</p>
                <p class="mt-2 text-xs tracking-[0.25em] text-paper/70">BOOK</p>
              </div>
            </div>
            <div class="flex-1">
              <div class="flex flex-wrap items-center gap-3">
                ${statusTag("book", book.status)}
                <span class="tag bg-black/5 text-ink">${escapeHtml(book.category)}</span>
                ${
                  book.course_name
                    ? `<span class="tag bg-white text-pine ring-1 ring-pine/10">${escapeHtml(book.course_name)}</span>`
                    : ""
                }
              </div>
              <p class="mt-4 text-3xl font-semibold text-pine">￥${formatPrice(book.price)}</p>
              <p class="mt-2 text-sm text-ink/60">作者：${escapeHtml(book.author)} ｜ 成色：${escapeHtml(book.condition_level)}</p>
              <p class="mt-5 rounded-[24px] bg-white/70 p-4 text-sm leading-7 text-ink/75">
                ${escapeHtml(book.description)}
              </p>
            </div>
          </div>

          <div class="mt-6 grid gap-4 md:grid-cols-2">
            ${infoBlock("ISBN", book.isbn || "未填写")}
            ${infoBlock("取书地点", book.pickup_location)}
            ${infoBlock("发布时间", formatDate(book.created_at), true)}
            ${infoBlock("更新时间", formatDate(book.updated_at), true)}
          </div>
        </section>

        <section class="space-y-6">
          <div class="paper-card p-6">
            <p class="text-xs uppercase tracking-[0.25em] text-ink/45">卖家信息</p>
            <p class="mt-4 text-xl font-semibold text-pine">${escapeHtml(seller.name)}</p>
            <p class="mt-1 text-sm text-ink/65">${escapeHtml(seller.major)} ｜ ${escapeHtml(seller.campus)}</p>
            <p class="mt-4 text-sm text-ink/70">信用分 ${escapeHtml(String(seller.credit_score))}</p>
            <div class="mt-5 flex flex-wrap gap-3">
              ${linkButton("查看学生资料", `#/users/${seller.id}`)}
              ${linkButton("查看卖家评价", `#/reviews/seller/${seller.id}`, "primary")}
            </div>
          </div>

          <div class="paper-card p-6">
            <p class="text-xs uppercase tracking-[0.25em] text-ink/45">当前可执行动作</p>
            <div class="mt-4 flex flex-wrap gap-3">
              ${bookDetailActions(book, isSeller).join("") || '<p class="text-sm text-ink/60">当前没有可执行动作。</p>'}
            </div>
          </div>
        </section>
      </div>
    `,
  });
}

async function renderBookCreatePage() {
  if (!authStore.getUserId()) {
    return renderAuthRequiredPage("发布图书", "发布图书需要先登录。");
  }

  setHeader("发布图书", "对应 POST /books，用于创建新的二手书记录。");

  return {
    html: pageShell({
      eyebrow: "图书模块",
      title: "发布一本新的二手书",
      description: "表单字段严格对应后端 BookCreate schema，提交后会直接创建图书。",
      content: bookFormLayout(),
    }),
    onMount() {
      mountBookForm({
        formSelector: "#book-form",
        submitText: "确认发布",
        onSubmit: async (payload) => {
          const created = await api.createBook(payload);
          toast("图书发布成功。");
          navigate(`/books/${created.id}`);
        },
      });
    },
  };
}

async function renderBookEditPage({ params }) {
  if (!authStore.getUserId()) {
    return renderAuthRequiredPage("编辑图书", "编辑图书需要先登录。");
  }

  const book = await api.bookDetail(params.bookId);
  setHeader("编辑图书", "对应 PUT /books/{book_id}，适合卖家更新价格、描述和地点。");

  return {
    html: pageShell({
      eyebrow: "图书模块",
      title: `编辑《${book.title}》`,
      description: "当前页面会以已存在的图书数据作为初始值。",
      content: bookFormLayout(book),
    }),
    onMount() {
      mountBookForm({
        formSelector: "#book-form",
        submitText: "保存修改",
        onSubmit: async (payload) => {
          const updated = await api.updateBook(book.id, payload);
          toast("图书信息已更新。");
          navigate(`/books/${updated.id}`);
        },
      });
    },
  };
}

async function renderMyBooksPage() {
  if (!authStore.getUserId()) {
    return renderAuthRequiredPage("我的图书", "查看我发布的图书需要先登录。");
  }

  const books = await api.myBooks();
  setHeader("我的图书", "对应 GET /books/mine/items，用来管理自己发布的图书。");

  return pageShell({
    eyebrow: "图书模块",
    title: "我发布的图书",
    description: "这里是卖家视角的主阵地，编辑、下架和重新上架都从这里进入。",
    content: `
      <div class="mb-6 flex flex-wrap gap-3">
        ${linkButton("发布新图书", "#/books/new", "primary")}
        ${linkButton("去图书广场", "#/books")}
      </div>
      <section class="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        ${
          books.length
            ? books.map((book) => bookCard(book, { sellerMode: true })).join("")
            : `
              <div class="paper-card col-span-full p-8 text-center">
                <p class="text-sm text-ink/70">你还没有发布图书，先去创建第一本吧。</p>
              </div>
            `
        }
      </section>
    `,
  });
}

async function renderFavoritesPage() {
  if (!authStore.getUserId()) {
    return renderAuthRequiredPage("我的收藏", "查看收藏需要先登录。");
  }

  const favorites = await api.favorites();
  setHeader("我的收藏", "对应 GET /favorites/me，适合继续比较、查看详情或发起下单。");

  return pageShell({
    eyebrow: "收藏模块",
    title: "我标记过的图书",
    description: "收藏页是买家做决策前的中间站，适合回看和继续下单。",
    content: `
      <section class="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        ${
          favorites.length
            ? favorites
                .map(
                  (favorite) => `
                    <div class="paper-card p-6">
                      <p class="text-xs text-ink/45">收藏于 ${formatDate(favorite.created_at)}</p>
                      <div class="mt-4">${bookCardContent(favorite.book)}</div>
                      <div class="mt-5 flex flex-wrap gap-3">
                        ${linkButton("查看详情", `#/books/${favorite.book.id}`)}
                        ${linkButton("取消收藏", `#/favorites/${favorite.book.id}/remove`, "danger")}
                      </div>
                    </div>
                  `,
                )
                .join("")
            : `
              <div class="paper-card col-span-full p-8 text-center">
                <p class="text-sm text-ink/70">收藏夹还是空的，可以先去图书广场挑几本书。</p>
              </div>
            `
        }
      </section>
    `,
  });
}

async function renderCartPage() {
  if (!authStore.getUserId()) {
    return renderAuthRequiredPage("购物车", "查看购物车需要先登录。");
  }

  const items = await api.cartItems();
  const totalAmount = items.reduce((sum, item) => sum + Number(item.book.price || 0), 0);
  setHeader("购物车", "对应 GET /cart/items，可以继续移除、查看详情或批量下单。");

  return pageShell({
    eyebrow: "购物车模块",
    title: "准备一起下单的图书",
    description: "如果购物车里有不同卖家的书，后端会在批量下单时自动拆分成多个订单。",
    content: `
      <div class="mb-6 grid gap-4 md:grid-cols-3">
        <div class="paper-card p-5">
          <p class="text-xs uppercase tracking-[0.25em] text-ink/45">图书数量</p>
          <p class="mt-3 text-3xl font-semibold text-pine">${escapeHtml(String(items.length))}</p>
        </div>
        <div class="paper-card p-5">
          <p class="text-xs uppercase tracking-[0.25em] text-ink/45">预估总额</p>
          <p class="mt-3 text-3xl font-semibold text-pine">￥${formatPrice(totalAmount)}</p>
        </div>
        <div class="paper-card p-5">
          <p class="text-xs uppercase tracking-[0.25em] text-ink/45">快捷操作</p>
          <div class="mt-4 flex flex-wrap gap-3">
            ${linkButton("批量下单", "#/orders/from-cart", "primary")}
            ${linkButton("继续挑书", "#/books")}
          </div>
        </div>
      </div>
      <section class="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        ${
          items.length
            ? items
                .map(
                  (item) => `
                    <div class="paper-card p-6">
                      <p class="text-xs text-ink/45">加入于 ${formatDate(item.created_at)}</p>
                      <div class="mt-4">${bookCardContent(item.book)}</div>
                      <div class="mt-5 flex flex-wrap gap-3">
                        ${linkButton("查看详情", `#/books/${item.book.id}`)}
                        ${linkButton("移出购物车", `#/cart/remove/${item.book.id}`, "danger")}
                        ${linkButton("直接下单", `#/orders/direct/${item.book.id}`, "primary")}
                      </div>
                    </div>
                  `,
                )
                .join("")
            : `
              <div class="paper-card col-span-full p-8 text-center">
                <p class="text-sm text-ink/70">购物车是空的，先去图书广场把目标书籍加进来吧。</p>
              </div>
            `
        }
      </section>
    `,
  });
}

async function renderOrdersPage({ query }) {
  if (!authStore.getUserId()) {
    return renderAuthRequiredPage("我的订单", "查看订单需要先登录。");
  }

  const role = query.get("role") || "all";
  const orders = await api.listOrders(role);
  setHeader("我的订单", "对应 GET /orders/me，是买家与卖家流转动作的核心页面。");

  return pageShell({
    eyebrow: "订单模块",
    title: "订单流转中心",
    description: "支付、发货、确认收货、取消订单和去评价都从这里进入。",
    content: `
      <section class="paper-card p-6">
        <div class="flex flex-wrap gap-3">
          ${roleTab("全部订单", "all", role)}
          ${roleTab("我买到的", "buyer", role)}
          ${roleTab("我卖出的", "seller", role)}
          ${linkButton("从购物车下单", "#/orders/from-cart", "primary")}
        </div>
      </section>
      <section class="mt-6 grid gap-5">
        ${
          orders.length
            ? orders.map((order) => orderCard(order)).join("")
            : `
              <div class="paper-card p-8 text-center">
                <p class="text-sm text-ink/70">当前筛选下没有订单记录。</p>
              </div>
            `
        }
      </section>
    `,
  });
}

async function renderDirectOrderPage({ params }) {
  if (!authStore.getUserId()) {
    return renderAuthRequiredPage("直接下单", "直接下单需要先登录。");
  }

  const book = await api.bookDetail(params.bookId);
  setHeader("直接下单", "对应 POST /orders/direct，适合对单本图书快速下单。");

  return {
    html: pageShell({
      eyebrow: "订单模块",
      title: "为单本图书创建订单",
      description: "后端会把这本图书标记为已预定，并生成一个待支付订单。",
      content: `
        <div class="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <section class="paper-card p-6">
            ${bookSummary(book)}
          </section>
          <section class="paper-card p-8">
            <form id="direct-order-form" class="space-y-5">
              ${fieldInput("取书地点", "pickup_location", book.pickup_location || "", {
                required: true,
                placeholder: "例如 图书馆门口",
              })}
              ${fieldTextarea("备注", "remark", "", {
                placeholder: "例如 晚上 7 点后方便交易",
              })}
              <button class="${buttonClass("primary")}" type="submit">确认创建订单</button>
            </form>
          </section>
        </div>
      `,
    }),
    onMount() {
      const form = document.querySelector("#direct-order-form");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);
        const payload = {
          book_id: Number(book.id),
          pickup_location: String(formData.get("pickup_location") || "").trim(),
          remark: normalizeOptionalField(formData.get("remark")),
        };
        await withButtonLoading(submitButton, async () => {
          await api.createDirectOrder(payload);
          toast("订单已创建，接下来可以去支付。");
          navigate("/orders?role=buyer");
        });
      });
    },
  };
}

async function renderOrderFromCartPage() {
  if (!authStore.getUserId()) {
    return renderAuthRequiredPage("从购物车下单", "批量下单需要先登录。");
  }

  const items = await api.cartItems();
  setHeader("从购物车批量下单", "对应 POST /orders/from-cart，可按所选图书自动按卖家拆单。");

  return {
    html: pageShell({
      eyebrow: "订单模块",
      title: "把购物车变成订单",
      description: "你可以勾选部分图书一起下单，后端会按卖家拆分成多个订单。",
      content: `
        <div class="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section class="paper-card p-8">
            ${
              items.length
                ? `
                  <form id="cart-order-form" class="space-y-5">
                    <div class="space-y-3">
                      ${items
                        .map(
                          (item) => `
                            <label class="flex items-start gap-3 rounded-[24px] border border-black/5 bg-white/70 p-4">
                              <input class="mt-1 h-4 w-4 rounded border-black/20 text-pine" type="checkbox" name="selected_book_ids" value="${item.book.id}" checked />
                              <span class="flex-1">
                                <span class="block font-medium text-pine">${escapeHtml(item.book.title)}</span>
                                <span class="mt-1 block text-sm text-ink/65">
                                  ￥${formatPrice(item.book.price)} ｜ ${escapeHtml(item.book.pickup_location)} ｜ ${escapeHtml(item.book.category)}
                                </span>
                              </span>
                            </label>
                          `,
                        )
                        .join("")}
                    </div>
                    ${fieldInput("统一取书地点", "pickup_location", "", {
                      required: true,
                      placeholder: "例如 图书馆门口",
                    })}
                    ${fieldTextarea("统一备注", "remark", "", {
                      placeholder: "例如 晚上 7 点后交易即可",
                    })}
                    <button class="${buttonClass("primary")}" type="submit">确认批量下单</button>
                  </form>
                `
                : `
                  <div class="text-center">
                    <p class="text-sm text-ink/70">购物车里还没有图书，暂时无法批量下单。</p>
                    <div class="mt-5">${linkButton("去图书广场", "#/books", "primary")}</div>
                  </div>
                `
            }
          </section>
          <section class="paper-card p-8">
            <p class="text-xs uppercase tracking-[0.25em] text-ink/45">说明</p>
            <ul class="mt-4 space-y-3 text-sm leading-7 text-ink/72">
              <li>后端会按卖家拆分订单，所以不同卖家的图书不会混成一单。</li>
              <li>下单成功后，被选中的购物车记录会自动删除。</li>
              <li>图书状态会变成 <code class="rounded bg-black/5 px-1 py-0.5">reserved</code>。</li>
            </ul>
          </section>
        </div>
      `,
    }),
    onMount() {
      const form = document.querySelector("#cart-order-form");
      if (!form) {
        return;
      }
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);
        const selectedBookIds = formData
          .getAll("selected_book_ids")
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value));

        if (!selectedBookIds.length) {
          toast("至少勾选一本图书再下单。", "error");
          return;
        }

        const payload = {
          pickup_location: String(formData.get("pickup_location") || "").trim(),
          remark: normalizeOptionalField(formData.get("remark")),
          selected_book_ids: selectedBookIds,
        };

        await withButtonLoading(submitButton, async () => {
          await api.createOrdersFromCart(payload);
          toast("购物车下单成功。");
          navigate("/orders?role=buyer");
        });
      });
    },
  };
}

async function renderReviewCreatePage({ params }) {
  if (!authStore.getUserId()) {
    return renderAuthRequiredPage("提交评价", "评价订单需要先登录。");
  }

  const order = await getMyOrderById(params.orderId);
  setHeader("提交评价", "对应 POST /reviews，买家在订单完成后可对卖家进行评价。");

  return {
    html: pageShell({
      eyebrow: "评价模块",
      title: `评价订单 #${order.id}`,
      description: "后端规定只有买家且订单状态为 completed 时才能提交评价。",
      content: `
        <div class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section class="paper-card p-6">
            ${orderSummary(order)}
          </section>
          <section class="paper-card p-8">
            <form id="review-form" class="space-y-5">
              ${fieldSelect("评分", "rating", "5", [
                { value: "5", label: "5 分" },
                { value: "4", label: "4 分" },
                { value: "3", label: "3 分" },
                { value: "2", label: "2 分" },
                { value: "1", label: "1 分" },
              ])}
              ${fieldTextarea("评价内容", "content", "", {
                required: true,
                placeholder: "例如 卖家沟通很顺畅，书和描述一致。",
              })}
              <button class="${buttonClass("primary")}" type="submit">提交评价</button>
            </form>
          </section>
        </div>
      `,
    }),
    onMount() {
      const form = document.querySelector("#review-form");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);
        const payload = {
          order_id: Number(order.id),
          rating: Number(formData.get("rating")),
          content: String(formData.get("content") || "").trim(),
        };

        await withButtonLoading(submitButton, async () => {
          const review = await api.createReview(payload);
          toast("评价已提交。");
          navigate(`/reviews/seller/${review.seller_id}`);
        });
      });
    },
  };
}

async function renderSellerReviewsPage({ params }) {
  const sellerId = Number(params.sellerId);
  const [seller, reviews] = await Promise.all([api.userDetail(sellerId), api.sellerReviews(sellerId)]);
  setHeader("卖家评价", "对应 GET /reviews/seller/{seller_id}，用于展示一个卖家的历史交易口碑。");

  return pageShell({
    eyebrow: "评价模块",
    title: `${seller.name} 的交易评价`,
    description: "适合从图书详情页跳进来，快速判断卖家是否值得继续交易。",
    content: `
      <div class="mb-6 grid gap-4 md:grid-cols-3">
        <div class="paper-card p-5">
          <p class="text-xs uppercase tracking-[0.25em] text-ink/45">卖家</p>
          <p class="mt-3 text-2xl font-semibold text-pine">${escapeHtml(seller.name)}</p>
        </div>
        <div class="paper-card p-5">
          <p class="text-xs uppercase tracking-[0.25em] text-ink/45">评价数量</p>
          <p class="mt-3 text-2xl font-semibold text-pine">${escapeHtml(String(reviews.length))}</p>
        </div>
        <div class="paper-card p-5">
          <p class="text-xs uppercase tracking-[0.25em] text-ink/45">信用分</p>
          <p class="mt-3 text-2xl font-semibold text-pine">${escapeHtml(String(seller.credit_score))}</p>
        </div>
      </div>
      <section class="grid gap-5">
        ${
          reviews.length
            ? reviews
                .map(
                  (review) => `
                    <article class="paper-card p-6">
                      <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-3">
                          <span class="tag bg-amber-100 text-amber-700">${"★".repeat(Math.max(1, Number(review.rating)))}</span>
                          <span class="text-sm text-ink/60">订单 #${escapeHtml(String(review.order_id))}</span>
                        </div>
                        <span class="text-xs text-ink/45">${formatDate(review.created_at)}</span>
                      </div>
                      <p class="mt-4 text-sm leading-7 text-ink/75">${escapeHtml(review.content)}</p>
                    </article>
                  `,
                )
                .join("")
            : `
              <div class="paper-card p-8 text-center">
                <p class="text-sm text-ink/70">这个卖家还没有评价记录。</p>
              </div>
            `
        }
      </section>
    `,
  });
}

async function renderBookActionPage({
  params,
  title,
  description,
  actionLabel,
  successRedirect,
  action,
}) {
  if (!authStore.getUserId()) {
    return renderAuthRequiredPage(title, `${title}需要先登录。`);
  }

  const book = await api.bookDetail(params.bookId);
  setHeader(title, description);

  return {
    html: pageShell({
      eyebrow: "操作确认",
      title,
      description,
      content: `
        <div class="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <section class="paper-card p-6">${bookSummary(book)}</section>
          <section class="paper-card p-8">
            <p class="text-sm leading-7 text-ink/72">${escapeHtml(description)}</p>
            <div class="mt-6 flex flex-wrap gap-3">
              <button id="confirm-action-btn" class="${buttonClass("primary")}" type="button">${escapeHtml(actionLabel)}</button>
              ${linkButton("返回图书详情", `#/books/${book.id}`)}
            </div>
          </section>
        </div>
      `,
    }),
    onMount() {
      const button = document.querySelector("#confirm-action-btn");
      button.addEventListener("click", async () => {
        await withButtonLoading(button, async () => {
          await action(Number(book.id));
          toast(`${title}成功。`);
          navigate(successRedirect);
        });
      });
    },
  };
}

async function renderOrderActionPage({
  params,
  title,
  description,
  actionLabel,
  successRedirect,
  action,
}) {
  if (!authStore.getUserId()) {
    return renderAuthRequiredPage(title, `${title}需要先登录。`);
  }

  const order = await getMyOrderById(params.orderId);
  setHeader(title, description);

  return {
    html: pageShell({
      eyebrow: "操作确认",
      title,
      description,
      content: `
        <div class="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <section class="paper-card p-6">${orderSummary(order)}</section>
          <section class="paper-card p-8">
            <p class="text-sm leading-7 text-ink/72">${escapeHtml(description)}</p>
            <div class="mt-6 flex flex-wrap gap-3">
              <button id="confirm-order-action-btn" class="${buttonClass("primary")}" type="button">${escapeHtml(actionLabel)}</button>
              ${linkButton("返回订单列表", "#/orders")}
            </div>
          </section>
        </div>
      `,
    }),
    onMount() {
      const button = document.querySelector("#confirm-order-action-btn");
      button.addEventListener("click", async () => {
        await withButtonLoading(button, async () => {
          await action(Number(order.id));
          toast(`${title}成功。`);
          navigate(successRedirect);
        });
      });
    },
  };
}

function pageShell({ eyebrow, title, description, content }) {
  return `
    <div class="mx-auto max-w-7xl space-y-6 fade-in">
      <section class="paper-card px-6 py-6 sm:px-8">
        <p class="text-xs uppercase tracking-[0.28em] text-ink/45">${escapeHtml(eyebrow)}</p>
        <h2 class="mt-3 font-display text-3xl text-pine sm:text-4xl">${escapeHtml(title)}</h2>
        <p class="mt-3 max-w-3xl text-sm leading-7 text-ink/72">${escapeHtml(description)}</p>
      </section>
      ${content}
    </div>
  `;
}

function quickEntry(label, href) {
  return `
    <a class="rounded-[22px] border border-black/5 bg-white/80 px-4 py-4 text-sm font-medium text-pine transition hover:-translate-y-0.5 hover:shadow-card" href="${href}">
      ${escapeHtml(label)}
    </a>
  `;
}

function linkButton(label, href, variant = "secondary", external = false) {
  const baseClass = buttonClass(variant);
  const extra = external ? ' target="_blank" rel="noreferrer"' : "";
  return `<a class="${baseClass}" href="${href}"${extra}>${escapeHtml(label)}</a>`;
}

function buttonClass(variant = "secondary") {
  const base =
    "inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition hover:-translate-y-0.5";
  const variants = {
    primary: "bg-pine text-paper shadow-float hover:bg-pineSoft",
    secondary: "border border-black/10 bg-white/80 text-ink hover:border-pine/20 hover:text-pine",
    danger: "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };
  return `${base} ${variants[variant] || variants.secondary}`;
}

function fieldWrapper(label, input, fullWidth = false) {
  return `
    <label class="${fullWidth ? "md:col-span-2" : ""} block">
      <span class="mb-2 block text-sm font-medium text-ink/80">${escapeHtml(label)}</span>
      ${input}
    </label>
  `;
}

function fieldInput(label, name, value = "", options = {}) {
  const {
    type = "text",
    placeholder = "",
    required = false,
    fullWidth = false,
  } = options;
  return fieldWrapper(
    label,
    `<input
      class="w-full rounded-[20px] border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink"
      name="${escapeHtml(name)}"
      type="${escapeHtml(type)}"
      value="${escapeHtml(value)}"
      placeholder="${escapeHtml(placeholder)}"
      ${required ? "required" : ""}
    />`,
    fullWidth,
  );
}

function fieldTextarea(label, name, value = "", options = {}) {
  const {
    placeholder = "",
    required = false,
    fullWidth = true,
  } = options;
  return fieldWrapper(
    label,
    `<textarea
      class="min-h-[136px] w-full rounded-[20px] border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink"
      name="${escapeHtml(name)}"
      placeholder="${escapeHtml(placeholder)}"
      ${required ? "required" : ""}
    >${escapeHtml(value)}</textarea>`,
    fullWidth,
  );
}

function fieldSelect(label, name, value, options) {
  return fieldWrapper(
    label,
    `<select class="w-full rounded-[20px] border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink" name="${escapeHtml(
      name,
    )}">
      ${options
        .map(
          (option) => `
            <option value="${escapeHtml(option.value)}" ${String(option.value) === String(value) ? "selected" : ""}>
              ${escapeHtml(option.label)}
            </option>
          `,
        )
        .join("")}
    </select>`,
  );
}

function infoBlock(label, value, fullWidth = false) {
  return `
    <div class="${fullWidth ? "md:col-span-2" : ""} rounded-[24px] border border-black/5 bg-white/70 p-5">
      <p class="text-xs uppercase tracking-[0.22em] text-ink/45">${escapeHtml(label)}</p>
      <p class="mt-3 text-base leading-7 text-ink/78">${escapeHtml(value)}</p>
    </div>
  `;
}

function statusTag(kind, value) {
  const meta = kind === "order" ? ORDER_STATUS_META[value] : BOOK_STATUS_META[value];
  const fallbackLabel = value || "未知状态";
  const fallbackClass = "bg-stone-200 text-stone-700";
  return `<span class="tag ${meta?.className || fallbackClass}">${escapeHtml(meta?.label || fallbackLabel)}</span>`;
}

function bookCard(book, options = {}) {
  return `
    <article class="paper-card p-6">
      ${bookCardContent(book)}
      <div class="mt-5 flex flex-wrap gap-3">
        ${bookCardActions(book, options).join("")}
      </div>
    </article>
  `;
}

function bookCardContent(book) {
  return `
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          ${statusTag("book", book.status)}
          <span class="tag bg-black/5 text-ink">${escapeHtml(book.category)}</span>
        </div>
        <h3 class="mt-4 text-xl font-semibold text-pine">${escapeHtml(book.title)}</h3>
        <p class="mt-2 text-sm text-ink/65">${escapeHtml(book.author)}${book.course_name ? ` ｜ ${escapeHtml(book.course_name)}` : ""}</p>
      </div>
      <p class="text-xl font-semibold text-pine">￥${formatPrice(book.price)}</p>
    </div>
    <p class="mt-4 text-sm leading-7 text-ink/75">${escapeHtml(book.description)}</p>
    <div class="mt-4 grid gap-3 text-sm text-ink/62 sm:grid-cols-2">
      <p>成色：${escapeHtml(book.condition_level)}</p>
      <p>地点：${escapeHtml(book.pickup_location)}</p>
    </div>
  `;
}

function bookCardActions(book, options = {}) {
  const currentUserId = authStore.getUserId();
  const isSeller = currentUserId === book.seller_id;
  const actions = [linkButton("查看详情", `#/books/${book.id}`)];

  if (options.sellerMode || isSeller) {
    actions.push(linkButton("编辑", `#/books/${book.id}/edit`));
    if (book.status === "offline") {
      actions.push(linkButton("重新上架", `#/books/${book.id}/republish`, "primary"));
    } else if (book.status !== "sold") {
      actions.push(linkButton("下架", `#/books/${book.id}/offline`, "danger"));
    }
    return actions;
  }

  if (!currentUserId) {
    actions.push(linkButton("登录后购买", "#/login", "primary"));
    return actions;
  }

  if (book.status === "available") {
    actions.push(linkButton("收藏", `#/favorites/${book.id}/add`));
    actions.push(linkButton("加购物车", `#/cart/add/${book.id}`));
    actions.push(linkButton("直接下单", `#/orders/direct/${book.id}`, "primary"));
  }

  return actions;
}

function bookDetailActions(book, isSeller) {
  if (isSeller) {
    const actions = [linkButton("编辑图书", `#/books/${book.id}/edit`)];
    if (book.status === "offline") {
      actions.push(linkButton("重新上架", `#/books/${book.id}/republish`, "primary"));
    } else if (book.status !== "sold") {
      actions.push(linkButton("下架图书", `#/books/${book.id}/offline`, "danger"));
    }
    return actions;
  }

  if (!authStore.getUserId()) {
    return [linkButton("登录后收藏或下单", "#/login", "primary")];
  }

  if (book.status !== "available") {
    return [linkButton("返回图书广场", "#/books")];
  }

  return [
    linkButton("收藏图书", `#/favorites/${book.id}/add`),
    linkButton("加入购物车", `#/cart/add/${book.id}`),
    linkButton("直接下单", `#/orders/direct/${book.id}`, "primary"),
  ];
}

function orderCard(order) {
  const currentUserId = authStore.getUserId();
  const userRole = currentUserId === order.buyer_id ? "买家视角" : currentUserId === order.seller_id ? "卖家视角" : "关联订单";

  return `
    <article class="paper-card p-6">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-3">
            ${statusTag("order", order.status)}
            <span class="tag bg-black/5 text-ink">订单 #${escapeHtml(String(order.id))}</span>
            <span class="tag bg-white text-pine ring-1 ring-pine/10">${userRole}</span>
          </div>
          <p class="mt-4 text-lg font-semibold text-pine">￥${formatPrice(order.total_amount)}</p>
          <p class="mt-2 text-sm text-ink/62">
            取书地点：${escapeHtml(order.pickup_location)} ｜ 创建于 ${formatDate(order.created_at)}
          </p>
          ${order.remark ? `<p class="mt-3 text-sm leading-7 text-ink/72">备注：${escapeHtml(order.remark)}</p>` : ""}
        </div>
        <div class="flex flex-wrap gap-3">
          ${orderActions(order).join("")}
        </div>
      </div>
      <div class="mt-5 grid gap-3">
        ${order.items
          .map(
            (item) => `
              <div class="rounded-[22px] border border-black/5 bg-white/75 p-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="font-medium text-pine">${escapeHtml(item.title_snapshot)}</p>
                    <p class="mt-1 text-xs text-ink/55">图书 ID ${escapeHtml(String(item.book_id))}</p>
                  </div>
                  <p class="text-sm text-ink/72">￥${formatPrice(item.price_snapshot)} × ${escapeHtml(String(item.quantity))}</p>
                </div>
              </div>
            `,
          )
          .join("")}
      </div>
    </article>
  `;
}

function orderActions(order) {
  const currentUserId = authStore.getUserId();
  const actions = [];
  if (currentUserId === order.buyer_id && order.status === "pending_payment") {
    actions.push(linkButton("支付订单", `#/orders/${order.id}/pay`, "primary"));
    actions.push(linkButton("取消订单", `#/orders/${order.id}/cancel`, "danger"));
  }
  if (currentUserId === order.seller_id && order.status === "paid") {
    actions.push(linkButton("卖家发货", `#/orders/${order.id}/ship`, "primary"));
    actions.push(linkButton("取消订单", `#/orders/${order.id}/cancel`, "danger"));
  }
  if (currentUserId === order.buyer_id && order.status === "shipped") {
    actions.push(linkButton("确认收货", `#/orders/${order.id}/confirm-receipt`, "primary"));
  }
  if (currentUserId === order.buyer_id && order.status === "completed") {
    actions.push(linkButton("去评价", `#/reviews/new/${order.id}`, "primary"));
  }
  return actions.length ? actions : [linkButton("回到订单列表", "#/orders")];
}

function roleTab(label, role, currentRole) {
  return linkButton(label, `#/orders?role=${role}`, role === currentRole ? "primary" : "secondary");
}

function bookSummary(book) {
  return `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        ${statusTag("book", book.status)}
        <span class="tag bg-black/5 text-ink">${escapeHtml(book.category)}</span>
      </div>
      <h3 class="text-2xl font-semibold text-pine">${escapeHtml(book.title)}</h3>
      <p class="text-sm text-ink/65">${escapeHtml(book.author)}</p>
      <p class="text-lg font-semibold text-pine">￥${formatPrice(book.price)}</p>
      <div class="grid gap-3 text-sm text-ink/72">
        <p>成色：${escapeHtml(book.condition_level)}</p>
        <p>地点：${escapeHtml(book.pickup_location)}</p>
        ${book.course_name ? `<p>课程：${escapeHtml(book.course_name)}</p>` : ""}
      </div>
    </div>
  `;
}

function orderSummary(order) {
  return `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        ${statusTag("order", order.status)}
        <span class="tag bg-black/5 text-ink">订单 #${escapeHtml(String(order.id))}</span>
      </div>
      <p class="text-2xl font-semibold text-pine">￥${formatPrice(order.total_amount)}</p>
      <div class="grid gap-3 text-sm text-ink/72">
        <p>取书地点：${escapeHtml(order.pickup_location)}</p>
        <p>买家 ID：${escapeHtml(String(order.buyer_id))}</p>
        <p>卖家 ID：${escapeHtml(String(order.seller_id))}</p>
        <p>创建时间：${formatDate(order.created_at)}</p>
      </div>
      <div class="space-y-3">
        ${order.items
          .map(
            (item) => `
              <div class="rounded-[22px] border border-black/5 bg-white/75 p-4">
                <p class="font-medium text-pine">${escapeHtml(item.title_snapshot)}</p>
                <p class="mt-1 text-sm text-ink/65">￥${formatPrice(item.price_snapshot)} × ${escapeHtml(String(item.quantity))}</p>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function bookFormLayout(book = {}) {
  return `
    <div class="paper-card mx-auto max-w-5xl p-8">
      <form id="book-form" class="grid gap-5 md:grid-cols-2">
        ${fieldInput("书名", "title", book.title || "", { required: true, placeholder: "例如 高等数学（第七版）上册" })}
        ${fieldInput("作者", "author", book.author || "", { required: true, placeholder: "例如 同济大学数学系" })}
        ${fieldInput("ISBN", "isbn", book.isbn || "", { placeholder: "没有可留空" })}
        ${fieldInput("课程名", "course_name", book.course_name || "", { placeholder: "例如 高等数学A" })}
        ${fieldInput("分类", "category", book.category || "", { required: true, placeholder: "教材 / 考研 / 英语" })}
        ${fieldInput("价格", "price", book.price || "", { required: true, type: "number", placeholder: "例如 18.5" })}
        ${fieldInput("成色", "condition_level", book.condition_level || "", { required: true, placeholder: "例如 8成新" })}
        ${fieldInput("封面链接", "cover_url", book.cover_url || "", { placeholder: "可选" })}
        ${fieldInput("取书地点", "pickup_location", book.pickup_location || "", {
          required: true,
          placeholder: "例如 主图书馆门口",
        })}
        ${fieldTextarea("图书描述", "description", book.description || "", {
          required: true,
          placeholder: "例如 有少量笔记，书皮完整，适合新生接手。",
        })}
        <div class="md:col-span-2 flex flex-wrap gap-3 pt-2">
          <button class="${buttonClass("primary")}" id="book-form-submit" type="submit">提交</button>
          ${linkButton("返回图书广场", "#/books")}
        </div>
      </form>
    </div>
  `;
}

function mountBookForm({ formSelector, submitText, onSubmit }) {
  const form = document.querySelector(formSelector);
  const submitButton = document.querySelector("#book-form-submit");
  submitButton.textContent = submitText;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      title: String(formData.get("title") || "").trim(),
      author: String(formData.get("author") || "").trim(),
      isbn: normalizeOptionalField(formData.get("isbn")),
      course_name: normalizeOptionalField(formData.get("course_name")),
      category: String(formData.get("category") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      price: Number(formData.get("price")),
      condition_level: String(formData.get("condition_level") || "").trim(),
      cover_url: normalizeOptionalField(formData.get("cover_url")),
      pickup_location: String(formData.get("pickup_location") || "").trim(),
    };

    await withButtonLoading(submitButton, () => onSubmit(payload));
  });
}

async function withButtonLoading(button, task) {
  const originalText = button.textContent;
  button.disabled = true;
  button.classList.add("opacity-70", "cursor-not-allowed");
  button.textContent = "处理中...";

  try {
    await task();
  } catch (error) {
    toast(error.message || "请求失败", "error");
  } finally {
    button.disabled = false;
    button.classList.remove("opacity-70", "cursor-not-allowed");
    button.textContent = originalText;
  }
}

async function getMyOrderById(orderId) {
  const orders = await api.listOrders("all");
  const order = orders.find((item) => Number(item.id) === Number(orderId));
  if (!order) {
    throw new Error("订单不存在，或者当前账号没有权限查看这笔订单。");
  }
  return order;
}

function normalizeOptionalField(value) {
  const text = String(value || "").trim();
  return text ? text : null;
}

function formatPrice(value) {
  const numberValue = Number(value || 0);
  return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(1);
}

function formatDate(value) {
  if (!value) {
    return "未知时间";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(String(value));
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
