export type BuildingOption = {
  id?: string;
  optionKey?: string;
  optionText: string;
};

export function isBuildingGame(engineKey: string) {
  return engineKey === "BUILDING_GAME";
}

export function optionIdentity(option: BuildingOption) {
  return option.id || option.optionKey || option.optionText;
}
