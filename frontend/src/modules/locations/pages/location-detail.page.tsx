import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { locationsApi } from '../api/locations.api';

const STATUS_COLORS: Record<string, string> = {
  ONGOING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  PLANNED: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const { data: location, isLoading: locationLoading } = useQuery({
    queryKey: ['location', id],
    queryFn: () => locationsApi.getById(id!),
    enabled: !!id,
  });

  const { data: developments, isLoading: devsLoading } = useQuery({
    queryKey: ['location-developments', id],
    queryFn: () => locationsApi.getDevelopments(id!),
    enabled: !!id,
  });

  const explainMutation = useMutation({
    mutationFn: () => locationsApi.explain(id!),
    onSuccess: (insight) => {
      setAiInsight(insight.content);
      setAiError(null);
    },
    onError: (err: any) => {
      setAiError(
        err.response?.data?.message || 'Failed to generate AI insight.',
      );
    },
  });

  if (locationLoading) {
    return (
      <div className="p-8 text-sm text-gray-400">Loading location...</div>
    );
  }

  if (!location) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Location not found.</p>
        <Link to="/locations" className="text-sm text-blue-600 mt-2 inline-block">
          ← Back to locations
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-gray-400">
        <Link to="/locations" className="hover:text-gray-600">
          Locations
        </Link>
        <span className="mx-2">›</span>
        <span className="text-gray-700">{location.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{location.name}</h1>
        <p className="text-gray-400 mt-1">
          {[location.district, location.state, location.country]
            .filter(Boolean)
            .join(', ')}
        </p>
        {location.description && (
          <p className="text-gray-600 mt-3 leading-relaxed">
            {location.description}
          </p>
        )}
      </div>

      {/* AI Explain section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              AI Regional Intelligence
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Powered by ZoneView AI — based on verified development data
            </p>
          </div>
          <button
            onClick={() => explainMutation.mutate()}
            disabled={explainMutation.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {explainMutation.isPending
              ? 'Generating...'
              : aiInsight
              ? 'Regenerate'
              : 'Generate Insight'}
          </button>
        </div>

        {aiError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {aiError}
          </div>
        )}

        {explainMutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Analyzing regional development data...
          </div>
        )}

        {aiInsight && !explainMutation.isPending && (
          <p className="text-gray-700 leading-relaxed text-sm">{aiInsight}</p>
        )}

        {!aiInsight && !explainMutation.isPending && !aiError && (
          <p className="text-sm text-gray-400">
            Click "Generate Insight" to get an AI-powered analysis of this
            region's development patterns and investment landscape.
          </p>
        )}
      </div>

      {/* Development Records */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Development Records
          {developments && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({developments.length})
            </span>
          )}
        </h2>

        {devsLoading && (
          <p className="text-sm text-gray-400">Loading records...</p>
        )}

        {!devsLoading && developments?.length === 0 && (
          <p className="text-sm text-gray-400">
            No development records found for this location.
          </p>
        )}

        <div className="space-y-3">
          {developments?.map((dev: any) => (
            <div
              key={dev.id}
              className="bg-white border border-gray-200 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{dev.title}</div>
                  {dev.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {dev.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {dev.category && <span>{dev.category.name}</span>}
                    {dev.organization && (
                      <>
                        <span>·</span>
                        <span>{dev.organization.name}</span>
                      </>
                    )}
                    {dev.budget && (
                      <>
                        <span>·</span>
                        <span>
                          ₹{(dev.budget / 10000000).toFixed(1)} Cr
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    STATUS_COLORS[dev.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {dev.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}