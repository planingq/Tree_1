from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:5173/',wait_until='networkidle');page.get_by_role('button',name='الدخول إلى النسخة التجريبية').click();page.locator('.person-card').first.wait_for();page.get_by_role('button',name='ملء الشاشة',exact=True).click();page.locator('.tree-fullscreen').wait_for();page.wait_for_timeout(400)
 box=page.locator('.tree-fullscreen').bounding_box();assert box['x']==0 and box['y']==0;assert box['width']==page.evaluate('innerWidth');assert box['height']==page.evaluate('innerHeight');assert page.locator('.tree-fullscreen .tree-canvas').bounding_box()['height']>600
 page.get_by_role('textbox',name='البحث في الشجرة').fill('005');page.get_by_role('button',name='بحث',exact=True).click();page.wait_for_timeout(500);page.locator('.person-card.highlight .person-main').click();page.get_by_role('dialog').wait_for();assert 'خالد' in page.locator('#detail-title').inner_text();page.get_by_role('button',name='إغلاق التفاصيل').click();assert page.locator('.tree-fullscreen').count()==1
 page.screenshot(path='/tmp/tree-fullscreen-preview.png',full_page=True)
 page.get_by_role('button',name='تصدير وطباعة').click();dialog=page.get_by_role('dialog');assert dialog.get_by_label('حجم بطاقات تلقائي بحسب الورق').is_checked();dialog.get_by_label('حجم بطاقات تلقائي بحسب الورق').uncheck();dialog.get_by_label('عرض بطاقة الاسم للطباعة').fill('18');dialog.get_by_label('توزيع الشجرة').select_option('fit')
 with page.expect_popup() as info:dialog.get_by_role('button',name='فتح معاينة الطباعة / PDF').click()
 popup=info.value;popup.wait_for_load_state();assert popup.locator('svg [data-person]').count()==15;assert popup.locator('svg [data-source]').count()==14
 texts=popup.locator('svg [data-person] text').all_text_contents();assert len(texts)==15;assert all('الأب:' not in s and 'الأبناء:' not in s and 'الذرية' not in s for s in texts)
 for direction in ['horizontal']:
  positions={id:popup.locator(f'svg [data-person="{id}"]').get_attribute('transform') for id in ['001','002','003','004']}
 popup.pdf(path='/tmp/names-only-tree.pdf',prefer_css_page_size=True,print_background=True);popup.screenshot(path='/tmp/names-only-preview.png',full_page=True);popup.close()
 # Exit native fullscreen while a dialog is open: scroll locking must restore correctly regardless of close order.
 page.evaluate('async()=>{if(document.fullscreenElement)await document.exitFullscreen()}');page.get_by_role('button',name='إغلاق خيارات التصدير').click()
 if page.locator('.tree-fullscreen').count():page.get_by_role('button',name='الخروج من ملء الشاشة').click()
 assert page.locator('.tree-fullscreen').count()==0;assert page.evaluate('document.body.style.overflow')!='hidden'
 # Test CSS fullscreen fallback and Escape on mobile.
 page.set_viewport_size({'width':390,'height':844});page.evaluate('()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error("unsupported"))}');page.get_by_role('button',name='ملء الشاشة',exact=True).click();page.locator('.tree-fullscreen').wait_for();assert page.evaluate('document.documentElement.scrollWidth <= innerWidth');page.keyboard.press('Escape');page.locator('.tree-fullscreen').wait_for(state='detached');assert page.locator('.tree-fullscreen').count()==0
 assert not errors,errors;print('PASS: native/fullscreen viewport, full-screen search/details/print, name-only cards and full parent edges, manual print width, safe scroll restoration, mobile fallback/Escape, no JS errors.');b.close()
