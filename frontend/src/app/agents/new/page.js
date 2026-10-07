'use client';

/**
 * Create New Delivery Agent Page.
 * Houses AgentForm in create mode and redirects to the new agent details upon success.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AgentForm from '@/components/AgentForm';
import { createAgent } from '@/lib/api';
import { toast } from 'sonner';

export default function NewAgentPage() {
  const router = useRouter();

  const handleCreate = async (payload) => {
    const res = await createAgent(payload);
    toast.success('Agent created successfully');
    router.push(`/agents/${res.data.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/agents" className="hover:text-indigo-600 transition-colors">
          Agents
        </Link>
        <span>/</span>
        <span className="text-zinc-900 font-medium">New Agent</span>
      </nav>

      {/* Page Header */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Register New Delivery Agent
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Add an agent to your logistics fleet. Upon saving, Redis caches are automatically invalidated.
        </p>
      </div>

      {/* Form Card Container */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-zinc-200/80 shadow-xs">
        <AgentForm isEdit={false} onSubmit={handleCreate} />
      </div>
    </div>
  );
}
