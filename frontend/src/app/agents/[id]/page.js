'use client';

/**
 * Agent Details Page.
 * Displays granular agent attributes, Redis cache status badge, one-click ID copy,
 * localized timestamp formatting, and edit/delete controls.
 */

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { getAgent, deleteAgent, ApiRequestError } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import CacheBadge from '@/components/CacheBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from 'sonner';

function AgentDetailContent() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [agent, setAgent] = useState(null);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState(null);

  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    document.title = 'Agent Details | Delivery Agent Manager';
  }, []);

  useEffect(() => {
    async function loadAgent() {
      setIsLoading(true);
      setError(null);
      setIsNotFound(false);

      try {
        const res = await getAgent(id);
        setAgent(res.data);
        setCacheStatus(res.cacheStatus);
      } catch (err) {
        if (
          err instanceof ApiRequestError &&
          (err.status === 404 ||
            err.code === 'AGENT_NOT_FOUND' ||
            err.code === 'INVALID_ID')
        ) {
          setIsNotFound(true);
        } else {
          setError(err.message || 'Failed to load agent profile');
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      loadAgent();
    }
  }, [id]);

  const handleCopyId = async () => {
    if (!agent?.id) return;
    try {
      await navigator.clipboard.writeText(agent.id);
      setCopied(true);
      toast.success('Agent ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy ID to clipboard');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAgent(id);
      toast.success('Agent deleted successfully');
      router.push('/agents');
    } catch (err) {
      toast.error(err.message || 'Failed to delete agent');
      setIsDeleting(false);
      setShowDeleteModal(false);
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
        second: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-4 bg-zinc-200 rounded-sm w-32 animate-pulse" />
        <div className="bg-white p-8 rounded-xl border border-zinc-200 shadow-xs space-y-6">
          <div className="h-8 bg-zinc-200 rounded-md w-1/3 animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-12 bg-zinc-100 rounded-lg animate-pulse" />
            <div className="h-12 bg-zinc-100 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white p-8 rounded-2xl border border-zinc-200 text-center shadow-xs space-y-4">
        <div className="w-14 h-14 rounded-full bg-zinc-100 text-zinc-600 mx-auto flex items-center justify-center">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-900">Agent Not Found</h2>
          <p className="mt-1 text-sm text-zinc-600">
            The requested delivery agent profile could not be found or has been removed from the system.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/agents"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Back to Agents List</span>
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white p-8 rounded-2xl border border-red-200 text-center shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-zinc-900">Error Loading Profile</h2>
        <p className="text-sm text-zinc-600">{error}</p>
        <Link
          href="/agents"
          className="inline-flex px-4 py-2 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Return to Agents
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-600">
        <Link href="/agents" className="hover:text-indigo-600 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded">
          Agents
        </Link>
        <span>/</span>
        <span className="text-zinc-900 font-semibold" aria-current="page">{agent?.fullName}</span>
      </nav>

      {/* Header Profile Summary */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-zinc-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                {agent?.fullName}
              </h1>
              <StatusBadge status={agent?.status} />
              <div className="min-h-6 min-w-24 flex items-center">
                <CacheBadge status={cacheStatus} />
              </div>
            </div>

            {/* Agent ID with Copy Button */}
            <div className="mt-2.5 flex items-center gap-2 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-500">UUID:</span>
              <code className="bg-zinc-100 px-2 py-0.5 rounded font-mono text-[11px] text-zinc-800 border border-zinc-200">
                {agent?.id}
              </code>
              <button
                type="button"
                aria-label="Copy agent UUID to clipboard"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                title="Copy UUID to clipboard"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Link
              href={`/agents/${agent?.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
              <span>Edit Agent</span>
            </Link>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Detailed Attribute Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <span className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Phone Number
            </span>
            <a
              href={`tel:${agent?.phone}`}
              className="font-semibold text-zinc-900 hover:text-indigo-600 transition-colors font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded"
            >
              {agent?.phone}
            </a>
          </div>

          <div>
            <span className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Email Address
            </span>
            <a
              href={`mailto:${agent?.email}`}
              className="font-semibold text-zinc-900 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded"
            >
              {agent?.email}
            </a>
          </div>

          <div>
            <span className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Assigned Service Zone
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
              {agent?.serviceArea}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Operational Status
            </span>
            <span className="text-zinc-800 capitalize font-medium">{agent?.status}</span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Created At
            </span>
            <span className="text-zinc-700 font-medium">{formatDate(agent?.createdAt)}</span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Last Updated
            </span>
            <span className="text-zinc-700 font-medium">{formatDate(agent?.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        title="Delete Delivery Agent"
        message={`Are you sure you want to permanently delete "${agent?.fullName}"? All associated cached data will be invalidated immediately.`}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}

export default function AgentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="h-4 bg-zinc-200 rounded-sm w-32 animate-pulse" />
          <div className="bg-white p-8 rounded-xl border border-zinc-200 shadow-xs h-64 animate-pulse" />
        </div>
      }
    >
      <AgentDetailContent />
    </Suspense>
  );
}
