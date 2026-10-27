import { describe, expect, it } from 'vitest';
import { audioCrossOrigin, canRouteAudioThroughGraph, isSameOriginAudioSource } from '../../../src/utils/audioGraphEligibility';

const ORIGIN = 'https://folia.tangbot.xyz';

describe('audio graph eligibility', () => {
    it('takes a same-origin source into the graph', () => {
        expect(isSameOriginAudioSource('/media/a.mp3', ORIGIN)).toBe(true);
        expect(isSameOriginAudioSource('media/a.mp3', ORIGIN)).toBe(true);
        expect(canRouteAudioThroughGraph(`${ORIGIN}/media/a.mp3`, ORIGIN)).toBe(true);
        expect(audioCrossOrigin('/media/a.mp3', ORIGIN)).toBe('anonymous');
    });

    // 本地协议不会污染音频图，接进去是安全的。
    it('treats blob, data and file sources as safe', () => {
        for (const src of ['blob:https://x/123', 'data:audio/mpeg;base64,AA', 'file:///a.mp3']) {
            expect(isSameOriginAudioSource(src, ORIGIN)).toBe(true);
            expect(canRouteAudioThroughGraph(src, ORIGIN)).toBe(true);
        }
    });

    // 这条是这次故障的核心：酷狗那类 CDN 不发 ACAO，带上 crossOrigin 会被直接拒绝加载，
    // 接进音频图又会得到静音。两个都必须拒绝，让它原生播放。
    it('keeps a cross-origin CDN source out of the graph, and without crossOrigin', () => {
        const src = 'https://ga-sycdn.kuwo.cn/632877e451e42c219c5bbee015509e05/6ae01fab/resource/pay3_v2/434768348/434768348_29_0.1743165065.mp3?from=bodian';
        expect(isSameOriginAudioSource(src, ORIGIN)).toBe(false);
        expect(canRouteAudioThroughGraph(src, ORIGIN)).toBe(false);
        expect(audioCrossOrigin(src, ORIGIN)).toBeUndefined();
    });

    it('answers no for an empty source, and for a source it cannot parse', () => {
        expect(canRouteAudioThroughGraph('', ORIGIN)).toBe(false);
        expect(canRouteAudioThroughGraph('   ', ORIGIN)).toBe(false);
        expect(canRouteAudioThroughGraph('http://[::bad', ORIGIN)).toBe(false);
    });

    // 拿不到页面 origin 时按跨源处理：宁可少一层特效，也不要把可能污染的地址接进音频图。
    it('answers no for every remote source when the page origin is unknown', () => {
        expect(canRouteAudioThroughGraph('https://ga-sycdn.kuwo.cn/a.mp3', '')).toBe(false);
        expect(canRouteAudioThroughGraph('/media/a.mp3', '')).toBe(false);
        expect(canRouteAudioThroughGraph('blob:https://x/1', '')).toBe(true);
    });
});
