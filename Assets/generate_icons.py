from __future__ import annotations

from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageOps
except ImportError as exc:
    raise SystemExit(
        "Pillow is required. Install it with: pip install pillow"
    ) from exc


ROOT = Path(__file__).resolve().parent
SRC_SQUARE = ROOT / "Assets" / "DevPrint.png"
SRC_SQUIRCLE = ROOT / "Assets" / "DevPrint (Squircle).png"
OUT_DIR = ROOT / "assets" / "icons"

ROUND_RADIUS_RATIO = 0.08
MACOS_USES_SQUIRCLE = True


def load_image(path: Path) -> Image.Image:
    if not path.exists():
        raise FileNotFoundError(f"Missing source file: {path}")
    return Image.open(path).convert("RGBA")


def fit_square(img: Image.Image, size: int) -> Image.Image:
    return ImageOps.fit(img, (size, size), method=Image.LANCZOS)


def apply_rounding(img: Image.Image, radius_ratio: float) -> Image.Image:
    size = img.size[0]
    radius = max(1, int(size * radius_ratio))
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    rounded = img.copy()
    rounded.putalpha(mask)
    return rounded


def save_icon(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="PNG")


def build_set(base: Image.Image, sizes: dict[str, int], out_dir: Path, rounded: bool) -> None:
    for name, size in sizes.items():
        icon = fit_square(base, size)
        if rounded:
            icon = apply_rounding(icon, ROUND_RADIUS_RATIO)
        save_icon(icon, out_dir / name)


def main() -> None:
    square = load_image(SRC_SQUARE)
    squircle = load_image(SRC_SQUIRCLE)

    ios_sizes = {
        "icon-1024.png": 1024,
        "icon-180.png": 180,
        "icon-167.png": 167,
        "icon-152.png": 152,
        "icon-120.png": 120,
        "icon-87.png": 87,
        "icon-80.png": 80,
        "icon-76.png": 76,
        "icon-60.png": 60,
        "icon-58.png": 58,
        "icon-40.png": 40,
        "icon-29.png": 29,
        "icon-20.png": 20,
        "apple-touch-icon.png": 180,
    }

    macos_iconset = {
        "icon_16x16.png": 16,
        "icon_16x16@2x.png": 32,
        "icon_32x32.png": 32,
        "icon_32x32@2x.png": 64,
        "icon_64x64.png": 64,
        "icon_64x64@2x.png": 128,
        "icon_128x128.png": 128,
        "icon_128x128@2x.png": 256,
        "icon_256x256.png": 256,
        "icon_256x256@2x.png": 512,
        "icon_512x512.png": 512,
        "icon_512x512@2x.png": 1024,
    }

    android_sizes = {
        "ic_launcher_mdpi.png": 48,
        "ic_launcher_hdpi.png": 72,
        "ic_launcher_xhdpi.png": 96,
        "ic_launcher_xxhdpi.png": 144,
        "ic_launcher_xxxhdpi.png": 192,
        "ic_launcher_playstore.png": 512,
    }

    windows_sizes = {
        "icon-44.png": 44,
        "icon-50.png": 50,
        "icon-70.png": 70,
        "icon-150.png": 150,
        "icon-310.png": 310,
        "icon-256.png": 256,
    }

    web_sizes = {
        "icon-192.png": 192,
        "icon-512.png": 512,
        "icon-512-maskable.png": 512,
        "apple-touch-icon.png": 180,
        "favicon-32.png": 32,
        "favicon-16.png": 16,
    }

    build_set(square, ios_sizes, OUT_DIR / "ios", rounded=True)

    macos_base = square if MACOS_USES_SQUIRCLE else squircle
    build_set(macos_base, macos_iconset, OUT_DIR / "macos.iconset", rounded=True)

    build_set(squircle, android_sizes, OUT_DIR / "android", rounded=False)
    build_set(squircle, windows_sizes, OUT_DIR / "windows", rounded=False)

    build_set(squircle, {k: v for k, v in web_sizes.items() if k != "apple-touch-icon.png"}, OUT_DIR / "web", rounded=False)
    build_set(square, {"apple-touch-icon.png": 180}, OUT_DIR / "web", rounded=True)

    print("Icon generation complete.")
    print(f"Output directory: {OUT_DIR}")


if __name__ == "__main__":
    main()
