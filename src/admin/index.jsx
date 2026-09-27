import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components.jsx'
import AdminLayout from './AdminLayout.jsx'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'
import Shipments from './Shipments.jsx'
import ShipmentDetail from './ShipmentDetail.jsx'
import Users from './Users.jsx'
import AuditLog from './AuditLog.jsx'

export default function AdminRoot() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="shipments/:id" element={<ShipmentDetail />} />
          <Route path="users" element={<Users />} />
          <Route path="audit" element={<AuditLog />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </ToastProvider>
  )
}
