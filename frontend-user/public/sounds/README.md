# Gacha sound placeholders

`useSoundManager` (`src/features/gacha/hooks/useSoundManager.ts`) loads these
files on first play. They are intentionally not committed — drop real `.mp3`
assets here with these exact names. Missing files fail silently in Howler, so
the experience works with no audio until they are added.

| Key                 | File                    | Plays when                     |
| ------------------- | ----------------------- | ------------------------------ |
| `summon-start`      | `summon-start.mp3`      | A pull begins                  |
| `portal-charge`     | `portal-charge.mp3`     | Portal charging phase          |
| `rare-reveal`       | `rare-reveal.mp3`       | Rare / epic climax             |
| `legendary-reveal`  | `legendary-reveal.mp3`  | Legendary climax               |
| `reward`            | `reward.mp3`            | Reward card revealed           |
| `button-click`      | `button-click.mp3`      | Reserved for UI clicks         |
