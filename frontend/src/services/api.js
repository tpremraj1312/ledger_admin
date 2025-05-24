export async function loginAdmin(email, password) {
  console.log(`backend url: ${import.meta.env.VITE_ADMIN_BACKEND_URL}`);
  const url = `${import.meta.env.VITE_ADMIN_BACKEND_URL}/admin/login`; // Ensure trailing slash
  console.log(`Full URL: ${url}`);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });
    console.log(`Response status: ${response.status}`);
    const data = await response.json();
    console.log(`Response data:`, data);
    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}