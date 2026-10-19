from pathlib import Path
import json
p=Path('tmp/pdfs/rapid-guide.json');pages=json.loads(p.read_text())
def diagram(name):return {'kind':'diagram','name':name}
def swap_table(n,header,name):
 blocks=pages[n-1]['blocks']
 for i,b in enumerate(blocks):
  if b['kind']=='table' and b['headers'][0]==header:blocks[i]=diagram(name);return
 raise ValueError((n,header))
# Keep the guide order so the existing timed study route still applies.
pages[0]['subtitle']='Applied Analytics in Business | COS10082 | Visual edition'
pages[0]['blocks'][0]['text']='Use these diagrams with your 120-question practice set. Trace each flow or example, cover it, and explain it aloud. Source references mean pages 1-208 in the original revision PDF viewer. Diagram examples illustrate the cited rules.'
swap_table(2,'Term','data')
swap_table(3,'Driver','drivers')
swap_table(4,'Capability','capabilities')
# The first capability table is replaced; its customization rules are now inside the graphic.
blocks=pages[3]['blocks']
blocks[:]=[b for b in blocks if not (b['kind']=='table' and b['headers'][0]=='Capability')]
for b in blocks:
 if b['kind']=='p' and b['text'].startswith('Stored purchase history'):
  b['text']='The visual separates four functions: preserving content, combining it, analysing it, and delivering the result. Integration supplies the content used by insight creation. A dashboard does not automatically discover new patterns.'
swap_table(5,'Development step','development')
swap_table(6,'Vendor category','vendors')
for b in pages[5]['blocks']:
 if b['kind']=='p' and b['text'].startswith('ATE criteria:'):
  b['text']='ATE asks whether the vendor can deliver: product/service, viability, execution, responsiveness, customer experience and operations. COV concerns direction: market understanding, strategies, business model and innovation.'
# Preserve vendor examples while reducing their length.
for b in pages[5]['blocks']:
 if b['kind']=='p' and b['text'].startswith('Vendor examples'):
  b['text']='Historical examples in the notes: mega-vendors - Oracle, SAP, IBM, Microsoft. Independent vendors listed include Tableau, SAS, MicroStrategy, TIBCO and Qlik.'
swap_table(7,'Management aspect','management')
swap_table(8,'Data-quality dimension','quality')
blocks=pages[7]['blocks']
for i,b in enumerate(blocks):
 if b['kind']=='table' and b['headers'][0]=='Component':
  blocks[i]={'kind':'p','text':'Governance has four parts: guiding principles (vision/goals); decision-making bodies (people/groups); decision areas and rights (what is decided and who may decide); oversight mechanisms (formal policies/procedures and progress evaluation).'}
swap_table(9,'Strategy area','strategy')
blocks=pages[9]['blocks']
for i,b in enumerate(blocks):
 if b['kind']=='bullets':blocks[i]=diagram('powerquery')
for i,b in enumerate(blocks):
 if b['kind']=='table' and b['headers'][0]=='Operation':
  b['rows']=[r for r in b['rows'] if r[0] in ['Remove Other Columns','Replace Values','Applied Steps','Expand','Group By','Merge']]
swap_table(11,'Chart','charts')
blocks=pages[10]['blocks']
for i,b in enumerate(blocks):
 if b['kind']=='table' and b['headers'][0]=='Workspace feature':
  blocks[i]={'kind':'p','text':'Workspace cues: Start page = Connect / Open / Discover. Sheets = worksheets / dashboards / stories. Rows and Columns construct the view; Swap exchanges them. Marks controls type/color. Filters restrict shown data; Show Me suggests charts; the status bar shows view details.'}
for i,b in enumerate(blocks):
 if b['kind']=='source' and b['text']=='Source: PDF pp. 167-177.':
  b['text']='Source: PDF pp. 167-177. Chart shapes and bullet values are illustrative examples, not measurements from the notes.'
swap_table(12,'Join type','joins')
blocks=pages[11]['blocks']
# Input and output IDs are now labeled in the diagram.
blocks[:]=[b for b in blocks if not (b['kind']=='p' and b['text'].startswith('Original examples:'))]
for b in blocks:
 if b['kind']=='table' and b['headers'][0]=='Preparation / connection':
  b['rows']=[r for r in b['rows'] if r[0] in ['Live','Extract','Metadata','Data Interpreter','Pivot']]
blocks.insert(-2,{'kind':'p','text':'Split separates strings using a delimiter or pattern. A data-source filter reduces included data. Union appends compatible rows: 12 + 18 + 20 = 50 when nothing is filtered or deduplicated.'})
Path('tmp/pdfs/visual-guide.json').write_text(json.dumps(pages,indent=2))
s=Path('tmp/pdfs/build_rapid_guide.py').read_text()
s=s.replace("from pathlib import Path", "from pathlib import Path\nfrom visual_diagrams import DIAGRAMS")
s=s.replace("rapid-guide.json", "visual-guide.json")
s=s.replace("if kind=='table':", "if kind=='diagram':\n   story.extend([DIAGRAMS[block['name']](),Spacer(1,7)])\n   md.extend(['[Visual diagram: '+block['name']+']',''])\n  elif kind=='table':")
s=s.replace('applied-analytics-rapid-revision.pdf','applied-analytics-visual-revision.pdf')
s=s.replace('applied-analytics-rapid-revision.md','applied-analytics-visual-revision.md')
s=s.replace('3-4 Hour Rapid Revision Guide','3-4 Hour Visual Revision Guide')
s=s.replace('RAPID REVISION','VISUAL REVISION')
Path('tmp/pdfs/build_visual_guide.py').write_text(s)
