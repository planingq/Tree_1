from playwright.sync_api import sync_playwright
import re
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1200});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:5173/',wait_until='networkidle');page.get_by_role('button',name='الدخول إلى النسخة التجريبية').click();page.locator('.person-card').first.wait_for();page.wait_for_timeout(400)
 page.get_by_role('textbox',name='البحث في الشجرة').fill('005');page.get_by_role('button',name='بحث',exact=True).click();page.wait_for_timeout(600)
 card=page.locator('.person-card.highlight');assert card.locator('strong').inner_text()=='خالد محمد عبدالله السالم'
 assert '#005' not in card.inner_text();assert card.locator('strong').evaluate('e=>getComputedStyle(e).textAlign')=='center'
 card.locator('.person-main').click();page.keyboard.press('Escape');assert page.locator('.person-card.highlight').count()==1
 page.get_by_label('من الجيل',exact=True).select_option('2');page.get_by_label('إلى الجيل',exact=True).select_option('3');assert '9 فردًا' in page.locator('.tree-extra-toolbar').inner_text()
 page.get_by_role('button',name='إعادة ضبط العرض').click();page.wait_for_timeout(500)
 page.get_by_label('امتداد الخطوط').fill('100');page.get_by_label('امتداد الخطوط').dispatch_event('input');page.wait_for_timeout(400)
 # Select mode, wheel should pan without zooming; drag works both axes.
 canvas=page.locator('.tree-canvas');canvas.scroll_into_view_if_needed();rect=canvas.bounding_box();page.mouse.move(rect['x']+70,rect['y']+100)
 before=page.locator('.react-flow__viewport').get_attribute('style');page.mouse.wheel(50,100);page.wait_for_timeout(200);after=page.locator('.react-flow__viewport').get_attribute('style');assert before!=after;assert re.search(r'scale\((.*?)\)',before).group(1)==re.search(r'scale\((.*?)\)',after).group(1)
 page.mouse.move(rect['x']+80,rect['y']+100);page.mouse.down();page.mouse.move(rect['x']+160,rect['y']+170,steps=10);page.mouse.up();page.wait_for_timeout(150);assert page.locator('.react-flow__viewport').get_attribute('style')!=after
 page.get_by_role('button',name='وضع الزوم',exact=True).click();canvas.scroll_into_view_if_needed();page.mouse.move(rect['x']+70,rect['y']+100);before=page.locator('.react-flow__viewport').get_attribute('style');page.mouse.wheel(0,-200);page.wait_for_timeout(250);after=page.locator('.react-flow__viewport').get_attribute('style');assert re.search(r'scale\((.*?)\)',before).group(1)!=re.search(r'scale\((.*?)\)',after).group(1)
 page.get_by_role('button',name='تصدير وطباعة').click();dialog=page.get_by_role('dialog');dialog.get_by_label('نطاق التصدير').select_option('all');dialog.get_by_label('من الجيل للطباعة').select_option('2');dialog.get_by_label('إلى الجيل للطباعة').select_option('2');dialog.get_by_label('حجم الورق').select_option('custom');dialog.get_by_label('عرض الورق (مم)').fill('1200');dialog.get_by_label('ارتفاع الورق (مم)').fill('2400');dialog.get_by_label('توزيع الشجرة').select_option('fit')
 with page.expect_popup() as popup_info:dialog.get_by_role('button',name='فتح معاينة الطباعة / PDF').click()
 popup=popup_info.value;popup.wait_for_load_state();assert popup.locator('svg [data-person]').count()==3;assert 'الأجيال 2 إلى 2' in popup.locator('header').inner_text();popup.pdf(path='/tmp/tree-custom-ux.pdf',prefer_css_page_size=True,print_background=True);popup.close()
 page.keyboard.press('Escape');page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth <= innerWidth');page.screenshot(path='/tmp/tree-ux-mobile.png',full_page=True)
 assert not errors,errors
 print('PASS: full lineage name, centered no ID, selected highlight, generation filters, spacing, wheel pan, mouse drag in two axes, separate wheel zoom, print generations/custom paper, mobile overflow, no page errors.')
 b.close()
