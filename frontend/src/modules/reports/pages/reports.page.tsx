import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../api/reports.api';
import { locationsApi } from '../../locations/api/locations.api';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  GENERATING: 'bg-blue-100 text-blue-700',
  READY: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export function ReportsPage() {
  const queryClient = useQueryClient();
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: reportsApi.getAll,
    // Poll every 5 seconds if any report is PENDING or GENERATING
    refetchInterval: (query) => {
      const data = query.state.data as any[];
      const hasActive = data?.some(
        (r) => r.status === 'PENDING' || r.status === 'GENERATING',
      );
      return hasActive ? 5000 : false;
    },
  });

  const { data: locationsData } = useQuery({
    queryKey: ['locations', { page: 1, limit: 200 }],
    queryFn: () => locationsApi.getAll({ limit: 200 }),
  });

  const createMutation = useMutation({
    mutationFn: reportsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setSelectedLocationId('');
      setCreateError(null);
    },
    onError: (err: any) => {
      setCreateError(
        err.response?.data?.message || 'Failed to create report.',
      );
    },
  });

  const handleCreate = () => {
    if (!selectedLocationId) return;
    setCreateError(null);
    createMutation.mutate({ locationId: selectedLocationId });
  };

  const handleDownload = async (reportId: string) => {
    try {
      const { fileUrl, title } = await reportsApi.getDownloadUrl(reportId);
      alert(`Download URL: ${fileUrl}\nTitle: ${title}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Download not available.');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">
          Generate and download regional intelligence reports
        </p>
      </div>

      {/* Create report */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Generate New Report
        </h2>
        <div className="flex gap-3">
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a location...</option>
            {locationsData?.data?.map((loc: any) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={!selectedLocationId || createMutation.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {createMutation.isPending ? 'Queuing...' : 'Generate Report'}
          </button>
        </div>
        {createError && (
          <p className="mt-2 text-xs text-red-600">{createError}</p>
        )}
        {createMutation.isSuccess && (
          <p className="mt-2 text-xs text-green-600">
            Report queued successfully. It will appear below.
          </p>
        )}
      </div>

      {/* Reports list */}
      {isLoading && (
        <p className="text-sm text-gray-400">Loading reports...</p>
      )}

      {!isLoading && (!reports || reports.length === 0) && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No reports yet.</p>
          <p className="text-xs mt-1">
            Generate your first report using the form above.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {reports?.map((report: any) => (
          <div
            key={report.id}
            className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {report.title}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {report.location?.name} ·{' '}
                {new Date(report.createdAt).toLocaleDateString('en-IN')}
              </div>
              {report.status === 'GENERATING' &&
                report.jobProgress !== undefined && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Generating...</span>
                      <span>{report.jobProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${report.jobProgress}%` }}
                      />
                    </div>
                  </div>
                )}
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  STATUS_STYLES[report.status] ?? 'bg-gray-100 text-gray-600'
                }`}
              >
                {report.status}
              </span>
              {report.status === 'READY' && (
                <button
                  onClick={() => handleDownload(report.id)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Download
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}