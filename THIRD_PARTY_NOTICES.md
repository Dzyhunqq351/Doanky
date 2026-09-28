# Third-party sources

## MMarQs / FlappyBird

- URL: https://github.com/MMarQs/FlappyBird
- Snapshot commit: `39bca3db5c2fad5f392c3bd501731508372cd93c`
- Retrieved: 2026-09-20
- Upstream files retained without modification: `third_party/FlappyBird/script.js`, `index.html`, `style.css`, `README.md`.
- Upstream image/audio files: `client/public/flappy/`. The original HTML expects assets under `img/` and `audio/`; the archived source is retained for reference, and the multiplayer app uses the public asset paths above.
- Derived code: `src/services/flappyEngine.js` (bird, pipes, canvasScale ratios), `client/src/components/FlappyCanvas.tsx` (sprite coordinates/rendering).
- Multiplayer changes: 640-unit logical height with a responsive horizontal viewport; seeded pipe generation; server-authoritative simulation; ceiling clamp; shared start/timer; manual retries on a fixed per-match map; best-run or average scoring; host overview and focused spectator snapshots. Single-player menus, local best-score storage and per-user pause are replaced by room UI.
- Upstream credits Flappy Bird to Dong Nguyen / dotGEARS and mentions CodeExplainedRepo as structural inspiration.

**No LICENSE file or explicit redistribution grant was found in the retrieved repository.** Public GitHub visibility is not itself a license. These materials were incorporated locally at the user's explicit request; confirm permission for the source and original game assets before distributing or publishing this project. This project does not assign an MIT or other license to those files.

## Lucide

Default avatar/icon collection uses `lucide-react`. See the package's ISC license in `node_modules/lucide-react/LICENSE`.
