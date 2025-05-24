import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import './index.css';
import './App.css';
// import DashboardLayout from "./layouts/DashboardLayout"; // You’ll build this later
import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import Home from "./pages/dashboard/Home";
import Users from "./pages/dashboard/Users";
import Budgets from "./pages/dashboard/Budgets";
import Transactions from "./pages/dashboard/Transactions";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<Login />} />
        {/* Dashboard and other routes go here */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard/home" element={<Home />} />
        <Route path="/dashboard/users" element={<Users />} />
        <Route path="/dashboard/budgets" element={<Budgets />} />
        <Route path="/dashboard/transactions" element={<Transactions />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
