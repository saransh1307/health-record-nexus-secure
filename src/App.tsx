
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { DbProvider } from "@/utils/db-context";
import { AuthProvider, useAuth } from "@/utils/auth-context";
import Login from "./pages/Login";
import HospitalDashboard from "./pages/HospitalDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

const queryClient = new QueryClient();

// ProtectedRoute component to handle auth checking
const ProtectedRoute = ({ children, requiredType }: { children: JSX.Element, requiredType?: 'hospital' | 'patient' }) => {
  const { isAuthenticated, isHospital, isPatient } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check if user type matches required type
  if (requiredType) {
    if (requiredType === 'hospital' && !isHospital) {
      return <Navigate to="/" state={{ from: location }} replace />;
    }
    if (requiredType === 'patient' && !isPatient) {
      return <Navigate to="/" state={{ from: location }} replace />;
    }
  }

  return children;
};

// AppRoutes component to use auth context
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route 
        path="/hospital" 
        element={
          <ProtectedRoute requiredType="hospital">
            <HospitalDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/patient" 
        element={
          <ProtectedRoute requiredType="patient">
            <PatientDashboard />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DbProvider>
        <BrowserRouter>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </DbProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
