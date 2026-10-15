/**
 * Learner profiles on this browser. Each profile keeps its own progress by
 * suffixing storage keys with its id; the first profile uses the plain keys,
 * so progress saved before profiles existed still belongs to it.
 */

export interface Profile {
  id: string;
  name: string;
}

interface ProfilesData {
  profiles: Profile[];
  activeId: string;
}

const PROFILES_KEY = 'piano.profiles';
export const DEFAULT_PROFILE_ID = 'default';
export const MAX_PROFILES = 5;

const DEFAULT_DATA: ProfilesData = { profiles: [{ id: DEFAULT_PROFILE_ID, name: 'Me' }], activeId: DEFAULT_PROFILE_ID };

export function loadProfiles(): ProfilesData {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILES_KEY) ?? 'null') as ProfilesData | null;
    if (saved?.profiles?.length && saved.profiles.some((p) => p.id === saved.activeId)) return saved;
  } catch {
    // Storage can be blocked or hold old data
  }
  return DEFAULT_DATA;
}

function save(data: ProfilesData) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(data));
  } catch {
    // Without storage there is only the default profile
  }
}

/** The storage key holding `base` for the active learner */
export function profileKey(base: string): string {
  const id = loadProfiles().activeId;
  return id === DEFAULT_PROFILE_ID ? base : `${base}@${id}`;
}

export function addProfile(name: string): Profile | null {
  const data = loadProfiles();
  if (data.profiles.length >= MAX_PROFILES) return null;
  const profile = { id: Math.random().toString(36).slice(2, 10), name };
  save({ ...data, profiles: [...data.profiles, profile] });
  return profile;
}

export function renameProfile(id: string, name: string) {
  const data = loadProfiles();
  save({ ...data, profiles: data.profiles.map((p) => (p.id === id ? { ...p, name } : p)) });
}

/** Removes a profile and everything it saved; the first profile can't be removed */
export function deleteProfile(id: string) {
  if (id === DEFAULT_PROFILE_ID) return;
  const data = loadProfiles();
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.endsWith(`@${id}`)) localStorage.removeItem(key);
    }
  } catch {
    // Nothing to clean up without storage
  }
  const profiles = data.profiles.filter((p) => p.id !== id);
  save({ profiles, activeId: data.activeId === id ? DEFAULT_PROFILE_ID : data.activeId });
}

export function setActiveProfile(id: string) {
  save({ ...loadProfiles(), activeId: id });
}
