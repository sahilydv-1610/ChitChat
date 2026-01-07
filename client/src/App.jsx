import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Messenger from "./pages/Messenger";
import CallHistory from "./pages/CallHistory";
import AdminDashboard from "./pages/AdminDashboard";
import Support from "./pages/Support";



function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Messenger /> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
        <Route path="/calls" element={user ? <CallHistory /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user ? <AdminDashboard /> : <Navigate to="/login" />} />
        <Route path="/support" element={user ? <Support /> : <Navigate to="/login" />} />

        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />


        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      </Routes>
    </Router>
  );
}

export default App;
