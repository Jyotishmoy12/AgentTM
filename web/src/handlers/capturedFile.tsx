import { APIError, get } from '../api';
import type { FileContent } from '../types';

export async function capturedFile(
  id: string,
  path: string,
  signal: AbortSignal,
): Promise<FileContent | null> {
  if (!id) return null;
  try {
    return await get<FileContent>(
      '/checkpoints/' + id + '/file?path=' + encodeURIComponent(path),
      signal,
    );
  } catch (error) {
    if (error instanceof APIError && error.code === 'file_not_found') return null;
    throw error;
  }
}
