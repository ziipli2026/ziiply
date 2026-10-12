"""Read publisher typography and spatial offer ownership, never a brand list."""
import hashlib,json,re,sys,unicodedata
import fitz

def category(name):
 s=unicodedata.normalize('NFKD',name).encode('ascii','ignore').decode().lower()
 if re.search(r'jaatel|pakaste',s):return 'Pakasteet'
 if re.search(r'pasteija|leip|leiv|piirakka|munkki|sampyl|donitsi|pulla',s):return 'Leipomo'
 if re.search(r'mikroateria|pizza|valmisateria',s):return 'Valmisruoka'
 if re.search(r'vanuk|mousse|juusto|maito|jogur|rahka|kerma',s):return 'Maitotuotteet'
 if re.search(r'kirjolohi|lohi|kala|katkarapu',s):return 'Kala'
 if re.search(r'jauheliha|kana|siivet|makkara|uunilenkki|poprilli|kinkku|broiler|liha|pors',s):return 'Liha & makkarat'
 if re.search(r'tomaatti|omena|kiivi|luumu|salaatti|peruna|porkkana|banaani|hedelm|vihann',s):return 'Hevi'
 return 'Muut'

def parse(filename):
 data=open(filename,'rb').read();doc=fitz.open(stream=data,filetype='pdf')
 pages=[{'text':p.get_text(),'width':p.rect.width,'height':p.rect.height,'spans':[s for block in p.get_text('dict')['blocks'] for line in block.get('lines',[]) for s in line['spans']]} for p in doc]
 return parse_pages(pages,hashlib.sha256(data).hexdigest())

def parse_pages(pages,digest):
 text=' '.join(p['text'] for p in pages)
 issue=re.search(r'EUROSPAR\s+(\d{1,2}/\d{2})',text)
 dates=re.findall(r'(\d{1,2})\.\s*[–-]\s*(\d{1,2})\.(\d{1,2})\.(20\d{2})',text)
 if not issue or not dates or len(set(dates))!=1:raise ValueError('Missing or conflicting publisher issue/validity')
 a,b,m,y=map(int,dates[0]);validity={'from':f'{y:04}-{m:02}-{a:02}','to':f'{y:04}-{m:02}-{b:02}'}
 store_lines=[line for p in pages for line in p['text'].splitlines() if line.count('|')>=2]
 stores=list(dict.fromkeys(part.strip().title() for line in store_lines for part in line.split('|') if part.strip()))
 if not stores:raise ValueError('Publisher store coverage missing')
 offers=[]
 for page_number,p in enumerate(pages,1):
  spans=p['spans']
  headings=sorted([s for s in spans if ('-Bd' in s['font'] or 'Bold' in s['font']) and 'Digital' not in s['font'] and 7<=s['size']<=12 and p['height']*.14<s['bbox'][1]<p['height']*.92 and re.search(r'[A-ZÅÄÖ]{3}',s['text'])],key=lambda s:(s['bbox'][1],s['bbox'][0]))
  titles=[]
  for h in headings:
   prev=next((t for t in reversed(titles) if abs(t['x']-h['bbox'][0])<3 and 0<h['bbox'][1]-t['lastY']<18),None)
   if prev:prev['name']+=' '+h['text'].strip();prev['lastY']=h['bbox'][1]
   else:titles.append({'x':h['bbox'][0],'y':h['bbox'][1],'lastY':h['bbox'][1],'name':h['text'].strip()})
  wholes=[s for s in spans if 'Digital' in s['font'] and s['size']>=40 and re.fullmatch(r'\d{1,2}',s['text'].strip())]
  wholes=[s for s in wholes if not any(o['size']>s['size']*1.3 and abs(s['bbox'][0]-o['bbox'][2])<8 and abs(s['bbox'][1]-o['bbox'][1])<o['size']*.3 for o in wholes)]
  used=set()
  for whole in wholes:
   wx,wy,wr,_=whole['bbox']
   cents=[s for s in spans if 'Digital' in s['font'] and .35*whole['size']<s['size']<.8*whole['size'] and re.fullmatch(r'\d{2}',s['text'].strip()) and abs(s['bbox'][0]-wr)<8 and abs(s['bbox'][1]-wy)<whole['size']*.3]
   if len(cents)!=1:raise ValueError('Ambiguous publisher price cents')
   candidates=[(wy-t['lastY']+abs(wx-t['x'])*.2,i) for i,t in enumerate(titles) if -.025*p['width']<wx-t['x']<.25*p['width'] and 0<wy-t['lastY']<.4*p['height']]
   candidates.sort()
   if not candidates:raise ValueError('Price without product heading')
   if len(candidates)>1 and candidates[1][0]-candidates[0][0]<10:raise ValueError('Ambiguous price ownership')
   ti=candidates[0][1]
   if ti in used:raise ValueError('Multiple prices assigned to one product')
   used.add(ti);t=titles[ti]
   details=sorted([s for s in spans if 'Digital' not in s['font'] and s['size']<=12 and abs(s['bbox'][0]-t['x'])<3 and t['y']-20<s['bbox'][1]<t['lastY']+55],key=lambda s:s['bbox'][1])
   context=' '.join(s['text'].strip() for s in details)
   brands=[s['text'].strip() for s in details if s['bbox'][1]<t['y']-2 and re.search(r'[A-ZÅÄÖ]',s['text'])]
   name=' '.join(brands+[t['name']])
   normal=re.search(r'Norm\.\s*(\d+[,.]\d{2}(?:[–-]\d+[,.]\d{2})?)(?:/(kpl|pkt|kg))?',context)
   unit=re.search(r'\((\d+[,.]\d{2}(?:[–-]\d+[,.]\d{2})?)/(kg|l)\)',context)
   size=re.search(r'(\d+(?:[,.]\d+)?(?:[–-]\d+(?:[,.]\d+)?)?\s*(?:g|kg|ml|l))\b',t['name'])
   quantity=[s for s in spans if 'Digital' in s['font'] and re.fullmatch(r'\d+\s+(kpl|pkt|ps|rs)',s['text'].strip(),re.I) and abs(s['bbox'][0]-wx)<whole['size'] and wy-25<s['bbox'][1]<wy+12]
   if len(quantity)>1:raise ValueError('Ambiguous multi-buy quantity')
   q=re.fullmatch(r'(\d+)\s+(\w+)',quantity[0]['text'].strip()) if quantity else None
   kilo=any(s['text'].strip().lower()=='kilo' and 'Digital' in s['font'] and abs(s['bbox'][0]-wx)<whole['size'] and wy<s['bbox'][1]<wy+whole['size'] for s in spans)
   restrictions=[s['text'].strip() for s in spans if s['text'].strip().startswith('Enintään') and t['x']<=s['bbox'][0]<t['x']+.25*p['width'] and wy+whole['size']*.6<s['bbox'][1]<wy+whole['size']+15]
   offer_price=int(whole['text'])+int(cents[0]['text'])/100
   offers.append({'id':f'eurospar:{issue[1]}:{page_number}:{ti+1}','name':name.lower(),'category':category(name),'offerPrice':offer_price,'priceBasis':'multi-buy-total' if q else 'per-kg' if kilo else 'single-unit','multiUnit':{'quantity':int(q[1]),'unit':q[2]} if q else None,'normalPrice':normal[1] if normal else None,'normalUnit':normal[2] if normal else None,'unitPrice':unit[1] if unit else None,'unitPriceUnit':unit[2] if unit else None,'size':size[1] if size else None,'packCount':None,'discountPercent':None,'restriction':' '.join(restrictions) or None,'isWeightedProduct':kilo,'offerUnit':'kg' if kilo else None,'eans':[],'identityStatus':'leaflet-only','identityReason':'Publisher PDF; EAN not inferred','chain':'EUROSPAR','storeType':'EUROSPAR','source':'EUROSPAR tarjouslehti','issue':issue[1],'validFrom':validity['from'],'validTo':validity['to'],'stores':stores,'page':page_number,'sourceEvidence':{'pdfSha256':digest,'heading':[t['x'],t['y']],'price':list(whole['bbox'])}})
  if len(used)!=len(titles):raise ValueError(f'Incomplete PDF coverage: {len(used)}/{len(titles)} product headings')
 if not offers:raise ValueError('No publisher offers')
 return {'issue':issue[1],'validity':validity,'stores':stores,'offers':offers}

if __name__=='__main__':print(json.dumps(parse(sys.argv[1]),ensure_ascii=False))
