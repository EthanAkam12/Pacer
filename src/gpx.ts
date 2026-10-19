import { Share } from 'react-native';
import { RunRecord } from './types';

/**
 * GPX export (free): the route as a standard GPX track that Strava, Garmin Connect and most
 * running apps can import. Runs recorded since GPX export was added have a time on each point;
 * older ones get times spread evenly across the run.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function toGpx(r: RunRecord): string {
  const start = Date.parse(r.startedAt);
  const n = r.route.length;
  const pts = r.route.map((p, i) => {
    const time = new Date(p.t ?? start + (n > 1 ? (i / (n - 1)) * r.duration * 1000 : 0)).toISOString();
    return `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"><time>${time}</time></trkpt>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Pacely" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(r.title)}</name><time>${new Date(start).toISOString()}</time></metadata>
  <trk>
    <name>${esc(r.title)}</name>
    <type>running</type>
    <trkseg>
${pts.join('\n')}
    </trkseg>
  </trk>
</gpx>
`;
}

/** Saves the GPX to a file and opens the share sheet (falls back to sharing the text). */
export async function shareGpx(r: RunRecord): Promise<void> {
  const text = toGpx(r);
  const name = `pacely-${r.startedAt.slice(0, 10)}-${r.id.slice(-4)}.gpx`;
  try {
    const FS = require('expo-file-system') as typeof import('expo-file-system');
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');
    const file = new FS.File(FS.Paths.cache, name);
    if (file.exists) file.delete();
    (file as unknown as { write: (s: string) => void }).write(text);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: 'application/gpx+xml', dialogTitle: 'Export run (GPX)', UTI: 'com.topografix.gpx' });
      return;
    }
  } catch {
    // fall through to sharing the text itself
  }
  await Share.share({ title: name, message: text });
}
