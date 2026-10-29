const state = {
  products: [],
  category: "All",
  search: "",
  cart: JSON.parse(localStorage.getItem("nest-cart") || "[]"),
  user: JSON.parse(localStorage.getItem("nest-user") || "null"),
  token: localStorage.getItem("nest-token"),
};
const $ = (selector) => document.querySelector(selector);
document.body.append($("#account-modal"), $("#checkout-modal"));
const money = (value) =>
  `PKR ${Number(value).toLocaleString("en-PK")}`;
const imageFallback = (event) => {
  event.target.classList.add("missing-image");
  event.target.alt = "Add your product photo to public/images";
};
const toast = (message) => {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
};
const saveCart = () => {
  localStorage.setItem("nest-cart", JSON.stringify(state.cart));
  renderCart();
  updateCartCount();
};
const updateCartCount = () => {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  document
    .querySelectorAll(".cart-count,.drawer-count")
    .forEach((el) => (el.textContent = count));
};

function openSideNav() {
  $("#side-nav").classList.add("open");
  $("#side-nav").setAttribute("aria-hidden", "false");
}
function closeSideNav() {
  $("#side-nav").classList.remove("open");
  $("#side-nav").setAttribute("aria-hidden", "true");
}
function focusSearch() {
  const search = $("#product-search");
  document.querySelector("#shop").scrollIntoView({ behavior: "smooth" });
  setTimeout(() => search.focus(), 300);
}
function renderCategoryLinks() {
  const categories = [
    "All",
    "Gaming laptops",
    "Workstation laptops",
    "Everyday laptops",
    "Workstations",
    "Mouse",
    "Keyboard",
    "Headphones",
    "RAM",
    "SSD",
    "Graphics cards",
  ];
  $(".category-links").innerHTML = categories
    .map(
      (category) =>
        `<a href="#category=${encodeURIComponent(category)}" data-action="close-menu">${category}</a>`,
    )
    .join("");
}

async function loadProducts() {
  const response = await fetch("/api/products");
  state.products = await response.json();
  renderProducts();
}
function visibleProducts() {
  return state.products.filter(
    (product) =>
      (state.category === "All" || product.category === state.category) &&
      `${product.name} ${product.company} ${product.processor} ${product.ram} ${product.storage} ${product.description}`
        .toLowerCase()
        .includes(state.search.toLowerCase()),
  );
}
function renderProducts() {
  const grid = $("#product-grid");
  const products = visibleProducts();
  if (!products.length) {
    grid.innerHTML = '<div class="loading">No pieces match your search.</div>';
    return;
  }
  grid.innerHTML = products
    .map(
      (product, index) =>
        `<article class="product-card" style="animation-delay:${index * 70}ms"><a class="product-image" href="#product-${product.id}"><img src="${product.image}" alt="${product.name}" loading="lazy" onerror="imageFallback(event)">${product.badge ? `<span class="product-badge">${product.badge}</span>` : ""}<button class="quick-add" data-add="${product.id}" type="button">Add to bag +</button></a><div class="product-meta"><div><p class="product-company">${product.company}</p><h3>${product.name}</h3><p>${product.category}</p><div class="spec-row"><span>${product.processor}</span><span>${product.ram}</span><span>${product.storage}</span></div><div class="rating"><span>★★★★★</span> ${product.rating}</div></div><strong class="product-price">${money(product.price)}</strong></div></article>`,
    )
    .join("");
  grid.querySelectorAll("[data-add]").forEach((button) =>
    button.addEventListener("click", (event) => {
      event.preventDefault();
      addToCart(Number(button.dataset.add));
    }),
  );
}
function addToCart(productId) {
  const product = state.products.find((item) => item.id === productId);
  const item = state.cart.find((entry) => entry.id === productId);
  if (item) item.quantity += 1;
  else
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });
  saveCart();
  toast(`${product.name} added to your bag`);
}
function renderCart() {
  const container = $("#cart-items");
  if (!state.cart.length) {
    container.innerHTML =
      '<div class="empty-cart">Your bag is waiting for something lovely.<br><br><a href="#shop" class="text-link" data-action="close-cart">Explore the collection →</a></div>';
    $("#cart-total").textContent = money(0);
    return;
  }
  container.innerHTML = state.cart
    .map(
      (item) =>
        `<div class="cart-item"><img src="${item.image}" alt="${item.name}"><div><h3>${item.name}</h3><p>${money(item.price)}</p><div class="qty-control"><button data-qty="${item.id}" data-change="-1" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button data-qty="${item.id}" data-change="1" aria-label="Increase quantity">+</button></div><button class="remove-item" data-remove="${item.id}" type="button">Remove</button></div><strong class="cart-item-price">${money(item.price * item.quantity)}</strong></div>`,
    )
    .join("");
  const total = state.cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  $("#cart-total").textContent = money(total);
  container
    .querySelectorAll("[data-qty]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        changeQuantity(
          Number(button.dataset.qty),
          Number(button.dataset.change),
        ),
      ),
    );
  container
    .querySelectorAll("[data-remove]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        removeFromCart(Number(button.dataset.remove)),
      ),
    );
}
function removeFromCart(id) {
  state.cart = state.cart.filter((item) => item.id !== id);
  saveCart();
  toast("Item removed from your bag");
}
function changeQuantity(id, amount) {
  const item = state.cart.find((entry) => entry.id === id);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0)
    state.cart = state.cart.filter((entry) => entry.id !== id);
  saveCart();
}
function openCart() {
  $("#cart-drawer").classList.add("open");
  $("#cart-drawer").setAttribute("aria-hidden", "false");
}
function closeCart() {
  $("#cart-drawer").classList.remove("open");
  $("#cart-drawer").setAttribute("aria-hidden", "true");
}
function openAuth(mode = "login") {
  setAuthMode(mode);
  $("#auth-modal").classList.add("open");
  $("#auth-modal").setAttribute("aria-hidden", "false");
}
function closeAuth() {
  $("#auth-modal").classList.remove("open");
  $("#auth-modal").setAttribute("aria-hidden", "true");
}
function openAccount() {
  if (!state.user) return openAuth();
  $("#account-summary").textContent =
    `${state.user.name} · ${state.user.email}`;
  renderAccountTab("profile");
  $("#account-modal").classList.add("open");
  $("#account-modal").setAttribute("aria-hidden", "false");
}
function closeAccount() {
  $("#account-modal").classList.remove("open");
  $("#account-modal").setAttribute("aria-hidden", "true");
}
function renderAccountTab(tab) {
  document
    .querySelectorAll("[data-account-tab]")
    .forEach((item) =>
      item.classList.toggle("active", item.dataset.accountTab === tab),
    );
  const saved = JSON.parse(localStorage.getItem("nexus-address") || "{}");
  const content = $("#account-content");
  if (tab === "profile")
    content.innerHTML = `<div class="account-card"><b>${state.user.name}</b><span>${state.user.email}</span><span>Member since 2026</span></div>`;
  if (tab === "orders") {
    content.innerHTML =
      '<div class="account-card"><span>Loading your orders...</span></div>';
    loadAccountOrders();
  }
  if (tab === "security")
    content.innerHTML = `<form id="password-form" class="account-form"><label>Current password<input id="current-password" type="password" required></label><label>New password<input id="new-password" type="password" minlength="6" required></label><button class="button button-dark" type="submit">Change password</button><p class="auth-message" id="password-message"></p></form>`;
  if (tab === "address")
    content.innerHTML = `<form id="address-form" class="account-form"><label>Billing / delivery address<textarea id="saved-address" required>${saved.address || ""}</textarea></label><div class="form-grid"><label>City<input id="saved-city" required value="${saved.city || ""}"></label><label>Postal code<input id="saved-postal" required value="${saved.postal || ""}"></label></div><button class="button button-dark" type="submit">Save address</button><p class="auth-message" id="address-message"></p></form>`;
  $("#password-form")?.addEventListener("submit", changePassword);
  $("#address-form")?.addEventListener("submit", saveAddress);
}
async function loadAccountOrders() {
  const response = await fetch("/api/orders", {
    headers: { Authorization: `Bearer ${state.token}` },
  });
  const orders = await response.json();
  if (!response.ok) {
    $("#account-content").innerHTML =
      `<p class="auth-message">${orders.message}</p>`;
    return;
  }
  $("#account-content").innerHTML = orders.length
    ? orders
        .map(
          (order) =>
            `<article class="order-card"><div><b>Order #${order.id}</b><span>${order.status}</span></div><p>${order.items.length} item(s) · ${money(order.total)}</p><strong>${order.trackingNumber}</strong><button class="button button-outline track-button" data-track="${order.trackingNumber}">Track order</button><div class="tracking-result" id="track-${order.trackingNumber}"></div></article>`,
        )
        .join("")
    : '<div class="account-card"><span>You have no orders yet.</span></div>';
  document
    .querySelectorAll("[data-track]")
    .forEach((button) =>
      button.addEventListener("click", () => trackOrder(button.dataset.track)),
    );
}
async function trackOrder(trackingNumber) {
  const response = await fetch(`/api/orders/${trackingNumber}/track`, {
    headers: { Authorization: `Bearer ${state.token}` },
  });
  const data = await response.json();
  if (!response.ok) return toast(data.message);
  const target = $(`#track-${trackingNumber}`);
  target.innerHTML = `<div class="tracking-line">${data.statusHistory.map((entry) => `<span><b>${entry.status}</b><small>${new Date(entry.date).toLocaleString()}</small></span>`).join("")}</div>`;
}
async function changePassword(event) {
  event.preventDefault();
  const response = await fetch("/api/account/password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.token}`,
    },
    body: JSON.stringify({
      currentPassword: $("#current-password").value,
      newPassword: $("#new-password").value,
    }),
  });
  const data = await response.json();
  $("#password-message").textContent = data.message;
}
function saveAddress(event) {
  event.preventDefault();
  localStorage.setItem(
    "nexus-address",
    JSON.stringify({
      address: $("#saved-address").value,
      city: $("#saved-city").value,
      postal: $("#saved-postal").value,
    }),
  );
  $("#address-message").textContent = "Address saved to this browser.";
}
function setAuthMode(mode) {
  const register = mode === "register";
  document
    .querySelectorAll(".auth-tab")
    .forEach((tab) =>
      tab.classList.toggle("active", tab.dataset.authMode === mode),
    );
  $("#name-label").classList.toggle("hidden", !register);
  $("#auth-name").required = register;
  $("#auth-submit").innerHTML =
    `${register ? "Create account" : "Sign in"} <span>→</span>`;
  $("#auth-message").textContent = "";
}
async function authSubmit(event) {
  event.preventDefault();
  const register = !$("#name-label").classList.contains("hidden");
  const body = {
    email: $("#auth-email").value,
    password: $("#auth-password").value,
  };
  if (register) body.name = $("#auth-name").value;
  const response = await fetch(`/api/auth/${register ? "register" : "login"}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    $("#auth-message").textContent = data.message;
    return;
  }
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem("nest-token", data.token);
  localStorage.setItem("nest-user", JSON.stringify(data.user));
  closeAuth();
  toast(`Welcome, ${data.user.name.split(" ")[0]}`);
}
async function checkout() {
  if (!state.cart.length) return toast("Your bag is empty");
  if (!state.token) {
    closeCart();
    openAuth("login");
    toast("Sign in to complete your order");
    return;
  }
  const total = state.cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  $("#checkout-total").textContent = money(total);
  $("#checkout-modal").classList.add("open");
  $("#checkout-modal").setAttribute("aria-hidden", "false");
}
async function submitCheckout(event) {
  event.preventDefault();
  const total = state.cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.token}`,
    },
    body: JSON.stringify({
      items: state.cart,
      total: total,
      paymentMethod: $("#payment-method").value,
      address: {
        address: $("#checkout-address").value,
        city: $("#checkout-city").value,
        postal: $("#checkout-postal").value,
      },
    }),
  });
  const data = await response.json();
  if (!response.ok) return ($("#checkout-message").textContent = data.message);
  state.cart = [];
  saveCart();
  closeCart();
  $("#checkout-modal").classList.remove("open");
  toast(`Order #${data.orderId} confirmed. Thank you.`);
}
function productRoute() {
  const id = Number(location.hash.replace("#product-", ""));
  if (!id || !state.products.length) return;
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  $("#product-grid").innerHTML =
    `<article class="detail-view"><a href="#shop" class="text-link">← Back to collection</a><div class="detail-layout"><img src="${product.image}" alt="${product.name}" onerror="imageFallback(event)"><div class="detail-copy"><p class="eyebrow">${product.category} · ${product.useCase}</p><p class="product-company">${product.company}</p><h2>${product.name}</h2><strong class="detail-price">${money(product.price)}</strong><p>${product.description}</p><div class="detail-specs"><span><b>Processor</b>${product.processor}</span><span><b>Memory</b>${product.ram}</span><span><b>Storage</b>${product.storage}</span></div><p class="detail-stock">● In stock and ready to ship</p><button class="button button-dark" data-detail-add="${product.id}">Add to bag <span>→</span></button>${product.officialUrl ? `<a class="official-link" href="${product.officialUrl}" target="_blank" rel="noreferrer">View official manufacturer page ↗</a>` : ""}</div></div></article>`;
  const style = document.createElement("style");
  style.textContent =
    ".detail-view{grid-column:1/-1}.detail-layout{display:grid;grid-template-columns:1fr 1fr;gap:70px;margin-top:35px}.detail-layout>img{width:100%;aspect-ratio:1/1;object-fit:cover}.detail-copy{align-self:center;max-width:400px}.detail-copy h2{font-family:var(--serif);font-size:clamp(42px,5vw,68px);line-height:1.05;font-weight:500;margin:0 0 14px}.detail-price{font-size:16px}.detail-copy>p:not(.eyebrow):not(.detail-stock){color:var(--muted);line-height:1.8;margin:28px 0}.detail-stock{font-size:12px;color:var(--sage);margin-bottom:28px}@media(max-width:760px){.detail-layout{grid-template-columns:1fr;gap:30px}}";
  document.head.appendChild(style);
  $("#product-grid")
    .querySelector("[data-detail-add]")
    .addEventListener("click", () => addToCart(product.id));
}

function categoryRoute() {
  if (!location.hash.startsWith("#category=")) return false;
  const category = decodeURIComponent(location.hash.split("=")[1] || "All");
  state.category = category;
  document.querySelectorAll(".filter").forEach((item) => {
    item.classList.toggle("active", item.dataset.category === category);
  });
  $(".section-heading h2").textContent =
    category === "All"
      ? "Power for your kind of work."
      : `${category} essentials.`;
  $(".section-heading .eyebrow").textContent =
    category === "All" ? "The laptop collection" : `${category} collection`;
  renderProducts();
  document.querySelector("#shop").scrollIntoView({ behavior: "smooth" });
  document.title = `${category === "All" ? "All products" : category} | Nexus Store`;
  return true;
}

function route() {
  if (categoryRoute()) return;
  if (location.hash.startsWith("#product-")) {
    productRoute();
    return;
  }
  document.title = "Nexus Store | Laptops for every build";
}

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "menu") openSideNav();
  if (action === "close-menu") closeSideNav();
  if (action === "search") focusSearch();
  if (action === "cart") openCart();
  if (action === "close-cart") closeCart();
  if (action === "account") state.user ? openAccount() : openAuth();
  if (action === "close-account") closeAccount();
  if (action === "close-checkout")
    $("#checkout-modal").classList.remove("open");
  if (action === "logout") {
    state.user = null;
    state.token = null;
    localStorage.removeItem("nest-user");
    localStorage.removeItem("nest-token");
    closeAccount();
    toast("You have been logged out");
  }
  if (action === "close-modal") closeAuth();
  if (action === "checkout") checkout();
  if (action === "theme") toggleTheme();
});

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;
  localStorage.setItem("nexus-theme", nextTheme);
  $(".theme-icon").textContent = nextTheme === "dark" ? "☀" : "☾";
  $(".theme-label").textContent = nextTheme === "dark" ? "Light" : "Dark";
  $(".theme-toggle").setAttribute("aria-pressed", nextTheme === "dark");
}

function toggleTheme() {
  const nextTheme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
}
document
  .querySelectorAll("[data-auth-mode]")
  .forEach((tab) =>
    tab.addEventListener("click", () => setAuthMode(tab.dataset.authMode)),
  );
document
  .querySelectorAll("[data-account-tab]")
  .forEach((tab) =>
    tab.addEventListener("click", () =>
      renderAccountTab(tab.dataset.accountTab),
    ),
  );
$("#payment-method").addEventListener("change", (event) => {
  $("#card-fields").classList.toggle("hidden", event.target.value !== "card");
});
document.querySelectorAll(".filter").forEach((button) =>
  button.addEventListener("click", () => {
    location.hash = `category=${encodeURIComponent(button.dataset.category)}`;
  }),
);
$("#product-search").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderProducts();
});
$("#auth-form").addEventListener("submit", authSubmit);
$("#checkout-form").addEventListener("submit", submitCheckout);
$("#newsletter-form").addEventListener("submit", (event) => {
  event.preventDefault();
  event.target.reset();
  toast("You are on the list. Welcome in.");
});
window.addEventListener("hashchange", route);
applyTheme(localStorage.getItem("nexus-theme") || "light");
renderCategoryLinks();
loadProducts().then(() => {
  updateCartCount();
  renderCart();
  route();
});
