import { authStore } from "./store.js";

const API_BASE_URL = window.location.origin;

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function request(path, options = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    auth = true,
  } = options;

  const finalHeaders = new Headers(headers);
  const userId = authStore.getUserId();
  if (auth && userId) {
    finalHeaders.set("X-User-Id", String(userId));
  }
  if (body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && (payload.detail || payload.message)) ||
      payload ||
      "请求失败";
    throw new Error(message);
  }

  return payload;
}

export const api = {
  baseUrl: API_BASE_URL,

  overview() {
    return request("/", { auth: false });
  },

  register(payload) {
    return request("/users/register", { method: "POST", body: payload, auth: false });
  },

  login(payload) {
    return request("/users/login", { method: "POST", body: payload, auth: false });
  },

  me() {
    return request("/users/me");
  },

  userDetail(userId) {
    return request(`/users/${userId}`, { auth: false });
  },

  searchBooks(filters = {}) {
    return request(`/books${buildQuery(filters)}`, { auth: false });
  },

  bookDetail(bookId) {
    return request(`/books/${bookId}`, { auth: false });
  },

  createBook(payload) {
    return request("/books", { method: "POST", body: payload });
  },

  updateBook(bookId, payload) {
    return request(`/books/${bookId}`, { method: "PUT", body: payload });
  },

  myBooks() {
    return request("/books/mine/items");
  },

  offlineBook(bookId) {
    return request(`/books/${bookId}/offline`, { method: "POST" });
  },

  republishBook(bookId) {
    return request(`/books/${bookId}/republish`, { method: "POST" });
  },

  favorites() {
    return request("/favorites/me");
  },

  addFavorite(bookId) {
    return request(`/favorites/${bookId}`, { method: "POST" });
  },

  removeFavorite(bookId) {
    return request(`/favorites/${bookId}`, { method: "DELETE" });
  },

  cartItems() {
    return request("/cart/items");
  },

  addToCart(bookId) {
    return request("/cart/items", { method: "POST", body: { book_id: bookId } });
  },

  removeCartItem(bookId) {
    return request(`/cart/items/${bookId}`, { method: "DELETE" });
  },

  listOrders(role = "all") {
    return request(`/orders/me${buildQuery({ role })}`);
  },

  createDirectOrder(payload) {
    return request("/orders/direct", { method: "POST", body: payload });
  },

  createOrdersFromCart(payload) {
    return request("/orders/from-cart", { method: "POST", body: payload });
  },

  payOrder(orderId) {
    return request(`/orders/${orderId}/pay`, { method: "POST" });
  },

  shipOrder(orderId) {
    return request(`/orders/${orderId}/ship`, { method: "POST" });
  },

  confirmReceipt(orderId) {
    return request(`/orders/${orderId}/confirm-receipt`, { method: "POST" });
  },

  cancelOrder(orderId) {
    return request(`/orders/${orderId}/cancel`, { method: "POST" });
  },

  createReview(payload) {
    return request("/reviews", { method: "POST", body: payload });
  },

  sellerReviews(sellerId) {
    return request(`/reviews/seller/${sellerId}`, { auth: false });
  },
};
