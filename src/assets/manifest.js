/** Production assets require provenance; null entries are a V2-C asset backlog. */
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

// Production Character Gate belongs to V2-C; missing entries are asset backlog.
export const PRODUCTION_ASSET = 'PRODUCTION_ASSET';
export const QA_ASSET = 'QA_ASSET';
for (const contract of Object.values(ASSET_MANIFEST)) contract.assetClass = PRODUCTION_ASSET;
export const QA_MANIFEST = {
  skinnedFixture: { path: 'assets/qa/skinned-fixture.glb', license: 'CC0-1.0; original Astral QA fixture', assetClass: QA_ASSET, kind: 'character', skinned: true, requiredClips: ['Idle'], requiredMaps: ['map', 'normalMap', 'roughnessMap', 'aoMap'] },
  pbrFixture: { path: 'assets/qa/skinned-fixture.glb', license: 'CC0-1.0; original Astral QA fixture', assetClass: QA_ASSET, kind: 'environment', requiredMaps: ['map', 'normalMap', 'roughnessMap', 'aoMap'] },
};

export const PRODUCTION_ENVIRONMENT_SOURCE = {
  assetClass: PRODUCTION_ASSET, status: 'IN_PROGRESS', finalArtAccepted: false,
  source: 'src/world/forest/AstralForestRuins.js', textures: 'assets/forest/',
  license: 'CC0-1.0; original Astral authored surfaces and maps',
  glbExport: 'TODO',
};
