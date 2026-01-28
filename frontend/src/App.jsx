import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/patient/PatientDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import LabDashboard from './pages/lab/LabDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

// Guard Component
const PrivateRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
     return <Navigate to="/" />; // Or unauthorized page
  }
  return children;
};

// Root Redirector
const RootRedirect = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" />;
    
    switch (user.role) {
        case 'patient': return <Navigate to="/patient" />;
        case 'doctor': return <Navigate to="/doctor" />;
        case 'lab_technician': return <Navigate to="/lab" />;
        case 'pharmacy': return <Navigate to="/pharmacy" />;
        case 'admin': return <Navigate to="/admin" />;
        default: return <Navigate to="/login" />;
    }
}

function App() {
  return (
    <div className="min-h-screen bg-cream-50">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<RootRedirect />} />

        {/* Patient Routes */}
        <Route path="/patient/*" element={
            <PrivateRoute allowedRoles={['patient']}>
                <PatientDashboard />
            </PrivateRoute>
        } />

        {/* Doctor Routes */}
        <Route path="/doctor/*" element={
            <PrivateRoute allowedRoles={['doctor']}>
                <DoctorDashboard />
            </PrivateRoute>
        } />

        {/* Lab Routes */}
         <Route path="/lab/*" element={
            <PrivateRoute allowedRoles={['lab_technician']}>
                <LabDashboard />
            </PrivateRoute>
        } />

         {/* Pharmacy Routes */}
         <Route path="/pharmacy/*" element={
            <PrivateRoute allowedRoles={['pharmacy']}>
                <PharmacyDashboard />
            </PrivateRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin/*" element={
            <PrivateRoute allowedRoles={['admin']}>
                <AdminDashboard />
            </PrivateRoute>
        } />
      </Routes>
    </div>
  );
}

export default App;

