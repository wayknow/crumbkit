// CrumbKit — Cookie Profiles
// Save and restore cookie sets for testing / environment switching.

const PROFILES_KEY = 'crumbkit_profiles';

/**
 * @typedef {Object} Profile
 * @property {string} id - unique id
 * @property {string} name - user-given name
 * @property {string} domain - the domain cookies were saved from
 * @property {Array} cookies - array of cookie objects
 * @property {number} createdAt - timestamp
 */

/**
 * Load all profiles from storage.
 * @returns {Promise<Profile[]>}
 */
export async function getProfiles() {
  try {
    const data = await chrome.storage.local.get(PROFILES_KEY);
    return data[PROFILES_KEY] || [];
  } catch (_) {
    return [];
  }
}

/**
 * Save a new profile.
 * @param {string} name
 * @param {string} domain
 * @param {Array} cookies
 * @returns {Promise<Profile>}
 */
export async function saveProfile(name, domain, cookies) {
  const profiles = await getProfiles();
  const profile = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    domain,
    cookies: cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite || 'unspecified',
      expirationDate: c.expirationDate || null
    })),
    createdAt: Date.now()
  };
  profiles.push(profile);
  await chrome.storage.local.set({ [PROFILES_KEY]: profiles });
  return profile;
}

/**
 * Delete a profile by id.
 * @param {string} id
 */
export async function deleteProfile(id) {
  const profiles = await getProfiles();
  const filtered = profiles.filter(p => p.id !== id);
  await chrome.storage.local.set({ [PROFILES_KEY]: filtered });
}

/**
 * Get a profile by id.
 * @param {string} id
 * @returns {Promise<Profile|undefined>}
 */
export async function getProfileById(id) {
  const profiles = await getProfiles();
  return profiles.find(p => p.id === id);
}
