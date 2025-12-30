/**
 * Schema-Versioned Persistence Layer
 *
 * Handles saving/loading profiles with forward compatibility.
 * When loading older schemas, missing fields get defaults and
 * a migration message is shown.
 */

const CURRENT_SCHEMA_VERSION = 1;

// Storage keys
export const STORAGE_KEYS = {
  currentProfile: 'rp-current-profile',
  profiles: 'rp-profiles',
  settings: 'rp-settings',
  chatSessions: 'rp-chat-sessions',
};

/**
 * Profile structure with schema version
 */
const createProfile = (data = {}) => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id: data.id || Date.now(),
  name: data.name || 'Untitled Profile',
  createdAt: data.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  params: data.params || {},
  options: data.options || {},
  settings: data.settings || {},
  scenarios: data.scenarios || [],
  chatSessions: data.chatSessions || [],
});

/**
 * Migrate profile from older schema versions
 */
const migrateProfile = profile => {
  const messages = [];
  const migrated = { ...profile };

  // Handle missing schema version (pre-versioning)
  if (!migrated.schemaVersion) {
    migrated.schemaVersion = 0;
    messages.push('Migrated from pre-versioned format');
  }

  // Migration from v0 to v1
  if (migrated.schemaVersion < 1) {
    // Add any new required fields with defaults
    migrated.chatSessions = migrated.chatSessions || [];
    migrated.scenarios = migrated.scenarios || [];
    migrated.schemaVersion = 1;
    messages.push('Added chat session and scenario support');
  }

  // Future migrations would go here
  // if (migrated.schemaVersion < 2) { ... }

  migrated.updatedAt = new Date().toISOString();

  return { profile: migrated, messages };
};

/**
 * Save profile to localStorage
 */
export const saveProfile = profile => {
  try {
    const fullProfile = createProfile(profile);
    localStorage.setItem(STORAGE_KEYS.currentProfile, JSON.stringify(fullProfile));
    return { success: true };
  } catch (e) {
    console.error('Failed to save profile:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Load profile from localStorage with migration
 */
export const loadProfile = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.currentProfile);
    if (!saved) return { profile: null, messages: [] };

    const parsed = JSON.parse(saved);
    const { profile, messages } = migrateProfile(parsed);

    // Auto-save migrated profile
    if (messages.length > 0) {
      saveProfile(profile);
    }

    return { profile, messages };
  } catch (e) {
    console.error('Failed to load profile:', e);
    return { profile: null, messages: [], error: e.message };
  }
};

/**
 * Export profile to JSON file (for sharing/backup)
 */
export const exportProfileToJSON = (profile, filename = 'retirement-profile') => {
  const fullProfile = createProfile(profile);
  const blob = new Blob([JSON.stringify(fullProfile, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Import profile from JSON file
 * Returns profile and any migration messages
 */
export const importProfileFromJSON = async file => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        const { profile, messages } = migrateProfile(data);
        resolve({ profile, messages });
      } catch (err) {
        reject(new Error('Invalid JSON file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

/**
 * List all saved profiles
 */
export const listProfiles = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.profiles);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

/**
 * Save profile to named profiles list
 */
export const saveNamedProfile = profile => {
  const profiles = listProfiles();
  const existing = profiles.findIndex(p => p.id === profile.id);
  const fullProfile = createProfile(profile);

  if (existing >= 0) {
    profiles[existing] = fullProfile;
  } else {
    profiles.push(fullProfile);
  }

  localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
  return fullProfile;
};

/**
 * Delete a named profile
 */
export const deleteNamedProfile = profileId => {
  const profiles = listProfiles().filter(p => p.id !== profileId);
  localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
};

export { CURRENT_SCHEMA_VERSION };
