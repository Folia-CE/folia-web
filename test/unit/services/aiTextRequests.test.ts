import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    generateObsThemeFromLyrics,
    generateThemeFromLyrics,
    isMissingAiApiKeyError,
    readCloudThemeFromLyrics,
} from '@/services/aiText';
import { segmentLyricsWithAi } from '@/services/lyricSegmentationAi';
import { resetFoliaCloudSettingsCache } from '@/services/foliaCloud';

// test/unit/services/aiTextRequests.test.ts
// What the window sends for each AI ask (a theme from lyrics, a lyric segmentation), on each way
// out: the desktop bridge, and our own web routes for each service. Recorded with a fake bridge and
// a fake fetch; no request leaves the test. The third ask, the connection test, is in
// test/unit/settings/aiConnectionTestBridge.test.ts.

const mainProcessClient = createRequire(import.meta.url)('../../../electron/aiTextClient.cjs');

const THEME_ANSWER = {
    light: { name: 'Dawn', backgroundColor: '#FFF8E7', primaryColor: '#1f2937', accentColor: '#e11d48', secondaryColor: '#475569' },
    dark: { name: 'Night', backgroundColor: '#101820', primaryColor: '#f1f5f9', accentColor: '#fb7185', secondaryColor: '#cbd5e1' },
};

type RecordedRequest = { url: string; init: RequestInit };

/** Replaces the global fetch with one that records every request and answers with `answer`. */
const recordFetch = (answer: () => Response): RecordedRequest[] => {
    const requests: RecordedRequest[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
        requests.push({ url, init });
        return answer();
    });
    return requests;
};

const jsonAnswer = (body: unknown, status = 200) => () => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

/** The web page: no desktop bridge, the service chosen by the deployment, a stored intensity. */
const stubWebWindow = (aiProvider: 'gemini' | 'openai', extra: Record<string, unknown> = {}) => {
    vi.stubGlobal('window', {
        __FOLIA_RUNTIME_CONFIG__: { aiProvider },
        localStorage: { getItem: (key: string) => (key === 'theme_animation_intensity' ? 'calm' : null) },
        ...extra,
    });
};

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    // 云缓存设置是模块级缓存：上一个用例定下的东西会一直生效，后面改了 window 也没用。
    resetFoliaCloudSettingsCache();
});

describe('a theme from lyrics', () => {
    // 桌面端也要先问一次云缓存：缓存是纯读、不要 Key，命中就省下一次模型调用。
    // 「不发路由请求」仍然成立 —— 只有那条 GET 出去，生成还是交给主进程。
    it('goes through the desktop bridge when there is one, after asking the cloud cache', async () => {
        const generateTheme = vi.fn().mockResolvedValue(THEME_ANSWER);
        vi.stubGlobal('window', { electron: { generateTheme } });
        const requests = recordFetch(jsonAnswer({}));

        const theme = await generateThemeFromLyrics('la la la', { isPureMusic: false, songTitle: 'Song' });

        expect(generateTheme).toHaveBeenCalledTimes(1);
        expect(generateTheme).toHaveBeenCalledWith('la la la', { isPureMusic: false, songTitle: 'Song' });
        // 云缓存未命中：一次 GET 去问，生成之后一次 PUT 把结果回传。
        // 桌面端该走的主进程那条路照样没被换成 web route。
        expect(requests.map(request => request.init?.method ?? 'GET')).toEqual(['GET', 'PUT']);
        expect(String(requests[0]?.url)).toContain('/api/ai-cache/');
        expect(theme).toMatchObject({
            light: { name: 'Dawn', backgroundColor: '#fff8e7', animationIntensity: 'normal' },
            dark: { name: 'Night', backgroundColor: '#101820', animationIntensity: 'normal' },
        });
    });

    // 桌面端命中云端时，主进程一次都不该被叫到。
    // 用另一段歌词：上一个用例把同一份歌词记成了「没命中」（aiCloudCache 有一层
    // 进程级的 miss 缓存，5 分钟内不再问），换一份才真的会去 GET。
    it('takes the cloud answer on the desktop too, without calling the bridge', async () => {
        const generateTheme = vi.fn().mockResolvedValue(THEME_ANSWER);
        vi.stubGlobal('window', { electron: { generateTheme } });
        recordFetch(jsonAnswer({ hit: true, entry: { payload: { theme: THEME_ANSWER } } }));

        const theme = await generateThemeFromLyrics('na na na, a different set', { isPureMusic: false, songTitle: 'Song' });

        expect(generateTheme).not.toHaveBeenCalled();
        expect(theme).toMatchObject({ light: { name: 'Dawn' } });
    });

    it.each([
        ['gemini', '/api/generate-theme'],
        ['openai', '/api/generate-theme_openai'],
    ] as const)('on the web with %s posts to %s', async (aiProvider, route) => {
        stubWebWindow(aiProvider);
        const requests = recordFetch(jsonAnswer(THEME_ANSWER));

        const theme = await generateThemeFromLyrics('la la la', { isPureMusic: true, songTitle: 'Song' });

        // The web build asks the cloud cache first, then the route, then pushes what it got back:
        // three requests, in that order. The cache is only ever a look-up around the same route.
        const themeRequest = requests.find(request => request.url === route);
        expect(themeRequest).toBeDefined();
        expect(requests.map(request => request.init?.method ?? 'GET')).toEqual(['GET', 'POST', 'PUT']);
        expect(themeRequest!.init).toEqual({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lyricsText: 'la la la', isPureMusic: true, songTitle: 'Song' }),
        });
        // The stored animation intensity is put on the answer on this route.
        expect(theme).toMatchObject({
            light: { name: 'Dawn', backgroundColor: '#fff8e7', animationIntensity: 'calm' },
            dark: { name: 'Night', backgroundColor: '#101820', animationIntensity: 'calm' },
        });
    });

    it('takes the cloud cache answer and never calls the route when the cache has it', async () => {
        stubWebWindow('gemini');
        const requests: RecordedRequest[] = [];
        vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
            requests.push({ url, init });
            // The cache: a hit, wrapped the way the service wraps it ({ theme, decision }).
            return new Response(JSON.stringify({ ok: true, hit: true, entry: { payload: { theme: THEME_ANSWER } } }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        });

        const theme = await generateThemeFromLyrics('la la la', { isPureMusic: true, songTitle: 'Song' });

        expect(requests.map(request => request.init?.method)).toEqual(['GET']);
        expect(theme).toMatchObject({ light: { name: 'Dawn' }, dark: { name: 'Night' } });
    });

    it('on the web fails with the message the route answered', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        stubWebWindow('gemini');

        recordFetch(jsonAnswer({ error: 'Server configuration error' }, 500));
        await expect(generateThemeFromLyrics('la la la')).rejects.toThrow('Server configuration error');

        recordFetch(jsonAnswer({}, 500));
        await expect(generateThemeFromLyrics('la la la')).rejects.toThrow('Failed to generate theme');
    });

    it('fails with the bridge\'s own error on the desktop', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const failure = new Error('Error invoking remote method \'generate-theme\': Error: GEMINI_API_KEY is not configured in settings');
        vi.stubGlobal('window', { electron: { generateTheme: vi.fn().mockRejectedValue(failure) } });

        await expect(generateThemeFromLyrics('la la la')).rejects.toBe(failure);
    });
});

describe('a theme for the OBS overlay', () => {
    it.each([
        ['gemini', '/api/generate-theme'],
        ['openai', '/api/generate-theme_openai'],
    ] as const)('with %s posts to %s, with the caller\'s abort signal', async (provider, route) => {
        stubWebWindow('gemini');
        const requests = recordFetch(jsonAnswer(THEME_ANSWER));
        const { signal } = new AbortController();

        const theme = await generateObsThemeFromLyrics('la la la', { songTitle: 'Song' }, { provider }, signal);

        expect(requests).toHaveLength(1);
        expect(requests[0].url).toBe(route);
        expect(requests[0].init).toEqual({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lyricsText: 'la la la', songTitle: 'Song' }),
            signal,
        });
        expect(requests[0].init.signal).toBe(signal);
        expect(theme).toMatchObject({ light: { name: 'Dawn', animationIntensity: 'calm' }, dark: { name: 'Night' } });
    });

    it('never uses the desktop bridge, and sends only the lyrics when it has no options', async () => {
        const generateTheme = vi.fn();
        stubWebWindow('gemini', { electron: { generateTheme } });
        const requests = recordFetch(jsonAnswer(THEME_ANSWER));

        await generateObsThemeFromLyrics('la la la', undefined, { provider: 'gemini' });

        expect(generateTheme).not.toHaveBeenCalled();
        expect(requests.map(request => request.url)).toEqual(['/api/generate-theme']);
        expect(requests[0].init.body).toBe(JSON.stringify({ lyricsText: 'la la la' }));
    });

    it('fails with the route\'s message, or a fixed one when the answer is not JSON', async () => {
        stubWebWindow('gemini');

        recordFetch(jsonAnswer({ error: 'Server configuration error' }, 500));
        await expect(generateObsThemeFromLyrics('la la la', undefined, { provider: 'gemini' }))
            .rejects.toThrow('Server configuration error');

        recordFetch(() => new Response('<html>bad gateway</html>', { status: 502 }));
        await expect(generateObsThemeFromLyrics('la la la', undefined, { provider: 'gemini' }))
            .rejects.toThrow('Failed to generate theme');
    });
});

describe('a lyric segmentation', () => {
    it('goes through the desktop bridge when there is one, and sends nothing to a web route', async () => {
        const segmentLyrics = vi.fn().mockResolvedValue([['la ', 'la'], ['do ', 're']]);
        vi.stubGlobal('window', { electron: { segmentLyrics } });
        const requests = recordFetch(jsonAnswer({}));

        const result = await segmentLyricsWithAi(['la la', 'do re']);

        expect(segmentLyrics).toHaveBeenCalledTimes(1);
        expect(segmentLyrics).toHaveBeenCalledWith(['la la', 'do re']);
        expect(requests).toEqual([]);
        expect(result).toEqual({ boundaries: [['la ', 'la'], ['do ', 're']], appliedCount: 2, failures: [] });
    });

    it('on the web posts the lines to /api/segment-lyrics, with the caller\'s abort signal', async () => {
        vi.stubGlobal('window', {});
        // A null row is a line the server rejected; it keeps the default split.
        const requests = recordFetch(jsonAnswer({ lines: [['la ', 'la'], null] }));
        const { signal } = new AbortController();

        const result = await segmentLyricsWithAi(['la la', 'do re'], { signal });

        expect(requests).toHaveLength(1);
        expect(requests[0].url).toBe('/api/segment-lyrics');
        expect(requests[0].init).toEqual({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lines: ['la la', 'do re'] }),
            signal,
        });
        expect(requests[0].init.signal).toBe(signal);
        expect(result).toEqual({ boundaries: [['la ', 'la'], null], appliedCount: 1, failures: [] });
    });

    it('on the web fails with the message the route answered, or a fixed one', async () => {
        vi.stubGlobal('window', {});

        recordFetch(jsonAnswer({ error: 'GEMINI_API_KEY is not configured' }, 500));
        await expect(segmentLyricsWithAi(['la la'])).rejects.toThrow('GEMINI_API_KEY is not configured');

        recordFetch(() => new Response('<html>bad gateway</html>', { status: 502 }));
        await expect(segmentLyricsWithAi(['la la'])).rejects.toThrow('Failed to segment lyrics');
    });

    it('refuses an answer that does not cover every line, from the bridge or from the route', async () => {
        vi.stubGlobal('window', { electron: { segmentLyrics: vi.fn().mockResolvedValue([['la ', 'la']]) } });
        await expect(segmentLyricsWithAi(['la la', 'do re'])).rejects.toThrow('Segmentation response did not cover every line');

        vi.stubGlobal('window', {});
        recordFetch(jsonAnswer({ lines: [['la ', 'la']] }));
        await expect(segmentLyricsWithAi(['la la', 'do re'])).rejects.toThrow('Segmentation response did not cover every line');
    });
});

// A missing key makes the theme fall back to the cover's colours instead of showing a failure
// (useThemeController). That rests on the words of an error thrown in another process.
describe('the missing-key check', () => {
    const storeWith = (settings: Record<string, unknown>) => ({ get: (key: string) => settings[key] });
    const neverFetch = async () => {
        throw new Error('no request expected');
    };
    const thrownBy = async (run: () => Promise<unknown>) => run().then(
        () => { throw new Error('expected a failure'); },
        (error: unknown) => error,
    );

    it('knows the errors the main process throws when the key of the chosen service is not set', async () => {
        const gemini = await thrownBy(() => mainProcessClient.runAiJsonCompletion({
            store: storeWith({}), task: 'theme', systemPrompt: 's', sourcePrompt: 'u', customFetch: neverFetch,
        }));
        const openai = await thrownBy(() => mainProcessClient.runAiJsonCompletion({
            store: storeWith({ AI_PROVIDER: 'openai' }), task: 'theme', systemPrompt: 's', sourcePrompt: 'u', customFetch: neverFetch,
        }));

        expect((gemini as Error).message).toBe('GEMINI_API_KEY is not configured in settings');
        expect((openai as Error).message).toBe('OPENAI_API_KEY is not configured in settings');
        expect(isMissingAiApiKeyError(gemini)).toBe(true);
        expect(isMissingAiApiKeyError(openai)).toBe(true);
    });

    it('knows them as they arrive over the bridge', () => {
        expect(isMissingAiApiKeyError(new Error(
            'Error invoking remote method \'generate-theme\': Error: GEMINI_API_KEY is not configured in settings',
        ))).toBe(true);
        expect(isMissingAiApiKeyError(new Error(
            'Error invoking remote method \'generate-theme\': Error: OPENAI_API_KEY is not configured in settings',
        ))).toBe(true);
    });

    it('knows what our web theme routes answer when the deployment has no key', () => {
        // That each route answers this, and for nothing else: aiServerlessRequests.test.ts.
        expect(isMissingAiApiKeyError(new Error('Server configuration error'))).toBe(true);
    });

    it('does not take other failures for a missing key', () => {
        expect(isMissingAiApiKeyError(new Error('Failed to generate theme'))).toBe(false);
        expect(isMissingAiApiKeyError(new Error('Gemini API error: 400 Bad Request - API key not valid'))).toBe(false);
        expect(isMissingAiApiKeyError(new Error('fetch failed'))).toBe(false);
        expect(isMissingAiApiKeyError(undefined)).toBe(false);
    });
});
