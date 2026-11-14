# Higgsfield integration (feasibility, 2026-11-14)

| Step | Result in cloud session |
|---|---|
| `npm i -g @higgsfield/cli` | Works (v1.2.2, MIT, github.com/higgsfield-ai/cli). Tested in a scratch prefix. |
| `higgsfield auth login` | **Blocked.** It uses browser OAuth with a loopback callback on the container, which a phone browser cannot reach. No token was requested, stored or committed. |
| `npx skills add higgsfield-ai/skills` | CLI available; not installed into the repo (needs the login anyway). |

## Alternative
The official Higgsfield MCP connector is already connected to this Claude account (tools `mcp__Animation__*`). It needs no local login. Free plan, 4 credits at the time of check.

## Policy
- No generation without the owner's explicit approval and a credit quote first. None was run.
- Generated images/video are concept references only, never gameplay or screenshots.
- `generate_3d` output is not a production asset; real meshes, rigs and animation come from Blender/Unity.
- Protected logos and mascot are never regenerated.
