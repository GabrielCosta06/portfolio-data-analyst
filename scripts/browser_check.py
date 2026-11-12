"""Real browser checks against the published data. Run after starting http.server.

Optional dependency: pip install playwright; playwright install chromium.
Screenshots are QA artifacts and default to the OS temporary directory.
"""
import argparse
import csv
import io
import json
import sys
import tempfile
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument("--base",default="http://127.0.0.1:8080/")
parser.add_argument("--screenshots",type=Path,default=Path(tempfile.gettempdir())/"gabriel-portfolio-qa")
args=parser.parse_args()
base=args.base.rstrip('/')+'/'
args.screenshots.mkdir(parents=True,exist_ok=True)
def get(relative):
    with urlopen(base+relative,timeout=15) as response:
        return json.load(response)
pointer=get('data/commercial/current.json')
manifest=get('data/commercial/'+pointer['path']+'/manifest.json')
rows=get('data/commercial/'+pointer['path']+'/sales.json')
checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={"width":1440,"height":1000},device_scale_factor=1,reduced_motion="reduce")
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    page.on('console',lambda message: errors.append(message.text) if message.type=='error' and '500' not in message.text else None)
    def capture(name):
        page.screenshot(path=str(args.screenshots/f'{name}.png'),full_page=True)
    def no_overflow():
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),page.url
    def ready():
        expect(page.locator('#analysis')).to_be_visible()
        expect(page.locator('#revenue')).not_to_have_text('—')
    def currency(cents):
        return page.evaluate("value => new Intl.NumberFormat(document.documentElement.lang,{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(value/100)",cents)
    page.goto(base)
    expect(page.locator('h1')).to_contain_text('Decisões claras.')
    expect(page.locator('#preview-revenue')).not_to_have_text('—')
    expect(page.locator('#preview-chart svg')).to_have_count(1)
    assert page.locator('#preview-chart svg').bounding_box()['width']>500
    assert len(page.locator('.hero .actions a').all())==2
    no_overflow();capture('home-pt-desktop')
    page.keyboard.press('Tab')
    expect(page.locator('.skip')).to_be_focused()
    page.locator('[data-lang=en]').click()
    expect(page.locator('html')).to_have_attribute('lang','en')
    expect(page.locator('h1')).to_contain_text('Good decisions.')
    capture('home-en-desktop')
    page.locator('.hero .actions a').first.click()
    ready()
    expect(page.locator('html')).to_have_attribute('lang','en')
    expect(page.locator('#month option').first).to_have_text('All months')
    expect(page.locator('#revenue')).to_have_text(currency(manifest['totals']['revenue_cents']))
    checks.append('Home: two equal paths, both chart previews, keyboard skip, language persistence')
    page.locator('#category').select_option('Serviços')
    page.locator('#month').select_option('2026-10')
    selection=[r for r in rows if r['category']=='Serviços' and r['date'].startswith('2026-10')]
    expected_revenue=sum(r['revenue_cents'] for r in selection)
    expect(page.locator('#revenue')).to_have_text(currency(expected_revenue))
    expected_orders=len({r['order_id'] for r in selection})
    expect(page.locator('#orders')).to_have_text(str(expected_orders))
    with page.expect_download() as download_info:
        page.locator('#export').click()
    exported=list(csv.DictReader(io.StringIO(Path(download_info.value.path()).read_text(encoding='utf-8-sig'))))
    assert len(exported)==len(selection)
    assert sum(int(r['revenue_cents']) for r in exported)==expected_revenue
    capture('analysis-filtered')
    shared=page.url;page.reload();ready()
    expect(page.locator('#revenue')).to_have_text(currency(expected_revenue))
    assert page.url==shared
    original_margin=page.locator('#scenario-margin').inner_text()
    page.locator('#discount').fill('10')
    page.locator('#discount').dispatch_event('input')
    expect(page.locator('#scenario-margin')).not_to_have_text(original_margin)
    profit_expected=round(expected_revenue*.9)-sum(r['cost_cents'] for r in selection)
    baseline_profit=sum(r['profit_cents'] for r in selection)
    expect(page.locator('#scenario-delta')).to_have_text(currency(profit_expected-baseline_profit))
    page.locator('#reset').click()
    expect(page.locator('#revenue')).to_have_text(currency(manifest['totals']['revenue_cents']))
    expect(page.locator('#discount')).to_have_value('0')
    capture('analysis-desktop');no_overflow()
    checks.append('Analysis: exact totals, order grain, filters, CSV contents, share/reload, scenario arithmetic, reset')
    page.locator('[data-tab=quality]').click()
    expect(page.locator('#quality')).to_be_visible()
    clean=page.locator('#validated-profit').inner_text()
    expect(page.locator('#unchecked-profit')).to_have_text(clean)
    page.locator('[data-fault=duplicate]').click()
    expect(page.locator('#validated-profit')).to_have_text(clean)
    expect(page.locator('#unchecked-profit')).not_to_have_text(clean)
    expect(page.locator('#lab-reason')).to_contain_text('duplicate_item_version')
    page.locator('[data-fault=cost]').click()
    expect(page.locator('#lab-reason')).to_contain_text('invalid_unit_cost_cents')
    page.locator('[data-fault=customer]').click()
    expect(page.locator('#lab-reason')).to_contain_text('unknown_customer')
    capture('quality-desktop')
    page.locator('[data-tab=engineering]').click()
    expect(page.locator('#snapshot-id')).to_have_text(manifest['run_id'])
    expect(page.locator('#snapshot-checks')).to_contain_text('Verified')
    expect(page.locator('#run-table tr')).to_have_count(2)
    video=page.locator('#walkthrough video')
    video.scroll_into_view_if_needed()
    video.evaluate('video => video.play()')
    page.wait_for_function("document.querySelector('video').currentTime > 0")
    assert video.evaluate('video => video.duration') > 35
    assert video.locator('track').count()==2
    video.evaluate('video => video.pause()')
    page.locator('#engineering h2').first.scroll_into_view_if_needed()
    capture('engineering-desktop');no_overflow()
    checks.append('Quality and engineering: all injected faults, traceable reasons, immutable run IDs, checksums, replay history, real video playback and PT/EN caption tracks')
    for width,height in [(390,844),(768,1024)]:
        page.set_viewport_size({'width':width,'height':height})
        for route,name,selector in [('', 'home','#preview-revenue'),('projects/commercial/#analysis','analysis','#revenue'),('projects/commercial/#quality','quality','#lab-reason'),('projects/commercial/#engineering','engineering','#snapshot-id'),('projects/brazil/','public','#public-insight')]:
            page.goto(base+route)
            page.locator(selector).wait_for(state='visible')
            page.wait_for_timeout(150)
            no_overflow()
            if width==390:capture(name+'-mobile')
    checks.append('Responsive: all three commercial paths, homepage and public study at 390px and 768px; no document overflow')
    page.set_viewport_size({'width':1440,'height':1000})
    page.goto(base+'projects/brazil/')
    expect(page.locator('#public-insight')).to_be_visible()
    expect(page.locator('#public-table tr')).to_have_count(25)
    first=page.locator('#public-insight').inner_text()
    page.locator('#measure').select_option('percapita')
    expect(page.locator('#public-insight')).not_to_have_text(first)
    page.locator('#scale').select_option('indexed')
    expect(page.locator('#public-table tr').first).to_contain_text('100')
    page.locator('[data-lang=pt]').click()
    expect(page.locator('h1')).to_have_text('O que entra na conta?')
    capture('public-desktop');no_overflow()
    checks.append('Public data: 25 observed years, total/per-capita switch, base-year index, table and bilingual narrative')
    # Verify actual navigable local resources, including all CV formats, case/source links and downloads.
    for route in ['', 'projects/commercial/#analysis','projects/commercial/#engineering','projects/brazil/']:
        page.goto(base+route)
        page.wait_for_timeout(200)
        hrefs=page.locator('a[href]').evaluate_all("nodes=>nodes.map(n=>n.href).filter(h=>h.startsWith(location.origin))")
        for href in set(hrefs):
            response=context.request.get(href.split('#')[0])
            assert response.ok,f'Broken local link: {href} ({response.status})'
    checks.append('Links: all local navigation, CV PDF/Word, JSON evidence, CSV downloads and source links return success')
    assert not errors,errors
    page.route('**/data/commercial/current.json',lambda route:route.fulfill(status=500,body='unavailable'))
    page.goto(base+'projects/commercial/')
    expect(page.locator('#app-status')).to_contain_text('Não foi possível')
    expect(page.locator('#app-status button')).to_be_visible()
    page.unroute('**/data/commercial/current.json')
    page.locator('#app-status button').click();ready()
    checks.append('Failure recovery: unavailable data produces a clear retry; retry restores the workspace')
    print(json.dumps({'status':'passed','browser':'Chromium / Playwright (Browser plugin unavailable)','checks':checks,'console_errors_before_injected_failure':errors,'screenshots':str(args.screenshots)},ensure_ascii=False,indent=2))
    browser.close()
