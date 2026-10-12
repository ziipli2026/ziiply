import copy,importlib.util,json,random
from pathlib import Path
spec=importlib.util.spec_from_file_location('parser',Path(__file__).with_name('eurospar-pdf-parser.py'))
parser=importlib.util.module_from_spec(spec);spec.loader.exec_module(parser)
fixture=json.loads(Path('data/eurospar/42-2026-pdf-spans.json').read_text())

def run(pages):return parser.parse_pages(pages,fixture['pdfSha256'])
result=run(fixture['pages'])
assert result['issue']=='42/26'
assert result['validity']=={'from':'2026-10-12','to':'2026-10-14'}
assert len(result['stores'])==6 and 'Järvenpää' in result['stores']
expected={
 'kirjolohifileepala':(5.99,None,'Kala'),
 'proteiinivanukkaat':(5,4,'Maitotuotteet'),
 'tomaatti':(3.99,None,'Hevi'),
 'jauheliha':(5.99,None,'Liha & makkarat'),
 'siivet':(2.99,None,'Liha & makkarat'),
 'omena':(2.99,None,'Hevi'),
 'kiivi':(2.89,None,'Hevi'),
 'juustoviipaleet':(4,2,'Maitotuotteet'),
 'paahtoleivät':(1.69,None,'Leipomo'),
 'uunilenkki':(3,2,'Liha & makkarat'),
 'mikroateriat':(1.99,None,'Valmisruoka'),
 'jäätelöt':(1,None,'Pakasteet'),
 'marjapiirakka':(3.5,2,'Leipomo'),
 'pasteija':(2,3,'Leipomo'),
 'hillomunkki':(3,6,'Leipomo'),
}
assert len(result['offers'])==len(expected)==15
for token,(price,quantity,category) in expected.items():
 matches=[r for r in result['offers'] if token in r['name']]
 assert len(matches)==1,token
 row=matches[0]
 assert (row['offerPrice'],(row['multiUnit'] or {}).get('quantity'),row['category'])==(price,quantity,category),row
 assert row['eans']==[]
 assert row['sourceEvidence']['pdfSha256']==fixture['pdfSha256']

assert all(r['priceBasis']=='per-kg' and r['isWeightedProduct'] for r in result['offers'] if r['name'] in ('omena','tomaatti'))
assert next(r for r in result['offers'] if 'kirjolohifileepala' in r['name'])['restriction']=='Enintään 3 kpl/talous'

# Publisher reading order may change while visual geometry remains identical.
shuffled=copy.deepcopy(fixture['pages']);random.Random(42).shuffle(shuffled[0]['spans'])
assert sorted(run(shuffled)['offers'],key=lambda r:r['id'])==sorted(result['offers'],key=lambda r:r['id'])

# Losing a cents span must reject the publication rather than invent a price.
broken=copy.deepcopy(fixture['pages'])
broken[0]['spans']=[s for s in broken[0]['spans'] if not (s['text']=='69' and 'Digital' in s['font'])]
try:run(broken)
except ValueError:pass
else:raise AssertionError('Missing price cents accepted')
print('PASS EUROSPAR 42/26: 15 source prices, multi-buys, categories, dates, spatial reorder and fail-closed cents')
