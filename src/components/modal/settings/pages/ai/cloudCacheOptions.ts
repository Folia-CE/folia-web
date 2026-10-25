import { option, type SettingsGroupDef, type SettingsOptionDef } from '../../kit';

// src/components/modal/settings/pages/ai/cloudCacheOptions.ts
// 「云缓存」那一组。刻意和 AI 连接那一组分开：AI 连接整组是 electronOnly（密钥存在主进程），
// 而云缓存**在网页版才有意义** —— 没填 Key 的人靠它拿到别人生成好的主题。
//
// 所以这一组不挂 electronOnly，只在桌面端隐藏（桌面端的生成走主进程，不进浏览器缓存）。

export const CLOUD_CACHE: SettingsGroupDef = {
    id: 'cloudCache',
    titleKey: 'options.cloudCache',
};

export const O = {
    enabled: option(CLOUD_CACHE, 'cloudCache', 'options.cloudCache'),
    baseUrl: option(CLOUD_CACHE, 'cloudCacheBaseUrl', 'options.cloudCacheBaseUrl'),
};

/** 登记给设置页的选项表（搜索、锚点都靠它）。 */
export const CLOUD_CACHE_OPTIONS: SettingsOptionDef[] = Object.values(O);

/** 云缓存这两项在桌面端不显示：那边主题由主进程生成，浏览器这层缓存用不上。 */
export const isCloudCacheSettingsVisible = (): boolean => (
    typeof window !== 'undefined' && !window.electron
);
