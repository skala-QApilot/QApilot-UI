import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** redirect 대상 (기본: /login) */
  redirectTo?: string;
}

/**
 * 인증되지 않은 사용자를 redirectTo 로 보낸다.
 * dev bypass sentinel 토큰도 인증으로 간주한다.
 */
export function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
