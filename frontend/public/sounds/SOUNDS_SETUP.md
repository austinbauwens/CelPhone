# 8-Bit Sound Effects Setup Guide

## Quick Setup

1. **Download the sounds:**
   - Visit: https://opengameart.org/content/8-bit-sound-effects-library
   - Click "Download" to get the ZIP file
   - Extract the ZIP file to this directory (`frontend/public/sounds/`)

2. **Organize/Rename files:**
   The sound manager expects these filenames. You may need to rename the downloaded files to match:

   ```
   ui-click.wav      → Button clicks
   ui-hover.wav      → Button hover
   brush.wav         → Drawing/brush strokes  
   powerup.wav       → Success/powerup sounds
   error.wav         → Error sounds
   coin.wav          → Coin/collection (submit/download)
   transition.wav    → Round transitions
   warning.wav       → Warning/timer sounds
   tick.wav          → Timer tick sounds
   pickup.wav        → Pickup/frame complete
   jump.wav          → Jump/player join
   success.wav       → Success/completion
   ```

3. **That's it!** The app will automatically use the sound files when available, and fall back to programmatic sounds if files are missing.

## Alternative Sound Packs

If you want different sounds, you can also check:
- **8-bit Platformer SFX**: https://opengameart.org/content/8-bit-platformer-sfx (12 sounds)
- **NES 8-bit Sound Effects**: https://opengameart.org/content/nes-8-bit-sound-effects (81 sounds)

## License

All sounds from OpenGameArt.org are typically CC-BY 3.0 (Creative Commons Attribution 3.0). Check the specific license for each pack.

## Testing

After adding sounds:
1. Restart your dev server
2. Interact with buttons, hover, etc.
3. If sounds don't play, check the browser console for errors
4. The app will fall back to programmatic sounds if files aren't found

