/**
 * ref からブランチ名を取得
 * @param refName refs/head/...
 */
export const getBranchName = (refName: string) => {
  const [,, ...branchNameParts] = refName.split('/');
  
  return branchNameParts.join('/');
}