export async function loginAdmin(email, password) {
  const response = await fetch(`${import.meta.env.VITE_ADMIN_BACKEND_URL/admin/login}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
}
