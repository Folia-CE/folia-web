import React, { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetButton } from '../../shared/Sheet';
import { isOfficialBuildBranch } from '../../../utils/buildChannel';

// src/components/app/notices/CanxuebanNotice.tsx
// 残血版的启动提醒：这一份构建不是从 main 或 release/* 出来的，就在启动时弹一次，说清它是哪条分支的包、能力是不全的。
//
// 为什么要有：这一版是网页移植，相对桌面端砍掉了本地文件、模组、部分平台登录等能力。拿到手的人分不出它和正式版，
// 出了问题的第一反应是「正式版坏了」。把分支名和「能力不全」摆在脸上，省掉这一轮猜测。
//
// 判据用的是构建时钉进包里的 __GIT_BRANCH__（vite.config.ts 在 define 里写），不是运行时的 git。

export const CanxuebanNotice: React.FC = () => {
    const { t } = useTranslation();
    // 每次启动都弹：这版是什么来路，不该只提醒一次就被记成「已读」。
    const [isOpen, setIsOpen] = useState(() => !isOfficialBuildBranch(__GIT_BRANCH__));

    useEffect(() => {
        if (isOfficialBuildBranch(__GIT_BRANCH__)) return;
        console.info(`[残血版] 这一版从 ${__GIT_BRANCH__} 分支构建，不是 main / release/*，启动时提醒用户能力不全`);
    }, []);

    if (!isOpen) return null;

    return (
        <Sheet
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            size="s"
            title={t('options.testBuildTitle')}
            titleLead={<TriangleAlert size={16} className="text-[color:var(--st-warn,var(--st-t2))]" />}
            footer={<SheetButton onClick={() => setIsOpen(false)}>{t('options.testBuildOk')}</SheetButton>}
        >
            <p className="text-[13px] leading-6 text-[color:var(--st-t2)]">
                {t('options.testBuildBody', { branch: __GIT_BRANCH__ || t('options.testBuildUnknownBranch') })}
            </p>
        </Sheet>
    );
};

export default CanxuebanNotice;
