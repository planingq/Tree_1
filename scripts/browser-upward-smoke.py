from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':1200});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:5173/',wait_until='networkidle');page.get_by_role('button',name='الدخول إلى النسخة التجريبية').click();page.locator('.person-card').first.wait_for();page.wait_for_timeout(400)
 page.get_by_role('textbox',name='البحث في الشجرة').fill('005');page.get_by_role('button',name='بحث',exact=True).click();page.wait_for_timeout(500)
 card=page.locator('.person-card.highlight');assert card.locator('strong').inner_text()=='خالد';assert card.evaluate('e=>e.offsetWidth')==160;assert card.evaluate('e=>e.offsetHeight')==92
 card.locator('.person-main').click();assert page.locator('#detail-title').inner_text()=='خالد محمد عبدالله السالم';page.keyboard.press('Escape')
 page.get_by_role('button',name='شجرة صاعدة',exact=True).click();page.wait_for_timeout(300);page.get_by_role('button',name='إعادة ضبط العرض').click();page.wait_for_timeout(500)
 root=page.locator('.react-flow__node[data-id="001"]');child=page.locator('.react-flow__node[data-id="002"]');assert root.bounding_box()['y']>child.bounding_box()['y'];assert root.locator('.react-flow__handle-top.source').count()==1;assert child.locator('.react-flow__handle-bottom.target').count()==1
 assert page.locator('.upward-canvas').count()==1;assert page.locator('.root-sprout').count()==1
 page.screenshot(path='/tmp/tree-upward.png',full_page=True)
 page.get_by_role('button',name='تصدير وطباعة').click();dialog=page.get_by_role('dialog');dialog.get_by_label('توزيع الشجرة').select_option('fit');dialog.get_by_label('توزيع الصفحة الواحدة').select_option('original')
 with page.expect_popup() as info:dialog.get_by_role('button',name='فتح معاينة الطباعة / PDF').click()
 popup=info.value;popup.wait_for_load_state();assert 'شجرة صاعدة' in popup.locator('header').inner_text();assert popup.locator('svg path').first.get_attribute('d').find('C')>=0
 r=popup.locator('svg [data-person="001"]').get_attribute('transform');c=popup.locator('svg [data-person="002"]').get_attribute('transform');assert float(r.split(' ')[1].rstrip(')'))>float(c.split(' ')[1].rstrip(')'))
 assert popup.locator('svg [data-person="005"] text').first.text_content()=='خالد';popup.pdf(path='/tmp/upward-tree.pdf',prefer_css_page_size=True,print_background=True);popup.close();page.keyboard.press('Escape')
 page.get_by_role('button',name='أفقي',exact=True).click();assert page.locator('.upward-canvas').count()==0
 page.get_by_role('button',name='عمودي',exact=True).click();assert page.locator('.upward-canvas').count()==0
 assert not errors,errors;print('PASS: compact 160x92 first-name cards; full lineage details; bottom-up roots/handles and curved branches; matching PDF; existing directions preserved; no page errors.');b.close()
