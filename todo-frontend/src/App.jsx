import { useEffect, useState } from "react";

const API_URL = "https://truonglpshop.onrender.com";
const PRODUCT_API = "https://dummyjson.com/products?limit=30";

const BANK_ID = "MB";
const ACCOUNT_NO = "1010135256004";
const ACCOUNT_NAME = "LE PHI TRUONG";

function App() {
  const [mode, setMode] = useState("login");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("truonglp1502@gmail.com");
  const [password, setPassword] = useState("123456");

  const [adminUsername, setAdminUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminRole, setAdminRole] = useState("user");

  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [users, setUsers] = useState([]);

  const [tab, setTab] = useState("shop");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);

  const [order, setOrder] = useState(null);

  const limit = 8;
  const exchangeRate = 25000;

  async function register() {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) setMode("login");
  }

  async function login() {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.token) {
      setToken(data.token);
      setUser(data.user);
      setTab("shop");
    } else {
      alert(data.message || "Đăng nhập thất bại");
    }
  }

  async function loadProducts() {
    const res = await fetch(PRODUCT_API);
    const data = await res.json();
    setProducts(data.products || []);
  }

  async function loadUsers() {
    const res = await fetch(`${API_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (Array.isArray(data)) setUsers(data);
    else alert(data.message || "Không tải được danh sách user");
  }

  async function addUserByAdmin() {
    const res = await fetch(`${API_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        role: adminRole,
      }),
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) {
      setAdminUsername("");
      setAdminEmail("");
      setAdminPassword("");
      setAdminRole("user");
      loadUsers();
    }
  }

  async function deleteUser(id) {
    if (!confirm("Bạn có chắc muốn xóa user này?")) return;

    const res = await fetch(`${API_URL}/api/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) loadUsers();
  }

  useEffect(() => {
    if (user) {
      loadProducts();
      if (user.role === "admin") loadUsers();
    }
  }, [user]);

  function finalPrice(product) {
    return product.price * (1 - product.discountPercentage / 100);
  }

  function formatVND(amount) {
    return Math.round(amount).toLocaleString("vi-VN") + " VNĐ";
  }

  function generateOrderCode() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");

    return `DH${year}${month}${day}${hour}${minute}${second}`;
  }

  function checkout() {
    if (cart.length === 0) {
      alert("Giỏ hàng đang trống");
      return;
    }

    const orderCode = generateOrderCode();
    const amount = Math.round(totalVND);

    const content = `Thanh toan so tien ${amount} cho ma don hang ${orderCode}`;

    const qrUrl =
      `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png` +
      `?amount=${amount}` +
      `&addInfo=${encodeURIComponent(content)}` +
      `&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

    setOrder({
      orderCode,
      amount,
      accountNo: ACCOUNT_NO,
      bankName: "MB Bank",
      accountName: ACCOUNT_NAME,
      content,
      qrUrl,
      createdAt: new Date().toLocaleString("vi-VN"),
    });

    setTab("payment");
  }

  function logout() {
    setToken("");
    setUser(null);
    setProducts([]);
    setCart([]);
    setUsers([]);
    setOrder(null);
    setTab("shop");
    setSelectedCategory("all");
    setSort("default");
    setPage(1);
    setEmail("truonglp1502@gmail.com");
    setPassword("123456");
  }

  const categories = ["all", ...new Set(products.map((p) => p.category))];

  let filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  if (sort === "price-asc") {
    filteredProducts = [...filteredProducts].sort(
      (a, b) => finalPrice(a) - finalPrice(b)
    );
  }

  if (sort === "price-desc") {
    filteredProducts = [...filteredProducts].sort(
      (a, b) => finalPrice(b) - finalPrice(a)
    );
  }

  if (sort === "discount-desc") {
    filteredProducts = [...filteredProducts].sort(
      (a, b) => b.discountPercentage - a.discountPercentage
    );
  }

  const totalPages = Math.ceil(filteredProducts.length / limit) || 1;

  const paginatedProducts = filteredProducts.slice(
    (page - 1) * limit,
    page * limit
  );

  function addToCart(product) {
    const found = cart.find((item) => item.id === product.id);

    if (found) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  }

  function increaseQuantity(id) {
    setCart(
      cart.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }

  function decreaseQuantity(id) {
    setCart(
      cart.map((item) =>
        item.id === id && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  }

  function removeFromCart(id) {
    setCart(cart.filter((item) => item.id !== id));
  }

  const totalUSD = cart.reduce(
    (sum, item) => sum + finalPrice(item) * item.quantity,
    0
  );

  const totalVND = totalUSD * exchangeRate;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.logo}>TRƯỜNG_LÊ-SHOP</h1>

        {user ? (
          <div style={styles.userBox}>
            <span>
              Xin chào, <b>{user.username}</b> - {user.role}
            </span>

            <button style={styles.logoutBtn} onClick={logout}>
              Đăng xuất
            </button>
          </div>
        ) : (
          <span>Vui lòng đăng nhập</span>
        )}
      </header>

      {!user ? (
        <div style={styles.loginBox}>
          <h2>
            {mode === "login" ? "Đăng nhập" : "Đăng ký tài khoản người dùng"}
          </h2>

          {mode === "register" && (
            <input
              style={styles.input}
              placeholder="Tên người dùng"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}

          <input
            style={styles.input}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {mode === "login" ? (
            <>
              <button style={styles.primaryBtn} onClick={login}>
                Đăng nhập
              </button>

              <button
                style={styles.registerBtn}
                onClick={() => {
                  setMode("register");
                  setUsername("");
                  setEmail("");
                  setPassword("");
                }}
              >
                Đăng ký tài khoản người dùng
              </button>
            </>
          ) : (
            <>
              <button style={styles.primaryBtn} onClick={register}>
                Tạo tài khoản
              </button>

              <button
                style={styles.registerBtn}
                onClick={() => {
                  setMode("login");
                  setEmail("truonglp1502@gmail.com");
                  setPassword("123456");
                }}
              >
                Quay lại đăng nhập
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <nav style={styles.nav}>
            <button
              style={tab === "shop" ? styles.activeTab : styles.tab}
              onClick={() => setTab("shop")}
            >
              Sản phẩm
            </button>

            <button
              style={tab === "cart" ? styles.activeTab : styles.tab}
              onClick={() => setTab("cart")}
            >
              Giỏ hàng ({cart.length})
            </button>

            {order && (
              <button
                style={tab === "payment" ? styles.activeTab : styles.tab}
                onClick={() => setTab("payment")}
              >
                Phiếu thanh toán
              </button>
            )}

            {user.role === "admin" && (
              <button
                style={tab === "admin" ? styles.activeTab : styles.tab}
                onClick={() => {
                  setTab("admin");
                  loadUsers();
                }}
              >
                Quản lý user
              </button>
            )}
          </nav>

          {tab === "admin" && user.role === "admin" && (
            <div style={styles.adminPage}>
              <h2>Quản lý người dùng</h2>

              <div style={styles.adminForm}>
                <h3>Admin thêm user mới</h3>

                <div style={styles.formGrid}>
                  <input
                    style={styles.input}
                    placeholder="Username"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                  />

                  <input
                    style={styles.input}
                    placeholder="Email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />

                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />

                  <select
                    style={styles.input}
                    value={adminRole}
                    onChange={(e) => setAdminRole(e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <button style={styles.primaryBtn} onClick={addUserByAdmin}>
                  Thêm user
                </button>
              </div>

              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Username</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Hành động</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={styles.td}>{u.id}</td>
                      <td style={styles.td}>{u.username}</td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.roleBadge,
                            background:
                              u.role === "admin" ? "#dc2626" : "#2563eb",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          style={styles.deleteBtn}
                          onClick={() => deleteUser(u.id)}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "shop" && (
            <div style={styles.layout}>
              <aside style={styles.sidebar}>
                <h2>Nhóm sản phẩm</h2>

                <select
                  style={styles.categorySelect}
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === "all" ? "Tất cả sản phẩm" : cat}
                    </option>
                  ))}
                </select>
              </aside>

              <main style={styles.products}>
                <div style={styles.productHeader}>
                  <h2>
                    Sản phẩm:{" "}
                    {selectedCategory === "all" ? "Tất cả" : selectedCategory}
                  </h2>

                  <select
                    style={styles.select}
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="default">Mặc định</option>
                    <option value="price-asc">Giá thấp đến cao</option>
                    <option value="price-desc">Giá cao đến thấp</option>
                    <option value="discount-desc">Giảm giá nhiều</option>
                  </select>
                </div>

                <div style={styles.grid}>
                  {paginatedProducts.map((product) => (
                    <div key={product.id} style={styles.card}>
                      <img
                        src={product.thumbnail}
                        alt={product.title}
                        style={styles.image}
                      />

                      <h3>{product.title}</h3>

                      <p style={styles.category}>{product.category}</p>

                      <p>
                        Giá gốc: <del>${product.price}</del>
                      </p>

                      <p>Giảm giá: {product.discountPercentage}%</p>

                      <h3 style={styles.price}>
                        {formatVND(finalPrice(product) * exchangeRate)}
                      </h3>

                      <p>⭐ {product.rating}</p>

                      <button
                        style={styles.addBtn}
                        onClick={() => addToCart(product)}
                      >
                        Thêm vào giỏ hàng
                      </button>
                    </div>
                  ))}
                </div>

                <div style={styles.pagination}>
                  <button
                    style={styles.pageBtn}
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Trang trước
                  </button>

                  <span>
                    Trang {page} / {totalPages}
                  </span>

                  <button
                    style={styles.pageBtn}
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Trang sau
                  </button>
                </div>
              </main>
            </div>
          )}

          {tab === "cart" && (
            <div style={styles.cartPage}>
              <h2>Giỏ hàng</h2>

              {cart.length === 0 ? (
                <p>Giỏ hàng trống</p>
              ) : (
                <>
                  {cart.map((item) => (
                    <div key={item.id} style={styles.cartItem}>
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        style={styles.cartImage}
                      />

                      <div style={{ flex: 1 }}>
                        <b>{item.title}</b>
                        <p>Đơn giá: {formatVND(finalPrice(item) * exchangeRate)}</p>

                        <div style={styles.quantityBox}>
                          <button
                            style={styles.smallBtn}
                            onClick={() => decreaseQuantity(item.id)}
                          >
                            -
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            style={styles.smallBtn}
                            onClick={() => increaseQuantity(item.id)}
                          >
                            +
                          </button>
                        </div>

                        <p>
                          Thành tiền:{" "}
                          <b>
                            {formatVND(
                              finalPrice(item) * item.quantity * exchangeRate
                            )}
                          </b>
                        </p>
                      </div>

                      <button
                        style={styles.deleteBtn}
                        onClick={() => removeFromCart(item.id)}
                      >
                        Xóa
                      </button>
                    </div>
                  ))}

                  <h3>Tổng tiền: {formatVND(totalVND)}</h3>

                  <button style={styles.checkoutBtn} onClick={checkout}>
                    Thanh toán
                  </button>
                </>
              )}
            </div>
          )}

          {tab === "payment" && order && (
            <div style={styles.paymentPage}>
              <h2>Phiếu thanh toán</h2>

              <div style={styles.paymentGrid}>
                <div style={styles.invoiceBox}>
                  <p>
                    <b>Mã đơn hàng:</b> {order.orderCode}
                  </p>

                  <p>
                    <b>Ngày tạo:</b> {order.createdAt}
                  </p>

                  <p>
                    <b>Ngân hàng:</b> {order.bankName}
                  </p>

                  <p>
                    <b>Số tài khoản:</b> {order.accountNo}
                  </p>

                  <p>
                    <b>Tên tài khoản:</b> {order.accountName}
                  </p>

                  <p>
                    <b>Số tiền:</b> {formatVND(order.amount)}
                  </p>

                  <p>
                    <b>Nội dung:</b> Thanh toán số tiền{" "}
                    {formatVND(order.amount)} cho mã đơn hàng{" "}
                    {order.orderCode}
                  </p>
                </div>

                <div style={styles.qrBox}>
                  <h3>Quét mã QR để thanh toán</h3>

                  <img
                    src={order.qrUrl}
                    alt="QR thanh toán"
                    style={styles.qrImage}
                  />

                  <button
                    style={styles.doneBtn}
                    onClick={() => {
                      alert("Đã tạo phiếu thanh toán thành công!");
                    }}
                  >
                    Tôi đã thanh toán
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
  },
  header: {
    background: "#991b1b",
    color: "#fff",
    padding: "20px",
    borderRadius: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  logo: {
    margin: 0,
    fontSize: "36px",
  },
  userBox: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  logoutBtn: {
    padding: "10px 14px",
    border: "none",
    borderRadius: "10px",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  },
  loginBox: {
    maxWidth: "400px",
    margin: "80px auto",
    background: "#fff",
    padding: "30px",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "12px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    boxSizing: "border-box",
  },
  primaryBtn: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "10px",
    background: "#dc2626",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  },
  registerBtn: {
    width: "100%",
    padding: "12px",
    marginTop: "12px",
    border: "1px solid #dc2626",
    borderRadius: "10px",
    background: "#fff",
    color: "#dc2626",
    cursor: "pointer",
    fontWeight: "bold",
  },
  nav: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  tab: {
    padding: "12px 16px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    background: "#fff",
    cursor: "pointer",
  },
  activeTab: {
    padding: "12px 16px",
    border: "none",
    borderRadius: "10px",
    background: "#dc2626",
    color: "#fff",
    cursor: "pointer",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "220px 1fr",
    gap: "20px",
  },
  sidebar: {
    background: "#fff",
    padding: "18px",
    borderRadius: "16px",
    height: "fit-content",
  },
  categorySelect: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    fontSize: "16px",
    textTransform: "capitalize",
  },
  products: {
    background: "#fff",
    padding: "20px",
    borderRadius: "16px",
  },
  productHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
  },
  select: {
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #ddd",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "#fafafa",
    border: "1px solid #e5e7eb",
    padding: "15px",
    borderRadius: "16px",
    textAlign: "center",
  },
  image: {
    width: "100%",
    height: "150px",
    objectFit: "contain",
  },
  category: {
    color: "#dc2626",
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  price: {
    color: "#16a34a",
  },
  addBtn: {
    width: "100%",
    padding: "10px",
    border: "none",
    borderRadius: "10px",
    background: "#16a34a",
    color: "#fff",
    cursor: "pointer",
  },
  pagination: {
    marginTop: "25px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
  },
  pageBtn: {
    padding: "10px 14px",
    border: "none",
    borderRadius: "10px",
    background: "#991b1b",
    color: "#fff",
    cursor: "pointer",
  },
  cartPage: {
    background: "#fff",
    padding: "25px",
    borderRadius: "16px",
  },
  cartItem: {
    borderBottom: "1px solid #ddd",
    padding: "12px 0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  cartImage: {
    width: "70px",
    height: "70px",
    objectFit: "contain",
    borderRadius: "8px",
    border: "1px solid #eee",
  },
  quantityBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "8px 0",
  },
  smallBtn: {
    width: "32px",
    height: "32px",
    border: "none",
    borderRadius: "8px",
    background: "#991b1b",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  },
  deleteBtn: {
    height: "36px",
    border: "none",
    borderRadius: "8px",
    background: "#dc2626",
    color: "#fff",
    cursor: "pointer",
    padding: "0 12px",
  },
  checkoutBtn: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#7c3aed",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
  },
  adminPage: {
    background: "#fff",
    padding: "25px",
    borderRadius: "16px",
  },
  adminForm: {
    background: "#f9fafb",
    padding: "20px",
    borderRadius: "14px",
    marginBottom: "25px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    background: "#f3f4f6",
    padding: "12px",
    border: "1px solid #ddd",
  },
  td: {
    padding: "12px",
    border: "1px solid #ddd",
    textAlign: "center",
  },
  roleBadge: {
    color: "#fff",
    padding: "6px 10px",
    borderRadius: "20px",
    fontSize: "13px",
  },
  paymentPage: {
    background: "#fff",
    padding: "25px",
    borderRadius: "16px",
  },
  paymentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 360px",
    gap: "25px",
  },
  invoiceBox: {
    background: "#f9fafb",
    padding: "20px",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    fontSize: "17px",
    lineHeight: "1.8",
  },
  qrBox: {
    textAlign: "center",
    background: "#f9fafb",
    padding: "20px",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
  },
  qrImage: {
    width: "280px",
    maxWidth: "100%",
    borderRadius: "12px",
    border: "1px solid #ddd",
    background: "#fff",
  },
  doneBtn: {
    width: "100%",
    marginTop: "15px",
    padding: "12px",
    border: "none",
    borderRadius: "10px",
    background: "#16a34a",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default App;