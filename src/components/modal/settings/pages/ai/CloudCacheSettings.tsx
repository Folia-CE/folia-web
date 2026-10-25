import React, { useCallback, useSyncExternalStore, useState } from 'react';
import { Check, Cloud, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, FoldedGroup, Row, TextField, Toggle } from '../../kit';
import {
    getFoliaCloudSettingsVersion,
    readFoliaCloudSettings,
    resolveCloudApiUrl,
    subscribeFoliaCloudSettings,
    updateFoliaCloudSettings,
} from '../../../../../services/foliaCloud';
import { O, CLOUD_CACHE } from './cloudCacheOptions';

// src/components/modal/settings/pages/ai/CloudCacheSettings.tsx
//
// 云缓存的设置：一个开关 + 一个服务地址 + 一个「测试连接」。
//
// 这一组只在网页版出现（见 cloudCacheOptions.ts）：它的用处就是让**没填 AI Key 的人**
// 也能拿到别人生成好的主题。桌面端主题由主进程生成，这层缓存没有意义，因而不画。

type ProbeState =
    | { state: 'idle' }
    | { state: 'running' }
    | { state: 'done'; ok: boolean; text: string };

/** 订阅云缓存的设置，改动后立刻重画（地址改完马上生效，不需要重启）。 */
const useFoliaCloudSettings = () => {
    const version = useSyncExternalStore(
        subscribeFoliaCloudSettings,
        getFoliaCloudSettingsVersion,
        getFoliaCloudSettingsVersion,
    );
    // version 只是用来触发重读的：设置对象本身不可变，改了才换身份。
    return React.useMemo(() => readFoliaCloudSettings(), [version]);
};

const CloudCacheSettings: React.FC = () => {
    const { t } = useTranslation();
    const settings = useFoliaCloudSettings();
    const [probe, setProbe] = useState<ProbeState>({ state: 'idle' });

    const runProbe = useCallback(async () => {
        setProbe({ state: 'running' });
        const startedAt = Date.now();
        try {
            // 问一下歌名清单：这条最轻，又能证明「地址对、服务活着、接口版本对得上」。
            const response = await fetch(`${resolveCloudApiUrl('ai-cache/songs')}?limit=1&offset=0`, {
                method: 'GET',
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) {
                setProbe({ state: 'done', ok: false, text: `${t('options.cloudCacheProbeFailed')}HTTP ${response.status}` });
                return;
            }
            setProbe({ state: 'done', ok: true, text: `${t('options.cloudCacheProbeOk')} · ${Date.now() - startedAt} ms` });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setProbe({ state: 'done', ok: false, text: `${t('options.cloudCacheProbeFailed')}${message}` });
        }
    }, [t]);

    return (
        <FoldedGroup def={CLOUD_CACHE} summary={settings.enabled ? t('options.cloudCacheOn') : t('options.cloudCacheOff')}>
            <Row option={O.enabled} note={t('options.cloudCacheDesc')}>
                <Toggle
                    checked={settings.enabled}
                    onChange={() => updateFoliaCloudSettings({ enabled: !settings.enabled })}
                />
            </Row>
            <Row option={O.baseUrl} note={t('options.cloudCacheBaseUrlDesc')}>
                <TextField
                    value={settings.baseUrl}
                    onChange={(value) => updateFoliaCloudSettings({ baseUrl: value })}
                    placeholder="https://apif.tangbot.xyz"
                />
            </Row>
            <Row
                label={probe.state === 'done' && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] opacity-70">
                        {probe.ok ? <Check size={12} /> : <X size={12} />}
                        {probe.text}
                    </span>
                )}
                below={<span className="text-[10px] opacity-45">{t('options.cloudCachePrivacy')}</span>}
            >
                <Button icon={probe.state === 'running' ? Loader2 : Cloud} onClick={() => void runProbe()} disabled={probe.state === 'running'}>
                    {probe.state === 'running' ? t('options.aiTestRunning') : t('options.cloudCacheProbe')}
                </Button>
            </Row>
        </FoldedGroup>
    );
};

export default CloudCacheSettings;
