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
    template = template.replace('<image ', '<img ')
    shutil.copyfile(ROOT.parent / 'src' / 'assets' / 'images' / 'aligner-icon.png', ASSETS / 'aligner-icon.png')
    for name in ['cat.png', 'aligner-icon.png']:
        encoded = base64.b64encode((ASSETS / name).read_bytes()).decode('ascii')
        template = template.replace('/watch300102/assets/' + name, 'data:image/png;base64,' + encoded)
    page.close()
    page = browser.new_page(viewport={'width': 466, 'height': 466}, device_scale_factor=1)
    page.set_content(f'<html><meta charset="utf-8"><style>body{{margin:0;width:466px;height:466px;font-family:Arial,"Microsoft YaHei",sans-serif}}div{{display:flex;box-sizing:border-box;flex-shrink:0}}text{{display:block;flex-shrink:0}}img{{flex-shrink:0}}{styles}</style><body>{template}</body></html>')
    page.wait_for_function('Array.from(document.images).every(image => image.complete && image.naturalWidth > 0)')
    page.screenshot(path=str(ASSETS / 'preview.png'))
    assert page.locator('.shortcut').bounding_box()['height'] == 76
    browser.close()
cat = Image.open(ASSETS / 'cat.png').convert('RGBA')
icon = Image.new('RGBA', (114, 114), '#191d24')
cat.thumbnail((112, 112), Image.Resampling.LANCZOS)
icon.alpha_composite(cat, ((114 - cat.width) // 2, (114 - cat.height) // 2))
icon.save(ASSETS / 'icon.png')
print('Generated cat.png, aligner-icon.png, icon.png and design preview.png')
