import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Welcome } from '../pages/Welcome';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { Dashboard } from '../pages/Dashboard';
import { Profile } from '../pages/Profile';
import { Vault } from '../pages/Vault';
import { Settings } from '../pages/Settings';
import { TestHome } from '../pages/TestHome';
import { TestBlogs } from '../pages/TestBlogs';
import { TestServices } from '../pages/TestServices';
import { TestContact } from '../pages/TestContact';
import { TestAbout } from '../pages/TestAbout';
import { useAuth } from '../contexts/AuthContext';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Rotas de teste para o Navbar */}
      <Route path="/home" element={<TestHome />} />
      <Route path="/blogs" element={<TestBlogs />} />
      <Route path="/services" element={<TestServices />} />
      <Route path="/contact" element={<TestContact />} />
      <Route path="/about" element={<TestAbout />} />

      {/* Rotas protegidas */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/vault" element={<PrivateRoute><Vault /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
    </Routes>
  );
}