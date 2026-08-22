export function shouldShowProfileRecovery(input: { isProfileLoading: boolean; hasProfile: boolean; isWorkspaceLoading: boolean; hasWorkspace: boolean; hasError: boolean }) {
  return input.hasError || (!input.isProfileLoading && !input.hasProfile) || (input.hasProfile && !input.isWorkspaceLoading && !input.hasWorkspace);
}

export function shouldConfirmDiscard(hasUnsavedChanges: boolean) {
  return hasUnsavedChanges;
}

export function budgetValidationMessage(value: number) {
  return Number.isFinite(value) && value > 0 ? "" : "月度预算需至少为 1 元";
}
