import { useQuery } from '@tanstack/react-query';
import { usageApi } from '../api/usage.api';
import { PLAN_LIMITS_DISPLAY } from '../constants/plan-limits.display';

export function UsagePage() {
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['usage'],
    queryFn: usageApi.getCurrent,
  });

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: usageApi.getSubscription,
  });

  const planType = subscription?.plan?.type ?? 'FREE';

  const features = [
    { key: 'AI_INSIGHT', label: 'AI Insights' },
    { key: 'AI_REPORT', label: 'AI Reports' },
    { key: 'REGION_COMPARE', label: 'Region Comparisons' },
    { key: 'LOCATION_SEARCH', label: 'Location Searches' },
  ];

  if (usageLoading || subLoading) {
    return <div className="p-8 text-sm text-gray-400">Loading usage...</div>;
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usage</h1>
        <p className="text-gray-500 mt-1">
          Billing cycle: {usageData?.billingCycle}
        </p>
      </div>

      {/* Plan badge */}
      <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
        <span className="text-xs font-semibold text-blue-700">
          {subscription?.plan?.name ?? 'Free'} Plan
        </span>
      </div>

      {/* Usage bars */}
      <div className="space-y-4">
        {features.map((feature) => {
          const record = usageData?.usage?.find(
            (u: any) => u.feature === feature.key,
          );
          const used = record?.count ?? 0;
          const limit = PLAN_LIMITS_DISPLAY[planType]?.[feature.key] ?? 0;
          const isUnlimited = limit === -1;
          const pct = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);

          return (
            <div
              key={feature.key}
              className="bg-white border border-gray-200 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {feature.label}
                </span>
                <span className="text-xs text-gray-500">
                  {isUnlimited ? `${used} / Unlimited` : `${used} / ${limit}`}
                </span>
              </div>
              {!isUnlimited && (
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      pct >= 90
                        ? 'bg-red-500'
                        : pct >= 70
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
              {isUnlimited && (
                <div className="text-xs text-green-600 font-medium">
                  Unlimited on your plan
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}