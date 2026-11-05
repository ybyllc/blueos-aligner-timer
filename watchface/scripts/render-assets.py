from pathlib import Path
import base64
import re
import shutil
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'src' / 'watch300102' / 'assets'
ASSETS.mkdir(parents=True, exist_ok=True)
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(device_scale_factor=2)
    for source_name, output_name, width, height in [
        ('cool-cat.svg', 'cat.png', 108, 108),
        ('mood-bar.svg', 'mood-bar.png', 222, 20),
        ('battery.svg', 'battery.png', 50, 60),
        ('heart.svg', 'heart.png', 22, 22),
    ]:
        page.set_viewport_size({'width': width, 'height': height})
        page.goto((ROOT / 'art' / source_name).as_uri())
        page.screenshot(path=str(ASSETS / output_name), omit_background=True)
    source = (ROOT / 'src' / 'watch300102' / 'index.ux').read_text(encoding='utf-8')
    template = re.search(r'<template>([\s\S]*?)</template>', source).group(1)
    styles = re.search(r'<style>([\s\S]*?)</style>', source).group(1)
    template = template.replace('{{ dateLabel }}', '18 周日').replace('{{ clock }}', '10:08')
    template = template.replace('{{ heartRate }}', '75').replace('{{ oxygen }}', '100')
    template = template.replace('<image ', '<img ').replace('<stack ', '<div data-stack ').replace('</stack>', '</div>')
    shutil.copyfile(ROOT.parent / 'src' / 'assets' / 'images' / 'aligner-icon.png', ASSETS / 'aligner-icon.png')
    for name in ['cat.png', 'aligner-icon.png', 'mood-bar.png', 'battery.png', 'heart.png']:
        encoded = base64.b64encode((ASSETS / name).read_bytes()).decode('ascii')
        template = template.replace('/watch300102/assets/' + name, 'data:image/png;base64,' + encoded)
    page.close()
    page = browser.new_page(viewport={'width': 466, 'height': 466}, device_scale_factor=1)
    for name, label, time, color, track in [
        ('preview.png', '佩戴中', '07:18:24', '#7bc77e', '#193523'),
        ('preview-removed.png', '已摘下', '00:12:08', '#f05252', '#451e25'),
    ]:
        rendered = template.replace('{{ wearLabel }}', label).replace('{{ wearTime }}', time)
        rendered = rendered.replace('{{ ringColor }}', color).replace('{{ ringTrack }}', track)
        def ring(match):
            class_name = match.group(1)
            declarations = re.search(r'\.' + re.escape(class_name) + r'\s*\{([^}]+)\}', styles).group(1)
            size = float(re.search(r'width:\s*([\d.]+)px', declarations).group(1))
            stroke = float(re.search(r'stroke-width:\s*([\d.]+)px', declarations).group(1))
            foreground = color if class_name == 'wear-ring' else re.search(r'(?:^|;)\s*color:\s*(#[0-9a-f]+)', declarations).group(1)
            background = track if class_name == 'wear-ring' else re.search(r'background-color:\s*(#[0-9a-f]+)', declarations).group(1)
            percent = {'wear-ring': 36.53, 'battery-ring': 78}.get(class_name, 100)
            center = size / 2
            radius = (size - stroke) / 2
            return f'<svg class="{class_name}" viewBox="0 0 {size} {size}"><circle cx="{center}" cy="{center}" r="{radius}" fill="none" stroke="{background}" stroke-width="{stroke}"/><circle cx="{center}" cy="{center}" r="{radius}" fill="none" stroke="{foreground}" stroke-width="{stroke}" stroke-linecap="round" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="{100 - percent}" transform="rotate(-90 {center} {center})"/></svg>'
        rendered = re.sub(r'<progress\s+class="([^"]+)"[^>]*?/>', ring, rendered)
        page.set_content(f'<html><meta charset="utf-8"><style>body{{margin:0;width:466px;height:466px;font-family:Arial,"Microsoft YaHei",sans-serif}}div{{display:flex;box-sizing:border-box;flex-shrink:0}}text{{display:block;flex-shrink:0;white-space:nowrap;overflow:hidden}}img,svg{{flex-shrink:0}}{styles}svg{{background-color:transparent!important}}[data-stack]{{display:grid}}[data-stack]>*{{grid-area:1/1}}</style><body>{rendered}</body></html>')
        page.wait_for_function('Array.from(document.images).every(image => image.complete && image.naturalWidth > 0)')
        page.screenshot(path=str(ASSETS / name))
        assert page.locator('.wear-dial').bounding_box()['width'] == 108
        footer = page.locator('.footer').bounding_box()
        assert footer['y'] + footer['height'] <= 466
        assert page.locator('.footer > *').count() == 3
    browser.close()
cat = Image.open(ASSETS / 'cat.png').convert('RGBA')
icon = Image.new('RGBA', (114, 114), '#000000')
cat.thumbnail((112, 112), Image.Resampling.LANCZOS)
icon.alpha_composite(cat, ((114 - cat.width) // 2, (114 - cat.height) // 2))
icon.save(ASSETS / 'icon.png')
print('Generated reference-style cat, mood bar, battery and three-ring design previews')
