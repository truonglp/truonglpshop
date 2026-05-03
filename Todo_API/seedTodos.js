require("dotenv").config();
const axios = require("axios");

const API_URL = "http://localhost:5000";

async function seedTodos() {
  try {
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: "truonglp1502@gmail.com",
      password: "123456",
    });

    const token = loginRes.data.token;

    const productsRes = await axios.get("https://dummyjson.com/products?limit=30");
    const products = productsRes.data.products;

    for (const product of products) {
      await axios.post(
        `${API_URL}/api/todos`,
        { title: product.title },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Đã thêm:", product.title);
    }

    console.log("Seed todo thành công!");
  } catch (error) {
    console.log("Lỗi:", error.response?.data || error.message);
  }
}

seedTodos();