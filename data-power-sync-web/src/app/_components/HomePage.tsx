"use client";

import { useEffect } from "react";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { api as clientApi } from "~/trpc/react";

export function HomePage() {
  // Use tRPC for data fetching
  const { data: counters, isLoading, refetch } = clientApi.counters.getAll.useQuery({});
  
  // Subscribe to real-time counter updates
  clientApi.counters.onUpdate.useSubscription(undefined, {
    onStarted: () => {
      console.log('✅ Subscription started - listening for updates');
    },
    onData: (update) => {
      console.log('🔔 Received real-time update:', update);
      // Refetch the list when an update is received
      refetch();
    },
    onError: (err) => {
      console.error('❌ Subscription error:', err);
    },
    onComplete: () => {
      console.log('⚠️ Subscription completed/closed');
    }
  });
  
  // Mutations
  const deleteCounter = clientApi.counters.delete.useMutation({
    onSuccess: () => {
      // No need to refetch here - the subscription will handle it
      console.log('Counter deleted successfully');
    }
  });
  
  const incrementCounter = clientApi.counters.increment.useMutation({
    onSuccess: () => {
      // No need to refetch here - the subscription will handle it
      console.log('Counter incremented successfully');
    }
  });
  
  // Handlers
  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this counter?")) {
      deleteCounter.mutate({ id });
    }
  };
  
  const handleIncrement = (id: string) => {
    incrementCounter.mutate({ id, amount: 1 });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="mb-4 text-center">
          Loading counter data...
        </p>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-6">
      <div className="w-full max-w-4xl flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-8">Counters</h1>
        <p className="text-xs text-gray-500 mb-4">
          Real-time updates via tRPC subscriptions
        </p>
      </div>

      {!counters || counters.length === 0 ? (
        <div className="w-full max-w-4xl flex flex-col items-center">
          <p className="text-center">
            You currently have no counters. Add counters through the API.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-2xl">
          <ul className="space-y-3">
            {counters.map((c: any) => {
              const createdDate = c.created_at 
                ? (typeof c.created_at === 'string' 
                    ? new Date(c.created_at) 
                    : c.created_at)
                : null;
              
              return (
                <li
                  key={c.id}
                  className="px-4 py-3 border border-gray-200 rounded-md shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col items-center">
                    <p className="text-lg font-semibold">Count: {c.count ?? 0}</p>
                    <p className="text-sm text-gray-600">OwnerId: {c.owner_id || '-'}</p>
                    <p className="text-xs text-gray-500">
                      Created: {createdDate ? createdDate.toLocaleString() : '-'}
                    </p>
                    
                    <div className="flex items-center justify-center space-x-4 mt-3">
                      <button 
                        onClick={() => handleIncrement(c.id)}
                        disabled={incrementCounter.isPending}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                      >
                        <PlusCircle size={16} /> 
                        {incrementCounter.isPending ? 'Updating...' : 'Increment'}
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        disabled={deleteCounter.isPending}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                      >
                        <Trash2 size={16} /> 
                        {deleteCounter.isPending ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}