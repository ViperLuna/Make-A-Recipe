export function rebirthCost(rebirthCount, rebirthData) {
  return rebirthData.baseCost * Math.pow(rebirthData.costGrowthRate, rebirthCount)
}

export function sellValueMultiplier(rebirthCount, rebirthData) {
  return 1 + rebirthData.sellValueBonusPerRebirth * rebirthCount
}
