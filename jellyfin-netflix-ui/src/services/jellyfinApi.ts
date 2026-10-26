import { Jellyfin } from '@jellyfin/sdk';
import { getTvShowsApi } from '@jellyfin/sdk/lib/utils/api/tv-shows-api';
import { getUserApi } from '@jellyfin/sdk/lib/utils/api/user-api';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { getUserViewsApi } from '@jellyfin/sdk/lib/utils/api/user-views-api';
import { getUserLibraryApi } from '@jellyfin/sdk/lib/utils/api/user-library-api';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { BaseItemKind, ItemFields, ItemFilter, ItemSortBy, SortOrder } from '@jellyfin/sdk/lib/generated-client/models';

const jellyfin = new Jellyfin({
  clientInfo: { name: 'Tokoshan', version: '1.0.0' },
  deviceInfo: { name: 'Web', id: 'tokoshan-web' },
});

export const getApi = (serverUrl: string, token: string) => {
  const api = jellyfin.createApi(serverUrl);
  api.accessToken = token;
  return api;
};

export const authenticateByName = async (serverUrl: string, username: string, password: string) => {
  const api = jellyfin.createApi(serverUrl);
  const response = await getUserApi(api).authenticateUserByName({
    authenticateUserByName: { Username: username, Pw: password }
  });
  return response.data;
};

export const getUsers = async (serverUrl: string, apiKey: string) => {
  const api = getApi(serverUrl, apiKey);
  const response = await getUserApi(api).getPublicUsers();
  return response.data;
};

export const getImageUrl = (serverUrl: string, itemId: string, type: 'Primary' | 'Backdrop' | 'Logo' = 'Primary', maxWidth?: number, maxHeight?: number, token?: string) => {
  let url = `${serverUrl}/Items/${itemId}/Images/${type}?quality=90`;
  if (maxWidth) url += `&maxWidth=${maxWidth}`;
  if (maxHeight) url += `&maxHeight=${maxHeight}`;
  if (token) url += `&api_key=${token}`;
  return url; 
};

export const getUserViews = async (serverUrl: string, userId: string, token: string) => {
  const api = getApi(serverUrl, token);
  const response = await getUserViewsApi(api).getUserViews({ userId });
  return response.data;
};

export const searchItems = async (serverUrl: string, userId: string, token: string, searchTerm: string) => {
  const api = getApi(serverUrl, token);
  const response = await getItemsApi(api).getItems({
    userId,
    searchTerm,
    includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
    recursive: true,
    limit: 40
  });
  return response.data;
};

export const getResumeItems = async (serverUrl: string, userId: string, token: string) => {
  const api = getApi(serverUrl, token);
  const response = await getItemsApi(api).getResumeItems({
    userId,
    limit: 24,
    includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
    fields: [ItemFields.Overview, ItemFields.Genres]
  });
  return response.data;
};

export const getFavoriteItems = async (serverUrl: string, userId: string, token: string) => {
  const api = getApi(serverUrl, token);
  const response = await getItemsApi(api).getItems({
    userId,
    filters: [ItemFilter.IsFavorite],
    includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
    recursive: true,
    limit: 24,
    fields: [ItemFields.Overview, ItemFields.Genres]
  });
  return response.data;
};

export const getLatestMedia = async (serverUrl: string, userId: string, token: string) => {
  const api = getApi(serverUrl, token);
  const response = await getUserLibraryApi(api).getLatestMedia({
    userId,
    limit: 20,
    includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
    fields: [ItemFields.Overview, ItemFields.PrimaryImageAspectRatio, ItemFields.Genres]
  });
  return response.data;
};

export const getItemsByGenre = async (serverUrl: string, userId: string, token: string, genre: string, itemType: 'Movie' | 'Series' = 'Movie') => {
  const api = getApi(serverUrl, token);
  const response = await getItemsApi(api).getItems({
    userId,
    includeItemTypes: [itemType as BaseItemKind],
    recursive: true,
    genres: [genre],
    limit: 40,
    fields: [ItemFields.Overview, ItemFields.Genres]
  });
  return response.data;
};

export const getCollections = async (serverUrl: string, userId: string, token: string) => {
  const api = getApi(serverUrl, token);
  const response = await getItemsApi(api).getItems({
    userId,
    includeItemTypes: [BaseItemKind.BoxSet],
    recursive: true,
    limit: 20,
    fields: [ItemFields.Overview, ItemFields.ChildCount]
  });
  return response.data;
};

export const getCollectionItems = async (serverUrl: string, userId: string, token: string, collectionId: string) => {
  const api = getApi(serverUrl, token);
  const response = await getItemsApi(api).getItems({
    userId,
    parentId: collectionId,
    sortBy: [ItemSortBy.SortName],
    sortOrder: [SortOrder.Ascending],
    fields: [ItemFields.PrimaryImageAspectRatio, ItemFields.Overview]
  });
  return response.data;
};

export const getItemDetails = async (serverUrl: string, userId: string, token: string, itemId: string) => {
  const api = getApi(serverUrl, token);
  const response = await getUserLibraryApi(api).getItem({
    userId,
    itemId
  });
  return response.data;
};

export const getSimilarItems = async (serverUrl: string, userId: string, token: string, itemId: string) => {
  const api = getApi(serverUrl, token);
  const response = await getLibraryApi(api).getSimilarItems({
    userId,
    itemId,
    limit: 10,
    fields: [ItemFields.Overview, ItemFields.Genres]
  });
  return response.data;
};

export const getEpisodes = async (serverUrl: string, userId: string, token: string, seriesId: string) => {
  const api = getApi(serverUrl, token);
  const response = await getTvShowsApi(api).getEpisodes({
    seriesId,
    userId,
    fields: [ItemFields.Overview, ItemFields.Genres]
  });
  return response.data;
};

export const detailsCache: Record<string, { details: any, similar: any[], episodes: any[] }> = {};

export const prefetchItemDetails = async (serverUrl: string, userId: string, token: string, itemId: string, type: 'movie' | 'series' | 'collection' | undefined) => {
  if (detailsCache[itemId]) return;
  
  detailsCache[itemId] = { details: null, similar: [], episodes: [] };
  
  try {
    const details = await getItemDetails(serverUrl, userId, token, itemId);
    const similar = await getSimilarItems(serverUrl, userId, token, itemId);
    let episodes: any[] = [];
    if (type === 'series') {
      const epData = await getEpisodes(serverUrl, userId, token, itemId);
      episodes = epData.Items || [];
    } else if (type === 'collection') {
      const colData = await getCollectionItems(serverUrl, userId, token, itemId);
      episodes = colData.Items || []; 
    }
    detailsCache[itemId] = { details, similar: similar.Items || [], episodes };
  } catch (error) {
    console.error('Failed to prefetch', error);
  }
};

export const formatRunTime = (ticks?: number) => {
  if (!ticks) return '';
  const totalSeconds = Math.floor(ticks / 10000000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export interface GetAllServerMediaOptions {
  searchTerm?: string;
  itemType?: 'Movie' | 'Series' | 'All';
  limit?: number;
  startIndex?: number;
}

export const getAllServerMedia = async (
  serverUrl: string,
  userId: string,
  token: string,
  options?: GetAllServerMediaOptions
) => {
  const api = getApi(serverUrl, token);
  let includeItemTypes: BaseItemKind[] = [BaseItemKind.Movie, BaseItemKind.Series];
  if (options?.itemType === 'Movie') {
    includeItemTypes = [BaseItemKind.Movie];
  } else if (options?.itemType === 'Series') {
    includeItemTypes = [BaseItemKind.Series];
  }

  const response = await getItemsApi(api).getItems({
    userId,
    searchTerm: options?.searchTerm ? options.searchTerm.trim() : undefined,
    includeItemTypes,
    recursive: true,
    sortBy: [ItemSortBy.SortName],
    sortOrder: [SortOrder.Ascending],
    fields: [
      ItemFields.Overview,
      ItemFields.PrimaryImageAspectRatio,
      ItemFields.Genres,
      ItemFields.MediaStreams
    ],
    limit: options?.limit ?? 150,
    startIndex: options?.startIndex ?? 0,
    enableTotalRecordCount: true
  });
  return response.data;
};

