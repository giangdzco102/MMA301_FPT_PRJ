/**
 * Web preview: there is no private file system, so audio stays as a blob/object URL.
 * It lives only for the browser session; the transcript and summary are still saved.
 */
export async function persistAudio(sourceUri: string, _id: string, _originalName: string) {
  return sourceUri;
}

export function deleteAudio(uri: string) {
  if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
}
