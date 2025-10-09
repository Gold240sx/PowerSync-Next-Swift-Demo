'use client';

import { AppSchema } from '~/library/powersync/AppSchema';
import { BackendConnector } from '~/library/powersync/BackendConnector';
import { PowerSyncContext } from '@powersync/react';
import { createBaseLogger, LogLevel, PowerSyncDatabase } from '@powersync/web';
import React, { Suspense, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Set up logger
const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.DEBUG);

// Create and initialize PowerSync inside a component with error handling
export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  const [powerSync, setPowerSync] = useState<PowerSyncDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize PowerSync
  useEffect(() => {
    const initializePowerSync = async () => {
      try {
        // Create PowerSync instance
        console.log("Initializing PowerSync...");
        const db = new PowerSyncDatabase({
          database: { dbFilename: 'powersync2.db' },
          schema: AppSchema,
          flags: {
            disableSSRWarning: true
          }
        });
        
        // Create connector
        const connector = new BackendConnector();
        
        // Connect PowerSync to the backend
        console.log("Connecting PowerSync to backend...");
        await db.connect(connector);
        
        console.log("PowerSync successfully initialized");
        setPowerSync(db);
      } catch (e: any) {
        console.error("PowerSync initialization error:", e);
        setError(e?.message || "Failed to initialize PowerSync");
      } finally {
        setIsInitializing(false);
      }
    };
    
    // Start initialization
    initializePowerSync();
    
    // Clean up function not needed - PowerSync instance will be preserved
  }, []);
  
  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="mb-4 text-center">Initializing PowerSync...</p>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // Show error if initialization failed
  if (error || !powerSync) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 font-medium mb-2">PowerSync Error</p>
        <p className="text-center mb-4">{error || "Unknown error initializing PowerSync"}</p>
        <p className="text-sm text-center mb-4 max-w-md">
          This is likely due to an issue with the browser's WebAssembly support or a network issue.
          Try using a different browser or check your network connection.
        </p>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          onClick={() => window.location.reload()}
        >
          Reload Page
        </button>
      </div>
    );
  }
  
  // Render children with PowerSync context when ready
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="mb-4 text-center">Loading application...</p>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <PowerSyncContext.Provider value={powerSync}>
        {children}
      </PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;