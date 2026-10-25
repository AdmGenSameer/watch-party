import { Jellyfin } from '@jellyfin/sdk';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { getSystemApi } from '@jellyfin/sdk/lib/utils/api/system-api';
import { getUserLibraryApi } from '@jellyfin/sdk/lib/utils/api/user-library-api';

const jellyfin = new Jellyfin({
  clientInfo: { name: 'Tokoshan', version: '1.0.0' },
  deviceInfo: { name: 'Web', id: 'tokoshan-web' },
});

export const getApi = (serverUrl: string, token: string) => {
  const api = jellyfin.createApi(serverUrl);
  api.accessToken = token;
  return api;
};

export { getItemsApi, getSystemApi, getUserLibraryApi };
