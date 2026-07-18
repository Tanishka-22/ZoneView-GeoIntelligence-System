export const PLAN_DETAILS: Record<string, {
  tagline: string;
  price: number;
  features: string[];
}> = {
  FREE: {
    tagline: 'Basic regional exploration for citizens and students',
    price: 0,
    features: [
      '100 location searches / month',
      '20 AI insights / month',
      '2 AI reports / month',
      '5 region comparisons / month',
      'Up to 10 saved locations',
    ],
  },
  PRO: {
    tagline: 'For researchers, consultants, and businesses',
    price: 999,
    features: [
      'Unlimited location searches',
      '500 AI insights / month',
      '50 AI reports / month',
      'Unlimited region comparisons',
      'Unlimited saved locations',
      'Historical analytics',
      'Priority support',
    ],
  },
  TEAM: {
    tagline: 'For organizations and government agencies',
    price: 4999,
    features: [
      'Everything in Pro',
      '5,000 AI insights / month (shared pool)',
      '500 AI reports / month',
      'Up to 25 team members',
      '100 GB storage',
      'API access (coming soon)',
      'Dedicated account support',
    ],
  },
};