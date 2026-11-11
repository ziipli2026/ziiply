"""Extract publisher image objects. Never infer an EAN or import image-source prices."""
import argparse,base64,hashlib,html,io,json,math,re,subprocess
from difflib import SequenceMatcher
from pathlib import Path
import fitz
from PIL import Image

def normalized(text):
 import unicodedata
 return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFKD',str(text)).encode('ascii','ignore').decode().lower()).strip()

STOP=set('plussa korttia ilman kpl tuotteet suomi tarjous voimassa erikois hinta kaikki alkaen prosenttia pakaste original natural sk20 light'.split())
def words(text):
 # PDF font extraction can insert a stray digit inside a product name
 # (e.g. M4EETVURSTIT). Retain the original token as well as a cautious
 # letter-only variant for OCR comparison; do not alter displayed titles.
 tokens=normalized(text).split()
 variants=set(tokens)
 for token in tokens:
  if re.search(r'[a-z][0-9][a-z]',token):
   letters=re.sub(r'[0-9]','',token)
   if len(letters)>=6:variants.add(letters)
 return {w for w in variants if len(w)>=4 and not w.isdigit() and w not in STOP}

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

def outlined_offer_panels(page, rows):
 """Find narrow, explicitly drawn panels with exactly one offer anchor."""
 if any(not row.get('anchor') for row in rows):return []
 anchors=[(row['id'],fitz.Point(
     (row['anchor']['left']+row['anchor']['width']/2)*page.rect.width,
     (row['anchor']['top']+row['anchor']['height']/2)*page.rect.height))
     for row in rows]
 panels=[]
 for drawing in page.get_drawings():
  if drawing['type'] not in ('s','fs'):continue
  for item in drawing['items']:
   if item[0]!='re':continue
   box=item[1]
   if not (.10<=box.width/page.rect.width<=.55 and .10<=box.height/page.rect.height<=.55):continue
   owners=[row_id for row_id,point in anchors if box.contains(point)]
   if len(owners)==1:panels.append((owners[0],box))
 return panels

def recover_pdf_text_anchor(page,row,rows):
 """Recover a missing offer anchor only from a unique PDF text occurrence.

 Never infer coordinates from another offer or a nearby image.
 """
 tokens=[w for w in re.findall(r'[A-Za-zÅÄÖåäö]{5,}',row['title']) if w.lower() not in STOP]
 other=' '.join(r['title'] for r in rows if r['id']!=row['id']).lower()
 for token in tokens:
  if token.lower() in other:continue
  hits=page.search_for(token)
  if len(hits)!=1:continue
  hit=hits[0]
  return {'left':hit.x0/page.rect.width,'top':hit.y0/page.rect.height,
          'width':hit.width/page.rect.width,'height':hit.height/page.rect.height}
 return None

def build(folder,manifest_path,public_folder,review_path):
 folder=Path(folder);meta=json.loads((folder/'leaflet.json').read_text());pdf=(folder/'leaflet.pdf').read_bytes();digest=hashlib.sha256(pdf).hexdigest();doc=fitz.open(stream=pdf,filetype='pdf')
 if len(doc)!=meta['pageCount']:raise ValueError('PDF page count differs from the parsed publication')
 reviews=json.loads(Path(review_path).read_text()) if Path(review_path).exists() else {}
 reviewed=reviews.get(digest,{});mapping={};report=[];cells=[]
 for number in range(len(doc)):
  page=doc[number];rows=[r.copy() for r in meta['rows'] if r['page']==number+1];blocks=pictures(page);accepted={r['id']:[] for r in rows}
  for row in rows:
   if not row.get('anchor'):
    anchor=recover_pdf_text_anchor(page,row,rows)
    if anchor:
     row['anchor']=anchor
     print(f'Citymarket PDF page {number+1}: recovered unique text anchor for {row["title"]}')
  if not rows:continue
  # Independent package-label text proof must accompany spatial ownership.
  # A distinctive word must occur in only one offer context on this page.
  context={r['id']:words(r.get('normalizedTitle',r['title'])+' '+' '.join(r['nearby'])) for r in rows}
  cells_by_id={r['id']:enclosed_cell(page,r,rows) for r in rows}
  freq={w:sum(w in v for v in context.values()) for v in context.values() for w in v}
  title_context={r['id']:words(r.get('normalizedTitle',r['title'])) for r in rows}
  title_freq={w:sum(w in v for v in title_context.values()) for v in title_context.values() for w in v}
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
    proof={word for word in context[r['id']] if freq[word]==1 and any(t==word or len(t)>=6 and len(word)>=6 and (t[:6]==word[:6] or (len(t)>=8 and len(word)>=8 and SequenceMatcher(None,t,word).ratio()>=.84)) for t in text)}
    if not proof:continue
    dx=(x0+x1)/2/page.rect.width-(a['left']+a['width']/2);dy=(y0+y1)/2/page.rect.height-a['top']
    distance=math.hypot(dx*1.4,dy*1.3)
    if distance<.6:options.append((distance,r['id'],sorted(proof)))
   options.sort()
   if len(options)==1 or len(options)>1 and options[1][0]-options[0][0]>.08:
    accepted[options[0][1]].append(b)
  # Geometry must not silently rescue an image from a different bordered
  # publisher cell. Keep cell ownership as an exclusion, not just a positive
  # assignment rule.
  image_cell_owners={}
  for b in blocks:
   x0,y0,x1,y1=b['bbox'];ix=(x0+x1)/(2*page.rect.width);iy=(y0+y1)/(2*page.rect.height)
   owners=[r['id'] for r in rows if cells_by_id[r['id']] and
           cells_by_id[r['id']][0]<ix<cells_by_id[r['id']][2] and
           cells_by_id[r['id']][1]<=iy<=cells_by_id[r['id']][3]]
   image_cell_owners[tuple(round(v,3) for v in b['bbox'])]=set(owners)
  # Rescue a package image only when geometry independently agrees in both
  # directions: this offer's closest unowned image is also that image's
  # closest offer, with a strong distance margin and no intervening border.
  # Never guess when multiple images or offers are similarly close.
  owned_boxes={tuple(round(v,3) for v in b['bbox']) for group in accepted.values() for b in group}
  unmatched=[r for r in rows if not accepted[r['id']] and r.get('anchor')]
  eligible=[]
  for b in blocks:
   x0,y0,x1,y1=b['bbox'];w=(x1-x0)/page.rect.width;h=(y1-y0)/page.rect.height
   if w<.05 or h<.05 or w*h<.005 or w*h>.25 or y0<0 or y1>page.rect.height*.95:continue
   key=tuple(round(v,3) for v in b['bbox'])
   if key in owned_boxes or image_cell_owners[key]:continue
   eligible.append(b)
  # An explicitly outlined panel provides ownership even when the package
  # has no readable OCR. Require full containment and an unambiguous pair.
  panels=outlined_offer_panels(page,rows) if unmatched else []
  panel_candidates={row['id']:[] for row in unmatched}
  for block in eligible:
   box=fitz.Rect(block['bbox'])
   panel_owners={owner for owner,panel in panels if panel.contains(box)}
   if len(panel_owners)!=1:continue
   owner=next(iter(panel_owners))
   if owner in panel_candidates:panel_candidates[owner].append(block)
  for row in unmatched:
   candidates=panel_candidates[row['id']]
   if len(candidates)!=1 or blocked(page,row['anchor'],candidates[0]['bbox']):continue
   block=candidates[0]
   accepted[row['id']].append(block)
   eligible.remove(block)
   print(f'Citymarket page {number+1}: enclosed PDF panel image match for {row["title"]}')
  unmatched=[row for row in unmatched if not accepted[row['id']]]
  def proximity(row,block):
   a=row['anchor'];x0,y0,x1,y1=block['bbox']
   return math.hypot(((x0+x1)/(2*page.rect.width)-(a['left']+a['width']/2))*1.4,
                     ((y0+y1)/(2*page.rect.height)-a['top'])*1.3)
  for row in unmatched:
   choices=sorted(((proximity(row,b),b) for b in eligible if not blocked(page,row['anchor'],b['bbox'])),key=lambda item:item[0])
   if not choices:continue
   # A long unique package word may be recognized despite OCR noise and
   # publisher graphics placing the package farther from the offer title.
   # Do not accept fuzzy text alone: require a single matching offer, a
   # substantial distance margin and no intervening publisher border.
   if choices[0][0]>.12:
    # Evaluate all plausible packages, not only the nearest one: the
    # publisher may place the right image behind an unrelated nearer image.
    # Nearby PDF text often repeats a product name in adjacent offers.
    # Prefer distinctive title words; keep the full-page uniqueness check.
    unique_words={word for word in title_context[row['id']] if title_freq[word]==1 and len(word)>=8}
    supported=[]
    for distance,block in choices:
     if distance>.35:break
     label=ocr(block)
     proof={word for word in unique_words if any(len(t)>=8 and SequenceMatcher(None,t,word).ratio()>=.84 for t in label)}
     if not proof:continue
     competing=[other for other in unmatched if other['id']!=row['id'] and
                any(len(t)>=8 and SequenceMatcher(None,t,word).ratio()>=.84
                    for word in title_context[other['id']] if len(word)>=8 for t in label)]
     if competing:continue
     supported.append((distance,block,proof))
    if len(supported)!=1:
     if supported:print(f'Citymarket page {number+1}: ambiguous distant OCR candidates for {row["title"]}: {[(round(d,3),sorted(proof)) for d,_,proof in supported]}')
     elif unique_words:print(f'Citymarket page {number+1}: no unique distant package OCR proof for {row["title"]}; title words {sorted(unique_words)}')
     else:print(f'Citymarket page {number+1}: no unique long title token for {row["title"]}; title words {sorted(title_context[row["id"]])}')
     continue
    distance,b,proof=supported[0]
    competitors=sorted(proximity(other,b) for other in unmatched if other['id']!=row['id'] and not blocked(page,other['anchor'],b['bbox']))
    if competitors and competitors[0]-distance<.10:
     print(f'Citymarket page {number+1}: distant OCR candidate rejected by reciprocal distance for {row["title"]}: own {distance:.3f}, competing {competitors[0]:.3f}, proof {sorted(proof)}')
     continue
    accepted[row['id']].append(b)
    eligible.remove(b)
    print(f'Citymarket page {number+1}: unique distant package OCR match for {row["title"]}: {sorted(proof)}')
    continue
   if len(choices)>1 and choices[1][0]-choices[0][0]<.10:continue
   distance,b=choices[0]
   competitors=sorted(proximity(other,b) for other in unmatched if other['id']!=row['id'] and not blocked(page,other['anchor'],b['bbox']))
   if competitors and competitors[0]-distance<.10:continue
   accepted[row['id']].append(b)
   eligible.remove(b)
   print(f'Citymarket page {number+1}: unique reciprocal spatial image match for {row["title"]}')
  # An image object must not be assigned to two different offers.
  # Ambiguous ownership is sent to review rather than silently duplicating
  # a product picture in the published leaflet.
  owners={}
  for row_id,owned in accepted.items():
   for block in owned:
    key=tuple(round(v,3) for v in block['bbox'])
    owners.setdefault(key,set()).add(row_id)
  ambiguous={key for key,ids in owners.items() if len(ids)>1}
  if ambiguous:
   for row_id,owned in accepted.items():
    accepted[row_id]=[block for block in owned if tuple(round(v,3) for v in block['bbox']) not in ambiguous]
   print(f'::warning::Citymarket page {number+1}: {len(ambiguous)} ambiguous shared image objects require ownership review')
  # Audit every unresolved offer in one batch, not only WC-paper examples.
  # Candidate rectangles are evidence, never automatically approved matches.
  unresolved=[]
  for row in rows:
   if accepted[row['id']] or row['id'] in reviewed:continue
   unresolved.append(row)
   anchor=row.get('anchor')
   candidates=[]
   for block in blocks:
    x0,y0,x1,y1=block['bbox']
    cx=(x0+x1)/(2*page.rect.width);cy=(y0+y1)/(2*page.rect.height)
    distance=(math.hypot((cx-(anchor['left']+anchor['width']/2))*1.4,
                         (cy-anchor['top'])*1.3) if anchor else None)
    candidates.append({'rectangle':list(block['bbox']),'distance':round(distance,4) if distance is not None else None,
                       'blocked':blocked(page,anchor,block['bbox']) if anchor else None,
                       'widthRatio':round((x1-x0)/page.rect.width,4),
                       'heightRatio':round((y1-y0)/page.rect.height,4),
                       'areaRatio':round((x1-x0)*(y1-y0)/(page.rect.width*page.rect.height),5),
                       'rejectedBySize':((x1-x0)/page.rect.width<.05 or (y1-y0)/page.rect.height<.05 or (x1-x0)*(y1-y0)/(page.rect.width*page.rect.height)<.005 or (x1-x0)*(y1-y0)/(page.rect.width*page.rect.height)>.25)})
   candidates.sort(key=lambda c:c['distance'] if c['distance'] is not None else 999)
   # Distinguish no nearby PDF image objects from unproven ownership.
   # These are diagnostics, never automatic approval of a candidate.
   nearby=[c for c in candidates if c['distance'] is not None and c['distance']<.35
           and not c['blocked'] and
           (c['rectangle'][2]-c['rectangle'][0])/page.rect.width>=.05 and
           (c['rectangle'][3]-c['rectangle'][1])/page.rect.height>=.05]
   status='no-nearby-eligible-pdf-image' if not nearby else 'nearby-pdf-image-ownership-unverified'
   # Explain the rejection decision without approving any unverified image.
   # A nearby PDF object already assigned to another offer is not available
   # for rescue; report that separately from a genuinely missing image.
   assigned_boxes={tuple(round(v,3) for v in b['bbox']) for owner,group in accepted.items() if owner!=row['id'] for b in group}
   for candidate in candidates:
    candidate['assignedToOtherOffer']=tuple(round(v,3) for v in candidate['rectangle']) in assigned_boxes
   eligible_candidates=[c for c in candidates if not c['rejectedBySize'] and not c['blocked'] and not c['assignedToOtherOffer']]
   closest=eligible_candidates[0] if eligible_candidates else None
   # Record exact distance evidence for the next geometric matching pass.
   nearest_distance=round(closest['distance'],4) if closest and closest['distance'] is not None else None
   next_distance=round(eligible_candidates[1]['distance'],4) if len(eligible_candidates)>1 and eligible_candidates[1]['distance'] is not None else None
   nearest_gap=round(next_distance-nearest_distance,4) if nearest_distance is not None and next_distance is not None else None
   if not candidates:reason='no-pdf-image-objects'
   elif not eligible_candidates:
    reason='nearest-images-already-owned' if any(c['assignedToOtherOffer'] and not c['rejectedBySize'] and not c['blocked'] for c in candidates) else 'all-candidates-rejected-by-size-or-border'
   elif closest['distance'] is None:reason='missing-offer-anchor'
   elif closest['distance']>.12:reason='closest-image-too-far-for-spatial-proof'
   elif len(eligible_candidates)>1 and eligible_candidates[1]['distance']-closest['distance']<.10:
    reason='multiple-images-too-close-to-distinguish'
   else:reason='package-text-or-reciprocal-ownership-not-proven'
   # PDF images may be displaced from publisher text anchors. Record the
   # closest image's label evidence so large-distance cases can be separated
   # from completely unrelated page graphics without relaxing publication.
   # Include publisher-package words for diagnostics, never as sole approval.
   # Full token comparison helps find OCR variants like 'tvurst' vs
   # 'meetvurstit' without claiming they prove product identity.
   title_words=sorted(words(row.get('normalizedTitle',row['title'])))
   # Record near-misses separately: fuzzy OCR scores are evidence for
   # debugging, never sufficient on their own to publish a picture.
   title_ocr_near_misses=[]
   closest_candidate=closest if closest else (candidates[0] if candidates else None)
   # Audit the five closest *eligible* images, not only the nearest object.
   # Record image dimensions so that the next repair can distinguish a
   # single large publisher photo from fragmented PDF image objects.
   # A correct package can be farther away than an unrelated product photo.
   candidate_ocr_evidence=[]
   for candidate in eligible_candidates[:5]:
    match=next((b for b in blocks if all(abs(a-c)<.015 for a,c in zip(b['bbox'],candidate['rectangle']))),None)
    if not match:continue
    try:label=sorted(ocr(match))[:24]
    except (subprocess.SubprocessError,OSError,ValueError) as exc:
     print(f'::warning::Citymarket PDF page {number+1}: candidate OCR unavailable: {exc}')
     label=[]
    fuzzy_matches=sorted(({'offerWord':word,'packageWord':token,'similarity':round(SequenceMatcher(None,word,token).ratio(),3)}
                          for word in title_words for token in label
                          if len(word)>=7 and len(token)>=6 and SequenceMatcher(None,word,token).ratio()>=.65),
                         key=lambda match:-match['similarity'])[:5]
    candidate_ocr_evidence.append({'rectangle':candidate['rectangle'],'distance':candidate['distance'],
                                   'words':label,'matchingWords':sorted(set(label)&context[row['id']]),
                                   'fuzzyMatches':fuzzy_matches,'pixelSize':[match.get('width'),match.get('height')],'blockedByBorder':bool(row.get('anchor') and blocked(page,row['anchor'],match['bbox'])),'publisherCellOwners':sorted(image_cell_owners.get(tuple(round(v,3) for v in match['bbox']),set())),'alreadyOwnedBy':sorted([owner for owner,owned in accepted.items() if match in owned])})
   closest_label_words=[]
   if closest_candidate:
    matched_block=next((b for b in blocks if all(abs(a-c)<.015 for a,c in zip(b['bbox'],closest_candidate['rectangle']))),None)
    if matched_block:
     try:closest_label_words=sorted(ocr(matched_block))[:24]
     except (subprocess.SubprocessError,OSError,ValueError) as exc:
      print(f'::warning::Citymarket PDF page {number+1}: candidate OCR unavailable: {exc}')
   report.append({'id':row['id'],'title':row['title'],'page':row['page'],
                  'candidateImageRectangles':candidates[:15],
                  'nearbyImageObjects':len(nearby),'status':status,'diagnosticReason':reason,
                  'nearestEligibleDistance':nearest_distance,'secondEligibleDistance':next_distance,'nearestDistanceGap':nearest_gap,
                  'titleWords':title_words,'closestCandidateOCRWords':closest_label_words,'candidateOCREvidence':candidate_ocr_evidence,'anchor':anchor})
  if unresolved:
   # Independent fallback: render the actual PDF page around each unresolved
   # offer. Unlike embedded-image extraction this also captures vector art,
   # masks and images split into multiple PDF objects. These previews are
   # evidence for a second OCR/layout pass, NEVER automatically published as
   # a product image without independent ownership verification.
   for item in unresolved:
    anchor=item.get('anchor')
    if not anchor:continue
    center_x=(anchor['left']+anchor['width']/2)*page.rect.width
    center_y=(anchor['top']+anchor['height']/2)*page.rect.height
    half_w=min(page.rect.width*.19,155)
    half_h=min(page.rect.height*.16,145)
    clip=fitz.Rect(max(0,center_x-half_w),max(0,center_y-half_h),
                   min(page.rect.width,center_x+half_w),min(page.rect.height,center_y+half_h))
    if clip.is_empty:continue
    preview=page.get_pixmap(matrix=fitz.Matrix(2,2),clip=clip,alpha=False)
    fragment=hashlib.sha256(item['id'].encode()).hexdigest()[:12]
    filename=f'fallback-render-page-{number+1}-{fragment}.png'
    preview.save(str(folder/filename))
    item['fallbackRenderedPreview']=filename
    item['fallbackRenderedClip']=[round(v,2) for v in clip]
    # The audit report is a separate dictionary from the unresolved row.
    # Attach the preview metadata to its matching diagnostic entry, otherwise
    # the rendered fallback cannot be discovered by automated reviewers.
    diagnostic=next((entry for entry in report if entry.get('id')==item['id']
                     and entry.get('diagnosticReason')),None)
    if diagnostic is not None:
     diagnostic['fallbackRenderedPreview']=filename
     diagnostic['fallbackRenderedClip']=item['fallbackRenderedClip']
     diagnostic['fallbackStatus']='review-required-not-published'
   for item in unresolved:
    print('::warning::Unresolved Citymarket image page '+str(number+1)+': '+item['title']+' ['+item['id']+']')
   print(f'::warning::Citymarket PDF page {number+1}: {len(unresolved)} unresolved images of {len(rows)} offers')
   sheet=page.get_pixmap(matrix=fitz.Matrix(1.4,1.4),alpha=False)
   sheet.save(str(folder/f'unresolved-review-page-{number+1}.png'))
  final_owners={}
  for row in rows:
   selection=reviewed.get(row['id'])
   if selection:
    if selection['page']!=row['page']:raise ValueError('Reviewed selection page mismatch')
    chosen=[b for b in blocks if any(max(abs(a-c) for a,c in zip(b['bbox'],rect))<.015 for rect in selection['rectangles'])]
    if len(chosen)!=len(selection['rectangles']):raise ValueError('Reviewed image object missing: '+row['title'])
   else:chosen=accepted[row['id']]
   for block in chosen:
    key=tuple(round(v,3) for v in block['bbox'])
    prior=final_owners.get(key)
    if prior and prior!=row['id']:
     raise ValueError(f'Citymarket PDF page {number+1}: image object shared by {prior} and {row["id"]}; refuse ambiguous publication')
    final_owners[key]=row['id']
   report.append({'id':row['id'],'title':row['title'],'page':row['page'],'images':len(chosen),'rectangles':[list(b['bbox']) for b in chosen],'method':'reviewed-pdf-digest' if selection else 'publisher-cell-or-package-text' if chosen else 'unresolved'})
   if not chosen:continue
   data=composite(chosen);fragment=hashlib.sha256(row['id'].encode()).hexdigest()[:20];y=len(cells)*300
   cells.append(f'<view id="{fragment}" viewBox="0 {y} 300 300"/><image x="0" y="{y}" width="300" height="300" preserveAspectRatio="xMidYMid meet" href="data:image/jpeg;base64,{base64.b64encode(data).decode()}"/>')
   mapping[row['id']]=f'/citymarket-leaflets/{digest}/images.svg#{fragment}'
 (folder/'image-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 if not cells:raise ValueError(f'No verified image matches; {len(meta["rows"])} offers unresolved. See image-report.json and unresolved-review-page-*.png')
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
