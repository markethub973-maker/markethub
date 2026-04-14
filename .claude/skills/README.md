# Project skills — MarketHub Pro

These skills are scoped to this project. Claude Code auto-loads them when working in this repo.

| Skill | Purpose |
|-------|---------|
| `frontend-design.md` | Distinctive (non-AI-slop) UI design guidelines — typography, color zones, layout variety, animation choreography, scroll-driven website rules |
| `video-to-website.md` | Turn a video file into a scroll-driven animated landing page (GSAP + Lenis + canvas frame rendering, FFmpeg frame extraction, premium 14-point checklist) |
| `skill-builder.md` | Meta-skill for creating new project skills |

## When to invoke

- **`/feature/<slug>` landing pages** — use `frontend-design` rules for the page styling and `video-to-website` for the scroll-driven product demo block (<FeatureDemo />)
- **New skills** — invoke `skill-builder` when we need to formalize a new repeatable workflow (e.g. "video-to-thumbnail", "competitor-snapshot-cron", etc.)

## Workflow for product demo videos (per Eduard's brief)

1. Pick product photo (white/no background ideal)
2. Generate disassembled/exploded version with **Nano Banana 2** (Google Gemini Image)
3. Generate animation video with **Kling 3.0** image-to-video (start frame = original, end frame = exploded)
4. Drop the MP4 into `public/demos/<feature-slug>.mp4`
5. In `src/lib/featuresData.ts`, set the feature's `demo_kind: "video"` and `demo_src: "/demos/<feature-slug>.mp4"`
6. The `<FeatureDemo />` component in `src/components/features/FeatureLanding.tsx` will render the video automatically

For full scroll-driven canvas treatment (the iPhone-disassembly experience), follow the
`video-to-website.md` skill steps inside the relevant feature page or as a standalone /demos/<slug> page.
