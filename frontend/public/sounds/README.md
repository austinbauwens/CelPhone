# 8-Bit Sound Effects Setup

This directory contains 8-bit sound effects from OpenGameArt.org.

## Download Instructions

1. Go to: https://opengameart.org/content/8-bit-sound-effects-library
2. Download the sound effects library (40 sounds, CC-BY 3.0 license)
3. Extract the files to this directory (`frontend/public/sounds/`)

## File Naming Convention

The sound manager expects these filenames (you may need to rename the downloaded files):

- `ui-click.wav` - Button clicks
- `ui-hover.wav` - Button hover
- `brush.wav` - Drawing/brush strokes
- `powerup.wav` - Success/powerup sounds
- `error.wav` - Error sounds
- `coin.wav` - Coin/collection sounds (for submit/download)
- `transition.wav` - Round transitions
- `warning.wav` - Warning/timer sounds
- `tick.wav` - Timer tick sounds
- `pickup.wav` - Pickup/frame complete sounds
- `jump.wav` - Jump/player join sounds
- `success.wav` - Success/completion sounds

## Alternative: Using Existing Files

If the OpenGameArt files have different names, you can:
1. Map the sounds manually to match the expected filenames
2. Or update `frontend/src/lib/sounds.ts` to use the actual filenames

## License

These sounds are from OpenGameArt.org and are licensed under CC-BY 3.0 (Creative Commons Attribution 3.0).

