"""Extract publisher image objects. Never infer an EAN or import image-source prices."""
import argparse,base64,hashlib,html,io,json,math,re,subprocess
from pathlib import Path
import fitz
from PIL import Image

def normalized(text):
 import unicodedata
 return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFKD',str(text)).encode('ascii','ignore').decode().lower()).strip()

STOP=set('plussa korttia ilman kpl tuotteet suomi tarjous voimassa erikois hinta kaikki alkaen prosenttia pakaste original natural sk20 light'.split())
def words(text):
 return {w for w in normalized(text).split() if len(w)>=4 and not w.isdigit() and w not in STOP}

def pictures(page):
 blocks=[b for b in page.get_text('dict',clip=fitz.INFINITE_RECT())['blocks'] if b['type']==1]
 seen=set();out=[]
 for b in blocks:
  key=tuple(round(v,3) for v in b['bbox'])
  if key in seen:continue
  seen.add(key);out.append(b)
 return out

def image_of(block):
 picture=Image.open(io.BytesIO(block['image'])).convert('RGBA')
 if block.get('mask'):
  mask=Image.open(io.BytesIO(block['mask'])).convert('L')
  if mask.size==picture.size:picture.putalpha(mask)
 return picture

def composite(blocks):
 bounds=[min(b['bbox'][0] for b in blocks),min(b['bbox'][1] for b in blocks),max(b['bbox'][2] for b in blocks),max(b['bbox'][3] for b in blocks)]
 scale=min(2,500/max(bounds[2]-bounds[0],bounds[3]-bounds[1]))
 canvas=Image.new('RGBA',(max(1,round((bounds[2]-bounds[0])*scale)),max(1,round((bounds[3]-bounds[1])*scale))),'white')
 for block in blocks:
  x0,y0,x1,y1=block['bbox'];picture=image_of(block).resize((max(1,round((x1-x0)*scale)),max(1,round((y1-y0)*scale))))
  canvas.alpha_composite(picture,(round((x0-bounds[0])*scale),round((y0-bounds[1])*scale)))
 canvas.thumbnail((300,300));data=io.BytesIO();canvas.convert('RGB').save(data,'JPEG',quality=86,optimize=True)
 return data.getvalue()

def ocr(block):
 picture=image_of(block);background=Image.new('RGB',picture.size,'white');background.paste(picture,mask=picture.getchannel('A'))
 factor=max(1,min(4,900/max(background.size)));background=background.resize((round(background.width*factor),round(background.height*factor)))
 buf=io.BytesIO();background.save(buf,'PNG')
 result=subprocess.run(['tesseract','stdin','stdout','--psm','11'],input=buf.getvalue(),capture_output=True,timeout=20,check=True)
 return words(result.stdout.decode())

def blocked(page,anchor,box):
 ax=(anchor['left']+anchor['width']/2)*page.rect.width;ay=anchor['top']*page.rect.height
 ix=(box[0]+box[2])/2;iy=(box[1]+box[3])/2
 for d in page.get_drawings():
  line=d['rect']
  if d['type']!='s' or d['width']>=2 or d['dashes']=='[] 0' or line.width+line.height<90:continue
  if line.width<2 and (ax-line.x0)*(ix-line.x0)<0:
   cy=ay+(iy-ay)*(line.x0-ax)/(ix-ax)
   if line.y0-6<=cy<=line.y1+6:return True
  if line.height<2 and (ay-line.y0)*(iy-line.y0)<0:
   cx=ax+(ix-ax)*(line.y0-ay)/(iy-ay)
   if line.x0-6<=cx<=line.x1+6:return True
 return False

def enclosed_cell(page,row,rows):
 a=row.get('anchor')
 if not a:return None
 x=a['left']+a['width']/2;y=a['top'];vertical=[]
 for d in page.get_drawings():
  line=d['rect']
  if d['type']=='s' and d['width']<2 and d['dashes']!='[] 0' and line.width<2 and line.height>90 and line.y0/page.rect.height<=y<=line.y1/page.rect.height:
   vertical.append((line.x0/page.rect.width,line.y0/page.rect.height,line.y1/page.rect.height))
 left=max((v for v in vertical if v[0]<x),default=None);right=min((v for v in vertical if v[0]>x),default=None)
 edges=[v for v in (left,right) if v]
 if not edges:return None
 box=(left[0] if left else 0,max(v[1] for v in edges),right[0] if right else 1,min(v[2] for v in edges))
 # Wide regions may include an unparsed durable-goods panel. A grid cell must
 # have one offer only and have a sufficiently narrow publisher border.
 if box[2]-box[0]>.55:return None
 inside=[r for r in rows if r.get('anchor') and box[0]<r['anchor']['left']+r['anchor']['width']/2<box[2] and box[1]<=r['anchor']['top']<=box[3]]
 return box if len(inside)==1 else None

def build(folder,manifest_path,public_folder,review_path):
 folder=Path(folder);meta=json.loads((folder/'leaflet.json').read_text());pdf=(folder/'leaflet.pdf').read_bytes();digest=hashlib.sha256(pdf).hexdigest();doc=fitz.open(stream=pdf,filetype='pdf')
 if len(doc)!=meta['pageCount']:raise ValueError('PDF page count differs from the parsed publication')
 reviews=json.loads(Path(review_path).read_text()) if Path(review_path).exists() else {}
 reviewed=reviews.get(digest,{});mapping={};report=[];cells=[]
 for number in range(len(doc)):
  page=doc[number];rows=[r for r in meta['rows'] if r['page']==number+1];blocks=pictures(page);accepted={r['id']:[] for r in rows}
  if not rows:continue
  if not reviewed:
   # Independent package-label text proof must accompany spatial ownership.
   # A distinctive word must occur in only one offer context on this page.
   context={r['id']:words(r['title']+' '+' '.join(r['nearby'])) for r in rows}
   cells_by_id={r['id']:enclosed_cell(page,r,rows) for r in rows}
   freq={w:sum(w in v for v in context.values()) for v in context.values() for w in v}
   for b in blocks:
    x0,y0,x1,y1=b['bbox'];w=(x1-x0)/page.rect.width;h=(y1-y0)/page.rect.height
    if w<.05 or h<.05 or w*h<.005 or w*h>.25 or y0<0 or y1>page.rect.height*.95:continue
    ix=(x0+x1)/2/page.rect.width;iy=(y0+y1)/2/page.rect.height
    own_cells=[r['id'] for r in rows if cells_by_id[r['id']] and cells_by_id[r['id']][0]<ix<cells_by_id[r['id']][2] and cells_by_id[r['id']][1]<=iy<=cells_by_id[r['id']][3]]
    if len(own_cells)==1:
     accepted[own_cells[0]].append(b);continue
    text=ocr(b);options=[]
    for r in rows:
     a=r.get('anchor')
     if not a or blocked(page,a,b['bbox']):continue
     proof={word for word in context[r['id']] if freq[word]==1 and any(t==word or len(t)>=6 and len(word)>=6 and t[:6]==word[:6] for t in text)}
     if not proof:continue
     dx=(x0+x1)/2/page.rect.width-(a['left']+a['width']/2);dy=(y0+y1)/2/page.rect.height-a['top']
     distance=math.hypot(dx*1.4,dy*1.3)
     if distance<.6:options.append((distance,r['id'],sorted(proof)))
    options.sort()
    if len(options)==1 or len(options)>1 and options[1][0]-options[0][0]>.08:
     accepted[options[0][1]].append(b)
  # Keep review evidence for unmatched cards, including publisher image bounds.
  # A reviewer can then identify missing package photos without guessing
  # which neighboring product image belongs to the offer.
  for row in rows:
   if row['id'] not in accepted or accepted[row['id']]:continue
   if not re.search(r'\\bWC[ -]?PAPERI\\b',row['title'],re.I):continue
   report.append({'id':row['id'],'title':row['title'],'page':row['page'],
                  'candidateImageRectangles':[list(b['bbox']) for b in blocks],
                  'status':'manual-review-needed'})
  for row in rows:
   selection=reviewed.get(row['id'])
   if selection:
    if selection['page']!=row['page']:raise ValueError('Reviewed selection page mismatch')
    chosen=[b for b in blocks if any(max(abs(a-c) for a,c in zip(b['bbox'],rect))<.015 for rect in selection['rectangles'])]
    if len(chosen)!=len(selection['rectangles']):raise ValueError('Reviewed image object missing: '+row['title'])
   else:chosen=accepted[row['id']]
   report.append({'id':row['id'],'title':row['title'],'page':row['page'],'images':len(chosen),'rectangles':[list(b['bbox']) for b in chosen],'method':'reviewed-pdf-digest' if selection else 'publisher-cell-or-package-text' if chosen else 'unresolved'})
   if not chosen:continue
   data=composite(chosen);fragment=hashlib.sha256(row['id'].encode()).hexdigest()[:20];y=len(cells)*300
   cells.append(f'<view id="{fragment}" viewBox="0 {y} 300 300"/><image x="0" y="{y}" width="300" height="300" preserveAspectRatio="xMidYMid meet" href="data:image/jpeg;base64,{base64.b64encode(data).decode()}"/>')
   mapping[row['id']]=f'/citymarket-leaflets/{digest}/images.svg#{fragment}'
 if not cells:raise ValueError('No verified image matches; preserving the previous manifest')
 target=Path(public_folder)/digest;target.mkdir(parents=True,exist_ok=True)
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">'+''.join(cells)+'</svg>'
 (target/'images.svg').write_text(svg)
 manifest_path=Path(manifest_path);manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {'revision':1,'publications':{}}
 manifest['publications'][meta['leaflet']]={'pdfSha256':digest,'pageCount':len(doc),'offerCount':len(meta['rows']),'images':mapping}
 manifest_path.parent.mkdir(parents=True,exist_ok=True);manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 (folder/'image-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(f"Publisher images: {len(mapping)}/{len(meta['rows'])}; unresolved: {len(meta['rows'])-len(mapping)}; PDF {digest}")

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('folder');parser.add_argument('--manifest',required=True);parser.add_argument('--public',required=True);parser.add_argument('--reviewed',required=True);args=parser.parse_args()
 build(args.folder,args.manifest,args.public,args.reviewed)
