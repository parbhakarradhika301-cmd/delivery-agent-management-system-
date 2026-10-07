'use client';

/**
 * Edit Delivery Agent Page.
 * Prefills existing agent attributes, captures only modified fields for PATCH submission,
 * and redirects to the updated detail view on success.
 */

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import AgentForm from '@/components/AgentForm';
import { getAgent, updateAgent, ApiRequestError } from '@/lib/api';
import { toast } from 'sonner';

function EditAgentContent() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [agent, setAgent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAgent() {
      setIsLoading(true);
      setError(null);
      setIsNotFound(false);

      try {
        const res = await getAgent(id);
        setAgent(res.data);
      } catch (err) {
        if (
          err instanceof ApiRequestError &&
          (err.status === 404 ||
            err.code === 'AGENT_NOT_FOUND' ||
            err.code === 'INVALID_ID')
        ) {
          setIsNotFound(true);
        } else {
          setError(err.message || 'Failed to load agent');
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      loadAgent();
    }
  }, [id]);

  const handleUpdate = async (changedFields) => {
    await updateAgent(id, changedFields);
    toast.success('Agent updated successfully');
    router.push(`/agents/${id}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-4 bg-zinc-200 rounded-sm w-32 animate-pulse" />
        <div className="bg-white p-8 rounded-xl border border-zinc-200/80 shadow-xs space-y-6">
          <div className="h-8 bg-zinc-200 rounded-md w-1/3 animate-pulse" />
          <div className="space-y-4">
            <div className="h-10 bg-zinc-100 rounded-lg animate-pulse" />
            <div className="h-10 bg-zinc-100 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-2xl border border-zinc-200 text-center shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-zinc-900">Agent Not Found</h2>
        <p className="text-sm text-zinc-600">The agent you wish to edit does not exist.</p>
        <Link
          href="/agents"
          className="inline-flex px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs"
        >
          Return to Agents
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-2xl border border-red-200 text-center shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Failed to Load Profile</h2>
        <p className="text-sm text-zinc-600">{error}</p>
        <Link
          href="/agents"
          className="inline-flex px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
        >
          Return to Agents
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/agents" className="hover:text-indigo-600 transition-colors">
          Agents
        </Link>
        <span>/</span>
        <Link href={`/agents/${id}`} className="hover:text-indigo-600 transition-colors">
          {agent?.fullName}
        </Link>
        <span>/</span>
        <span className="text-zinc-900 font-medium">Edit</span>
      </nav>

      {/* Header */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Edit Agent: {agent?.fullName}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Modify agent profile attributes. Only modified fields will be transmitted in the update.
        </p>
      </div>

      {/* Prefilled Form Container */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-zinc-200/80 shadow-xs">
        <AgentForm
          initialData={agent}
          isEdit={true}
          onSubmit={handleUpdate}
          onCancel={() => router.push(`/agents/${id}`)}
        />
      </div>
    </div>
  );
}

export default function EditAgentPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-4 bg-zinc-200 rounded-sm w-32 animate-pulse" />
          <div className="bg-white p-8 rounded-xl border border-zinc-200/80 shadow-xs h-64 animate-pulse" />
        </div>
      }
    >
      <EditAgentContent />
    </Suspense>
  );
}
