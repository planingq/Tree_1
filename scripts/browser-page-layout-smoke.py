from playwright.sync_api import sync_playwright
import json,fitz
counts=[1,5,20,50,100,120,60,40];people=[];prev=[];seq=0
for g,count in enumerate(counts):
 ids=[f'anon-{g}-{i}' for i in range(count)]
 for i,id in enumerate(ids):
  people.append({'id':id,'name':['أحمد','محمد','خالد','سالم','نورة','عمر','فاطمة','يوسف','مريم','سارة'][i%10]+' التجريبي','status':1,'parentId':prev[i*len(prev)//count] if prev else '', 'siblingOrder':i+1,'fatherName':'','customFields':{}})
 prev=ids
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1600,'height':1400});page.goto('http://127.0.0.1:5173/',wait_until='networkidle')
 for mode in ['balanced','original']:
  result=page.evaluate('''async ({people,mode})=>{const {analyzeFamily}=await import('/src/utils/family.ts');const {compactTreeLayout}=await import('/src/features/tree/layout.ts');const {buildPrintDocument}=await import('/src/features/tree/export.ts');const f=analyzeFamily(people),pos=compactTreeLayout(people,true,false,28);const nodes=people.map(p=>({id:p.id,position:pos.get(p.id),data:{person:p,displayName:p.name.split(' ')[0],generation:f.depth.get(p.id)+1,...f.stats.get(p.id)}}));const ids=new Set(people.map(p=>p.id));const edges=people.filter(p=>ids.has(p.parentId)).map(p=>({source:p.parentId,target:p.id}));const result=buildPrintDocument(nodes,edges,true,{paper:'A3',landscape:true,mode:'fit',cardWidth:65,singlePageLayout:mode});return {html:result.html,count:result.pages[0].nodes.length,edges:result.balanced?.routes.size??edges.length,fontPoints:16*result.plan.scale*72/25.4};}''',{'people':people,'mode':mode})
  preview=b.new_page();preview.set_content(result['html']);assert preview.locator('.sheet').count()==1;assert preview.locator('svg [data-person]').count()==len(people);assert result['edges']==len(people)-1;preview.pdf(path=f'/tmp/print-400-{mode}.pdf',prefer_css_page_size=True,print_background=True);preview.close();doc=fitz.open(f'/tmp/print-400-{mode}.pdf');assert len(doc)==1;p0=doc[0];rects=[d['rect'] for d in p0.get_drawings() if d['fill'] is not None and d['rect'].width>0];bounds=fitz.Rect(min(r.x0 for r in rects),min(r.y0 for r in rects),max(r.x1 for r in rects),max(r.y1 for r in rects));print(json.dumps({'layout':mode,'people':result['count'],'links':result['edges'],'font_points':round(result['fontPoints'],2),'width_fraction':round(bounds.width/p0.rect.width,3),'height_fraction':round(bounds.height/p0.rect.height,3)}),flush=True);p0.get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(f'/tmp/print-400-{mode}.png')
 page.get_by_role('button',name='الدخول إلى النسخة التجريبية').click();page.locator('.person-card').first.wait_for();page.get_by_role('button',name='الشجرة التراثية',exact=True).click();page.wait_for_timeout(800);page.screenshot(path='/tmp/heritage-v2-review.png',full_page=True)
 assert page.locator('.heritage-person').count()==15
 page.get_by_role('textbox',name='البحث في الشجرة').fill('005');page.get_by_role('button',name='بحث',exact=True).click();page.wait_for_timeout(500);page.locator('.heritage-selected .heritage-name').click();assert page.locator('#detail-title').inner_text()=='خالد محمد عبدالله السالم';page.keyboard.press('Escape')
 page.get_by_role('button',name='إعادة ضبط العرض').click();page.wait_for_timeout(450);assert page.locator('.heritage-branch').count()==14
 print('PASS: connected botanical junctions, leaf names and detail selection.',flush=True);b.close()
