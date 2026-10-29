from playwright.sync_api import sync_playwright
import fitz
people=[{'id':'root','parentId':'','name':'الجد التجريبي','status':2,'siblingOrder':1,'fatherName':'','customFields':{}}]
for i,count in enumerate([9,3,5,2,0,1,4],1):
 people.append({'id':f'c{i}','parentId':'root','name':['أحمد','محمد','خالد','سالم','عمر','ماجد','يوسف'][i-1],'status':1,'siblingOrder':i,'fatherName':'','customFields':{}})
 for j in range(1,count+1):people.append({'id':f'c{i}-{j}','parentId':f'c{i}','name':['عبدالله','عبد الرحمن','عبدالعزيز','علي','حسن','بدر','راشد','سعيد','ناصر'][j-1],'status':1,'siblingOrder':j,'fatherName':'','customFields':{}})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1600,'height':1100});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:5173/',wait_until='networkidle');page.evaluate('(p)=>localStorage.setItem("judhur-demo-family-v1",JSON.stringify(p))',people);page.reload(wait_until='networkidle');page.get_by_role('button',name='الدخول إلى النسخة التجريبية').click();page.locator('.person-card').first.wait_for();assert page.get_by_role('button',name='الشجرة التراثية',exact=True).count()==0
 for label,mode in [('عمودي','vertical'),('أفقي','horizontal'),('شجرة صاعدة','upward')]:
  page.get_by_role('button',name=label,exact=True).click();page.wait_for_timeout(600);page.get_by_role('button',name='إعادة ضبط العرض').click();page.wait_for_timeout(400);page.screenshot(path=f'/tmp/family-packed-{mode}-screen.png',full_page=True)
  page.get_by_role('button',name='تصدير وطباعة').click();dialog=page.get_by_role('dialog');dialog.get_by_label('توزيع الشجرة').select_option('fit')
  with page.expect_popup() as info:dialog.get_by_role('button',name='فتح معاينة الطباعة / PDF').click()
  popup=info.value;popup.wait_for_load_state();assert popup.locator('svg [data-person]').count()==len(people);assert popup.locator('svg [data-source]').count()==len(people)-1;assert popup.locator('svg [data-person] text').count()==len(people)
  popup.pdf(path=f'/tmp/family-packed-{mode}.pdf',prefer_css_page_size=True,print_background=True);doc=fitz.open(f'/tmp/family-packed-{mode}.pdf');assert len(doc)==1;doc[0].get_pixmap(matrix=fitz.Matrix(2,2)).save(f'/tmp/family-packed-{mode}-pdf.png');popup.close();page.get_by_role('button',name='إغلاق خيارات التصدير').click()
 page.get_by_role('button',name='ملء الشاشة',exact=True).click();page.locator('.tree-fullscreen').wait_for();page.wait_for_timeout(600);page.get_by_role('textbox',name='البحث في الشجرة').fill('c1-9');page.get_by_role('button',name='بحث',exact=True).click();page.wait_for_timeout(500);assert page.locator('.person-card.highlight').count()==1
 page.locator('.person-card.highlight .person-main').click();page.get_by_role('dialog').wait_for();page.get_by_role('button',name='إغلاق التفاصيل').click();page.get_by_role('button',name='الخروج من ملء الشاشة').click();page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(500);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
 print('PASS: 7 children / 9,3,5 grandchildren; three screen directions; name-only single-page PDFs; correct edge counts; heritage removed; fullscreen/search/details/mobile; no JS errors.');b.close()
