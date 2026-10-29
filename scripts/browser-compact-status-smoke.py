from playwright.sync_api import sync_playwright
import json
people=[{'id':str(i),'name':f'جيل {i}','status':1 if i%2 else 2,'parentId':str(i-1) if i>1 else '', 'siblingOrder':1,'fatherName':'','customFields':{}} for i in range(1,10)]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':1200});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:5173/',wait_until='networkidle');page.evaluate('(p)=>localStorage.setItem("judhur-demo-family-v1",JSON.stringify(p))',people);page.reload(wait_until='networkidle');page.get_by_role('button',name='الدخول إلى النسخة التجريبية').click();page.locator('.person-card').first.wait_for();page.wait_for_timeout(300)
 page.get_by_role('button',name='أفقي',exact=True).click();page.wait_for_timeout(300);page.get_by_role('button',name='إعادة ضبط العرض').click();page.wait_for_timeout(450)
 assert page.locator('.person-card').count()==9
 assert page.locator('.person-card').first.evaluate('e=>e.offsetWidth')==160;assert page.locator('.person-card').first.evaluate('e=>e.offsetHeight')==92
 assert all('على قيد الحياة' not in t and 'رحمه الله' not in t for t in page.locator('.person-card').all_inner_texts())
 assert page.locator('.person-card.deceased').first.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(225, 227, 220)'
 page.get_by_label('إظهار نص الحالة',exact=True).check();assert 'على قيد الحياة' in '\n'.join(page.locator('.person-card').all_inner_texts());page.get_by_label('إظهار نص الحالة',exact=True).uncheck()
 page.get_by_label('تصفية حالة الشجرة').select_option('2');page.wait_for_timeout(300);page.get_by_role('button',name='إعادة ضبط العرض').click();page.wait_for_timeout(450);assert page.locator('.person-card').count()==4;assert page.locator('.person-card.deceased').count()==4
 page.get_by_role('textbox',name='البحث في الشجرة').fill('3');page.get_by_role('button',name='بحث',exact=True).click();page.wait_for_timeout(450);assert page.get_by_label('تصفية حالة الشجرة').input_value()=='all';assert page.locator('.person-card.highlight').count()==1
 page.get_by_role('button',name='تصدير وطباعة').click();dialog=page.get_by_role('dialog');dialog.get_by_label('نطاق التصدير').select_option('all');dialog.get_by_label('حجم الورق').select_option('A4');dialog.get_by_label('حجم بطاقات تلقائي بحسب الورق').uncheck();dialog.get_by_label('عرض بطاقة الاسم للطباعة').fill('80')
 with page.expect_popup() as info:dialog.get_by_role('button',name='فتح معاينة الطباعة / PDF').click()
 popup=info.value;popup.wait_for_load_state();small=popup.locator('.sheet').count();assert small>1;assert not any('متوفى' in t or 'حي'==t for t in popup.locator('svg text').all_text_contents());popup.pdf(path='/tmp/compact-A4.pdf',prefer_css_page_size=True,print_background=True);popup.close()
 dialog.get_by_label('حجم الورق').select_option('A0')
 with page.expect_popup() as info:dialog.get_by_role('button',name='فتح معاينة الطباعة / PDF').click()
 popup=info.value;popup.wait_for_load_state();assert popup.locator('.sheet').count()<small;assert popup.locator('.sheet').count()==1;assert popup.locator('.sheet svg [data-person]').count()==16;popup.pdf(path='/tmp/compact-A0.pdf',prefer_css_page_size=True,print_background=True);popup.close()
 dialog.get_by_label('حالة الأفراد للطباعة').select_option('2');dialog.get_by_label('إظهار نص الحالة في الطباعة').check()
 with page.expect_popup() as info:dialog.get_by_role('button',name='فتح معاينة الطباعة / PDF').click()
 popup=info.value;popup.wait_for_load_state();assert popup.locator('svg [data-person]').count()==4;assert 'متوفى — رحمه الله' in '\n'.join(popup.locator('svg text').all_text_contents());popup.close();page.keyboard.press('Escape')
 assert not errors,errors;print('PASS: compact cards, hidden/optional status text, darker deceased cards, status filter and search reset; A4 multiple pages vs A0 packed page; PDF status filter and labels; no JS errors.');b.close()
