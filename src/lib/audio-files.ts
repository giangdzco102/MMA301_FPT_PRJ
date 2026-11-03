import { Directory, File, Paths } from 'expo-file-system';

const recordingsDir = new Directory(Paths.document, 'recordings');

function extensionOf(name: string, fallback: string) {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : fallback;
}

/**
 * Copies a temporary audio file (recorder cache / document picker cache) into the
 * app's private document directory so it survives cache cleanup.
 */
export async function persistAudio(sourceUri: string, id: string, originalName: string) {
  recordingsDir.create({ idempotent: true, intermediates: true });
  const ext = extensionOf(originalName, extensionOf(sourceUri, 'm4a'));
  const target = new File(recordingsDir, `${id}.${ext}`);
  if (target.exists) target.delete();
  const source = new File(sourceUri);
  source.copy(target);
  return target.uri;
}

export function deleteAudio(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // File already gone – nothing to clean up.
  }
}
