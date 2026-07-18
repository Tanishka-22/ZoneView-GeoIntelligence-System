import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usageApi } from '../api/usage.api';
import { subscriptionsApi } from '../../subscriptions/api/subscriptions.api';
import { PLAN_LIMITS_DISPLAY } from '../constants/plan-limits.display';
import { PLAN_DETAILS } from '../../subscriptions/constants/plan-features';
import { useAuthStore } from '../../../shared/stores/auth.store';

export function UsagePage() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['usage'],
    queryFn: usageApi.getCurrent,
  });

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionsApi.getCurrent,
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: subscriptionsApi.getPlans,
  });

  // const upgradeMutation = useMutation({
  //   mutationFn: (planType: string) => subscriptionsApi.upgrade(planType),
  //   onSuccess: (updatedSub) => {
  //     queryClient.invalidateQueries({ queryKey: ['subscription'] });
  //     queryClient.invalidateQueries({ queryKey: ['usage'] });
  //     setUpgradeSuccess(`You're now on the ${updatedSub.plan.name} plan!`);
  //     setUpgradeError(null);
  //     setTimeout(() => {
  //       setSelectedPlan(null);
  //       setUpgradeSuccess(null);
  //     }, 1800);
  //   },
  //   onError: (err: any) => {
  //     setUpgradeError(err.response?.data?.message || 'Upgrade failed. Please try again.');
  //   },
  // });

  const user = useAuthStore((state) => state.user);

  const handleUpgrade = async (planType: string) => {
  setUpgradeError(null);
  try {
    // Step 1: create order on backend
    const order = await subscriptionsApi.createOrder(planType);

    // Step 2: open Razorpay Checkout
    const razorpay = new (window as any).Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'ZoneView',
      description: `${planType} Plan Subscription`,
      prefill: {
        name: user?.name ?? '',
        email: user?.email ?? '',
      },
      theme: { color: '#2563eb' },
      handler: async (response: any) => {
        // Step 3: verify on backend
        try {
          const updatedSub = await subscriptionsApi.verifyPayment({
            planType,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
          queryClient.invalidateQueries({ queryKey: ['usage'] });
          setUpgradeSuccess(`You're now on the ${updatedSub.plan.name} plan!`);
          setTimeout(() => {
            setSelectedPlan(null);
            setUpgradeSuccess(null);
          }, 1800);
        } catch (err: any) {
          setUpgradeError(err.response?.data?.message || 'Payment verification failed.');
        }
      },
      modal: {
        ondismiss: () => {
          // user closed the checkout without paying — no error, just no-op
        },
      },
    });

    razorpay.open();
  } catch (err: any) {
    setUpgradeError(err.response?.data?.message || 'Could not start checkout.');
  }
};

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
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usage & Plans</h1>
        <p className="text-gray-500 mt-1">Billing cycle: {usageData?.billingCycle}</p>
      </div>

      <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
        <span className="text-xs font-semibold text-blue-700">
          {subscription?.plan?.name ?? 'Free'} Plan — Current
        </span>
      </div>

      {/* Usage bars */}
      <div className="space-y-4 mb-10">
        {features.map((feature) => {
          const record = usageData?.usage?.find((u: any) => u.feature === feature.key);
          const used = record?.count ?? 0;
          const limit = PLAN_LIMITS_DISPLAY[planType]?.[feature.key] ?? 0;
          const isUnlimited = limit === -1;
          const pct = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);

          return (
            <div key={feature.key} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{feature.label}</span>
                <span className="text-xs text-gray-500">
                  {isUnlimited ? `${used} / Unlimited` : `${used} / ${limit}`}
                </span>
              </div>
              {!isUnlimited && (
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
              {isUnlimited && (
                <div className="text-xs text-green-600 font-medium">Unlimited on your plan</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Plan cards */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Available Plans</h2>
        <p className="text-sm text-gray-500 mt-0.5">Click a plan to see details and upgrade.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {plans?.map((plan: any) => {
          const isCurrent = plan.type === planType;
          const details = PLAN_DETAILS[plan.type];
          return (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className={`text-left bg-white border rounded-xl p-5 transition-all hover:shadow-md ${
                isCurrent ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {isCurrent && (
                <span className="inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full mb-2">
                  CURRENT PLAN
                </span>
              )}
              <div className="font-semibold text-gray-900">{plan.name}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                ₹{details?.price ?? 0}
                <span className="text-xs font-normal text-gray-400">/mo</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">{details?.tagline}</p>
              <div className="mt-4 text-xs text-blue-600 font-medium">View details →</div>
            </button>
          );
        })}
      </div>

      {/* Plan modal */}
      {selectedPlan && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => !upgradeMutation.isPending && setSelectedPlan(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedPlan.name} Plan</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {PLAN_DETAILS[selectedPlan.type]?.tagline}
                </p>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="text-3xl font-bold text-gray-900 mb-4">
              ₹{PLAN_DETAILS[selectedPlan.type]?.price ?? 0}
              <span className="text-sm font-normal text-gray-400"> / month</span>
            </div>

            <ul className="space-y-2 mb-6">
              {PLAN_DETAILS[selectedPlan.type]?.features.map((f: string) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {upgradeError && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {upgradeError}
              </div>
            )}
            {upgradeSuccess && (
              <div className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                {upgradeSuccess}
              </div>
            )}

            {selectedPlan.type === planType ? (
              <button
                disabled
                className="w-full py-2.5 bg-gray-100 text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed"
              >
                This is your current plan
              </button>
            ) : (
              <button
                onClick={() => handleUpgrade(selectedPlan.type)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Upgrade to {selectedPlan.name} — ₹{PLAN_DETAILS[selectedPlan.type]?.price}/mo
              </button>
            )}

            <p className="text-[10px] text-gray-400 mt-3 text-center">
              Test mode — use card 4111 1111 1111 1111, any future expiry, any CVV.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}