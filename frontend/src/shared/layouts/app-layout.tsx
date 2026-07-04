import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '⌂' },
  { path: '/locations', label: 'Locations', icon: '📍' },
  { path: '/reports', label: 'Reports', icon: '📄' },
  { path: '/notifications', label: 'Notifications', icon: '🔔' },
  { path: '/usage', label: 'Usage', icon: '📊' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">ZoneView</h1>
          <p className="text-xs text-gray-400 mt-0.5">Regional Intelligence</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
              {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                {user?.name ?? user?.email ?? 'User'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full text-xs text-gray-500 hover:text-red-600 py-1.5 rounded transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}