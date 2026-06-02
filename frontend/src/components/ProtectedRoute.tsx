import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../api/authService';

const ProtectedRoute = () => {
  const token = authService.getToken();

  // If no token exists, redirect to login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If token exists, render the "child" components (the actual page)
  return <Outlet />;
};

export default ProtectedRoute;