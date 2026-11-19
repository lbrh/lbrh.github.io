/**
 * Recording start time from a media file's own metadata. Video and m4a
 * files (QuickTime/MP4 family — iPhone, Android, GoPro, most recorders)
 * carry a creation time in the `mvhd` atom inside `moov`; there's no EXIF
 * in video, this is the equivalent. mp3/wav usually have nothing, so those
 * fall back to the file's saved time minus its length (done by the caller).
 */

const MAC_TO_UNIX_SECONDS = 2082844800; // 1904-01-01 -> 1970-01-01

function fourcc(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

const MAX_MOOV_SCAN = 32 * 1024 * 1024;
const LOCAL_ISO = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/;

export type MediaStart = {
  /** Local wall-clock time of recording start, seconds since midnight. */
  seconds: number;
  /** "local": the device's own local-time stamp (iPhone); "utc": converted from UTC to this browser's zone. */
  source: 'local' | 'utc';
};

/**
 * iPhones also write com.apple.quicktime.creationdate, e.g.
 * 2024-03-09T15:42:10+1100 — the local time where it was filmed, so no
 * time-zone conversion is involved. Returns that time of day, or null.
 */
async function readAppleLocalTime(file: File, moovStart: number, moovSize: number): Promise<number | null> {
  const buf = await file.slice(moovStart, moovStart + Math.min(moovSize, MAX_MOOV_SCAN)).arrayBuffer();
  const text = new TextDecoder('latin1').decode(buf);
  if (!text.includes('com.apple.quicktime.creationdate')) return null;
  const m = text.match(LOCAL_ISO);
  if (!m) return null;
  const year = Number(m[1]);
  if (year < 2005 || year > new Date().getFullYear() + 1) return null;
  return Number(m[4]) * 3600 + Number(m[5]) * 60 + Number(m[6]);
}

/** Recording start time from an MP4/MOV/M4A file's metadata, or null if there isn't a sane one. */
export async function readMediaCreationTime(file: File): Promise<MediaStart | null> {
  try {
    let offset = 0;
    for (let guard = 0; guard < 128 && offset + 8 <= file.size; guard++) {
      const head = new DataView(await file.slice(offset, offset + 16).arrayBuffer());
      if (head.byteLength < 8) return null;
      let size = head.getUint32(0);
      const type = fourcc(head, 4);
      let headerLen = 8;
      if (size === 1) {
        if (head.byteLength < 16) return null;
        size = Number(head.getBigUint64(8));
        headerLen = 16;
      } else if (size === 0) {
        size = file.size - offset;
      }
      if (size < headerLen) return null;

      if (type === 'moov') {
        const apple = await readAppleLocalTime(file, offset + headerLen, size - headerLen);
        if (apple !== null) return { seconds: apple, source: 'local' };
        const body = new DataView(
          await file.slice(offset + headerLen, offset + headerLen + Math.min(size - headerLen, 4096)).arrayBuffer(),
        );
        let p = 0;
        while (p + 8 <= body.byteLength) {
          const childSize = body.getUint32(p);
          if (fourcc(body, p + 4) === 'mvhd') {
            const version = body.getUint8(p + 8);
            const created =
              version === 1 ? Number(body.getBigUint64(p + 12)) : body.getUint32(p + 12);
            if (!created) return null;
            const date = new Date((created - MAC_TO_UNIX_SECONDS) * 1000);
            const year = date.getFullYear();
            // Recorders with no clock write zero/1904 or a bogus default.
            if (year < 2005 || date.getTime() > Date.now() + 86_400_000) return null;
            return {
              seconds: date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds(),
              source: 'utc',
            };
          }
          if (childSize < 8) break;
          p += childSize;
        }
        return null;
      }
      offset += size;
    }
  } catch {
    /* unreadable or not an MP4-family file */
  }
  return null;
}

/** Duration in seconds via a throwaway media element, or null if the browser can't read it. */
export function readMediaDuration(url: string, isVideo: boolean): Promise<number | null> {
  return new Promise((resolve) => {
    const el = document.createElement(isVideo ? 'video' : 'audio');
    const done = (v: number | null) => {
      el.removeAttribute('src');
      el.load();
      resolve(v);
    };
    const timer = setTimeout(() => done(null), 8000);
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      clearTimeout(timer);
      done(Number.isFinite(el.duration) ? el.duration : null);
    };
    el.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    el.src = url;
  });
}
