import fetch from "node-fetch";

async function testAPI() {
  try {
    console.log("Testing API endpoints...");

    // Test health
    console.log("Testing /api/health...");
    const healthResponse = await fetch("http://localhost:3000/api/health");
    const healthData = await healthResponse.json();
    console.log("✅ Health:", healthData);

    // Test register
    console.log("Testing /api/auth/register...");
    const registerResponse = await fetch(
      "http://localhost:3000/api/auth/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test4@example.com",
          password: "123456",
          name: "Test User 4",
        }),
      }
    );

    const registerData = await registerResponse.json();
    console.log("Register response:", registerData);

    if (registerResponse.ok) {
      console.log("✅ Registration successful!");
    } else {
      console.log("❌ Registration failed:", registerData);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testAPI();
