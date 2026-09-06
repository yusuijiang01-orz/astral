/** Formal assets must carry explicit provenance. Null paths are deliberate blockers. */
export const PLAYER_CLIPS = [
  "Idle",
  "Run",
  "Attack1",
  "Attack2",
  "Attack3",
  "Attack4",
  "Skill1",
  "Skill2",
  "Skill3",
  "Skill4",
  "Ultimate",
  "Dodge",
  "Hit",
  "Death",
];
export const ASSET_MANIFEST = {
  player: {
    path: null,
    license: null,
    kind: "character",
    skinned: true,
    requiredClips: PLAYER_CLIPS,
    requiredNodes: ["Weapon"],
  },
  environment: {
    path: null,
    license: null,
    kind: "environment",
    requiredMaps: ["map", "normalMap", "roughnessMap", "aoMap"],
  },
};
export function debugAssetsEnabled(search = "") {
  return new URLSearchParams(search).get("debugAssets") === "1";
}
export function assetURL(path, base = "./", documentURL = "http://localhost/") {
  if (
    typeof path !== "string" ||
    !path ||
    path.startsWith("/") ||
    path.includes("..") ||
    /^[a-z]+:/i.test(path)
  )
    throw new Error("Asset path must be relative to the Vite base");
  return new URL(path, new URL(base, documentURL)).href;
}
