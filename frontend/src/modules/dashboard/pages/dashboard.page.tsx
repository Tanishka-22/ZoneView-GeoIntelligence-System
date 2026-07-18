import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../shared/stores/auth.store';
import { locationsApi } from '../../locations/api/locations.api';
import { reportsApi } from '../../reports/api/reports.api';
import { usageApi } from '../../usage/api/usage.api';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const { data: locationsData } = useQuery({
    queryKey: ['locations', { page: 1, limit: 3 }],
    queryFn: () => locationsApi.getAll({ page: 1, limit: 3 }),
  });

  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: reportsApi.getAll,
  });

  const { data: usageData } = useQuery({
    queryKey: ['usage'],
    queryFn: usageApi.getCurrent,
  });

  const aiInsightUsage = usageData?.usage?.find(
    (u: any) => u.feature === 'AI_INSIGHT',
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="text-gray-500 mt-1">
          Regional intelligence for India
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Locations"
          value={locationsData?.meta?.total ?? '—'}
          sub="tracked regions"
          color="blue"
        />
        <StatCard
          label="Reports"
          value={reports?.length ?? 0}
          sub="generated this account"
          color="green"
        />
        <StatCard
          label="AI Insights Used"
          value={aiInsightUsage?.count ?? 0}
          sub="this billing cycle"
          color="purple"
        />
      </div>

      {/* Recent locations */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Explore Locations
          </h2>
          <Link
            to="/locations"
            className="text-sm text-blue-600 hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {locationsData?.data?.map((location: any) => (
            <Link
              key={location.id}
              to={`/locations/${location.id}`}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="font-medium text-gray-900">{location.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {location.state}
              </div>
            </Link>
          )) ?? (
            <p className="text-sm text-gray-400 col-span-3">
              Loading locations...
            </p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="flex gap-3">
          <Link
            to="/locations"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Locations
          </Link>
          <Link
            to="/reports"
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Generate Report
          </Link>
          <Link
            to="/usage"
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Usage
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | string;
  sub: string;
  color: 'blue' | 'green' | 'purple';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div
        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-3 ${colors[color]}`}
      >
        {label}
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  );
}