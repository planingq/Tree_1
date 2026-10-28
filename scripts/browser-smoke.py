from playwright.sync_api import sync_playwright
import json
import os
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1100},device_scale_factor=1)
 errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
 page.goto(os.environ.get('APP_URL','http://127.0.0.1:5173/'),wait_until='networkidle')
 page.get_by_role('button',name='الدخول إلى النسخة التجريبية').click()
 page.locator('.person-card').first.wait_for()
 page.wait_for_timeout(700)
 page.screenshot(path='/tmp/tree-desktop.png',full_page=True)
 page.get_by_role('button',name='إعادة ضبط العرض').click()
 page.wait_for_timeout(500)
 assert page.locator('.person-card').count()==15
 # Collapse the top root, search a hidden descendant, open detail.
 page.get_by_role('button',name='إغلاق فرع عبدالله السالم',exact=True).first.click()
 assert page.locator('.person-card').count()==1
 page.get_by_role('textbox',name='البحث في الشجرة').fill('011')
 page.get_by_role('button',name='بحث',exact=True).click()
 page.locator('.person-card.highlight').wait_for()
 assert page.locator('.person-card.highlight').inner_text().find('يوسف')>=0
 page.get_by_role('button',name='أفقي',exact=True).click()
 page.wait_for_timeout(400)
 page.locator('.person-card.highlight .person-main').click()
 assert page.get_by_role('dialog').count()==1
 page.keyboard.press('Escape')
 assert page.get_by_role('dialog').count()==0
 page.locator('nav').get_by_role('button',name='الأفراد').click()
 page.get_by_role('button',name='إضافة فرد',exact=True).click()
 dialog=page.get_by_role('dialog')
 dialog.get_by_label('المعرّف الفريد').fill('020')
 dialog.get_by_label('الاسم الكامل').fill('فرد اختبار')
 dialog.get_by_label('الأب المرتبط').select_option('005')
 dialog.get_by_role('button',name='حفظ الفرد').click()
 assert page.get_by_text('تم حفظ بيانات الفرد وتحديث العلاقات.').count()==1
 page.get_by_role('textbox',name='البحث عن فرد').fill('020')
 assert page.locator('tbody tr').count()==1
 page.get_by_role('button',name='تعديل فرد اختبار').click()
 page.get_by_role('textbox',name='اسم الحقل المخصص').fill('المدينة')
 page.get_by_role('button',name='إضافة حقل',exact=True).click()
 page.get_by_label('المدينة',exact=True).fill('الرياض')
 page.get_by_role('button',name='حفظ الفرد').click()
 page.reload(wait_until='networkidle')
 page.get_by_role('button',name='الدخول إلى النسخة التجريبية').click()
 page.locator('nav').get_by_role('button',name='الأفراد').click()
 page.get_by_role('textbox',name='البحث عن فرد').fill('020')
 assert page.locator('tbody tr').count()==1
 page.get_by_role('button',name='حذف فرد اختبار').click()
 page.get_by_role('button',name='تأكيد الحذف').click()
 assert page.locator('tbody tr').count()==0
 # Download the actual XLSX template and reimport it with explicit confirmation.
 page.locator('nav').get_by_role('button',name='استيراد Excel').click()
 with page.expect_download() as d: page.get_by_role('button',name='تنزيل النموذج').click()
 download=d.value;download.save_as('/tmp/family-template.xlsx')
 page.locator('input[type=file]').set_input_files('/tmp/family-template.xlsx')
 page.get_by_role('button',name='مراجعة واعتماد الاستيراد').wait_for()
 assert not page.get_by_role('button',name='مراجعة واعتماد الاستيراد').is_disabled()
 page.get_by_role('button',name='مراجعة واعتماد الاستيراد').click()
 assert len(json.loads(page.evaluate("localStorage.getItem('judhur-demo-family-v1')")))==15
 page.get_by_role('button',name='تأكيد استبدال البيانات').click()
 assert len(json.loads(page.evaluate("localStorage.getItem('judhur-demo-family-v1')")))==2
 page.locator('nav').get_by_role('button',name='الإحصائيات').click()
 assert page.get_by_text('تفاصيل الذرية لكل فرد').count()==1
 # Mobile, reset and viewer mode.
 page.set_viewport_size({'width':390,'height':844})
 page.get_by_role('button',name='فتح القائمة').click()
 page.locator('nav').get_by_role('button',name='الإعدادات').click()
 page.get_by_role('button',name='استعادة البيانات التجريبية').click()
 page.get_by_role('button',name='تأكيد الاستعادة').click()
 assert len(json.loads(page.evaluate("localStorage.getItem('judhur-demo-family-v1')")))==15
 page.get_by_role('button',name='فتح القائمة').click()
 page.locator('nav').get_by_role('button',name='الرئيسية',exact=True).click()
 page.wait_for_timeout(500)
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
 page.screenshot(path='/tmp/tree-mobile.png',full_page=True)
 page.get_by_role('button',name='فتح القائمة').click()
 page.locator('.profile').click()
 page.get_by_label('الدور في التجربة').select_option('viewer')
 page.get_by_role('button',name='الدخول إلى النسخة التجريبية').click()
 page.get_by_role('button',name='فتح القائمة').click()
 page.locator('nav').get_by_role('button',name='الأفراد').click()
 assert page.get_by_role('button',name='إضافة فرد',exact=True).count()==0
 assert not errors,errors
 print('PASS: desktop/mobile RTL; branch collapse, search reveal, horizontal layout, details/Escape; add/edit/custom field, persistence, delete; XLSX download/preview/confirmation; statistics; reset; viewer controls; no page errors.')
 browser.close()
