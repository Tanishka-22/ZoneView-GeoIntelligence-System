import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../shared/components/protected-routes';
import { LoginPage } from '../modules/auth/pages/login.page';
import { RegisterPage } from '../modules/auth/pages/register.page';
import { DashboardPage } from '../modules/dashboard/pages/dashboard.page';
import { LocationsPage } from '../modules/locations/pages/locations.page';
import { LocationDetailPage } from '../modules/locations/pages/location-detail.page';
import { ReportsPage } from '../modules/reports/pages/reports.page';
import { NotificationsPage } from '../modules/notifications/pages/notifications.page';
import { UsagePage } from '../modules/usage/pages/usage.page';

const ProfilePage = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Profile</h1>
    <p className="text-gray-500 mt-2">Profile management coming soon.</p>
  </div>
);

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/locations', element: <LocationsPage /> },
      { path: '/locations/:id', element: <LocationDetailPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/usage', element: <UsagePage /> },
      { path: '/profile', element: <ProfilePage /> },
    ],
  },
]);