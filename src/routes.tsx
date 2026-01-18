import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './ui/layout'
import Home from './pages/Home'
import AdminLogin from './pages/AdminLogin'
import AdminStaff from './pages/AdminStaff'
import StaffDetail from './pages/StaffDetail'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/staff/:id', element: <StaffDetail /> },
      { path: '/admin/login', element: <AdminLogin /> },
      { path: '/admin/staff', element: <AdminStaff /> },
    ],
  },
])
