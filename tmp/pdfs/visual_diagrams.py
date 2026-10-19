from reportlab.graphics.shapes import Drawing,Rect,Line,Polygon,PolyLine,Circle,String
from reportlab.lib.colors import HexColor,white
from reportlab.pdfbase.pdfmetrics import stringWidth
import math
NAVY='#16324F';TEAL='#146C63';BLUE='#306BA0';PURPLE='#7253A1';ORANGE='#A76120';GRAY='#475563';PALE='#F0F4F8';BORDER='#D5DEE8';RED='#A13C44'
COLORS=[BLUE,TEAL,PURPLE,ORANGE]
def C(c):return HexColor(c)
def text(d,x,y,s,size=9,color=NAVY,bold=False,anchor='start'):
 d.add(String(x,y,str(s),fontName='Helvetica-Bold' if bold else 'Helvetica',fontSize=size,fillColor=C(color),textAnchor=anchor))
def lines(s,width,size=9,bold=False):
 font='Helvetica-Bold' if bold else 'Helvetica';res=[]
 for para in s.split('\n'):
  line=''
  for word in para.split():
   test=(line+' '+word).strip()
   if line and stringWidth(test,font,size)>width:res.append(line);line=word
   else:line=test
  res.append(line)
 return res

def wrap(d,x,y,s,width,size=9,color=GRAY,bold=False,leading=12):
 for a in lines(s,width,size,bold):text(d,x,y,a,size,color,bold);y-=leading
 return y

def box(d,x,y,w,h,title,body='',color=BLUE):
 d.add(Rect(x,y,w,h,rx=6,ry=6,fillColor=C(PALE),strokeColor=C(BORDER),strokeWidth=.6))
 d.add(Rect(x,y+h-4,w,4,fillColor=C(color),strokeColor=None))
 yy=wrap(d,x+9,y+h-20,title,w-18,10,color,True,12)
 if body:wrap(d,x+9,yy-8,body,w-18,9,GRAY,False,12)

def arrow(d,x1,y1,x2,y2,color=GRAY):
 d.add(Line(x1,y1,x2,y2,strokeColor=C(color),strokeWidth=1))
 ang=math.atan2(y2-y1,x2-x1);l=5
 pts=[x2,y2,x2-l*math.cos(ang-.45),y2-l*math.sin(ang-.45),x2-l*math.cos(ang+.45),y2-l*math.sin(ang+.45)]
 d.add(Polygon(pts,fillColor=C(color),strokeColor=None))

def data_flow():
 d=Drawing(505,130)
 for i,(title,body) in enumerate([('DATA','161.2, 175.3\nValues without context'),('INFORMATION','Student heights\nValues with meaning'),('KNOWLEDGE','Apply a relationship\nUse it to decide')]):
  box(d,i*175,20,155,96,title,body,COLORS[i])
  if i<2:arrow(d,i*175+158,68,i*175+173,68)
 text(d,252,5,'Context gives meaning; relationships support action.',9,GRAY,anchor='middle')
 return d

def drivers():
 d=Drawing(505,156)
 data=[('More data','Cheaper storage + connections'),('More complex decisions','More competitors + sources'),('Faster decisions','Less time to respond'),('Enabling technology','DSS, ERP, warehousing, mining')]
 for i,(title,body) in enumerate(data):box(d,(i%2)*259,80-(i//2)*77,246,70,title,body,COLORS[i])
 return d

def capabilities():
 d=Drawing(505,226)
 specs=[('1  MEMORY','Keep history','Warehouse / ERP','Standardize'),('2  INTEGRATION','Connect content','Text / web mining','Role'),('3  INSIGHT','Find patterns','Mining / analytics','Role + task'),('4  PRESENTATION','Show useful results','OLAP / dashboard','Role + task + person')]
 for i,(title,body,tech,custom) in enumerate(specs):
  x=i*129;box(d,x,91,118,124,title,body+'\n'+tech,COLORS[i]);text(d,x+59,99,custom,7.7,COLORS[i],True,'middle')
  if i<3:arrow(d,x+119,153,x+127,153)
 for i,(a,b) in enumerate([('Archive','Past purchases'),('Combine','Today + comments'),('Discover','Predict demand'),('Deliver','Manager dashboard')]):
  x=i*129;text(d,x+59,67,a,10,COLORS[i],True,'middle');wrap(d,x+8,50,b,106,8.7,GRAY)
 text(d,0,14,'Customization expands from shared storage to individual presentation.',9,GRAY)
 return d

def development():
 d=Drawing(505,184)
 labels=[('PLAN','Scope + resources'),('ANALYSE','Processes + metrics'),('DESIGN','Specifications'),('BUILD','Solution / pilot'),('DEPLOY','Test + train + roll out'),('REVIEW','Evaluate + improve')]
 positions=[(0,99),(175,99),(350,99),(350,13),(175,13),(0,13)]
 for i,((title,body),(x,y)) in enumerate(zip(labels,positions)):
  box(d,x,y,155,67,title,body,COLORS[i%4])
 for i in range(5):
  x,y=positions[i];xx,yy=positions[i+1]
  if y==yy:arrow(d,x+158 if xx>x else x-3,y+33,xx-3 if xx>x else xx+158,yy+33)
  else:arrow(d,x+77,y-2,xx+77,yy+69)
 arrow(d,77,81,77,97,TEAL)
 text(d,252,1,'Review informs the next iteration.',8.5,GRAY,anchor='middle')
 return d

def vendors():
 d=Drawing(505,188);x0=116;y0=23;w=325;h=139
 d.add(Rect(x0,y0,w,h,fillColor=C(PALE),strokeColor=C(BORDER)))
 d.add(Line(x0+w/2,y0,x0+w/2,y0+h,strokeColor=C(BORDER),strokeWidth=1));d.add(Line(x0,y0+h/2,x0+w,y0+h/2,strokeColor=C(BORDER),strokeWidth=1))
 for x,y,title,sub in [(197,129,'CHALLENGER','Strong ATE / limited COV'),(360,129,'LEADER','Strong ATE / strong COV'),(197,60,'NICHE PLAYER','Limited ATE / limited COV'),(360,60,'VISIONARY','Limited ATE / strong COV')]:
  text(d,x,y,title,10,NAVY,True,'middle');text(d,x,y-16,sub,8,GRAY,anchor='middle')
 arrow(d,x0-5,y0-6,x0+w+12,y0-6);arrow(d,x0-6,y0-5,x0-6,y0+h+8)
 text(d,x0,0,'Limited',8,GRAY);text(d,x0+w,0,'Strong',8,GRAY,anchor='end');text(d,x0+w/2,1,'Completeness of vision (COV)',9,NAVY,True,'middle')
 wrap(d,3,135,'Ability to\nexecute\n(ATE)',99,10,NAVY,True,14)
 text(d,94,150,'Strong',8,GRAY,anchor='end');text(d,94,35,'Limited',8,GRAY,anchor='end')
 return d

def management():
 d=Drawing(505,137)
 box(d,177,85,151,43,'BI MANAGEMENT','',NAVY)
 for i,(title,body) in enumerate([('PROCESSES','Business case, support, education, evaluation'),('INFRASTRUCTURE','Data infrastructure + organizational culture'),('STRUCTURES','Governance, BICC, centralization')]):
  x=i*175;box(d,x,5,155,67,title,body,COLORS[i]);arrow(d,252,84,x+77,74)
 return d

def quality():
 d=Drawing(505,233)
 vals=[('EXISTENCE','Do we have the data?','Missing dataset'),('VALIDITY','Is it in the allowed domain?','Rating 9, allowed 1-5'),('CONSISTENCY','Do copies agree?','Different postcodes'),('INTEGRITY','Are relationships complete?','Order has no linked customer'),('ACCURACY','Does it match reality?','Wrong delivery date'),('RELEVANCE','Does it fit the objective?','Data answers another question')]
 for i,(title,q,example) in enumerate(vals):
  x=(i%2)*259;y=157-(i//2)*76
  box(d,x,y,246,69,title,q,COLORS[i%4]);text(d,x+9,y+9,'Failure: '+example,8,GRAY)
 text(d,0,0,'Six independent checks: one record can fail more than one.',9,GRAY)
 return d

def strategy():
 d=Drawing(505,181)
 labels=[('ROADMAP','Scope + alignment'),('STAKEHOLDERS','Who needs what?'),('BLUEPRINT','Structure + funding'),('IMPROVEMENT','People + systems'),('IMPLEMENTATION','Releases + delivery')]
 for i,(title,body) in enumerate(labels):
  y=145-i*33;d.add(Circle(13,y+9,10,fillColor=C(COLORS[i%4]),strokeColor=None));text(d,13,y+6,str(i+1),9,'#FFFFFF',True,'middle')
  text(d,33,y+10,title,9.7,NAVY,True);text(d,184,y+10,body,9.5,GRAY)
  if i<4:arrow(d,13,y-3,13,y-12)
 text(d,33,0,'Keep the route aligned with business strategy.',9,TEAL,True)
 return d

def powerquery():
 d=Drawing(505,211)
 items=[('IMPORT + EXPAND','Products + Orders + details'),('CALCULATE','Line Total = UnitPrice x Quantity'),('EXTRACT YEAR','OrderDate -> Year'),('GROUP + SUM','ProductID + Year -> Total Sales'),('MERGE + EXPAND','Match ProductID; bring in Year / Total Sales'),('SORT + LOAD','Descending sales; worksheet / model')]
 for i,(a,b) in enumerate(items):
  y=175-i*33;box(d,0,y,505,30,a,'',COLORS[i%4]);text(d,169,y+10,b,9,GRAY)
  if i<5:arrow(d,492,y-1,492,y-5)
 return d

def axes(d,x,y,w,h):
 d.add(Line(x,y,x+w,y,strokeColor=C(GRAY),strokeWidth=.6));d.add(Line(x,y,x,y+h,strokeColor=C(GRAY),strokeWidth=.6))
def charts():
 d=Drawing(505,224)
 # Five illustrative chart shapes in two rows.
 for i,(name,purpose) in enumerate([('BAR','Compare categories'),('AREA','Totals over time'),('HISTOGRAM','Distribution in bins'),('BULLET','Actual vs comparison'),('TREEMAP','Nested rectangles')]):
  x=(i%3)*173;y=117-(i//3)*110
  text(d,x,y+96,name,9.5,NAVY,True);text(d,x,y+82,purpose,8.3,GRAY)
  px=x+18;py=y+24
  if i==0:
   axes(d,px,py,130,49)
   for k,v in enumerate([20,40,30]):d.add(Rect(px+13+k*37,py,22,v,fillColor=C(BLUE),strokeColor=None));text(d,px+24+k*37,py-11,'ABC'[k],8,GRAY,anchor='middle')
   text(d,x,y+5,'x: category | y: sales',8,GRAY)
  elif i==1:
   axes(d,px,py,130,49);pts=[px,py,px,py+12,px+45,py+42,px+85,py+27,px+128,py+47,px+128,py]
   d.add(Polygon(pts,fillColor=C('#D8E8F4'),strokeColor=None));d.add(PolyLine([px,py+12,px+45,py+42,px+85,py+27,px+128,py+47],strokeColor=C(BLUE),strokeWidth=1))
   text(d,x,y+5,'x: time | y: total',8,GRAY)
  elif i==2:
   axes(d,px,py,130,49)
   for k,v in enumerate([18,44,28]):d.add(Rect(px+k*42,py,41,v,fillColor=C(TEAL),strokeColor=None));text(d,px+21+k*42,py-11,['0-2','2-4','4-6'][k],7.8,GRAY,anchor='middle')
   text(d,x,y+5,'x: bins | y: frequency',8,GRAY)
  elif i==3:
   d.add(Rect(px,py+15,130,21,fillColor=C('#E2E8EE'),strokeColor=None));d.add(Rect(px,py+20,91,11,fillColor=C(BLUE),strokeColor=None));d.add(Line(px+117,py+10,px+117,py+42,strokeColor=C(NAVY),strokeWidth=1.5))
   text(d,px,py+47,'Actual 70',8,GRAY);text(d,px+117,py-2,'Target 90',8,GRAY,anchor='end');text(d,x,y+5,'Scale: 0-100',8,GRAY)
  else:
   d.add(Rect(px,py+4,77,47,fillColor=C('#D8E8F4'),strokeColor=white,strokeWidth=1));d.add(Rect(px+77,py+4,52,30,fillColor=C('#D3E9E4'),strokeColor=white,strokeWidth=1));d.add(Rect(px+77,py+34,52,17,fillColor=C('#ECD8D8'),strokeColor=white,strokeWidth=1))
   text(d,px+38,py+22,'A',9,NAVY,True,'middle');text(d,px+103,py+16,'B',9,NAVY,True,'middle');text(d,px+103,py+39,'C',9,NAVY,True,'middle');text(d,x,y+5,'Size = sales; color = profit',8,GRAY)
 text(d,349,51,'Choose by the question:',9,TEAL,True);wrap(d,349,33,'Categories, time, distribution, comparison, or structure?',155,8.6,GRAY)
 return d

def joins():
 d=Drawing(505,171)
 text(d,0,157,'Inputs: LEFT = IDs 1, 2    |    RIGHT = IDs 2, 3    |    Match on ID',9,NAVY,True)
 specs=[('INNER',[(2,'L2','R2')]),('LEFT',[(1,'L1','null'),(2,'L2','R2')]),('RIGHT',[(2,'L2','R2'),(3,'null','R3')]),('FULL OUTER',[(1,'L1','null'),(2,'L2','R2'),(3,'null','R3')])]
 for i,(name,rows) in enumerate(specs):
  x=i*129;text(d,x,135,name,9.6,COLORS[i],True)
  for col,t in enumerate(['ID','Left','Right']):text(d,x+col*36+3,117,t,8.5,NAVY,True)
  for r,row in enumerate(rows):
   y=94-r*23;d.add(Rect(x,y-6,116,22,fillColor=C(PALE),strokeColor=None))
   for col,t in enumerate(row):text(d,x+col*36+3,y,t,9,RED if t=='null' else GRAY)
 text(d,0,5,'Union stacks rows. Join matches keys. Null means the other side has no match.',8.8,GRAY)
 return d
DIAGRAMS={'data':data_flow,'drivers':drivers,'capabilities':capabilities,'development':development,'vendors':vendors,'management':management,'quality':quality,'strategy':strategy,'powerquery':powerquery,'charts':charts,'joins':joins}
