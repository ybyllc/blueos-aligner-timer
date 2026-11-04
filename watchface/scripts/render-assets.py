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
    page = browser.new_page(viewport={'width': 320, 'height': 180}, device_scale_factor=2)
    page.goto((ROOT / 'art' / 'cat.svg').as_uri())
    page.screenshot(path=str(ASSETS / 'cat.png'), omit_background=True)
    source = (ROOT / 'src' / 'watch300102' / 'index.ux').read_text(encoding='utf-8')
    template = re.search(r'<template>([\s\S]*?)</template>', source).group(1)
    styles = re.search(r'<style>([\s\S]*?)</style>', source).group(1)
    template = template.replace('{{ dateLabel }}', '11月4日  周三').replace('{{ clock }}', '10:08')
    template = template.replace('<image ', '<img ').replace('<stack ', '<div ').replace('</stack>', '</div>')
    shutil.copyfile(ROOT.parent / 'src' / 'assets' / 'images' / 'aligner-icon.png', ASSETS / 'aligner-icon.png')
    for name in ['cat.png', 'aligner-icon.png']:
        encoded = base64.b64encode((ASSETS / name).read_bytes()).decode('ascii')
        template = template.replace('/watch300102/assets/' + name, 'data:image/png;base64,' + encoded)
    page.close()
    page = browser.new_page(viewport={'width': 466, 'height': 466}, device_scale_factor=1)
    for name, label, time, color, track in [
        ('preview.png', '佩戴中', '07:18:24', '#7bc77e', '#35413c'),
        ('preview-removed.png', '已摘下', '00:12:08', '#f05252', '#523237'),
    ]:
        rendered = template.replace('{{ wearLabel }}', label).replace('{{ wearTime }}', time)
        rendered = rendered.replace('{{ ringColor }}', color).replace('{{ ringTrack }}', track)
        ring = f'<svg class="wear-ring" viewBox="0 0 124 124"><circle cx="62" cy="62" r="56" fill="none" stroke="{track}" stroke-width="8"/><circle cx="62" cy="62" r="56" fill="none" stroke="{color}" stroke-width="8" stroke-linecap="round" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="63.47" transform="rotate(-90 62 62)"/></svg>'
        rendered = re.sub(r'<progress\s[^>]*?/>', ring, rendered)
        page.set_content(f'<html><meta charset="utf-8"><style>body{{margin:0;width:466px;height:466px;font-family:Arial,"Microsoft YaHei",sans-serif}}div{{display:flex;box-sizing:border-box;flex-shrink:0}}text{{display:block;flex-shrink:0}}img{{flex-shrink:0}}{styles}.wear-dial{{display:grid}}.wear-dial>*{{grid-area:1/1}}</style><body>{rendered}</body></html>')
        page.wait_for_function('Array.from(document.images).every(image => image.complete && image.naturalWidth > 0)')
        page.screenshot(path=str(ASSETS / name))
        assert page.locator('.wear-dial').bounding_box()['width'] == 124
        assert page.locator('.complication').bounding_box()['y'] + 132 <= 466
    browser.close()
cat = Image.open(ASSETS / 'cat.png').convert('RGBA')
icon = Image.new('RGBA', (114, 114), '#191d24')
cat.thumbnail((112, 112), Image.Resampling.LANCZOS)
icon.alpha_composite(cat, ((114 - cat.width) // 2, (114 - cat.height) // 2))
icon.save(ASSETS / 'icon.png')
print('Generated cat assets and wearing/removed design previews')
