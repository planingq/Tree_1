from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':1200});page.goto('http://127.0.0.1:5173/',wait_until='networkidle');page.get_by_role('button',name='الدخول إلى النسخة التجريبية').click();page.locator('.person-card').first.wait_for()
 for label,horizontal in [('عمودي',False),('أفقي',True),('شجرة صاعدة',False)]:
  page.get_by_role('button',name=label,exact=True).click();page.wait_for_timeout(350);page.get_by_role('button',name='إعادة ضبط العرض').click();page.wait_for_timeout(400)
  boxes=[page.locator(f'.react-flow__node[data-id="{id}"]').bounding_box() for id in ['002','003','004']]
  if horizontal:assert all(c['x']<a['x']-1 or (abs(c['x']-a['x'])<1 and c['y']>a['y']) for a,c in zip(boxes,boxes[1:]))
  else:assert all((c['y']<a['y']-1 if label=='شجرة صاعدة' else c['y']>a['y']+1) or (abs(c['y']-a['y'])<1 and c['x']<a['x']) for a,c in zip(boxes,boxes[1:]))
 page.get_by_role('button',name='عمودي',exact=True).click();page.get_by_role('button',name='تصدير وطباعة').click();dialog=page.get_by_role('dialog');dialog.get_by_label('نطاق التصدير').select_option('all');dialog.get_by_label('توزيع الشجرة').select_option('fit')
 with page.expect_popup() as info:dialog.get_by_role('button',name='فتح معاينة الطباعة / PDF').click()
 popup=info.value;popup.wait_for_load_state();positions=[popup.locator(f'svg [data-person="{id}"]').get_attribute('transform').split('(')[1].rstrip(')').split() for id in ['002','003','004']];positions=[(float(x),float(y)) for x,y in positions];assert all(c[1]>a[1]+1 or (abs(c[1]-a[1])<1 and c[0]<a[0]) for a,c in zip(positions,positions[1:]));popup.close();page.keyboard.press('Escape');page.get_by_role('button',name='إعادة ضبط العرض').click();page.wait_for_timeout(400);page.screenshot(path='/tmp/tree-sibling-order.png',full_page=True)
 print('PASS: ordered sibling shelves match vertical/upward/horizontal reading order in screen and PDF.');b.close()
