import {
	AbstractPowerSyncDatabase,
	type PowerSyncBackendConnector
} from "@powersync/web"
import { env } from '~/env';

export class BackendConnector implements PowerSyncBackendConnector {
  private powersyncUrl: string | undefined;
  private powersyncToken: string | undefined;

  constructor() {
    this.powersyncUrl = env.NEXT_PUBLIC_POWERSYNC_URL;
    this.powersyncToken = env.NEXT_PUBLIC_POWERSYNC_TOKEN;
    
    console.log('BackendConnector initialized with URL:', this.powersyncUrl ? 'Set' : 'Not set');
  }

  async fetchCredentials() {
    console.log('fetchCredentials called');
    
    // Simple direct approach - just use the token directly
    if (this.powersyncUrl && this.powersyncToken) {
      console.log('Returning credentials');
      return {
        endpoint: this.powersyncUrl,
        token: this.powersyncToken
      };
    }
    
    console.log('No credentials available');
    return null;
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    console.log('uploadData called');
    
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) {
      console.log('No transaction to process');
      return;
    }

    try {
      // For demo, just complete the transaction without actually uploading
      console.log('Completing transaction without uploading (demo mode)');
      await transaction.complete();
    } catch (error: any) {
      console.error('Error in uploadData:', error);
      throw error;
    }
  }
}