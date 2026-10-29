from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1300});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:5173/',wait_until='networkidle');page.get_by_role('button',name='الدخول إلى النسخة التجريبية').click();page.locator('.person-card').first.wait_for()
 page.get_by_role('button',name='الشجرة التراثية',exact=True).click();page.wait_for_timeout(700)
 assert page.locator('.heritage-person').count()==15
 assert page.locator('.heritage-branch').count()==14
 for card in page.locator('.heritage-person').all():
  a=card.locator('.source').evaluate('e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})');b=card.locator('.target').evaluate('e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})');assert abs(a['x']-b['x'])<1 and abs(a['y']-b['y'])<1
 import re
 incoming=page.locator('.react-flow__edge[data-id="001-002"] [data-branch-spine]').get_attribute('d');outgoing=page.locator('.react-flow__edge[data-id="002-005"] [data-branch-spine]').get_attribute('d');a=list(map(float,re.findall(r'[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?',incoming)));b=list(map(float,re.findall(r'[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?',outgoing)));assert abs(a[-2]-b[0])<.01 and abs(a[-1]-b[1])<.01
 assert page.locator('.heritage-branch [data-ornament="foliage"]').count()>0
 page.get_by_role('textbox',name='البحث في الشجرة').fill('005');page.get_by_role('button',name='بحث',exact=True).click();page.wait_for_timeout(500)
 page.locator('.heritage-selected .heritage-name').click();assert page.locator('#detail-title').inner_text()=='خالد محمد عبدالله السالم';page.keyboard.press('Escape')
 page.get_by_role('button',name='تصدير وطباعة').click();dialog=page.get_by_role('dialog');dialog.get_by_label('توزيع الشجرة').select_option('fit');dialog.get_by_label('حجم الورق').select_option('A0')
 with page.expect_popup() as info:dialog.get_by_role('button',name='فتح معاينة الطباعة / PDF').click()
 popup=info.value;popup.wait_for_load_state();assert popup.locator('svg [data-person]').count()==15;assert 'الشجرة التراثية' in popup.locator('header').inner_text();popup.pdf(path='/tmp/heritage-junction-A0.pdf',prefer_css_page_size=True,print_background=True);popup.close();page.keyboard.press('Escape')
 page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth <= innerWidth');assert not errors,errors
 print('PASS: incoming/outgoing junctions coincide, named leaves remain separate, decorative foliage does not change person count, details and A0 SVG PDF work, mobile has no overflow.')
 browser.close()
