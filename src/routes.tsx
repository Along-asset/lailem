import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './ui/layout'
import Home from './pages/Home'
import AdminLogin from './pages/AdminLogin'
import AdminStaff from './pages/AdminStaff'
import StaffDetail from './pages/StaffDetail'
import StaffShare from './pages/StaffShare'

export const router = createBrowserRouter([
  {
    path: '/share/staff/:id',
    element: <StaffShare />,
  },
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
