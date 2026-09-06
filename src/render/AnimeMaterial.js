import { Color, MeshStandardMaterial, ShaderChunk, Vector3 } from "three";

export const MATERIAL_PROFILES = Object.freeze({
  skin: { roughness: 0.62, metalness: 0, rim: 0.07 },
  cloth: { roughness: 0.95, metalness: 0, rim: 0.045 },
  metal: { roughness: 0.23, metalness: 0.85, rim: 0.09 },
  leather: { roughness: 0.76, metalness: 0.04, rim: 0.04 },
  hair: { roughness: 0.42, metalness: 0.04, rim: 0.12 },
  crystal: { roughness: 0.16, metalness: 0.28, rim: 0.12 },
  magic: { roughness: 0.35, metalness: 0.1, rim: 0.14 },
});

/** Three r185 shader extension: retain skinning, maps, shadows and PBR specular. */
export function patchAnimeShader(shader, uniforms) {
  const physical = ShaderChunk.lights_physical_pars_fragment;
  const diffuse =
    "reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );";
  if (
    !physical.includes(diffuse) ||
    !shader.fragmentShader.includes("#include <lights_physical_pars_fragment>")
  ) {
    throw new Error(
      "ANIME_SHADER_INCOMPATIBLE: review the pinned Three.js shader contract",
    );
  }
  Object.assign(shader.uniforms, uniforms);
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
    uniform vec3 astralCool; uniform vec3 astralWarm;
    uniform vec3 astralKeyView; uniform float astralRim; uniform float astralHair;
    float astralRamp(float n) {
      return 0.18 + 0.35*smoothstep(0.18,0.30,n) + 0.47*smoothstep(0.55,0.68,n);
    }
  `,
    )
    .replace(
      "#include <lights_physical_pars_fragment>",
      physical.replace(
        diffuse,
        `
    float astralBand = astralRamp(dotNL);
    vec3 astralTint = mix(astralCool, astralWarm, smoothstep(0.2, 0.8, dotNL));
    reflectedLight.directDiffuse += directLight.color * astralBand * astralTint * BRDF_Lambert(material.diffuseContribution);
  `,
      ),
    )
    .replace(
      "#include <opaque_fragment>",
      `
    float astralFacing = 1.0 - saturate(dot(normal, geometryViewDir));
    float astralLitEdge = smoothstep(-0.2,0.7,dot(normal,astralKeyView));
    outgoingLight += diffuseColor.rgb * astralRim * pow(astralFacing,3.0) * astralLitEdge;
    // Directional hair glint; the material profile bounds intensity.
    vec3 astralHalf = normalize(astralKeyView + geometryViewDir);
    float astralGlint = pow(max(0.0,1.0-abs(dot(normal,astralHalf))),22.0);
    outgoingLight += astralHair * astralGlint * astralLitEdge * vec3(0.11,0.10,0.08);
    #include <opaque_fragment>
  `,
    );
}

export class AnimeMaterial extends MeshStandardMaterial {
  constructor({ type = "cloth", ...options } = {}) {
    const profile = MATERIAL_PROFILES[type] || MATERIAL_PROFILES.cloth;
    super({
      roughness: profile.roughness,
      metalness: profile.metalness,
      ...options,
    });
    this.name = `AstralAnime:${type}`;
    this.userData.astralType = type;
    this.astralUniforms = {
      astralCool: { value: new Color("#8d9fc9") },
      astralWarm: { value: new Color("#fff1d9") },
      astralKeyView: { value: new Vector3(-0.4, 0.8, 0.4).normalize() },
      astralRim: { value: profile.rim },
      astralHair: { value: type === "hair" ? 1 : 0 },
    };
    this.onBeforeCompile = (shader) =>
      patchAnimeShader(shader, this.astralUniforms);
    this.customProgramCacheKey = () => "astral-anime-r185-v1";
  }
  updateLight(camera, direction) {
    this.astralUniforms.astralKeyView.value
      .copy(direction)
      .transformDirection(camera.matrixWorldInverse);
  }
}
