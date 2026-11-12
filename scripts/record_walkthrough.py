"""Record a real, silent, captioned browser walkthrough. Requires Playwright Chromium."""
import argparse
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base',default='http://127.0.0.1:8080/')
args=parser.parse_args()
base=args.base.rstrip('/')+'/'
with tempfile.TemporaryDirectory() as temporary, sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':1280,'height':800},record_video_dir=temporary,record_video_size={'width':1280,'height':800},reduced_motion='reduce')
    page=context.new_page()
    page.goto(base+'?lang=en');page.wait_for_function("document.querySelector('#preview-revenue').textContent !== '—'");page.screenshot(path=str(ROOT/'assets/walkthrough-poster.png'));page.wait_for_timeout(5000)
    page.locator('.hero .actions a').first.click();page.wait_for_function("document.querySelector('#revenue').textContent !== '—'");page.wait_for_timeout(5000)
    page.locator('#category').select_option('Equipamentos');page.locator('#month').select_option('2026-10');page.wait_for_timeout(4000)
    page.locator('.scenario').scroll_into_view_if_needed();page.locator('#discount').fill('5');page.locator('#discount').dispatch_event('input');page.wait_for_timeout(5000)
    page.locator('[data-tab=quality]').click();page.locator('[data-fault=duplicate]').click();page.wait_for_timeout(4000)
    page.locator('[data-fault=cost]').click();page.wait_for_timeout(4000)
    page.locator('[data-tab=engineering]').click();page.locator('.run-grid').scroll_into_view_if_needed();page.wait_for_timeout(6000)
    page.goto(base+'projects/brazil/');page.locator('#public-insight').wait_for();page.locator('#scale').select_option('indexed');page.wait_for_timeout(5000)
    video=page.video
    context.close()
    video.save_as(ROOT/'assets/walkthrough.webm')
    browser.close()
print('assets/walkthrough.webm')
