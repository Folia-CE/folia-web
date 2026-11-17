// src/stores/storagePrimitives.ts
// The localStorage read/write primitives every settings store shares.
//
// Moved out of useSettingsUiStore so the domain stores split out of it do not have to import
// from each other just to read a boolean. Behaviour is unchanged, including the SSR guard.

export const getStoredBoolean = (key: string, fallback: boolean) => {
    if (typeof window === 'undefined') {
        return fallback;
    }

    const saved = localStorage.getItem(key);
    return saved !== null ? saved === 'true' : fallback;
};

export const setStoredBoolean = (key: string, value: boolean) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(key, String(value));
    }
};

export const setStoredString = (key: string, value: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
    }
};

export const getStoredString = (key: string, fallback: string) => {
    if (typeof window === 'undefined') {
        return fallback;
    }

    return localStorage.getItem(key) || fallback;
};

export const removeStoredKey = (key: string) => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
    }
};

/**
 * The raw localStorage object, or null when there is none (SSR, tests) or when
 * touching it throws (private mode in some browsers).
 *
 * Some callers need the storage object itself rather than a single value: they
 * enumerate keys (the cross-tab lease in src/library/core/account/loginLeaderLease.ts
 * decides the leader by looking at every candidate key). Those callers cannot
 * go through getStoredString/setStoredString, so the object is handed out here —
 * this module is the one place allowed to name localStorage directly.
 */
export const browserLocalStorage = (): Storage | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

/** The raw sessionStorage object, or null when there is none or it throws. */
export const browserSessionStorage = (): Storage | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
};
