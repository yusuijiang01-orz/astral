import { Color, MeshStandardMaterial, SRGBColorSpace, Vector2 } from "three";

/** Stylized PBR interface. Missing maps are an asset gate, never a final substitute. */
export function createEnvironmentMaterial({
  color = "#ffffff",
  maps = {},
  roughness = 0.85,
  emissive = "#000000",
  detailNormalScale = 0.3,
} = {}) {
  if (maps.baseColor) maps.baseColor.colorSpace = SRGBColorSpace;
  if (maps.emissive) maps.emissive.colorSpace = SRGBColorSpace;
  const material = new MeshStandardMaterial({
    color,
    map: maps.baseColor || null,
    normalMap: maps.normal || null,
    roughnessMap: maps.roughness || null,
    aoMap: maps.ao || null,
    emissiveMap: maps.emissive || null,
    roughness,
    metalness: 0,
    emissive: new Color(emissive),
    normalScale: new Vector2(0.7, 0.7),
  });
  material.name = "AstralEnvironmentPBR";
  material.userData.missingMaps = [
    "baseColor",
    "normal",
    "roughness",
    "ao",
  ].filter((k) => !maps[k]);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.astralDetailNormal = {
      value: maps.detailNormal || maps.normal || null,
    };
    shader.uniforms.astralDetailAmount = {
      value: maps.detailNormal ? detailNormalScale : 0,
    };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 astralWorldPosition;",
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
      vec4 astralWorld = vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        astralWorld = instanceMatrix * astralWorld;
      #endif
      astralWorldPosition = (modelMatrix * astralWorld).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 astralWorldPosition; uniform sampler2D astralDetailNormal; uniform float astralDetailAmount;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      float astralMacro = sin(astralWorldPosition.x*.19)*sin(astralWorldPosition.z*.23)*.045;
      diffuseColor.rgb *= vec3(1.0+astralMacro,1.0+astralMacro*.6,1.0-astralMacro*.5);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
      #ifdef USE_NORMALMAP_TANGENTSPACE
        if(astralDetailAmount>0.0){
          vec3 astralDetail = texture2D(astralDetailNormal,vNormalMapUv*8.0).xyz*2.0-1.0;
          normal = normalize(normal + tbn * vec3(astralDetail.xy*astralDetailAmount,0.0));
        }
      #endif`,
      );
  };
  material.customProgramCacheKey = () => "astral-environment-r185-v1";
  return material;
}
