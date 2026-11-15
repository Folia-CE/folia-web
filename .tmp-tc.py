# -*- coding: utf-8 -*-
# useThemeController 最终版：上游 0.7.28 全文 + 云缓存前置查询补丁。
# 云缓存放在 generateThemeFromLyrics 之前：命中就不再烧 AI 调用；没命中走上游原有的 AI 生成路。
import io, re

p = 'src/hooks/useThemeController.ts'
c = io.open(p, encoding='utf-8').read()

# 1) import：上游 + 云缓存
c = c.replace(
    "import { generateThemeFromLyrics, isMissingAiApiKeyError } from '../services/aiText';",
    "import { generateThemeFromLyrics, isMissingAiApiKeyError, readCloudThemeFromLyrics } from '../services/aiText';",
)

# 2) generateAITheme 主干：AI 生成之前先问云缓存
old = """            const dualTheme = await generateThemeFromLyrics(promptText, {
                isPureMusic,
                songTitle: songTitle || undefined,
            });"""
new = """            // 先问云缓存：这首有人算过就直接用，不再烧一次 AI 调用（开关与 Key 都不看）。
            // 没命中才走下面的生成路 —— 恢复 AI 生成之后，云缓存是它的省钱前置，不是替代。
            const cachedTheme = await readCloudThemeFromLyrics({ lyricSource: promptText, isPureMusic, songTitle });
            if (cachedTheme) {
                const normalizedCached = applyStoredAnimationIntensityToDualTheme(sanitizeDualTheme(cachedTheme));
                if (currentSong) {
                    await saveToCache(`dual_theme_${getPlaybackSongKey(currentSong)}`, normalizedCached);
                    saveSyncedThemeWithoutBlocking(currentSong, normalizedCached, source === 'auto' ? 'auto' : 'manual');
                }
                if (!shouldApply()) {
                    return { status: 'generated', applied: false };
                }
                if (currentSong) {
                    setCurrentSongHasLocalAiTheme(true);
                }
                applyDualTheme(normalizedCached);
                const selectedCached = getSelectedDualTheme(normalizedCached, isDaylight);
                setStatusMsg({
                    type: 'success',
                    text: bgMode === 'custom' && customTheme
                        ? t('notifications.aiThemeUpdatedCustomPreferred')
                        : t('status.cloudThemeApplied', { themeName: selectedCached.name }),
                });
                return { status: 'generated', applied: true };
            }

            const dualTheme = await generateThemeFromLyrics(promptText, {
                isPureMusic,
                songTitle: songTitle || undefined,
            });"""
assert old in c, 'generateThemeFromLyrics block not found'
c = c.replace(old, new)

io.open(p, 'w', encoding='utf-8', newline='\n').write(c)
print('patched')
