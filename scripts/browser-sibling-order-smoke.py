from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':1200});page.goto('http://127.0.0.1:5173/',wait_until='networkidle');page.get_by_role('button',name='الدخول إلى النسخة التجريبية').click();page.locator('.person-card').first.wait_for()
 for label,horizontal in [('عمودي',False),('أفقي',True),('شجرة صاعدة',False)]:
  page.get_by_role('button',name=label,exact=True).click();page.wait_for_timeout(350);page.get_by_role('button',name='إعادة ضبط العرض').click();page.wait_for_timeout(400)
  boxes=[page.locator(f'.react-flow__node[data-id="{id}"]').bounding_box() for id in ['002','003','004']]
  if horizontal:assert boxes[0]['y']<boxes[1]['y']<boxes[2]['y']
  else:assert boxes[0]['x']>boxes[1]['x']>boxes[2]['x']
 page.get_by_role('button',name='عمودي',exact=True).click();page.get_by_role('button',name='تصدير وطباعة').click();dialog=page.get_by_role('dialog');dialog.get_by_label('نطاق التصدير').select_option('all');dialog.get_by_label('توزيع الشجرة').select_option('fit')
 with page.expect_popup() as info:dialog.get_by_role('button',name='فتح معاينة الطباعة / PDF').click()
 popup=info.value;popup.wait_for_load_state();xs=[float(popup.locator(f'svg [data-person="{id}"]').get_attribute('transform').split('(')[1].split(' ')[0]) for id in ['002','003','004']];assert xs[0]>xs[1]>xs[2];popup.close();page.keyboard.press('Escape');page.get_by_role('button',name='إعادة ضبط العرض').click();page.wait_for_timeout(400);page.screenshot(path='/tmp/tree-sibling-order.png',full_page=True)
 print('PASS: oldest is rightmost in vertical/upward, topmost in horizontal; full-tree PDF matches RTL sibling order.');b.close()
