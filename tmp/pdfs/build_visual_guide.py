from pathlib import Path
from visual_diagrams import DIAGRAMS
import json,re
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor,white
from reportlab.lib.pagesizes import A4
root=Path('/Users/adamliewkangyee/WebstormProjects/ICT_Project_Safeway_Sdn_Bhd')
pages=json.loads((root/'tmp/pdfs/visual-guide.json').read_text())
navy=HexColor('#16324F'); teal=HexColor('#146C63');gray=HexColor('#475563'); pale=HexColor('#EEF5F5')
styles={
 'title':ParagraphStyle('title',fontName='Helvetica-Bold',fontSize=21,leading=25,textColor=navy,spaceAfter=5),
 'subtitle':ParagraphStyle('subtitle',fontName='Helvetica',fontSize=10,leading=14,textColor=gray,spaceAfter=14),
 'h':ParagraphStyle('h',fontName='Helvetica-Bold',fontSize=11.2,leading=15,textColor=navy,spaceBefore=6,spaceAfter=4),
 'p':ParagraphStyle('p',fontName='Helvetica',fontSize=9.8,leading=12.5,spaceAfter=6),
 'bullet':ParagraphStyle('bullet',fontName='Helvetica',fontSize=9.8,leading=12.5,leftIndent=10,firstLineIndent=-10,spaceAfter=4),
 'cell':ParagraphStyle('cell',fontName='Helvetica',fontSize=9.3,leading=11.5),
 'header':ParagraphStyle('header',fontName='Helvetica-Bold',fontSize=9.5,leading=12,textColor=white),
 'source':ParagraphStyle('source',fontName='Helvetica-Oblique',fontSize=8,leading=9.5,textColor=gray,spaceAfter=5),
 'box':ParagraphStyle('box',fontName='Helvetica',fontSize=9.5,leading=12.8,textColor=navy),
 'recall':ParagraphStyle('recall',fontName='Helvetica-Bold',fontSize=9.4,leading=12.8,textColor=teal,spaceBefore=7),
}
def P(t,s):return Paragraph(escape(t),styles[s])
def table(block):
 cols=len(block['headers'])
 if cols==3:
  if block['headers'][0]=='Minutes': widths=[70,360,75]
  elif block['headers'][0]=='Capability': widths=[105,222,178]
  elif block['headers'][0]=='Data-quality dimension':widths=[102,190,213]
  elif block['headers'][0]=='Vendor category':widths=[125,180,200]
  else:widths=[93,195,217]
 else:
  first=155 if block['headers'][0] in ['Waterfall','Sourcing approach'] else 137
  if block['headers'][0]=='Waterfall':first=252.5
  widths=[first,505-first]
 data=[[P(v,'header') for v in block['headers']]]+[[P(v,'cell') for v in row] for row in block['rows']]
 tab=Table(data,colWidths=widths,hAlign='LEFT')
 tab.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),navy),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('ROWBACKGROUNDS',(0,1),(-1,-1),[HexColor('#F2F5F8'),white]),('LINEBELOW',(0,0),(-1,-1),0.35,HexColor('#DBE2E9'))]))
 return [tab,Spacer(1,6)]
story=[];md=['# Applied Analytics in Business: Rapid Revision Guide','']
for i,page in enumerate(pages):
 story.extend([P(page['title'],'title'),P(page['subtitle'],'subtitle')])
 md.extend([f"## Guide page {i+1}: {page['title']}",'',page['subtitle'],''])
 for block in page['blocks']:
  kind=block['kind']
  if kind=='diagram':
   story.extend([DIAGRAMS[block['name']](),Spacer(1,7)])
   md.extend(['[Visual diagram: '+block['name']+']',''])
  elif kind=='table':
   story.extend(table(block))
   md.append('| '+' | '.join(block['headers'])+' |')
   md.append('| '+' | '.join(['---']*len(block['headers']))+' |')
   md.extend('| '+' | '.join(row)+' |' for row in block['rows']);md.append('')
  elif kind=='bullets':
   for s in block['items']:story.append(P('- '+s,'bullet'));md.append('- '+s)
   md.append('')
  elif kind=='callout':
   box=Table([[P(block['text'],'box')]],colWidths=[505])
   box.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),pale),('BOX',(0,0),(-1,-1),0.5,HexColor('#C8DDDC')),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
   story.extend([Spacer(1,4),box,Spacer(1,5)])
   md.extend(['> '+block['text'],''])
  else:
   story.append(P(block['text'],kind))
   md.extend([('### ' if kind=='h' else '')+block['text'],''])
 if i<len(pages)-1:story.append(PageBreak())
 print('Guide section',i+1,'words',len(re.findall(r'\S+',json.dumps(page))))

def decorate(canvas,doc):
 w,h=A4;canvas.saveState();canvas.setStrokeColor(HexColor('#DCE4E9'));canvas.line(45,h-36,w-45,h-36)
 canvas.setFillColor(gray);canvas.setFont('Helvetica',8)
 canvas.drawString(45,h-26,'APPLIED ANALYTICS | VISUAL REVISION')
 canvas.drawString(45,25,'Source references use original PDF viewer pages 1-208.')
 canvas.drawRightString(w-45,25,f'Guide page {doc.page}')
 canvas.restoreState()
out=root/'output/pdf';out.mkdir(exist_ok=True,parents=True)
pdf=out/'applied-analytics-visual-revision.pdf'
doc=SimpleDocTemplate(str(pdf),pagesize=A4,leftMargin=45,rightMargin=45,topMargin=50,bottomMargin=44,title='Applied Analytics - 3-4 Hour Visual Revision Guide',author='')
doc.build(story,onFirstPage=decorate,onLaterPages=decorate)
(out/'applied-analytics-visual-revision.md').write_text('\n'.join(md))
print('Guide generated.')
