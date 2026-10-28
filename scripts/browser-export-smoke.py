from playwright.sync_api import sync_playwright
from zipfile import ZipFile
import re
people=[{'id':f'{i:03}','parentId':f'{i-1:03}' if i>1 else '', 'name':f'فرد تجريبي {i}', 'status':1, 'siblingOrder':1,'fatherName':f'فرد تجريبي {i-1}' if i>1 else '', 'customFields':{'المدينة':'الرياض'}} for i in range(1,10)]
people += [{'id':f'b{i}', 'parentId':'001','name':f'فرع جانبي {i}','status':1,'siblingOrder':i+1,'fatherName':'فرد تجريبي 1','customFields':{}} for i in range(1,151)]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:5173/',wait_until='networkidle')
 page.evaluate('(people)=>localStorage.setItem("judhur-demo-family-v1",JSON.stringify(people))',people)
 page.reload(wait_until='networkidle');page.get_by_role('button',name='الدخول إلى النسخة التجريبية').click()
 page.locator('.person-card').first.wait_for();page.wait_for_timeout(500)
 transform=page.locator('.react-flow__viewport').get_attribute('style');assert 'scale(0.9)' in transform,transform
 page.get_by_role('textbox',name='البحث في الشجرة').fill('009');page.get_by_role('button',name='بحث',exact=True).click()
 page.locator('.person-card.highlight .person-main').click()
 page.get_by_role('button',name='عرض المختار وأسلافه إلى الجيل 1').click()
 page.locator('.ancestor-banner').wait_for();assert 'الجيل 9 إلى الجيل 1' in page.locator('.ancestor-banner').inner_text()
 page.wait_for_timeout(400);page.get_by_role('button',name='إعادة ضبط العرض').click();page.wait_for_timeout(500)
 print('ancestor cards', page.locator('.person-card').count(),page.locator('.react-flow__viewport').get_attribute('style'),flush=True)
 assert page.locator('.person-card').count()==9
 assert page.locator('.collapse-button').count()==0
 page.screenshot(path='/tmp/tree-ancestors.png',full_page=True)
 page.get_by_role('button',name='أفقي',exact=True).click();page.wait_for_timeout(400)
 page.get_by_role('button',name='تصدير وطباعة').click()
 dialog=page.get_by_role('dialog');dialog.get_by_label('حجم الورق').select_option('A0');dialog.get_by_label('توزيع الشجرة').select_option('fit')
 with page.expect_popup() as popup_info:dialog.get_by_role('button',name='فتح معاينة الطباعة / PDF').click()
 popup=popup_info.value;popup.wait_for_load_state();assert popup.locator('#family-drawing > g').count()==9;assert popup.locator('.sheet').count()==1
 assert '<script>' not in popup.content()
 popup.pdf(path='/tmp/tree-a0-test.pdf',prefer_css_page_size=True,print_background=True)
 assert open('/tmp/tree-a0-test.pdf','rb').read(5)==b'%PDF-'
 popup.screenshot(path='/tmp/tree-print.png',full_page=True)
 popup.close()
 with page.expect_download() as dl: dialog.get_by_role('button',name='تنزيل Excel',exact=True).click()
 dl.value.save_as('/tmp/tree-ancestors-export.xlsx')
 with ZipFile('/tmp/tree-ancestors-export.xlsx') as z: assert len(re.findall(r'<row\b',z.read('xl/worksheets/sheet1.xml').decode()))==10
 dialog.get_by_label('نطاق التصدير').select_option('all')
 with page.expect_download() as dl: dialog.get_by_role('button',name='تنزيل Excel',exact=True).click()
 dl.value.save_as('/tmp/tree-all-export.xlsx')
 with ZipFile('/tmp/tree-all-export.xlsx') as z: assert len(re.findall(r'<row\b',z.read('xl/worksheets/sheet1.xml').decode()))==160
 dialog.get_by_label('نطاق التصدير').select_option('visible');dialog.get_by_label('حجم الورق').select_option('A4');dialog.get_by_label('توزيع الشجرة').select_option('tiles')
 with page.expect_popup() as popup_info:dialog.get_by_role('button',name='فتح معاينة الطباعة / PDF').click()
 popup=popup_info.value;popup.wait_for_load_state();assert popup.locator('.sheet').count()>1
 popup.pdf(path='/tmp/tree-tiled-test.pdf',prefer_css_page_size=True,print_background=True);popup.close()
 page.keyboard.press('Escape');page.get_by_role('button',name='العودة إلى العائلة كاملة').click();assert page.locator('.ancestor-banner').count()==0
 assert not errors,errors
 page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
 print('PASS: 159-person tree readable default; nine-generation ancestors only; horizontal mode; A0 vector PDF; A4 tiled PDF; scoped/full XLSX; return to family; mobile overflow; no JS errors.')
 browser.close()
