# V2-A / V2-A.1 acceptance

PASS on commit 85180735455530c481d3fe3a9616017536d6e3b0.

- [Actual Actions run](https://github.com/yusuijiang01-orz/astral/actions/runs/34052100683): all steps success.
- [Screenshots + report artifact](https://github.com/yusuijiang01-orz/astral/actions/runs/34052100683/artifacts/9994856501).
- Chromium 140 / Playwright 1.55.1 / ANGLE Vulkan SwiftShader Device (Subzero).
- Actual context: true; GL error: 0; 17 programs including AstralAnime:cloth, AstralEnvironmentPBR, OutputShader, FXAAShader.
- Real QA GLB fetch, two-bone SkinnedMesh, AnimationMixer bone rotation change; embedded base, normal, roughness and AO maps.
- Selective Bloom annulus pixel delta: selected 156.91; unselected 11.03 (distant spill, no independent halo). Lighting on/off mean red-channel difference: 27.46.
- Screenshots visually reviewed: left marker blooms, right marker retains only its solid emissive core. QA_ASSET badge visible. This is renderer acceptance, never final art acceptance.
- npm test: 32/32 PASS; npm run build: PASS.

The first software run correctly failed on zero Bloom difference. Root cause was ShaderPass cloning the render-target texture uniform. Rebinding the live texture repaired actual output; the pixel gate then passed.

Cloud GL_VENDOR=Disabled / GL_RENDERER=Disabled is ENVIRONMENT_LIMITATION. The historical cloud screenshot is not a renderer failure and does not block any stage.

Current CI additionally checks actual GL shader COMPILE_STATUS and program LINK_STATUS on the built application, and captures three V2-B environment views. Latest branch run is the authoritative regression result.

## Remaining boundaries

- V2-B began after A passed: authored terrain, courtyard, masonry arches, rooted trees, leaf surfaces, rocks, PBR maps, crystals and distant ridges. IN_PROGRESS, not final art accepted.
- V2-C: production character GLB / Weapon / 14 animation clips TODO.
- V2-D through V2-H have not been implemented in this task. Old corridor encounters and gameplay remain debug-only.
- REAL_DEVICE_NOT_VERIFIED: real GPU/browser matrix, mobile multitouch, actual sustained FPS, heat/battery and long-session GPU memory. Nonblocking engineering backlog.

Gate authority: [V2_GATES.md](V2_GATES.md).
