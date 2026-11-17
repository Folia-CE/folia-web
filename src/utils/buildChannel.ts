// src/utils/buildChannel.ts
// 判断这条分支出来的包算不算正式版。

// 正式渠道只有两个：main（合并后的发版）与 release/x.y.z（出包分支），其余一律算非正式版。
// 判错一边的代价不对称 —— 把非正式版认成正式版，用户拿它当日常用；反过来只是多弹一个窗。
// 所以分不清的取值（空串、'HEAD'、'unknown'）一律按非正式版算。

const OFFICIAL_BRANCH_PATTERN = /^(?:main|release\/\d+\.\d+\.\d+)$/;

/** 这条分支出来的包算不算正式版。分不清的一律按非正式版算，宁可多提醒一句。 */
export const isOfficialBuildBranch = (branch: string | null | undefined): boolean => {
    const value = (branch ?? '').trim();
    if (!value) return false;
    if (value === 'HEAD' || value.toLowerCase() === 'unknown') return false;
    return OFFICIAL_BRANCH_PATTERN.test(value);
};
