import { Navigate, Route, Routes } from 'react-router-dom';

import { LoginPage } from '@/modules/auth/pages/LoginPage';

// Árbol completo para un visitante sin sesión (no hay token). Se monta desde
// app/App.tsx cuando useAuthStore no tiene token.
export default function PublicRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
