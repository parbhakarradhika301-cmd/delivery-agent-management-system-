'use client';

/**
 * Agents List Dashboard Page.
 * Optimized with useDeferredValue for stutter-free search filtering,
 * optimistic deletions with rollback on API failure, accessible aria-live regions,
 * and high-contrast WCAG AA compliant typography.
 */

import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import Link from 'next/link';
import { listAgents, deleteAgent, ApiRequestError } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import CacheBadge from '@/components/CacheBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from 'sonner';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState('all');

  // Delete modal state
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Set document title
  useEffect(() => {
    document.title = 'Agents | Delivery Agent Manager';
  }, []);

  // Manual refresh callback
  const refreshAgents = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const res = await listAgents();
      setAgents(res.data || []);
      setCacheStatus(res.cacheStatus);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to load delivery agents');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load effect
  useEffect(() => {
    let ignore = false;
    async function initLoad() {
      try {
        const res = await listAgents();
        if (!ignore) {
          setAgents(res.data || []);
          setCacheStatus(res.cacheStatus);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof ApiRequestError ? err.message : 'Failed to load delivery agents');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    initLoad();
    return () => {
      ignore = true;
    };
  }, []);

  // Filtered agents using deferred search for non-blocking typing
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesStatus =
        statusFilter === 'all' || agent.status?.toLowerCase() === statusFilter;

      if (!matchesStatus) return false;

      if (!deferredSearch.trim()) return true;
      const q = deferredSearch.toLowerCase().trim();
      return (
        agent.fullName?.toLowerCase().includes(q) ||
        agent.email?.toLowerCase().includes(q) ||
        agent.phone?.toLowerCase().includes(q) ||
        agent.serviceArea?.toLowerCase().includes(q)
      );
    });
  }, [agents, statusFilter, deferredSearch]);

  // Memoized KPI metrics
  const { totalCount, activeCount, inactiveCount } = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const agent of agents) {
      if (agent.status?.toLowerCase() === 'active') active++;
      else if (agent.status?.toLowerCase() === 'inactive') inactive++;
    }
    return {
      totalCount: agents.length,
      activeCount: active,
      inactiveCount: inactive,
    };
  }, [agents]);

  // Optimistic delete with rollback on failure
  const handleDeleteConfirm = async () => {
    if (!agentToDelete) return;
    const target = agentToDelete;
    setIsDeleting(true);

    // 1. Optimistically remove from local state immediately
    setAgents((prev) => prev.filter((a) => a.id !== target.id));
    setAgentToDelete(null);

    try {
      // 2. Perform backend deletion
      await deleteAgent(target.id);
      toast.success(`Agent "${target.fullName}" deleted successfully`);
      // 3. Silent re-fetch to synchronize state & update cache header
      refreshAgents(true);
    } catch (err) {
      // 4. Rollback state if deletion fails
      setAgents((prev) => [target, ...prev]);
      toast.error(err.message || 'Failed to delete agent');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Title & Cache Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Delivery Agents
            </h1>
            <div className="min-h-6 min-w-24 flex items-center">
              <CacheBadge status={cacheStatus} />
            </div>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Monitor, assign, and manage registered delivery personnel across service zones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Refresh agents list"
            onClick={() => refreshAgents(true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 transition-colors shadow-2xs"
            title="Refresh agents list"
          >
            <svg
              className={`w-3.5 h-3.5 text-zinc-500 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            href="/agents/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Add Agent</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
              Total Agents
            </span>
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900">{totalCount}</span>
            <span className="text-xs text-zinc-600">registered</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
              Active Agents
            </span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-800">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{activeCount}</span>
            <span className="text-xs text-zinc-600">ready for dispatch</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
              Inactive Agents
            </span>
            <span className="p-2 rounded-lg bg-zinc-100 text-zinc-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-800">{inactiveCount}</span>
            <span className="text-xs text-zinc-600">paused / off-duty</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search Box */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            id="agent-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone, or service area..."
            aria-label="Search agents by name, email, phone, or service area"
            className="w-full pl-9 pr-8 py-2 text-sm bg-zinc-50 border border-zinc-300 rounded-lg placeholder-zinc-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search input"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-500 hover:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-md"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Live Filter Counter and Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <span aria-live="polite" className="text-xs text-zinc-600 font-medium">
            {filteredAgents.length} {filteredAgents.length === 1 ? 'agent' : 'agents'}
          </span>
          <div
            role="group"
            aria-label="Filter agents by status"
            className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg"
          >
            {['all', 'active', 'inactive'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                aria-pressed={statusFilter === status}
                className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  statusFilter === status
                    ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-6 space-y-4">
          <div className="h-6 bg-zinc-200 rounded-md w-1/4 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-zinc-100 rounded-lg w-full animate-pulse" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Failed to load agents</h2>
            <p className="mt-1 text-sm text-zinc-600 max-w-md mx-auto">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => refreshAgents()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Retry Connection
          </button>
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-700 mx-auto flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-zinc-900">No agents registered yet</h2>
          <p className="mt-1 text-sm text-zinc-600 max-w-sm mx-auto">
            Get started by adding your first delivery agent to begin dispatching deliveries.
          </p>
          <div className="mt-5">
            <Link
              href="/agents/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Add Your First Agent</span>
            </Link>
          </div>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center shadow-xs">
          <p className="text-sm font-semibold text-zinc-800">No agents match your criteria</p>
          <p className="mt-1 text-xs text-zinc-600">
            Try adjusting your search terms or clearing the status filter.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Name</th>
                    <th scope="col" className="px-6 py-3.5">Phone</th>
                    <th scope="col" className="px-6 py-3.5">Email</th>
                    <th scope="col" className="px-6 py-3.5">Service Area</th>
                    <th scope="col" className="px-6 py-3.5">Status</th>
                    <th scope="col" className="px-6 py-3.5">Last Updated</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {filteredAgents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-zinc-900 whitespace-nowrap">
                        <Link
                          href={`/agents/${agent.id}`}
                          className="hover:text-indigo-600 transition-colors hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded"
                        >
                          {agent.fullName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-zinc-700 whitespace-nowrap font-mono text-xs">
                        {agent.phone}
                      </td>
                      <td className="px-6 py-4 text-zinc-700 whitespace-nowrap">
                        {agent.email}
                      </td>
                      <td className="px-6 py-4 text-zinc-800 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                          {agent.serviceArea}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={agent.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-600 whitespace-nowrap">
                        {formatDate(agent.updatedAt)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Link
                            href={`/agents/${agent.id}`}
                            className="px-2.5 py-1 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            View
                          </Link>
                          <Link
                            href={`/agents/${agent.id}/edit`}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => setAgentToDelete(agent)}
                            className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Cards View */}
          <div className="md:hidden space-y-3">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/agents/${agent.id}`}
                      className="font-semibold text-zinc-900 text-base hover:text-indigo-600 block focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded"
                    >
                      {agent.fullName}
                    </Link>
                    <span className="inline-block mt-1 text-xs text-zinc-600 font-mono">
                      {agent.phone}
                    </span>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>

                <div className="text-xs text-zinc-700 space-y-1.5 pt-1 border-t border-zinc-100">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Email:</span>
                    <span className="font-medium text-zinc-900">{agent.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Zone:</span>
                    <span className="font-medium text-zinc-900">{agent.serviceArea}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Updated:</span>
                    <span>{formatDate(agent.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                  <Link
                    href={`/agents/${agent.id}`}
                    className="flex-1 text-center py-1.5 text-xs font-semibold text-zinc-800 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    View
                  </Link>
                  <Link
                    href={`/agents/${agent.id}/edit`}
                    className="flex-1 text-center py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => setAgentToDelete(agent)}
                    className="py-1.5 px-3 text-xs font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Accessible Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(agentToDelete)}
        title="Delete Delivery Agent"
        message={`Are you sure you want to delete "${agentToDelete?.fullName}"? This action will immediately remove the agent from the dashboard and invalidate active caches.`}
        confirmText="Delete Agent"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setAgentToDelete(null)}
      />
    </div>
  );
}
