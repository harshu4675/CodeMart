const API_URL = "http://localhost:5000/api";

async function testAPI() {
  console.log("🧪 Testing Backend API...\n");

  try {
    // Test 1: Health Check
    console.log("1️⃣ Testing Health Endpoint...");
    const healthResponse = await fetch(`${API_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`HTTP error! status: ${healthResponse.status}`);
    }
    const healthData = await healthResponse.json();
    console.log("✅ Health Check:", healthData);

    // Test 2: Register User
    console.log("\n2️⃣ Testing Registration...");
    const registerData = {
      name: "Test User",
      email: `test${Date.now()}@example.com`,
      password: "test123",
      phone: "1234567890",
    };

    try {
      const registerResponse = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      });

      const registerResult = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(
          registerResult.message ||
            `HTTP error! status: ${registerResponse.status}`,
        );
      }

      console.log("✅ Registration Response:", {
        success: registerResult.success,
        token: registerResult.token ? "Token received" : "No token",
        user: registerResult.user,
      });

      // Test 3: Login with registered user
      console.log("\n3️⃣ Testing Login...");
      const loginData = {
        email: registerData.email,
        password: registerData.password,
      };

      const loginResponse = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const loginResult = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(
          loginResult.message || `HTTP error! status: ${loginResponse.status}`,
        );
      }

      console.log("✅ Login Response:", {
        success: loginResult.success,
        token: loginResult.token ? "Token received" : "No token",
        user: loginResult.user,
      });
    } catch (error) {
      console.error("❌ Auth Error:", error.message);
    }
  } catch (error) {
    console.error("❌ API Error:", error.message);
  }
}

testAPI();
