import { describe, expect, it } from "vitest";
import { budgetValidationMessage, shouldConfirmDiscard, shouldShowProfileRecovery } from "./interaction-guards";

describe("移动端交互保护", () => {
  it("资料查询未启动、失败或缺少工作区时显示可恢复错误态", () => {
    expect(shouldShowProfileRecovery({ isProfileLoading: false, hasProfile: false, isWorkspaceLoading: false, hasWorkspace: false, hasError: false })).toBe(true);
    expect(shouldShowProfileRecovery({ isProfileLoading: false, hasProfile: true, isWorkspaceLoading: false, hasWorkspace: false, hasError: false })).toBe(true);
    expect(shouldShowProfileRecovery({ isProfileLoading: false, hasProfile: true, isWorkspaceLoading: false, hasWorkspace: true, hasError: true })).toBe(true);
    expect(shouldShowProfileRecovery({ isProfileLoading: false, hasProfile: true, isWorkspaceLoading: false, hasWorkspace: true, hasError: false })).toBe(false);
  });

  it("仅在存在未保存修改时请求确认放弃", () => {
    expect(shouldConfirmDiscard(false)).toBe(false);
    expect(shouldConfirmDiscard(true)).toBe(true);
  });

  it("预算金额为零、负数或非数值时返回中文字段级错误", () => {
    expect(budgetValidationMessage(0)).toBe("月度预算需至少为 1 元");
    expect(budgetValidationMessage(-1)).toBe("月度预算需至少为 1 元");
    expect(budgetValidationMessage(Number.NaN)).toBe("月度预算需至少为 1 元");
    expect(budgetValidationMessage(1)).toBe("");
  });
});
