const path = require("path");
const fs = require("fs");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "nestand-development-secret";
const dataDir = path.join(__dirname, "data");
const databaseFile = path.join(dataDir, "nestand.json");
fs.mkdirSync(dataDir, { recursive: true });

const seedProducts = [
  [
    "Dell G15 5530",
    "Gaming laptops",
    "A powerful gaming laptop widely available in Pakistan for competitive play, streaming, and demanding creative work.",
    402900,
    "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1000&q=88",
    "Gaming",
    4.9,
    12,
    "Dell",
    "Intel Core i9-14900HX",
    "32 GB DDR5",
    "1 TB NVMe SSD",
    "Gaming",
  ],
  [
    "Lenovo LOQ 15IRX9",
    "Workstation laptops",
    "A performance-focused Lenovo laptop popular with Pakistani students, developers, and creators.",
    300900,
    "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1000&q=88",
    "Workstation",
    4.8,
    9,
    "Lenovo",
    "Intel Core Ultra 7 165H",
    "32 GB LPDDR5X",
    "1 TB PCIe 4.0 SSD",
    "Workstation",
  ],
  [
    "HP Victus 15",
    "Workstation laptops",
    "An affordable HP gaming laptop with strong everyday performance and a discrete graphics card.",
    321300,
    "https://images.unsplash.com/photo-1593642702749-b7d2a804fbcf?auto=format&fit=crop&w=1000&q=88",
    "Creator pick",
    4.7,
    15,
    "HP",
    "AMD Ryzen 9 8945HS",
    "32 GB DDR5",
    "2 TB NVMe SSD",
    "Workstation",
  ],
  [
    "ASUS TUF Gaming A15",
    "Gaming laptops",
    "A durable ASUS gaming laptop with a high-refresh display and graphics ready for modern titles.",
    316200,
    "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=1000&q=88",
    "Best value",
    4.8,
    21,
    "ASUS",
    "AMD Ryzen 7 8845HS",
    "16 GB DDR5",
    "1 TB NVMe SSD",
    "Gaming",
  ],
  [
    "Acer Aspire 5",
    "Everyday laptops",
    "A practical Acer laptop for study, office work, browsing, and daily use in Pakistan.",
    198900,
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&q=88",
    "Lightweight",
    4.6,
    28,
    "Acer",
    "Intel Core Ultra 5 125H",
    "16 GB LPDDR5X",
    "512 GB NVMe SSD",
    "Everyday",
  ],
  [
    "MSI Katana 15",
    "Workstations",
    "A strong MSI gaming laptop for 3D work, engineering, code, and modern PC games.",
    428400,
    "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=1000&q=88",
    "Pro setup",
    4.9,
    7,
    "MSI",
    "Intel Core i9-14900K",
    "64 GB DDR5",
    "2 TB NVMe SSD",
    "Workstation",
  ],
  [
    "Glide Wireless Mouse",
    "Mouse",
    "A precise wireless mouse with a comfortable shape for long gaming and work sessions.",
    14790,
    "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1000&q=88",
    "New",
    4.8,
    34,
    "Nexus Glide",
    "PixArt PAW3395 sensor",
    "2.4 GHz wireless",
    "80-hour battery",
    "Gaming / Work",
  ],
  [
    "Keyline 75 Keyboard",
    "Keyboard",
    "A hot-swappable mechanical keyboard with a compact layout and satisfying tactile feedback.",
    19890,
    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=88",
    "Bestseller",
    4.9,
    20,
    "Nexus Keyline",
    "Hot-swappable mechanical",
    "RGB backlight",
    "75% layout",
    "Gaming / Work",
  ],
  [
    "Atmos ANC Headphones",
    "Headphones",
    "Immersive wireless headphones with adaptive noise cancellation for focus anywhere.",
    27540,
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=88",
    "Top rated",
    4.8,
    18,
    "Nexus Atmos",
    "Adaptive ANC",
    "40-hour battery",
    "Bluetooth 5.3",
    "Audio",
  ],
  [
    "Forge DDR5 Memory Kit",
    "RAM",
    "A fast 32 GB memory kit for smoother multitasking, rendering, and high-frame-rate play.",
    35700,
    "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=1000&q=88",
    "Upgrade pick",
    4.7,
    26,
    "Nexus Forge",
    "DDR5-6000",
    "32 GB (2 x 16 GB)",
    "CL30 timing",
    "Gaming / Workstation",
  ],
  [
    "Vault 2TB NVMe SSD",
    "SSD",
    "High-speed solid-state storage for fast boot times, large projects, and responsive game libraries.",
    53040,
    "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=1000&q=88",
    "Fast shipping",
    4.9,
    19,
    "Nexus Vault",
    "PCIe 4.0 NVMe",
    "2 TB capacity",
    "7,400 MB/s read",
    "Storage",
  ],
  [
    "Raytrace RTX Graphics Card",
    "Graphics cards",
    "A modern graphics card for ray-traced gaming, 3D creation, and accelerated creative workflows.",
    242760,
    "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1000&q=88",
    "Performance pick",
    4.9,
    8,
    "Nexus Raytrace",
    "12 GB GDDR6X",
    "2,560 CUDA cores",
    "PCIe 4.0",
    "Gaming / Creator",
  ],
].map(
  (
    [
      name,
      category,
      description,
      price,
      image,
      badge,
      rating,
      stock,
      company,
      processor,
      ram,
      storage,
      useCase,
    ],
    index,
  ) => ({
    id: index + 1,
    name,
    category,
    description,
    price,
    image,
    badge,
    rating,
    stock,
    company,
    processor,
    ram,
    storage,
    useCase,
  }),
);

const officialProductPages = {
  "Dell G15 5530": "https://www.dell.com/en-pk",
  "Lenovo LOQ 15IRX9": "https://www.lenovo.com/pk/en/c/laptops/loq-laptops/",
  "HP Victus 15":
    "https://www.hp.com/us-en/shop/cat/gaming-3074457345617980168--1",
  "ASUS TUF Gaming A15": "https://www.asus.com/laptops/for-gaming/tuf-gaming/",
  "Acer Aspire 5": "https://www.acer.com/us-en/laptops/aspire/aspire-5",
  "MSI Katana 15": "https://www.msi.com/Laptop/Katana-15-B13VX",
};
seedProducts.forEach((product) => {
  product.officialUrl = officialProductPages[product.name] || null;
});

function loadDatabase() {
  if (!fs.existsSync(databaseFile))
    return {
      users: [],
      products: seedProducts,
      orders: [],
      nextUserId: 1,
      nextOrderId: 1,
    };
  return JSON.parse(fs.readFileSync(databaseFile, "utf8"));
}
let database = loadDatabase();
function saveDatabase() {
  fs.writeFileSync(databaseFile, JSON.stringify(database, null, 2));
}
database.orders = database.orders.map((order) => ({
  ...order,
  trackingNumber:
    order.trackingNumber || `NEX-${String(order.id).padStart(6, "0")}`,
  status: order.status || "Confirmed",
  statusHistory: order.statusHistory || [
    { status: order.status || "Confirmed", date: order.createdAt },
  ],
}));
database.products = seedProducts;
saveDatabase();

app.use(express.json());
const frontendDirectory = fs.existsSync(path.join(__dirname, "dist"))
  ? "dist"
  : "public";
app.use(express.static(path.join(__dirname, frontendDirectory)));

function authRequired(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token)
    return res.status(401).json({ message: "Please sign in to continue." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res
      .status(401)
      .json({ message: "Your session has expired. Please sign in again." });
  }
}

app.get("/api/products", (req, res) => res.json(database.products));
app.get("/api/products/:id", (req, res) => {
  const product = database.products.find(
    (item) => item.id === Number(req.params.id),
  );
  if (!product) return res.status(404).json({ message: "Product not found." });
  res.json(product);
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({
      message: "Add your name, a valid email, and a password of 6+ characters.",
    });
  const normalizedEmail = email.trim().toLowerCase();
  if (database.users.some((user) => user.email === normalizedEmail))
    return res
      .status(409)
      .json({ message: "An account with this email already exists." });
  const user = {
    id: database.nextUserId++,
    name: name.trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  };
  database.users.push(user);
  saveDatabase();
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
  res
    .status(201)
    .json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/auth/login", async (req, res) => {
  const user = database.users.find(
    (item) => item.email === req.body.email?.trim().toLowerCase(),
  );
  if (!user || !(await bcrypt.compare(req.body.password || "", user.password)))
    return res.status(401).json({ message: "Email or password is incorrect." });
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

app.put("/api/account/password", authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = database.users.find((item) => item.id === req.user.id);
  if (!user || !(await bcrypt.compare(currentPassword || "", user.password)))
    return res.status(401).json({ message: "Current password is incorrect." });
  if (!newPassword || newPassword.length < 6)
    return res
      .status(400)
      .json({ message: "New password must be at least 6 characters." });
  user.password = await bcrypt.hash(newPassword, 10);
  saveDatabase();
  res.json({ message: "Password changed successfully." });
});

app.post("/api/orders", authRequired, (req, res) => {
  const { items, total } = req.body;
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    !Number.isFinite(Number(total))
  )
    return res.status(400).json({ message: "Your cart is empty." });
  const order = {
    id: database.nextOrderId++,
    userId: req.user.id,
    items,
    total: Number(total),
    paymentMethod: req.body.paymentMethod || "cod",
    address: req.body.address || {},
    status: "Processing",
    trackingNumber: `NEX-${String(database.nextOrderId).padStart(6, "0")}`,
    statusHistory: [
      { status: "Confirmed", date: new Date().toISOString() },
      { status: "Processing", date: new Date().toISOString() },
    ],
    createdAt: new Date().toISOString(),
  };
  database.orders.push(order);
  saveDatabase();
  res.status(201).json({ orderId: order.id, message: "Order confirmed." });
});

app.get("/api/orders", authRequired, (req, res) =>
  res.json(database.orders.filter((order) => order.userId === req.user.id)),
);
app.get("/api/orders/:trackingNumber/track", authRequired, (req, res) => {
  const order = database.orders.find(
    (item) =>
      item.trackingNumber === req.params.trackingNumber &&
      item.userId === req.user.id,
  );
  if (!order) return res.status(404).json({ message: "Order not found." });
  res.json({
    orderId: order.id,
    trackingNumber: order.trackingNumber,
    status: order.status,
    statusHistory: order.statusHistory,
    createdAt: order.createdAt,
  });
});
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, frontendDirectory, "index.html")),
);
app.listen(PORT, () =>
  console.log(`Northstar Supply running at http://localhost:${PORT}`),
);
