// src/services/foliaCloud.ts
// 云服务地址与开关。云缓存（AI 主题结果的复用）用的就是这一份配置。
//
// 移植自 folia-sonnet。默认指向官方那个地址，自建的把地址换成自己的即可。

import { browserLocalStorage } from '@/stores/storagePrimitives';

/*
 * 换过一次键名，别再换回来。
 *
 * 这个开关出厂就是开的，但老版本把它存成了「关」—— 那些值已经躺在用户的
 * localStorage 里了。沿用旧键名的话，读出来的是老版本那个 false，代码里写的
 * 「默认打开」根本轮不上生效，升级上来的用户等于没这个功能。
 *
 * 所以这里挂个 v2：读不到新键 = 第一次用这个版本 = 走默认值（开）。
 */
const STORAGE_KEY = 'foliaCloudSettings.v2';
export const FOLIA_CLOUD_SETTINGS_CHANGED_EVENT = 'folia-ai-cloud-cache-settings-changed';

export const DEFAULT_CLOUD_BASE_URL = 'https://apif.tangbot.xyz';

export interface FoliaCloudSettings {
    /** 云缓存开关。默认打开 —— 没填 Key 的人也能靠它拿到主题。 */
    enabled: boolean;
    /** 云服务地址（不含 /api）。 */
    baseUrl: string;
}

export const DEFAULT_FOLIA_CLOUD_SETTINGS: FoliaCloudSettings = {
    enabled: true,
    baseUrl: DEFAULT_CLOUD_BASE_URL,
};

let cachedSettings: FoliaCloudSettings | null = null;
let settingsVersion = 0;
const listeners = new Set<() => void>();

const normalizeBaseUrl = (value: unknown): string => {
    // 只认字符串：数字/对象混进来都按「没填」处理，别把 [object Object] 拼进地址。
    const trimmed = (typeof value === 'string' ? value : '').trim().replace(/\/+$/, '');
    if (!trimmed) return '';
    // A bare host is the common hand-typed case; the API always lives under /api.
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export const readFoliaCloudSettings = (): FoliaCloudSettings => {
    if (cachedSettings) return { ...cachedSettings };
    let parsed: Partial<FoliaCloudSettings> | null = null;
    const storage = browserLocalStorage();
    if (storage) {
        try {
            const raw = storage.getItem(STORAGE_KEY);
            if (raw) parsed = JSON.parse(raw) as Partial<FoliaCloudSettings>;
        } catch {
            parsed = null;
        }
    }
    cachedSettings = {
        enabled: parsed?.enabled === undefined ? true : parsed.enabled,
        baseUrl: normalizeBaseUrl(parsed?.baseUrl) || DEFAULT_CLOUD_BASE_URL,
    };
    return { ...cachedSettings };
};

export const updateFoliaCloudSettings = (patch: Partial<FoliaCloudSettings>): FoliaCloudSettings => {
    const current = readFoliaCloudSettings();
    const next: FoliaCloudSettings = {
        enabled: patch.enabled === undefined ? current.enabled : patch.enabled,
        baseUrl: patch.baseUrl === undefined
            ? current.baseUrl
            : (normalizeBaseUrl(patch.baseUrl) || DEFAULT_CLOUD_BASE_URL),
    };
    cachedSettings = next;
    const storage = browserLocalStorage();
    if (storage) {
        try {
            storage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
            // Quota or private mode: the session value still applies.
        }
    }
    settingsVersion += 1;
    listeners.forEach(listener => listener());
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(FOLIA_CLOUD_SETTINGS_CHANGED_EVENT));
    }
    return { ...next };
};

export const subscribeFoliaCloudSettings = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const getFoliaCloudSettingsVersion = (): number => settingsVersion;

/**
 * 丢掉内存里那份设置，下次读重新从存储取。
 *
 * 给测试用：这份缓存是**模块级**的，同一进程里跑多个用例时，
 * 前一个用例定下的设置会一直生效，后面的用例改 `window.localStorage` 也没用。
 * 线上没有调用它的地方 —— 设置变了走 `updateFoliaCloudSettings`，那条路会自己更新缓存。
 */
export const resetFoliaCloudSettingsCache = (): void => {
    cachedSettings = null;
    settingsVersion += 1;
    listeners.forEach(listener => listener());
};

export const isFoliaCloudCacheEnabled = (): boolean => readFoliaCloudSettings().enabled;

export const resolveCloudBaseUrl = (): string => readFoliaCloudSettings().baseUrl;

/** `<base>/api/<path>`，`path` 里不要带前导斜杠。 */
export const resolveCloudApiUrl = (path: string): string => (
    `${resolveCloudBaseUrl()}/api/${path.replace(/^\/+/, '')}`
);
