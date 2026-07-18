import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { locationsApi } from '../api/locations.api';
import { IndiaLocationsMap } from '../components/india-map';

export function LocationsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Paginated grid — what the user browses
  const { data, isLoading, isError } = useQuery({
    queryKey: ['locations', { page, search }],
    queryFn: () => locationsApi.getAll({ page, limit: 9, search: search || undefined }),
  });

  // Separate query for map markers — not paginated, follows the same search term
  const { data: mapData } = useQuery({
    queryKey: ['locations-map', { search }],
    queryFn: () => locationsApi.getAll({ limit: 100, search: search || undefined }),
  });

  const locations = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        <p className="text-gray-500 mt-1">
          Browse regional development data across India
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search any city in India..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Map */}
      <div className="mb-8">
        <IndiaLocationsMap locations={mapData?.data ?? []} />
        <p className="text-xs text-gray-400 mt-2">
          Click a marker to view that location's regional intelligence.
        </p>
      </div>

      {isLoading && <div className="text-sm text-gray-400">Loading locations...</div>}
      {isError && (
        <div className="text-sm text-red-600">Failed to load locations. Please try again.</div>
      )}

      {!isLoading && !isError && (
        <>
          {locations.length === 0 ? (
            <div className="text-sm text-gray-400">
              No locations found{search ? ` for "${search}"` : ''}.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {locations.map((location: any) => (
                <Link
                  key={location.id}
                  to={`/locations/${location.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {location.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {[location.district, location.state].filter(Boolean).join(', ')}
                  </div>
                  {location.description && (
                    <p className="text-xs text-gray-500 mt-3 line-clamp-2">
                      {location.description}
                    </p>
                  )}
                  <div className="mt-4 text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View details →
                  </div>
                </Link>
              ))}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}