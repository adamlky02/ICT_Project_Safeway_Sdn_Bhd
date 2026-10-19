from pathlib import Path
import random, json, collections
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4

root=Path('/Users/adamliewkangyee/WebstormProjects/ICT_Project_Safeway_Sdn_Bhd')
raw=(root/'tmp/pdfs/questions.txt').read_text().splitlines()
replacements={
20: "A retailer has accurate historical records and a readable dashboard, but no forecasts and no current market inputs. It wants anticipative decisions. Which pair of improvements best addresses these gaps?|Integrate current market information and create predictive insights|Add more dashboard colors and keep using historical totals alone|Replace historical storage with individual presentation preferences|Standardize hardware and remove external information|Anticipative decisions use the latest information and predictions. Information integration supplies current content, and insight creation supports prediction.|34,50,56",
39: "A firm's warehouse preserves historical sales, and an analyst can discover patterns, but current customer comments and competitor reports never reach the analysis. Which change most directly enables better insights without merely altering the dashboard?|Integrate the current unstructured and external sources before analysis|Customize only the dashboard's colors for each manager|Increase historical storage without adding current sources|Move all reports into a single worksheet without combining their sources|The missing step is information integration: insight creation needs synthesized historical and current content, including external and unstructured sources.|43,50,54",
41: "A BI pilot has an extensive archive and can display reports. Its recommendations remain outdated because staff analyse only historical records, even though current competitor information is available. Which diagnosis best fits?|Organizational memory is present, but current-source integration must improve to support timely insight creation|Presentation alone will create the missing external information|The archive proves all four capabilities are effective|Organizational memory should be eliminated because integration uses only external data|Memory supplies accumulated history; integration must synthesize current and external content so insights can reflect ongoing events.|43,50,55",
90: "A BI improvement plan must address untrained staff, unsuitable software and aging hardware. Which order and scope best follow the notes?|Assess staff skills and resourcing, investigate software fit, then build hardware architecture around that fit|Buy hardware first, postpone software choice, and assume users need no development|Change only report ownership because infrastructure cannot affect delivery|Replace all people considerations with a larger historical archive|Capability improvement includes people and infrastructure. The notes advise investigating suitable software before shaping hardware around it.|137",
97: "A product has three order lines: in 2025, price 10 with quantity 3 and price 8 with quantity 5; in 2026, price 12 with quantity 2. After the lab's calculations and grouping by ProductID and Year, what totals should appear?|2025: 70; 2026: 24|2025: 18; 2026: 12|2025: 94; 2026: 94|2025: 144; 2026: 24|Line totals are 30, 40 and 24. Summing within each product-year gives 70 for 2025 and 24 for 2026.|150,151",
111: "An Orders table has two rows for CustomerID 7, with Sales of 100 and 200. A second table has three matching rows for CustomerID 7. After an inner join on CustomerID, what is SUM(Sales) over the joined rows?|900|300|600|1500|The join produces 2 times 3 = 6 rows. Each order's Sales appears three times, so the sum is (100 + 200) times 3 = 900; this illustrates duplication when joining at the wrong level of detail.|183,184,166",
113: "A left table contains two rows for ID 1, one for ID 2 and one for ID 3. The right table has three rows for ID 2, two for ID 3 and one for ID 4. A left join matches on ID. How many result rows appear, and how many have null right-side fields?|7 rows; 2 with null right-side fields|6 rows; 1 with null right-side fields|8 rows; 3 with null right-side fields|4 rows; 2 with null right-side fields|The two ID 1 rows are retained unmatched. ID 2 produces 3 matches and ID 3 produces 2: 2 + 3 + 2 = 7. ID 4 is not retained by this left join.|183,184",
119: "Two compatible tables contain monthly values for 4 and 2 different employees, respectively. Each has one employee row and three month columns, all populated. You union the tables, then pivot all three month columns while retaining employee identity. How many result rows appear?|18|6|9|24|Union gives 4 + 2 = 6 employee rows. Pivoting three populated month columns produces 6 times 3 = 18 employee-month rows, with original month names and values in the generated fields.|181,192,193",
}
for num,row in replacements.items(): raw[num-1]=row
questions=[]
for row in raw:
 parts=row.split('|')
 assert len(parts)==7
 q,correct,d1,d2,d3,why,pages=parts
 p=[int(x) for x in pages.split(',')]
 assert all(1<=n<=208 for n in p)
 assert len({correct,d1,d2,d3})==4
 questions.append(dict(question=q, correct=correct, distractors=[d1,d2,d3], explanation=why, pages=p))
assert len(questions)==120
assert len({q['question'] for q in questions})==120
rng=random.Random(10082)
rng.shuffle(questions)
answer_positions=list(range(4))*30
rng.shuffle(answer_positions)
for n,(q,pos) in enumerate(zip(questions,answer_positions),1):
 options=q.pop('distractors'); rng.shuffle(options); options.insert(pos,q['correct'])
 q.update(number=n, options=options, answer='ABCD'[pos])

out=root/'output/pdf'
out.mkdir(parents=True, exist_ok=True)
(out/'applied-analytics-120-mcq.json').write_text(json.dumps(questions,indent=2))
md=['# Applied Analytics in Business: 120 MCQ Practice Questions','',
'Choose one best answer for each question. Questions and topics are shuffled, with no difficulty labels. The answer and explanation follow each question.', '',
'Source: Applied Analytic Exam Revision.pdf. Source references use the original PDF viewer pages, counted from 1 to 208, rather than page numbers printed within individual handouts. Numerical scenarios without a named case are original practice examples applying the concepts on the cited pages. Software terminology follows the revision notes.', '']
for q in questions:
 md.extend([f"## {q['number']}. {q['question']}",''])
 md.extend(f'{l}. {o}' for l,o in zip('ABCD',q['options']))
 md.extend(['',f"**Answer: {q['answer']}. {q['correct']}**",q['explanation'],f"**Source: PDF {'page' if len(q['pages'])==1 else 'pages'} {', '.join(map(str,q['pages']))}.**",''])
(out/'applied-analytics-120-mcq.md').write_text('\n'.join(md))

navy=HexColor('#16324F'); gray=HexColor('#4D5965'); teal=HexColor('#146C63')
styles={
 'title':ParagraphStyle('title',fontName='Helvetica-Bold',fontSize=25,leading=30,textColor=navy,spaceAfter=18),
 'intro':ParagraphStyle('intro',fontName='Helvetica',fontSize=11,leading=17,textColor=gray,spaceAfter=14),
 'q':ParagraphStyle('q',fontName='Helvetica-Bold',fontSize=11,leading=15,textColor=navy,spaceAfter=8),
 'option':ParagraphStyle('option',fontName='Helvetica',fontSize=10,leading=14,leftIndent=13,firstLineIndent=-13,spaceAfter=3),
 'answer':ParagraphStyle('answer',fontName='Helvetica-Bold',fontSize=10,leading=14,textColor=teal,spaceBefore=8,spaceAfter=4),
 'why':ParagraphStyle('why',fontName='Helvetica',fontSize=9.6,leading=13,textColor=gray,spaceAfter=5),
 'cite':ParagraphStyle('cite',fontName='Helvetica-Oblique',fontSize=9,leading=12,textColor=gray),
}
def P(text,style): return Paragraph(escape(text),styles[style])
story=[Spacer(1,65),P('Applied Analytics<br/>in Business'.replace('<br/>','\n'),'title'),P('120 multiple-choice practice questions','title'),
 P('COS10082 | Based on your revision notes','intro'),Spacer(1,20),
 P('Choose one best answer. The questions are shuffled across topics and levels of challenge, with no difficulty labels. Each question is followed by its answer, a brief explanation, and a source page reference.','intro'),
 P('Page references mean pages 1-208 in the original PDF viewer. Individual lectures and lab handouts restart their printed page numbering, so use the PDF viewer page number to find the source.','intro'),
 P('Source: Applied Analytic Exam Revision.pdf','intro'),
 P('Unnamed numerical scenarios are original practice examples applying the cited rules. Software names and terminology follow the revision notes.','intro'),
 P('Coverage: BI foundations and benefits; BI capabilities and big data; development, sourcing and tools; management and strategy; case studies; Power Query; Tableau and data preparation.','intro'),PageBreak()]
for i,q in enumerate(questions):
 block=[P(f"{q['number']}. {q['question']}",'q')]
 block.extend(P(f'{l}. {o}','option') for l,o in zip('ABCD',q['options']))
 block.extend([P(f"Answer: {q['answer']}. {q['correct']}",'answer'),P(q['explanation'],'why'),P(f"Source: PDF {'page' if len(q['pages'])==1 else 'pages'} {', '.join(map(str,q['pages']))}.",'cite'),Spacer(1,20)])
 story.append(KeepTogether(block))
 if (i+1)%3==0 and i<119: story.append(PageBreak())

def decorate(canvas,doc):
 w,h=A4
 canvas.saveState()
 canvas.setStrokeColor(HexColor('#DCE4E9'));canvas.line(45,h-38,w-45,h-38)
 canvas.setFont('Helvetica',8);canvas.setFillColor(gray)
 canvas.drawString(45,h-28,'APPLIED ANALYTICS IN BUSINESS | MCQ PRACTICE')
 canvas.drawString(45,26,'Source citations refer to the original revision PDF.')
 canvas.drawRightString(w-45,26,f'Practice set page {doc.page}')
 canvas.restoreState()
file=out/'applied-analytics-120-mcq.pdf'
doc=SimpleDocTemplate(str(file),pagesize=A4,rightMargin=45,leftMargin=45,topMargin=54,bottomMargin=44,title='Applied Analytics - 120 MCQ Practice Questions',author='')
doc.build(story,onFirstPage=decorate,onLaterPages=decorate)
print('Created PDF and editable Markdown.')
print('Answer distribution:',dict(collections.Counter(q['answer'] for q in questions)))
print('Source pages cited:',len({p for q in questions for p in q['pages']}))
