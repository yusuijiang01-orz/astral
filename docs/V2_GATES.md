# V2 amended stage gates

This document supersedes contradictory gates in the original prompt and historical V2-A report, per the repository owner's latest instruction.

- Cloud GL_VENDOR/GL_RENDERER Disabled: ENVIRONMENT_LIMITATION, never a project defect or development blocker.
- Renderer QA Failure: failing GitHub Actions software-WebGL acceptance. A successful build alone is not graphical acceptance.
- REAL_DEVICE_NOT_VERIFIED: real GPU compatibility, mobile multitouch, actual FPS, thermal behavior; independent nonblocking verification backlog.
- QA_ASSET: original CC0 skinned GLB with Idle and embedded base/normal/roughness/AO textures. Runtime `?qa=1` labels it explicitly. Never production art acceptance.
- PRODUCTION_ASSET: tracked separately; missing art remains an asset todo.

## V2-A
Runtime RendererPipeline, LightingRig, Stylized Material, PostProcessing, AssetLoader and QualityManager integration; real fetched QA GLB renders; skin animation changes bones; shaders compile under Chromium SwiftShader; selective bloom on/off screenshots show selected glow without unselected glow; lighting affects pixels; npm test/build pass.

Evidence: Software WebGL Renderer QA workflow, immutable per-commit screenshot artifact and report.json. Until the actual run passes, software validation is pending. After PASS, immediately proceed V2-B.

## V2-B
Begin authored Astral Forest Ruins production environment. Old Cone Tree, Box Ground and primitive WorldView are debug-only, never formal output. Production environment review is separate from the V2-A QA fixture.

## V2-C Production Character Gate
Full production player, legal provenance, Weapon node and all 14 clips: Idle, Run, Attack1–4, Skill1–4, Ultimate, Dodge, Hit, Death. Missing assets block production character acceptance only, not V2-B engineering.
