export const DEFAULT_NARRATION_VOICE = 'aoede';
export const DEFAULT_NARRATION_RATE = 1.25;
export const NARRATION_RATES = Object.freeze([1, 1.25, 1.5, 1.75]);
export const REQUIRED_NARRATION_TRACKS = Object.freeze({
  aoede: Object.freeze({
    gender: 'female',
    voiceId: 'en-US-Chirp3-HD-Aoede',
  }),
  algieba: Object.freeze({
    gender: 'male',
    voiceId: 'en-US-Chirp3-HD-Algieba',
  }),
});

function findTrackId(trackIds, candidate) {
  if (typeof candidate !== 'string' || !candidate.trim()) return null;
  const wanted = candidate.trim().toLowerCase();
  return trackIds.find((id) => id.toLowerCase() === wanted) || null;
}

function cleanSectionStarts(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([section, seconds]) => (
        typeof section === 'string'
        && section.trim()
        && Number.isFinite(Number(seconds))
        && Number(seconds) >= 0
      ))
      .map(([section, seconds]) => [section.trim(), Number(seconds)]),
  );
}

export function usableNarrationTracks(manifest) {
  if (!manifest?.tracks || typeof manifest.tracks !== 'object') return [];

  return Object.entries(manifest.tracks)
    .filter(([id, track]) => (
      typeof id === 'string'
      && id.trim().length > 0
      && track
      && typeof track === 'object'
      && typeof track.object_key === 'string'
      && track.object_key.trim().length > 0
    ))
    .map(([id, track]) => ({
      id,
      label: typeof track.label === 'string' && track.label.trim()
        ? track.label.trim()
        : id,
      gender: track.gender === 'female' || track.gender === 'male'
        ? track.gender
        : '',
      voiceId: typeof track.voice_id === 'string' ? track.voice_id : '',
      objectKey: track.object_key.trim(),
      durationSeconds: Number.isFinite(Number(track.duration_seconds))
        && Number(track.duration_seconds) > 0
        ? Number(track.duration_seconds)
        : 0,
      sectionStarts: cleanSectionStarts(track.section_starts),
    }));
}

export function hasUsableNarration(manifest) {
  const tracks = usableNarrationTracks(manifest);
  if (tracks.length !== Object.keys(REQUIRED_NARRATION_TRACKS).length) return false;
  return Object.entries(REQUIRED_NARRATION_TRACKS).every(([id, expected]) => {
    const track = tracks.find((candidate) => candidate.id === id);
    return track?.gender === expected.gender && track?.voiceId === expected.voiceId;
  });
}

export function narrationManifestProblem(manifest, mediaBaseUrl) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return 'the narration manifest is missing';
  }
  if (manifest.schema_version !== 1) return 'the narration manifest schema is unsupported';
  if (!/^puzzle:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.content_id || '')) {
    return 'the narration content identifier is invalid';
  }
  for (const key of ['source_sha256', 'recipe_sha256', 'release_sha256']) {
    if (!/^[a-f0-9]{64}$/.test(manifest[key] || '')) {
      return `the narration ${key} is invalid`;
    }
  }
  if (!hasUsableNarration(manifest)) {
    return 'both preserved Aoede and Algieba tracks are required';
  }
  let parsedBaseUrl;
  try {
    parsedBaseUrl = new URL(String(mediaBaseUrl || ''));
  } catch {
    return 'VITE_MEDIA_BASE_URL is missing or invalid';
  }
  if (parsedBaseUrl.protocol !== 'https:' || parsedBaseUrl.username || parsedBaseUrl.password) {
    return 'VITE_MEDIA_BASE_URL must be a credential-free HTTPS origin';
  }
  if (parsedBaseUrl.pathname !== '/' || parsedBaseUrl.search || parsedBaseUrl.hash) {
    return 'VITE_MEDIA_BASE_URL must contain only an HTTPS origin';
  }
  return '';
}

export function chooseNarrationVoice(tracks, configuredVoice) {
  const trackIds = tracks.map((track) => track.id);
  return (
    findTrackId(trackIds, configuredVoice)
    || findTrackId(trackIds, DEFAULT_NARRATION_VOICE)
    || trackIds[0]
    || null
  );
}

export function isNarrationRate(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && NARRATION_RATES.includes(numeric);
}

export function chooseNarrationRate(configuredRate) {
  return isNarrationRate(configuredRate)
    ? Number(configuredRate)
    : DEFAULT_NARRATION_RATE;
}

export function formatNarrationRate(rate) {
  return `${Number(rate).toFixed(2)}x`;
}

export function clampMediaTime(seconds, duration) {
  const value = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
  const boundedDuration = Number.isFinite(Number(duration)) && Number(duration) > 0
    ? Number(duration)
    : 0;

  if (boundedDuration === 0) return Math.max(0, value);
  return Math.min(boundedDuration, Math.max(0, value));
}

export function seekBySeconds(currentTime, deltaSeconds, duration) {
  const current = Number.isFinite(Number(currentTime)) ? Number(currentTime) : 0;
  const delta = Number.isFinite(Number(deltaSeconds)) ? Number(deltaSeconds) : 0;
  return clampMediaTime(current + delta, duration);
}

export function mediaProgressRatio(currentTime, duration) {
  const total = Number(duration);
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.min(1, Math.max(0, Number(currentTime) / total || 0));
}

export function timeAtProgressRatio(ratio, duration) {
  const total = Number(duration);
  if (!Number.isFinite(total) || total <= 0) return 0;
  const normalized = Math.min(1, Math.max(0, Number(ratio) || 0));
  return normalized * total;
}

export function formatNarrationTime(seconds) {
  const safe = Math.max(0, Number.isFinite(Number(seconds)) ? Number(seconds) : 0);
  const whole = Math.floor(safe);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remainder = whole % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function narrationTimeValueText(currentTime, duration) {
  return `${formatNarrationTime(currentTime)} of ${formatNarrationTime(duration)}`;
}

export function voiceDescription(track, fallback = 'selected voice') {
  if (!track) return fallback;
  return track.gender ? `${track.label}, ${track.gender}` : track.label;
}

export function sectionStartTime(track, section, duration) {
  if (!section) return null;
  const exact = track?.sectionStarts?.[section];
  if (Number.isFinite(exact) && exact >= 0) return clampMediaTime(exact, duration);
  return null;
}
