require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ================= DATABASE =================

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME,
  port: process.env.MYSQLPORT || process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ================= CONFIG =================

const JWT_SECRET = process.env.JWT_SECRET || "abc123";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Admin";

const BANK_NAME = "MB Bank";
const ACCOUNT_NO = "1010135256004";
const ACCOUNT_NAME = "LE PHI TRUONG";

// ================= AUTO CREATE TABLES =================

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        order_code VARCHAR(100),
        total_amount INT,
        bank_name VARCHAR(100),
        account_no VARCHAR(50),
        account_name VARCHAR(100),
        payment_content VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT,
        product_id INT,
        product_name VARCHAR(255),
        price INT,
        quantity INT,
        image TEXT
      )
    `);

    await createDefaultAdmin();

    console.log("Database ready");
  } catch (error) {
    console.log("DB error:", error.message);
  }
}

async function createDefaultAdmin() {
  const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
    ADMIN_EMAIL,
  ]);

  if (users.length > 0) {
    console.log("Admin account already exists");
    return;
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await pool.query(
    "INSERT INTO users(username, email, password, role) VALUES (?, ?, ?, ?)",
    [ADMIN_USERNAME, ADMIN_EMAIL, hash, "admin"]
  );

  console.log("Default admin created");
}

initDB();

// ================= HELPER =================

function createOrderCode() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  return `DH${year}${month}${day}${hour}${minute}${second}`;
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

// ================= MIDDLEWARE =================

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Chưa có token" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Token lỗi hoặc đã hết hạn" });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Bạn không có quyền admin" });
  }

  next();
}

// ================= AUTH =================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ username, email và password",
      });
    }

    const [exist] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (exist.length > 0) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users(username, email, password, role) VALUES (?, ?, ?, ?)",
      [username, email, hash, "user"]
    );

    return res.json({ message: "Đăng ký thành công" });
  } catch (error) {
    console.log("Register error:", error.message);
    return res.status(500).json({ message: "Lỗi đăng ký tài khoản" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Vui lòng nhập email và password",
      });
    }

    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(400).json({ message: "Email không tồn tại" });
    }

    const user = users[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ message: "Sai mật khẩu" });
    }

    const token = createToken(user);

    delete user.password;

    return res.json({
      message: "Đăng nhập thành công",
      token,
      user,
    });
  } catch (error) {
    console.log("Login error:", error.message);
    return res.status(500).json({ message: "Lỗi đăng nhập" });
  }
});

// ================= ADMIN USERS =================

app.get("/api/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, username, email, role, created_at FROM users ORDER BY id DESC"
    );

    return res.json(users);
  } catch (error) {
    console.log("Get users error:", error.message);
    return res.status(500).json({ message: "Không tải được danh sách user" });
  }
});

app.post("/api/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ username, email và password",
      });
    }

    const [exist] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (exist.length > 0) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users(username, email, password, role) VALUES (?, ?, ?, ?)",
      [username, email, hash, role || "user"]
    );

    return res.json({ message: "Thêm user thành công" });
  } catch (error) {
    console.log("Add user error:", error.message);
    return res.status(500).json({ message: "Lỗi thêm user" });
  }
});

app.delete("/api/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({
        message: "Không thể tự xóa tài khoản đang đăng nhập",
      });
    }

    await pool.query("DELETE FROM users WHERE id = ?", [id]);

    return res.json({ message: "Xóa user thành công" });
  } catch (error) {
    console.log("Delete user error:", error.message);
    return res.status(500).json({ message: "Lỗi xóa user" });
  }
});

// ================= ORDER =================

app.post("/api/orders", authMiddleware, async (req, res) => {
  try {
    const { items, total_amount } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Giỏ hàng trống" });
    }

    if (!total_amount || total_amount <= 0) {
      return res.status(400).json({ message: "Tổng tiền không hợp lệ" });
    }

    const orderCode = createOrderCode();

    const paymentContent = `Thanh toán số tiền ${total_amount} cho mã đơn hàng ${orderCode}`;

    const [result] = await pool.query(
      `
      INSERT INTO orders(
        user_id,
        order_code,
        total_amount,
        bank_name,
        account_no,
        account_name,
        payment_content
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user.id,
        orderCode,
        total_amount,
        BANK_NAME,
        ACCOUNT_NO,
        ACCOUNT_NAME,
        paymentContent,
      ]
    );

    const orderId = result.insertId;

    for (const item of items) {
      await pool.query(
        `
        INSERT INTO order_items(
          order_id,
          product_id,
          product_name,
          price,
          quantity,
          image
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.id,
          item.title,
          item.price,
          item.quantity,
          item.thumbnail,
        ]
      );
    }

    return res.json({
      message: "Tạo đơn hàng thành công",
      order: {
        id: orderId,
        order_code: orderCode,
        total_amount,
        bank_name: BANK_NAME,
        account_no: ACCOUNT_NO,
        account_name: ACCOUNT_NAME,
        payment_content: paymentContent,
      },
    });
  } catch (error) {
    console.log("Create order error:", error.message);
    return res.status(500).json({ message: "Lỗi tạo đơn hàng" });
  }
});

app.get("/api/orders", authMiddleware, async (req, res) => {
  try {
    const [orders] = await pool.query(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC",
      [req.user.id]
    );

    for (const order of orders) {
      const [items] = await pool.query(
        "SELECT * FROM order_items WHERE order_id = ?",
        [order.id]
      );

      order.items = items;
    }

    return res.json(orders);
  } catch (error) {
    console.log("Get orders error:", error.message);
    return res.status(500).json({ message: "Không tải được đơn hàng" });
  }
});

// ================= TEST =================

app.get("/", (req, res) => {
  res.send("API running");
});

// ================= START =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server chạy trên port ${PORT}`);
});