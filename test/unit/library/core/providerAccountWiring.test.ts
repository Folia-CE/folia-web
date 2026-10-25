// test/unit/library/core/providerAccountWiring.test.ts
// 装配层测试：单元测试里注入 fake visibility 永远绿，测不到「生产有没有接线」。
// 这条专门钉住接线本身 —— 没有它，P1/scannedTimer 的修复可以在生产是死代码而测试全绿。
import { describe, expect, it, vi } from 'vitest';

const capturedDeps: Array<Record<string, unknown>> = [];

vi.mock('@/library/core/account/providerLoginSession.service', async importOriginal => {
    const actual = await importOriginal<typeof import('@/library/core/account/providerLoginSession.service')>();
    return {
        ...actual,
        createProviderLoginSession: (deps: Record<string, unknown>) => {
            capturedDeps.push(deps);
            return actual.createProviderLoginSession(deps as never);
        },
    };
});

import { browserLoginVisibility, createProviderAccountDeps } from '@/library/core/account/providerAccountDeps.service';
import { createProviderAccountController } from '@/library/core/account/providerAccountController.service';

describe('provider account wiring · visibility must reach the login session', () => {
    it('exposes a real visibility port from the deps factory', () => {
        const deps = createProviderAccountDeps({
            logout: vi.fn(),
            confirmLogout: vi.fn(),
            switchCleanup: { cleanup: vi.fn() } as never,
        });
        expect(deps.visibility).toBeTruthy();
        expect(typeof deps.visibility?.isHidden).toBe('function');
        expect(typeof deps.visibility?.subscribe).toBe('function');
        expect(deps.visibility).toBe(browserLoginVisibility);
    });

    it('degrades to always-visible without a document, and never throws', () => {
        expect(() => browserLoginVisibility.isHidden()).not.toThrow();
        expect(browserLoginVisibility.isHidden()).toBe(false);
        const unsubscribe = browserLoginVisibility.subscribe(() => { });
        expect(typeof unsubscribe).toBe('function');
        expect(() => unsubscribe()).not.toThrow();
    });

    it('forwards the visibility port into the login session it creates', () => {
        capturedDeps.length = 0;
        const deps = createProviderAccountDeps({
            logout: vi.fn(),
            confirmLogout: vi.fn(),
            switchCleanup: { cleanup: vi.fn() } as never,
        });
        createProviderAccountController(deps);
        expect(capturedDeps.length).toBeGreaterThan(0);
        // 关键断言：controller 必须把 visibility 透传给会话，否则后台暂停/恢复在生产永不执行。
        expect(capturedDeps[0].visibility).toBe(deps.visibility);
    });
});
