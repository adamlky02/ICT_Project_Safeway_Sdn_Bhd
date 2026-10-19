# Applied Analytics in Business: Rapid Revision Guide

## Guide page 1: Your 3-4 hour revision route

Applied Analytics in Business | COS10082 | Visual edition

Use these diagrams with your 120-question practice set. Trace each flow or example, cover it, and explain it aloud. Source references mean pages 1-208 in the original revision PDF viewer. Diagram examples illustrate the cited rules.

### A complete 3-hour session

| Minutes | Task | Guide pages |
| --- | --- | --- |
| 0-10 | Orient yourself; identify unfamiliar terms. | 1 |
| 10-30 | Learn definitions, drivers, benefits and big data. | 2-3 |
| 30-50 | Reproduce the four-capability table from memory. | 4 |
| 50-75 | Review development, sourcing, customization and vendors. | 5-6 |
| 75-110 | Review management, data quality, governance and strategy. | 7-9 |
| 110-145 | Work through Power Query, Tableau, joins and cleaning. | 10-12 |
| 145-170 | Attempt 15-20 shuffled MCQs; cover their answers. | Practice set |
| 170-180 | Review mistakes and recall the lists below. | This guide |

### If you have 4 hours

Add 10 minutes of breaks, 35 minutes for another 20-25 MCQs and reviewing errors, and 15 minutes to revisit your weakest section. Total: 240 minutes. These are suggested study timings, not predicted exam weightings.

### Final 10-minute recall checklist

- Data -> information -> knowledge; BI product vs process vs tool vs solution.
- Four capabilities, enabling technologies and customization rules.
- Plan -> Analyse -> Design -> Build -> Deploy -> Review; Waterfall vs Agile.
- Six data-quality dimensions; four vendor categories; governance vs BICC.
- Five strategy areas; two meanings of BI centralization.
- UnitPrice x Quantity; group by product AND year; merge then expand.
- Blue vs green; dimension vs measure; chart purpose; union vs join vs blending.

> Revision method: explain the difference between similar terms. For scenario MCQs, identify the missing function or the precise failure before choosing an answer.

Study schedule and recall method are suggested for this guide. Source content: original PDF pp. 8-140 and 146-193. Software terminology follows the revision notes.

## Guide page 2: 1. Core definitions and distinctions

Learn the meaning, then recognize it in a scenario.

[Visual diagram: data]

Source: PDF pp. 8-9.

Business intelligence (BI) supplies useful information and knowledge for decision makers using internal/external sources and structured/unstructured information. The notes identify knowledge as a key output, and also describe user-friendly information and new insights as BI outputs.

| BI term | Remember |
| --- | --- |
| Product | The useful information and knowledge produced. |
| Process | Obtaining, analysing and distributing information/knowledge. |
| Tool | Application software for access, analysis and presentation. |
| Solution | The deployed combination of tools and sources supporting the process; an organization may use several solutions. |

Source: PDF pp. 11, 13, 23, 41, 71, 85.

### BI and related technologies

- Data warehouse: one logical repository for organizational data.
- Data mining: discover hidden patterns in electronically stored data.
- Decision support system (DSS): combine data and prior knowledge to create rules guiding decisions.
- BI: connect these resources to useful information and knowledge, including presentation to people with limited technical expertise.
- Knowledge management (KM): create, convert, capture, share and apply knowledge. Unlike BI, data is not its main concern except in knowledge discovery. BI results can become KM inputs.

Source: PDF pp. 23, 25, 27-28.

Tacit knowledge = undocumented experience or intuition, difficult to store/transmit. Explicit knowledge = documented or encoded, such as a manual, financial statement or lessons-learned record.

Source: PDF p. 24.

> MCQ traps: a warehouse stores data; mining finds patterns; BI is broader than either. A software purchase is a tool, not automatically a complete deployed solution. Matching numbers alone do not establish useful knowledge.

Cover and recall: explain why daily sales figures are information, but a bread-ordering decision based on sales and stock demonstrates applied knowledge.

## Guide page 3: 2. Drivers, benefits, big data and cases

Use the business problem to identify the BI contribution.

[Visual diagram: drivers]

Three delays constrain quick decisions: converting source data, integrating information across sources, and making results available to decision makers. A hotel manager deciding within minutes whether to accept a room bid illustrates quick reflexes.

Source: PDF pp. 16-22.

### Contributions and organizational benefits

Four contributions: user-friendly real-time information; new knowledge from the past; responsive and anticipative decisions using current information and predictions; improved future planning.

- Operational performance: identify what needs improvement. Example: on-time gas deliveries but invoices a week late; the company required invoicing within a day.
- Customer service: find problems and solutions, reduce concerns and improve retention. Example: identify mobile customers likely to change carrier.
- New opportunities: discover previously unknown patterns and track innovative projects.

Source: PDF pp. 34-36.

### Big data and analytics

3 Vs: volume = amount; variety = different forms; velocity = generation speed. Examples include video, sensor readings, geospatial data, messages and machine logs. Analytics is a subset of BI covering statistics, forecasts, models and simulations. Big-data analytics supplements BI/traditional analytics; big data is another input source, not a replacement for BI.

Source: PDF pp. 64-67.

### Case recognition

| Case | Problem -> BI result |
| --- | --- |
| Tesco | Rewards-card purchase data -> customer categories and tailored offers. Redemption about 20% vs 2% industry norm: roughly 10 times the rate. |
| St. Joseph Medical Center | Analyse patient reports -> identify potential problems earlier; examine nurse response times; provide information to authorized staff. |
| PhoneWorks / LucidEra | Static current Salesforce reports lacked historical analysis -> track average deal size, days to close and stage-by-stage bottlenecks. |

Source: PDF pp. 15, 142, 144. Case figures and product descriptions are as reported in the notes.

Cover and recall: a missed market opportunity caused by slow report delivery illustrates which driver and which of the three delays? Answer: quick reflexes; making results available.

## Guide page 4: 3. The four BI capabilities

Memory -> Integration -> Insight -> Presentation

[Visual diagram: capabilities]

Source: PDF pp. 43, 46-62.

### Trace an entire scenario

The visual separates four functions: preserving content, combining it, analysing it, and delivering the result. Integration supplies the content used by insight creation. A dashboard does not automatically discover new patterns.

Source: PDF pp. 43, 50, 54-59. Retail example applies the notes' capability model.

Source: PDF pp. 88-89.

### Feature-to-capability mappings

Benchmarking -> organizational memory. Intelligence -> information integration + insight creation. Convenience -> presentation. Benchmarking examines performance and industry trends; intelligence develops insights from disparate sources; convenience makes output appropriate and user-friendly.

Source: PDF p. 44.

> MCQ traps: warehouse/ERP = memory; text/web mining = integration; data mining = insight; OLAP/dashboard = presentation. A lack of current external inputs points to integration. Valid insights that users cannot understand point to presentation.

Cover and recall: name two technologies for each capability, then reproduce the four customization rules without looking.

## Guide page 5: 4. Developing a good BI solution

Know the property, the stage and the development approach.

| Quality | Meaning |
| --- | --- |
| Alignment | Fits business strategy, processes and context. |
| Intelligence | Provides new, valuable insight. |
| Usability | Easy to use. |
| Accuracy | Based on clean, accurate data. |
| Connectivity | Interfaces effectively with other IT systems. |
| Flexibility | Can be modified quickly for changing business conditions. |
| Portability | Works on different software/hardware platforms. |
| Scalability | Expands as users and data volume grow. |

Source: PDF p. 72.

[Visual diagram: development]

Source: PDF pp. 81-82.

| Waterfall | Agile |
| --- | --- |
| Strictly sequential; finish a stage before the next. | Iterative; repeat steps, deliver small chunks and build on them. |
| Comprehensive documentation; contract; planning; process. | Working software; collaboration; flexibility; people. |
| Described as heavy; steps strictly documented. | Described as light; more flexible. |

Source: PDF pp. 77-80.

> MCQ traps: more users/data = scalability; another platform = portability; changing business requirements = flexibility; connecting to ERP = connectivity. Choosing metrics = Analyse; specifying capabilities = Design; training and rollout = Deploy; stakeholder satisfaction = Review.

Cover and recall: a solution works on several platforms but cannot exchange data with ERP. Which property is good and which is deficient? Answer: portability is present; connectivity is deficient.

## Guide page 6: 5. Sourcing, users, tools and vendors

Tool origin and solution developer are separate decisions.

| Sourcing approach | Who provides tools / development? |
| --- | --- |
| Completely in-house | Internal tools; internal development. |
| Vendor tools, in-house development | Acquired vendor tools, possibly internal tools; internal development. |
| Joint development | Vendor tools, possibly internal tools; joint development. |
| Outsourced development with internal tools | Some internal tools; external development. |
| Complete outsourcing | External tools and external development. |

Source: PDF pp. 73-74.

Three vendor/tool choices: strategic vs tactical buying; mega-vendors vs independent vendors; standardization vs multiple options. Strategic buying builds long-term relationships with a few preferred vendors; tactical buying selects the best option for a particular need. Standardization depends on prior BI experience, internal IT competence and resources.

Source: PDF p. 75.

Users: powerful users understand BI tools well; business users mainly consume information with little BI expertise; the middle class usually consumes information but occasionally creates reports/queries or performs further analysis.

Too much customization can waste time on tools and produce narrowly useful queries. Too much standardization can restrict users and inhibit BI benefits. Use the capability-specific customization rules on guide page 4.

Source: PDF pp. 86-89.

[Visual diagram: vendors]

ATE asks whether the vendor can deliver: product/service, viability, execution, responsiveness, customer experience and operations. COV concerns direction: market understanding, strategies, business model and innovation.

Source: PDF pp. 91-93.

Historical examples in the notes: mega-vendors - Oracle, SAP, IBM, Microsoft. Independent vendors listed include Tableau, SAS, MicroStrategy, TIBCO and Qlik.

Source: PDF p. 90.

Cover and recall: strong execution but limited vision = Challenger. Limited execution but strong vision = Visionary. Do not swap them.

## Guide page 7: 6. Managing BI: processes and culture

Successful BI needs people, resources and evaluation as well as tools.

[Visual diagram: management]

Source: PDF pp. 100-101, 112, 117.

### Business case: justify and sustain resources

A business case justifies investment and continuing resources. Benefits include competitiveness, cross-selling/up-selling from customer history, satisfaction/retention and regulatory reporting. ROI may be hard to quantify because payoffs are long term; explain the fundamental value proposition too.

Source: PDF pp. 103-105.

### Organizational support: reduce resistance

People may doubt the benefits, feel threatened, prefer intuition or resist change. Build support using a solid business case, incremental investment with visible results, roles that show personal benefit, BI champions, and early user involvement to manage expectations.

Source: PDF pp. 106-107.

### Education: broader than tool training

Keep current and potential users informed about benefits, functionality and use. Continue learning through communication, collaborative sessions and the BICC. Develop appreciation for data and analysis, not just skill at clicking tool buttons.

Source: PDF pp. 108-109.

### Evaluation: compare expectations with outcomes

Use the business-case expectations as a baseline. Include unexpected benefits/costs, solicited and unsolicited user feedback, business-strategy alignment, and effects on customers and suppliers. The evaluation material appears on a slide headed 'Education' in the notes.

Source: PDF p. 110.

### Analytics culture

Organizational culture means shared norms and beliefs guiding behavior. BI works better where data and analysis guide decisions. Executives establish the example by seeking facts. Technology + analytics culture supports BI success; culture and BI success reinforce one another.

Source: PDF p. 115.

> MCQ trap: buying a tool does not fix resistance to change. Choose the process intervention that fits the problem: resource justification = business case; resistance = support; ongoing understanding = education; benefits against expectations = evaluation.

Cover and recall: explain why an incremental pilot and a BI champion can help an organization that prefers intuition-based decisions.

## Guide page 8: 7. Data quality, governance and centralization

Distinguish the exact defect or responsibility.

[Visual diagram: quality]

Source: PDF pp. 113-114. Failure examples apply the definitions.

> Two identical wrong values are consistent but inaccurate. A value can be valid yet inaccurate: an allowed age can still be the wrong age. More records and prettier charts cannot repair poor source data.

### BI governance: direction, authority and oversight

Governance has four parts: guiding principles (vision/goals); decision-making bodies (people/groups); decision areas and rights (what is decided and who may decide); oversight mechanisms (formal policies/procedures and progress evaluation).

Source: PDF pp. 118-119.

BICC = Business Intelligence Competency Center: a relatively permanent cross-functional team supporting effective BI use. It coordinates solutions/tools, shares best practices, supports data stewardship, develops standardized models and provides BI expertise.

Source: PDF pp. 120-121.

| Centralization dimension | More centralized | More decentralized |
| --- | --- | --- |
| Solution focus | Enterprise-wide | Department-focused |
| Report development | Reports standard in the solution | Reports mainly user-developed |

These are separate dimensions. Department-focused solutions may still provide centrally developed reports. The notes recommend a balanced approach to report development.

Source: PDF p. 122.

Cover and recall: missing cross-dataset links = integrity; contradictory copies = consistency; wrong real-world description = accuracy. Governance allocates authority; the BICC supplies coordinated expertise.

## Guide page 9: 8. BI strategy: problems and roadmap

Align the BI direction with the business direction.

A BI strategy is a roadmap for measuring performance, seeking competitive advantage and understanding customers through data mining and statistics. BI provision should align with corporate strategy.

Source: PDF pp. 126, 131.

| Reason strategy is needed | Recognize the problem |
| --- | --- |
| Multiple versions of the truth | Different data produces conflicting figures/conclusions; reliable decisions need a shared version. |
| Unclear business logic | The same term has different definitions, or calculations are named inconsistently. |
| Personnel overhead | Separate departmental BI efforts can duplicate staffing; a BICC can help. |
| Programming instead of analysing | Analysts spend time extracting data rather than interpreting results. |
| Data quality issues | Visualizations and insights use poor data: garbage in, garbage out. |

Source: PDF pp. 127-129.

[Visual diagram: strategy]

Source: PDF pp. 130-138.

Infrastructure planning: investigate which software fits the strategic direction, then shape the hardware architecture around it. People may need updated skills or external/new staff.

Source: PDF p. 137.

Additional considerations: how to acquire, validate, store, protect and process required data for accessibility, reliability and timeliness; types of reports and both dimensions of centralization.

Source: PDF p. 140.

> MCQ traps: roadmap = scope and alignment; stakeholders = who needs information; blueprint = structure/funding/reporting; improvement = people and infrastructure; implementation = releases and documentation. Conflicting totals concern versions of truth; conflicting meanings concern business logic.

Cover and recall: name the five strategy areas in order and give one decision handled by each. Then explain how poor data can undermine an otherwise impressive visualization.

## Guide page 10: 9. Power Query: the practical workflow

Focus on what each transformation does and the final level of detail.

Power Query / Get & Transform gathers, connects, combines, refines and reshapes data. Sources in the lab include a web table, an Excel workbook and an OData feed. The notes describe OData as an open data-sharing protocol based on REST principles.

Source: PDF pp. 146, 149.

| Operation | Effect |
| --- | --- |
| Remove Other Columns | Keep selected columns; remove unselected ones. |
| Replace Values | Substitute a specified value; the lab replaces null with 0. |
| Applied Steps | Records successive query actions and transformations. |
| Expand | Bring selected fields from a related/nested table into the main table. |
| Group By | Aggregate records at the chosen key level. |
| Merge | Match two queries on selected common key fields. |

Source: PDF pp. 147-153.

### Sales per product per year: learn this sequence

[Visual diagram: powerquery]

Source: PDF pp. 149-155.

Worked example: product A has two lines in 2025: 10 x 3 = 30 and 8 x 5 = 40. A line in 2026 is 12 x 2 = 24. Grouping by product and year gives A/2025 = 70 and A/2026 = 24. Grouping only by product gives 94 and loses the yearly distinction.

Example applies PDF pp. 150-151.

> MCQ traps: Line Total is multiplication, not addition. Sum the line totals, not unit prices. Grouping keys determine the answer's level of detail. Merge creates a related-table column; expand exposes the desired fields. The lab's null-to-zero replacement is a specific exercise step.

Cover and recall: why are ProductID and Year both needed? What is the difference between Merge and Expand?

## Guide page 11: 10. Tableau fields, charts and workspace

Field role and discrete/continuous behavior are separate choices.

| Distinction | Meaning |
| --- | --- |
| Dimension | Qualitative categories such as names, dates or geography; segments data and affects detail. |
| Measure | Quantitative numeric values; can be aggregated. Tableau aggregates a measure in a view by default. |
| Discrete / blue | Separate values; produces headers. |
| Continuous / green | An unbroken range; produces axes. |

A dimension may be continuous, and a measure may be discrete. Blue does not always mean dimension; green does not always mean measure. A continuous field on Columns creates a horizontal axis; on Rows it creates a vertical axis.

Source: PDF pp. 166-167.

[Visual diagram: charts]

Source: PDF pp. 167-177. Chart shapes and bullet values are illustrative examples, not measurements from the notes.

Treemap example: Sales on Size and Profit on Color means equal sales can produce equal areas but different colors. For the histogram's per-bar segment percentages, use Percent of Total and edit Compute Using to Cell as the lab specifies.

Source: PDF pp. 175-177.

Workspace cues: Start page = Connect / Open / Discover. Sheets = worksheets / dashboards / stories. Rows and Columns construct the view; Swap exchanges them. Marks controls type/color. Filters restrict shown data; Show Me suggests charts; the status bar shows view details.

Source: PDF pp. 158-165, 168, 171-172.

> MCQ traps: histogram = distribution, bar = category comparison, bullet = performance comparison. Discrete/continuous controls headers/axes; dimension/measure controls categorization/measurement. These distinctions are related but not identical.

Cover and recall: what happens when Quantity changes from continuous to discrete? Answer: the axis becomes headers, with green changing to blue.

## Guide page 12: 11. Tableau: combine, connect and clean

Work out rows, keys and grain before choosing a combining method.

| Method | Effect / when useful |
| --- | --- |
| Union | Append rows vertically; compatible tables have matching columns. Monthly tables -> one longer table. |
| Join | Match on common fields and combine columns. The number of rows depends on matches and duplicates. |
| Data blending | Combine a primary source with secondary sources on common fields; useful when joins are unavailable or levels of detail differ, such as daily vs quarterly. |

Source: PDF pp. 181-186.

[Visual diagram: joins]

Duplicate-key trap: two left rows and three right rows with the same key produce 2 x 3 = 6 matched rows. If left sales are 100 and 200, each repeats three times, so a joined sum becomes 900 rather than the original 300. Check table detail before interpreting totals.

Examples apply PDF pp. 166, 181, 183-186.

| Preparation / connection | Remember |
| --- | --- |
| Live | Data stays in source; useful for current updates and capable databases; can be slow depending on source. |
| Extract | Bring data into Tableau's analysis engine; can improve slow-source performance and reduce source query load. |
| Metadata | Review/rename/hide columns, change types or geographic roles; these changes do not modify underlying data. |
| Data Interpreter | Detect titles, notes, footers, empty cells and embedded tables. Check the result and do further cleaning if needed. |
| Pivot | Turn original column names and values into Pivot field names / Pivot field values; the lab renames these Date / Resolved Incidents. |

Split separates strings using a delimiter or pattern. A data-source filter reduces included data. Union appends compatible rows: 12 + 18 + 20 = 50 when nothing is filtered or deduplicated.

Source: PDF pp. 186-193.

Final check: explain why a join can increase row count; why a union differs from a join; why live differs from extract; and how pivot differs from splitting a field. Then return to the checklist on guide page 1.
