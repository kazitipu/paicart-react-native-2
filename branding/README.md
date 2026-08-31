# Branding assets

`paicart-mark.png` is the master: the supplied logo trimmed to its alpha bounding
box and padded to a square (840×840, `#FF6A00` on transparent). Everything else
is generated from it — never hand-edit anything under `android/app/src/main/res`.

## Launcher icons

```sh
python3 branding/generate-icons.py
cp -R branding/generated/mipmap-* branding/generated/drawable-* android/app/src/main/res/
rm -rf branding/generated
```

Produces legacy `mipmap-*` (square + round, 5 densities), the adaptive-icon
`drawable-*/ic_launcher_foreground.png` and `ic_launcher_monochrome.png`, and
refreshes `play-store-icon.png` for the Play listing.

Two fill constants control sizing, and both are measured against **actual ink**,
not the bounding box:

* `ADAPTIVE_FILL` puts the mark's ink at 64.2dp on the 108dp adaptive canvas,
  inside Android's 66dp guaranteed-safe circle. OEM launchers each apply their
  own mask (circle, squircle, rounded square, teardrop); raising this clips the
  mark on circular masks.
* `LEGACY_FILL` covers API 24-25, which never mask the icon. It is set so the
  mark reads at 85% of the tile, matching the 89% the adaptive icon reads inside
  its 72dp visible window - otherwise Android 7.x shows a visibly smaller icon
  than Android 8+.

The adaptive background is a flat white `@color/ic_launcher_background`. If you
would rather have an orange tile with a white mark, invert both there and in
`generate-icons.py`.

## Splash screen

```sh
npx react-native-bootsplash generate branding/paicart-mark.png \
  --platforms android,ios --background "#FFFFFF" --logo-width 110 \
  --assets-output assets/bootsplash
```

The generator **rewrites `AndroidManifest.xml` and `Info.plist` and strips the
comments out of both.** Re-run it only when the logo changes, and check the diff
afterwards — the manifest carries the `paicart://` and `paicart.com` deep-link
filters and the `<queries>` block.
