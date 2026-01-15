import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './ui/layout'
import Home from './pages/Home'
import AdminLogin from './pages/AdminLogin'
import AdminStaff from './pages/AdminStaff'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/admin/login', element: <AdminLogin /> },
      { path: '/admin/staff', element: <AdminStaff /> },
    ],
  },
])

