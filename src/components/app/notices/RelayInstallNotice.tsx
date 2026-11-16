import React, { useEffect, useState } from 'react';
import { Puzzle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetButton } from '../../shared/Sheet';
import { probeRelayReady, relayVersionSeen } from '../../../services/webBridge';

// src/components/app/notices/RelayInstallNotice.tsx
// 篡改猴中继脚本的安装引导：纯网页环境里，弹窗问一次要不要装 public/folia-bridge-relay.user.js。
//
// 装了它之后，桥的请求从用户自己的浏览器直连上游（GM_xmlhttpRequest 不受同源策略限制），
// QQ 扫码等特权请求更快，部署的服务器零负担。没装也完全能用 —— 走同源服务器桥。
//
// 触发条件（三者缺一不弹）：
//   1. 纯网页环境（无 window.electron，桌面版有主进程的本地服务，不需要脚本）；
//   2. 中继握手没有成功（装了脚本的页面 services/webBridge.ts 那边已经握手成功，不用再问）；
//   3. 用户没有点过「忽略」（localStorage 键 folia_relay_notice_dismissed_v1）。

const DISMISS_KEY = 'folia_relay_notice_dismissed_v1';

/** 中继握手是异步的（ping-pong 要一个来回）：给一小段宽限再判定「没装脚本」。 */
const READY_GRACE_MS = 1500;

export const RelayInstallNotice: React.FC = () => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // 桌面版不需要这个脚本：主进程里的本地服务把同源与跨域都解决了。
        if (typeof window === 'undefined' || Boolean((window as any).electron)) return;
        // 点过忽略的人不再打扰；这个键不与任何已发布的键冲突。
        try {
            if (window.localStorage.getItem(DISMISS_KEY)) return;
        } catch (_) {
            return;
        }
        let cancelled = false;
        // 主动 ping 一次再下结论：脚本应答可能晚于页面首帧，同步读标志会误判「没装」。
        // waitForRelayReady 内部先 ping 后等 pong，1.5 秒没应答就是真没装。
        void probeRelayReady(READY_GRACE_MS).then((ready) => {
            if (cancelled) return;
            // 装了但报不出桥代码版本 = v1 旧脚本：它的转发能力是残缺的（netease/kugou
            // 的加密签名复刻不了），照样弹引导 —— 用户装上 v2 后弹窗自然消失。
            if (!ready || !relayVersionSeen()) setIsOpen(true);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const dismiss = (): void => {
        try {
            window.localStorage.setItem(DISMISS_KEY, '1');
        } catch (_) {
            // 存不进去（隐私模式等）就只关这一次，下次启动再问 —— 不比「从来没见过」更差。
        }
        setIsOpen(false);
    };

    const install = (): void => {
        try {
            window.open('/folia-bridge-relay.user.js', '_blank', 'noopener');
        } catch (error) {
            console.warn('[中继引导] 打开脚本地址失败', error);
        }
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <Sheet
            isOpen={isOpen}
            onClose={dismiss}
            size="s"
            title={t('options.relayNoticeTitle')}
            titleLead={<Puzzle size={16} className="text-[color:var(--st-t2)]" />}
            footer={(
                <>
                    <SheetButton onClick={dismiss}>{t('options.relayNoticeDismiss')}</SheetButton>
                    <SheetButton variant="primary" onClick={install}>{t('options.relayNoticeInstall')}</SheetButton>
                </>
            )}
        >
            <div className="space-y-2 text-[13px] leading-6 text-[color:var(--st-t2)]">
                <p>{t('options.relayNoticeBody')}</p>
                <ol className="list-decimal space-y-1 pl-5">
                    <li>{t('options.relayNoticeStepTampermonkey')}</li>
                    <li>{t('options.relayNoticeStepOpen')}</li>
                    <li>{t('options.relayNoticeStepRefresh')}</li>
                </ol>
            </div>
        </Sheet>
    );
};

export default RelayInstallNotice;
