# Applied Analytics in Business: 120 MCQ Practice Questions

Choose one best answer for each question. Questions and topics are shuffled, with no difficulty labels. The answer and explanation follow each question.

Source: Applied Analytic Exam Revision.pdf. Source references use the original PDF viewer pages, counted from 1 to 208, rather than page numbers printed within individual handouts. Numerical scenarios without a named case are original practice examples applying the concepts on the cited pages. Software terminology follows the revision notes.

## 1. Three monthly tables have matching schemas and contain 12, 18 and 20 rows. Assuming no filtering or deduplication, how many rows result from their union?

A. 50
B. 12
C. 4320
D. 20

**Answer: A. 50**
A union appends rows vertically, so the count is 12 + 18 + 20 = 50.
**Source: PDF pages 181, 184.**

## 2. An imported spreadsheet contains titles, notes, empty cells and several embedded tables. Which Tableau feature can help identify the actual data before further reshaping?

A. Swap
B. Data Interpreter
C. Fix Axes
D. Show Mark Labels

**Answer: B. Data Interpreter**
Data Interpreter detects non-data content and tables, but its results should still be checked.
**Source: PDF page 190.**

## 3. Which three characteristics distinguish big data in the notes?

A. Volume, variety and velocity
B. Validity, visibility and viability
C. Volume, version and visualization
D. Vision, value and verification

**Answer: A. Volume, variety and velocity**
The notes use the three Vs: volume, variety and velocity.
**Source: PDF page 65.**

## 4. Which description best fits a Business Intelligence Competency Center (BICC)?

A. A vendor's score for completeness of vision
B. A database table containing transaction records
C. A temporary chart used only for a single meeting
D. A relatively permanent cross-functional team supporting effective BI use

**Answer: D. A relatively permanent cross-functional team supporting effective BI use**
A BICC coordinates expertise, tools, best practices and other support across the organization.
**Source: PDF pages 120, 121.**

## 5. An Orders table has two rows for CustomerID 7, with Sales of 100 and 200. A second table has three matching rows for CustomerID 7. After an inner join on CustomerID, what is SUM(Sales) over the joined rows?

A. 900
B. 1500
C. 600
D. 300

**Answer: A. 900**
The join produces 2 times 3 = 6 rows. Each order's Sales appears three times, so the sum is (100 + 200) times 3 = 900; this illustrates duplication when joining at the wrong level of detail.
**Source: PDF pages 183, 184, 166.**

## 6. Two compatible tables contain monthly values for 4 and 2 different employees, respectively. Each has one employee row and three month columns, all populated. You union the tables, then pivot all three month columns while retaining employee identity. How many result rows appear?

A. 24
B. 9
C. 6
D. 18

**Answer: D. 18**
Union gives 4 + 2 = 6 employee rows. Pivoting three populated month columns produces 6 times 3 = 18 employee-month rows, with original month names and values in the generated fields.
**Source: PDF pages 181, 192, 193.**

## 7. A retailer has accurate historical records and a readable dashboard, but no forecasts and no current market inputs. It wants anticipative decisions. Which pair of improvements best addresses these gaps?

A. Add more dashboard colors and keep using historical totals alone
B. Standardize hardware and remove external information
C. Replace historical storage with individual presentation preferences
D. Integrate current market information and create predictive insights

**Answer: D. Integrate current market information and create predictive insights**
Anticipative decisions use the latest information and predictions. Information integration supplies current content, and insight creation supports prediction.
**Source: PDF pages 34, 50, 56.**

## 8. Which BI application supports cross-selling or up-selling in the notes?

A. Replacing customer segmentation with identical offers
B. Counting only the number of database tables
C. Using customer history and characteristics to identify additional products to offer
D. Ignoring previous customer interactions

**Answer: C. Using customer history and characteristics to identify additional products to offer**
Customer history and characteristics can help identify additional products suitable for each customer.
**Source: PDF page 104.**

## 9. After merging Products with Total Sales, a column contains links to related tables. What should you do to add Year and Total Sales as ordinary result columns?

A. Group by the column name only
B. Rename the query without expanding anything
C. Sort the links alphabetically
D. Expand the related-table column and select Year and Total Sales

**Answer: D. Expand the related-table column and select Year and Total Sales**
The merge supplies a related-table column; expansion adds the desired fields to the primary table.
**Source: PDF page 153.**

## 10. A policy specifies which committee can approve BI investments. Which governance component most directly allocates that authority?

A. Presentation preferences
B. Decision areas and decision rights
C. Data-source filters
D. Guiding principles only

**Answer: B. Decision areas and decision rights**
Decision rights allocate authority for identified types of decisions to decision-making bodies.
**Source: PDF pages 118, 119.**

## 11. A system stores history, integrates current sources, discovers trends and displays results for users. Which sequence best matches these activities?

A. Organizational memory, information integration, insight creation, presentation
B. Insight creation, organizational memory, presentation, information integration
C. Presentation, insight creation, organizational memory, information integration
D. Information integration, presentation, organizational memory, insight creation

**Answer: A. Organizational memory, information integration, insight creation, presentation**
The four capabilities connect accumulated content, synthesis, insights and user-facing outputs.
**Source: PDF pages 43, 61.**

## 12. Employees distrust BI and prefer intuition. Which response best follows the notes?

A. Use a solid business case, a small initial success, champions and early user involvement
B. Purchase more hardware without addressing expectations
C. Require immediate company-wide deployment with no user input
D. Delay all education until every BI project is finished

**Answer: A. Use a solid business case, a small initial success, champions and early user involvement**
Incremental results, champions and user involvement build and sustain support.
**Source: PDF pages 106, 107.**

## 13. A team asks whether stakeholders are satisfied and which parts of the solution should improve. Which step is this?

A. Plan
B. Build
C. Design
D. Review

**Answer: D. Review**
Review evaluates the solution and identifies what works and what needs improvement.
**Source: PDF page 81.**

## 14. Executives regularly ask for facts and analyses before deciding. What effect is most consistent with the notes?

A. They make all report development decentralized
B. They remove the need for ongoing BI education
C. They help establish an organizational culture conducive to BI
D. They eliminate the need for data infrastructure

**Answer: C. They help establish an organizational culture conducive to BI**
Senior executives can model the norms of an analytics culture; technology and culture together support BI success.
**Source: PDF page 115.**

## 15. Which BI capability represents the organization's accumulated history?

A. Organizational memory
B. Presentation
C. Information integration
D. Insight creation

**Answer: A. Organizational memory**
Organizational memory includes accumulated data, information and explicit knowledge.
**Source: PDF page 46.**

## 16. A vendor has strong ability to execute but limited completeness of vision. Which classification applies?

A. Niche player
B. Visionary
C. Leader
D. Challenger

**Answer: D. Challenger**
Challengers are strong in execution but limited in vision.
**Source: PDF page 91.**

## 17. Which BI capability develops new patterns, trends and relationships to improve decisions?

A. Insight creation
B. Presentation
C. Data-source connection management
D. Organizational memory

**Answer: A. Insight creation**
Insight creation develops useful insights for short-term or long-term decisions.
**Source: PDF page 55.**

## 18. Which item is the clearest example of explicit knowledge?

A. An employee's undocumented instinct
B. An unspoken ability to identify a problem
C. A procedure recorded in a manual
D. A manager's private intuition about a deadline

**Answer: C. A procedure recorded in a manual**
Explicit knowledge is documented or encoded and can be stored or transmitted.
**Source: PDF page 24.**

## 19. Which property means a BI solution fits business strategy, processes and context?

A. Alignment
B. Portability
C. Scalability
D. Connectivity

**Answer: A. Alignment**
Alignment concerns the fit between the BI solution and its business setting.
**Source: PDF page 72.**

## 20. What is the main purpose of Power Query / Get & Transform in the lab?

A. Create only presentation slides
B. Gather, combine, refine and reshape data for analysis
C. Replace all database relationships with text labels
D. Assign BI governance decision rights

**Answer: B. Gather, combine, refine and reshape data for analysis**
The lab presents Get & Transform as a tool for gathering and shaping data from sources.
**Source: PDF page 146.**

## 21. A BI strategy team identifies key information consumers, critical subject areas and future organizational challenges. Which area is it addressing?

A. Report sorting
B. Data validity testing
C. Stakeholder management
D. Implementation planning

**Answer: C. Stakeholder management**
Stakeholder management requires understanding who needs information and what matters to the business.
**Source: PDF page 133.**

## 22. A Tableau field is a discrete measure. Which statement must be true?

A. It is represented in blue because it is discrete
B. It is automatically a dimension because it is discrete
C. It must create a continuous axis
D. It cannot be numeric because it is blue

**Answer: A. It is represented in blue because it is discrete**
The notes allow discrete measures and continuous dimensions. Blue indicates discrete behavior.
**Source: PDF pages 166, 167.**

## 23. How does BI education differ from a one-time tool-training session?

A. It applies only to developers and excludes information consumers
B. It concerns only the location of toolbar buttons
C. It ends as soon as users complete initial training
D. It is broader and ongoing, promoting the value and use of data and analysis

**Answer: D. It is broader and ongoing, promoting the value and use of data and analysis**
Education includes continued communication, collaboration and cultivating appreciation for data and analysis.
**Source: PDF pages 108, 109.**

## 24. Which development helps explain exploding organizational data volumes in the notes?

A. Fewer transaction systems and less internet use
B. Cheaper storage and more electronic connections
C. A universal decline in regulatory requirements
D. The elimination of electronic documents

**Answer: B. Cheaper storage and more electronic connections**
Lower storage costs and expanding internet and intranet connections increase collected and stored data.
**Source: PDF page 17.**

## 25. Which comparison agrees with the notes?

A. Waterfall emphasizes people; Agile emphasizes process
B. Waterfall emphasizes collaboration; Agile emphasizes contracts
C. Waterfall emphasizes planning; Agile emphasizes flexibility
D. Waterfall avoids documentation; Agile requires every step to be strictly documented

**Answer: C. Waterfall emphasizes planning; Agile emphasizes flexibility**
The comparison associates Waterfall with planning and Agile with flexibility.
**Source: PDF page 80.**

## 26. An organization buys visualization software, combines it with its data sources and deploys a decision-support application. Which statement is most accurate?

A. The software is a BI tool and the deployed application is a BI solution
B. The application is the BI product and can contain no tools
C. The software is a BI strategy and the application is raw data
D. The software and application are both only data warehouses

**Answer: A. The software is a BI tool and the deployed application is a BI solution**
A BI solution uses tools and organizational data to support the BI process.
**Source: PDF pages 13, 41.**

## 27. Which customization policy is recommended for organizational-memory tools?

A. Customize them for every task and individual
B. Allow every department to define unrelated historical records
C. Customize them for each individual
D. Standardize them

**Answer: D. Standardize them**
The notes recommend standardization for organizational memory.
**Source: PDF pages 88, 89.**

## 28. Which technology is listed under presentation capability?

A. Online analytical processing (OLAP)
B. Enterprise resource planning
C. Text mining
D. Radio-frequency identification

**Answer: A. Online analytical processing (OLAP)**
The presentation technologies include OLAP, visualization, dashboards, scorecards and business performance management.
**Source: PDF page 60.**

## 29. The left table contains unique IDs 1, 2 and 3; the right contains unique IDs 2, 3 and 4. Which IDs appear in an inner join on ID?

A. 1, 2 and 3 only
B. 2, 3 and 4 only
C. 2 and 3 only
D. 1, 2, 3 and 4

**Answer: C. 2 and 3 only**
An inner join retains only IDs with matches in both tables.
**Source: PDF page 184.**

## 30. According to the notes, how does analytics relate to BI?

A. Analytics concerns only data storage
B. Analytics excludes forecasts and simulations
C. Analytics is a subset of BI
D. BI is a subset of spreadsheet formatting

**Answer: C. Analytics is a subset of BI**
Analytics includes statistical analyses, forecasts, models and simulations within the broader BI scope.
**Source: PDF page 66.**

## 31. A string field contains a location code and employee ID separated consistently by a delimiter. Which operation best creates separate Location and EmployeeID fields?

A. Percent of Total
B. Split or custom split
C. Full outer join
D. Continuous-axis conversion

**Answer: B. Split or custom split**
Splitting separates multiple units of information in a string using a separator or repeated pattern.
**Source: PDF pages 189, 193.**

## 32. A team delivers working BI features in small chunks and repeatedly builds on them. Which methodology best fits?

A. Complete outsourcing
B. Waterfall
C. Vendor standardization
D. Agile

**Answer: D. Agile**
Agile repeats a development sequence in smaller increments.
**Source: PDF page 77.**

## 33. A company develops its BI solution internally using tools purchased from vendors. Which sourcing approach matches the notes?

A. In-house development using acquired vendor tools
B. Completely in-house development of both tools and solution
C. Complete outsourcing
D. Outsourced development using only internal tools

**Answer: A. In-house development using acquired vendor tools**
Tool sourcing and solution development are separate choices; external tools can support internal development.
**Source: PDF pages 73, 74.**

## 34. A product has three order lines: in 2025, price 10 with quantity 3 and price 8 with quantity 5; in 2026, price 12 with quantity 2. After the lab's calculations and grouping by ProductID and Year, what totals should appear?

A. 2025: 94; 2026: 94
B. 2025: 70; 2026: 24
C. 2025: 18; 2026: 12
D. 2025: 144; 2026: 24

**Answer: B. 2025: 70; 2026: 24**
Line totals are 30, 40 and 24. Summing within each product-year gives 70 for 2025 and 24 for 2026.
**Source: PDF pages 150, 151.**

## 35. A BI team tests the current iteration, trains users and rolls out the solution. Which step is this?

A. Review
B. Design
C. Deploy
D. Analyse

**Answer: C. Deploy**
The deployment step includes testing the iteration, training and rollout.
**Source: PDF page 81.**

## 36. The lab calculates Line Total as UnitPrice multiplied by Quantity. For a unit price of 12.50 and quantity of 8, what is Line Total?

A. 1.5625
B. 1250.00
C. 100.00
D. 20.50

**Answer: C. 100.00**
Using the lab's formula, 12.50 multiplied by 8 equals 100.00.
**Source: PDF page 150.**

## 37. Which combination best describes a BI roadmap?

A. List only vendors with strong execution scores
B. Specify only hardware purchases and no business direction
C. Define scope and exclusions, and align BI provision with corporate strategy
D. Choose chart colors and ignore business objectives

**Answer: C. Define scope and exclusions, and align BI provision with corporate strategy**
The roadmap clarifies what is covered and checks alignment with business strategy.
**Source: PDF page 131.**

## 38. What is a data warehouse according to the notes?

A. A policy assigning rights to approve BI investments
B. A chart that compares performance with a target
C. A method for converting intuition into explicit knowledge
D. A single logical repository for an organization's data

**Answer: D. A single logical repository for an organization's data**
The notes define a warehouse as a single logical data repository.
**Source: PDF page 28.**

## 39. A product has Line Total 30 in 2024 and Line Total 40 in 2025. You need sales per product per year. Which grouping correctly preserves that requirement?

A. Group only by Year, then count ProductID
B. Group only by ProductID, then sum Line Total
C. Group by ProductID and Year, then sum Line Total
D. Group by UnitPrice, then average Year

**Answer: C. Group by ProductID and Year, then sum Line Total**
Using both ProductID and Year keeps separate yearly totals for each product; grouping only by product combines years.
**Source: PDF page 151.**

## 40. Which BI capability links structured and unstructured content from multiple sources?

A. Organizational memory alone
B. Presentation
C. Business governance
D. Information integration

**Answer: D. Information integration**
Integration synthesizes diverse content before it is used to produce insights.
**Source: PDF page 50.**

## 41. In a Tableau treemap, Sales is assigned to Size and Profit to Color. Two categories have equal total sales but different profits. What should you expect?

A. Rectangle areas determined by the number of letters in category names
B. Different areas determined only by profit
C. Equal rectangle areas but potentially different colors
D. Identical colors because sales is equal

**Answer: C. Equal rectangle areas but potentially different colors**
Sales controls size, while Profit independently controls color.
**Source: PDF pages 176, 177.**

## 42. SUM(Sales) is continuous and placed on Tableau's Columns shelf. What does it create?

A. A data-source filter
B. Only row headers
C. A vertical axis
D. A horizontal axis

**Answer: D. A horizontal axis**
A continuous field creates an axis; placement on Columns makes it horizontal.
**Source: PDF page 167.**

## 43. A BI application can be expanded as its user base and data volume grow. Which characteristic is being demonstrated?

A. Scalability
B. Portability
C. Usability
D. Accuracy

**Answer: A. Scalability**
Scalability is the ability to expand with more users and more data.
**Source: PDF page 72.**

## 44. Why can a quantitative ROI estimate for BI be difficult?

A. BI investments have no costs
B. Every benefit must occur before deployment
C. Some payoffs are long term and hard to compute
D. BI never produces business benefits

**Answer: C. Some payoffs are long term and hard to compute**
Long-term benefits can be difficult to quantify, so the fundamental value proposition may also matter.
**Source: PDF page 105.**

## 45. Which user category mainly consumes information and lacks BI expertise?

A. Business users
B. Middle-class users at all times
C. Powerful users
D. BI developers by definition

**Answer: A. Business users**
Business users are described as information consumers without BI expertise.
**Source: PDF page 86.**

## 46. A dataset is accurate and complete, but its contents do not support the business objective being analysed. Which dimension is deficient?

A. Consistency
B. Existence
C. Validity
D. Relevance

**Answer: D. Relevance**
Relevance asks whether the available data is appropriate for the business objectives.
**Source: PDF page 114.**

## 47. Which pair is listed as enabling information integration?

A. Data warehousing and ERP
B. Scorecards and digital dashboards
C. Business analytics and data mining
D. Text mining and web mining

**Answer: D. Text mining and web mining**
Text and web mining help bring unstructured and external content into integrated information.
**Source: PDF pages 52, 62.**

## 48. A firm stores past practices and lessons learned in a repository. Which development explains this organizational-memory need?

A. External information has disappeared
B. Knowledge is increasingly stored in explicit form
C. All knowledge has become tacit
D. Presentation is no longer needed

**Answer: B. Knowledge is increasingly stored in explicit form**
Explicit repositories, including lessons-learned systems, increase the content available to organizational memory.
**Source: PDF page 48.**

## 49. A firm's warehouse preserves historical sales, and an analyst can discover patterns, but current customer comments and competitor reports never reach the analysis. Which change most directly enables better insights without merely altering the dashboard?

A. Integrate the current unstructured and external sources before analysis
B. Increase historical storage without adding current sources
C. Move all reports into a single worksheet without combining their sources
D. Customize only the dashboard's colors for each manager

**Answer: A. Integrate the current unstructured and external sources before analysis**
The missing step is information integration: insight creation needs synthesized historical and current content, including external and unstructured sources.
**Source: PDF pages 43, 50, 54.**

## 50. Which chart in the notes is a line chart with the area between the line and axis shaded, often used for accumulated totals over time?

A. Histogram
B. Bullet graph
C. Treemap
D. Area chart

**Answer: D. Area chart**
An area chart shades the area under a line and is commonly used for totals over time.
**Source: PDF page 167.**

## 51. Tesco's redemption rate is about 20%, compared with an industry norm of about 2%. Approximately how many times the norm is Tesco's rate?

A. 100 times
B. 2 times
C. 18 times
D. 10 times

**Answer: D. 10 times**
Divide 20% by 2% to obtain a factor of 10. These are the figures reported in the case.
**Source: PDF page 15.**

## 52. A list contains 161.2, 175.3 and 166.4 with no description. What does this list best represent?

A. Knowledge
B. Data
C. A BI strategy
D. Information

**Answer: B. Data**
The values become information when context, such as student heights, is added.
**Source: PDF page 8.**

## 53. A BI improvement plan must address untrained staff, unsuitable software and aging hardware. Which order and scope best follow the notes?

A. Buy hardware first, postpone software choice, and assume users need no development
B. Assess staff skills and resourcing, investigate software fit, then build hardware architecture around that fit
C. Change only report ownership because infrastructure cannot affect delivery
D. Replace all people considerations with a larger historical archive

**Answer: B. Assess staff skills and resourcing, investigate software fit, then build hardware architecture around that fit**
Capability improvement includes people and infrastructure. The notes advise investigating suitable software before shaping hardware around it.
**Source: PDF page 137.**

## 54. In the St. Joseph Medical Center case, what did analysing patterns of high glucose readings help the organization do?

A. Replace authorized access with public patient dashboards
B. Focus exclusively on the hospital's bed count
C. Identify potential problems earlier and support timely care
D. Eliminate the need for patient reports

**Answer: C. Identify potential problems earlier and support timely care**
The case illustrates earlier identification of potential problems and useful information for authorized healthcare staff.
**Source: PDF page 142.**

## 55. A stacked histogram label uses Percent of Total, but you want segment percentages within each individual bar. What adjustment does the lab specify?

A. Convert every dimension to a continuous measure
B. Sort the rows by the source filename
C. Replace the histogram with a union
D. Edit the table calculation and set Compute Using to Cell

**Answer: D. Edit the table calculation and set Compute Using to Cell**
The lab changes Compute Using to Cell to obtain percentages on a per-bar basis.
**Source: PDF pages 175, 176.**

## 56. A firm faces global competition and must consider both structured sales records and unstructured market reports. Which BI driver is most directly illustrated?

A. Reduced data availability
B. A preference for identical dashboards
C. A decreasing need for integration
D. Increasingly complicated decisions

**Answer: D. Increasingly complicated decisions**
More diverse factors and sources make decisions more complex.
**Source: PDF page 18.**

## 57. Which pair primarily enables insight creation in the notes?

A. Environmental scanning and RFID
B. Data mining and business analytics
C. Document management and knowledge repositories
D. Visualization and scorecards

**Answer: B. Data mining and business analytics**
Data mining, business analytics and real-time decision support enable insight creation.
**Source: PDF page 57.**

## 58. Analysts spend most of their time programming data extraction rather than interpreting results. Which BI strategy problem does this illustrate?

A. Too much organizational alignment
B. A lack of continuous green fields
C. Analyst programming rather than analysts analysing
D. Excessive customer retention

**Answer: C. Analyst programming rather than analysts analysing**
The notes identify extraction programming that displaces analysis as a reason to develop a BI strategy.
**Source: PDF page 128.**

## 59. You need to show the shape of the distribution of quantities per order by grouping numeric values into bins. Which chart is most appropriate?

A. Treemap
B. A bar chart grouped only by product category
C. Bullet graph
D. Histogram

**Answer: D. Histogram**
A histogram displays a distribution by grouping a continuous measure into ranges or bins.
**Source: PDF page 173.**

## 60. From a BI perspective, how should big data be viewed?

A. A replacement for every BI capability
B. Another source of data and digital content for analysis
C. A guarantee that data quality problems disappear
D. A source that can never include unstructured information

**Answer: B. Another source of data and digital content for analysis**
Big data can supply content for BI rather than replacing its capabilities.
**Source: PDF page 67.**

## 61. Which risk is associated with excessive tool customization?

A. Data automatically becomes more accurate
B. Users may spend time on tools rather than business tasks
C. Every user is forced to see identical reports
D. All tools lose the ability to create queries

**Answer: B. Users may spend time on tools rather than business tasks**
Customization can waste time and produce queries that are not useful to everyone; excessive standardization can be restrictive.
**Source: PDF page 87.**

## 62. Managers receive useful patterns, but cannot interpret the technical reports. Which action best addresses the immediate bottleneck?

A. Present the insights in a form suited to their roles and tasks
B. Stop combining external information
C. Increase the number of historical records without changing reports
D. Replace predictive analysis with additional storage

**Answer: A. Present the insights in a form suited to their roles and tasks**
Useful insights require an appropriate presentation to reach decision makers effectively.
**Source: PDF pages 58, 59.**

## 63. The left table has unique IDs 1 and 2; the right has unique IDs 2 and 3. How many rows result from a full outer join, and how many have unmatched fields on one side?

A. 1 row, with no unmatched fields
B. 3 rows, with 2 rows having unmatched fields
C. 2 rows, with 1 row having unmatched fields
D. 4 rows, with all rows fully matched

**Answer: B. 3 rows, with 2 rows having unmatched fields**
ID 2 matches; IDs 1 and 3 are both retained with nulls on their missing side.
**Source: PDF page 184.**

## 64. A hotel manager has only minutes to accept or reject an online room bid. Which BI driver is most directly illustrated?

A. Need for comprehensive documentation
B. Need for quick reflexes
C. Need for standardized report ownership
D. Need for tacit knowledge conversion

**Answer: B. Need for quick reflexes**
A rapidly closing decision window requires timely, actionable information.
**Source: PDF pages 19, 21.**

## 65. A team identifies scope, deliverables, staffing and cost-benefit considerations. Which primary BI development step is this?

A. Design
B. Plan
C. Review
D. Analyse

**Answer: B. Plan**
These items are listed as planning responsibilities.
**Source: PDF page 81.**

## 66. Which pair constitutes BI infrastructure in the notes?

A. Data infrastructure and organizational culture
B. Development and sourcing
C. Governance and centralization
D. Roadmap and release schedules

**Answer: A. Data infrastructure and organizational culture**
Both the available data and the organization's culture affect BI success.
**Source: PDF page 112.**

## 67. Which set contains all three delays that effective BI can help reduce?

A. Planning, design and long-term budgeting
B. Recruiting staff, purchasing buildings and auditing payroll
C. Converting data, integrating information and delivering results to decision makers
D. Creating knowledge, forgetting knowledge and deleting knowledge

**Answer: C. Converting data, integrating information and delivering results to decision makers**
The notes identify conversion, integration and availability of results as constraints on quick responses.
**Source: PDF page 20.**

## 68. Which factor belongs to ability to execute rather than completeness of vision in the classification criteria?

A. Market understanding
B. Innovation
C. Geographic strategy
D. Customer experience

**Answer: D. Customer experience**
Customer experience is an execution criterion; the other options are vision criteria.
**Source: PDF pages 92, 93.**

## 69. What does the Applied Steps list in Power Query record?

A. The successive query activities and transformations
B. Only the final worksheet's formatting choices
C. Only the source's original column names
D. Only rows rejected by data filters

**Answer: A. The successive query activities and transformations**
The lab states that each query activity creates a step listed under Applied Steps.
**Source: PDF page 149.**

## 70. Departments publish different revenue figures and also use the same label for different calculations. Which pair of strategy issues is most directly illustrated?

A. Personnel overhead and hardware portability
B. Low data velocity and excess visualization
C. Lack of dashboard colors and report pinning
D. Multiple versions of the truth and unclear business logic

**Answer: D. Multiple versions of the truth and unclear business logic**
Conflicting figures concern versions of the truth; inconsistent term definitions concern business logic.
**Source: PDF page 127.**

## 71. Order records refer to customer identifiers that are absent from the customer dataset. Which dimension is most directly affected?

A. Existence of the entire order dataset
B. Integrity
C. Validity of the order-date format
D. Relevance of sales analysis

**Answer: B. Integrity**
Integrity concerns complete relationships between data elements and across datasets.
**Source: PDF page 114.**

## 72. A mobile operator analyses usage patterns to identify customers likely to switch carriers. What is the most direct objective?

A. Improve customer retention
B. Standardize the operating systems of all customers
C. Reduce the number of data sources by ignoring usage
D. Replace customer history with random offers

**Answer: A. Improve customer retention**
The example uses BI to identify likely defections and target retention efforts.
**Source: PDF page 36.**

## 73. In Power Query, you select Year, Winners and Score and choose Remove Other Columns. What remains?

A. Only the first selected column
B. Only Year, Winners and Score
C. Every column except Year, Winners and Score
D. Only rows with non-null scores

**Answer: B. Only Year, Winners and Score**
Remove Other Columns retains the selected columns and removes the unselected ones.
**Source: PDF page 147.**

## 74. A company uses externally sourced BI tools and an external developer for the solution. Which sourcing approach fits?

A. Internal development using vendor tools
B. Joint development with internal tools only
C. Completely in-house development
D. Complete outsourcing

**Answer: D. Complete outsourcing**
The complete-outsourcing category uses external development and external tools.
**Source: PDF page 74.**

## 75. A BI review reports only planned benefits and ignores unexpected costs and user feedback. Which improvement best follows the notes?

A. Compare progress with the business case and include unexpected effects and user input
B. Evaluate only the number of dashboards created
C. Ignore effects on customers and suppliers
D. Discard the business-case baseline

**Answer: A. Compare progress with the business case and include unexpected effects and user input**
Evaluation should revisit expectations, account for unexpected benefits and costs, and use user feedback.
**Source: PDF page 110.**

## 76. Two systems both record a delivery as 5 October, but it actually happened on 6 October. Which assessment is correct?

A. The records are consistent with each other but inaccurate
B. The records are accurate but inconsistent
C. The matching dates prove all quality dimensions are satisfied
D. The records necessarily violate existence but satisfy accuracy

**Answer: A. The records are consistent with each other but inaccurate**
Consistency across copies does not guarantee that the data correctly describes the real object or event.
**Source: PDF page 114.**

## 77. Why is a business case important for BI?

A. It guarantees that every benefit has a precise short-term monetary value
B. It justifies investment and helps obtain continuing resources
C. It proves that data quality is irrelevant
D. It removes the need for organizational support

**Answer: B. It justifies investment and helps obtain continuing resources**
BI needs resources; a business case explains its organizational benefits and investment value.
**Source: PDF pages 103, 105.**

## 78. A vendor has limited ability to execute but strong completeness of vision. Which classification applies?

A. Niche player
B. Leader
C. Visionary
D. Challenger

**Answer: C. Visionary**
Visionaries have strong vision but limited execution. Leaders are strong on both dimensions.
**Source: PDF page 91.**

## 79. A slow operational database is under heavy query load. Immediate updates are not required for the analysis. Which connection choice best fits the guidance?

A. Use a field split to obtain real-time updates
B. Use an extract to improve analytical performance and reduce source query load
C. Use a union to eliminate all query load
D. Use live solely because live can never be slow

**Answer: B. Use an extract to improve analytical performance and reduce source query load**
An extract can help with slow databases and take query load off critical systems; live is useful for current source changes.
**Source: PDF page 188.**

## 80. Which statement correctly describes the relationship between BI and knowledge management (KM)?

A. BI results can become useful inputs to KM
B. KM excludes information and knowledge
C. BI depends only on tacit knowledge
D. KM and BI have exactly the same inputs and processes

**Answer: A. BI results can become useful inputs to KM**
BI relies critically on data; its results can feed knowledge management.
**Source: PDF page 25.**

## 81. A required dataset has never been collected. Which data-quality dimension is most directly affected?

A. Consistency
B. Validity
C. Existence
D. Accuracy

**Answer: C. Existence**
Existence asks whether the organization has the data.
**Source: PDF page 114.**

## 82. Why did PhoneWorks add LucidEra's sales analytics solution to its existing Salesforce use?

A. It had no current business reports of any kind
B. It wanted to measure only the total number of employees
C. It needed historical analysis and stage-by-stage sales-cycle insight
D. It wanted to stop tracking sales metrics

**Answer: C. It needed historical analysis and stage-by-stage sales-cycle insight**
Its static current reports did not adequately support historical trends or visibility into sales-cycle bottlenecks.
**Source: PDF page 144.**

## 83. Which Tableau pairing is correct according to the notes?

A. Both discrete and continuous fields always create headers
B. Discrete fields are green and create axes; continuous fields are blue and create headers
C. Blue always means dimension and green always means measure
D. Discrete fields are blue and create headers; continuous fields are green and create axes

**Answer: D. Discrete fields are blue and create headers; continuous fields are green and create axes**
The color distinction denotes discrete versus continuous behavior, rather than an absolute dimension-versus-measure distinction.
**Source: PDF pages 166, 167.**

## 84. In the lab, which fields are used to match Products with Total Sales during a merge?

A. ProductName and Year
B. Products.ProductID and Total Sales.Order_Details.ProductID
C. CategoryID and Line Total
D. QuantityPerUnit and Total Sales

**Answer: B. Products.ProductID and Total Sales.Order_Details.ProductID**
The merge matches the product identifier in each query.
**Source: PDF page 152.**

## 85. You have daily transactional data and quarterly data from a source that does not allow joins. Which combining method is most appropriate according to the notes?

A. An inner join that the source does not support
B. Union solely because both sources contain dates
C. Data blending
D. A metadata rename that appends the records

**Answer: C. Data blending**
Blending is useful when joins are unavailable and when sources have different levels of detail.
**Source: PDF page 186.**

## 86. Which sequence matches the primary BI development steps in the notes?

A. Design, Plan, Build, Analyse, Review, Deploy
B. Plan, Analyse, Design, Build, Deploy, Review
C. Plan, Design, Review, Analyse, Deploy, Build
D. Analyse, Build, Plan, Review, Design, Deploy

**Answer: B. Plan, Analyse, Design, Build, Deploy, Review**
The six primary stages appear in this order; iterative work can revisit them.
**Source: PDF pages 81, 82.**

## 87. Which pair of technologies primarily enables organizational memory?

A. Visualization and scorecards
B. Text mining and environmental scanning
C. Data warehousing and knowledge repositories
D. Business analytics and real-time decision support

**Answer: C. Data warehousing and knowledge repositories**
Warehouses and knowledge repositories preserve organizational content and history.
**Source: PDF page 49.**

## 88. A dashboard needs to compare a primary performance measure with one or more comparison measures. Which chart is specifically described for this purpose?

A. Treemap
B. Area chart
C. Histogram
D. Bullet graph

**Answer: D. Bullet graph**
The bullet graph is a bar-graph variation used to compare a primary measure with other measures.
**Source: PDF page 172.**

## 89. A firm standardizes its historical repositories, customizes integration by role, insight tools by role and task, and presentation by role, task and individual. How does this compare with the notes?

A. It matches all four customization recommendations
B. Integration should instead be customized for every individual
C. Only the organizational-memory policy matches
D. Presentation should have no customization

**Answer: A. It matches all four customization recommendations**
The recommended extent of customization increases across the four capabilities in precisely this pattern.
**Source: PDF pages 88, 89.**

## 90. A field accepts only values 1 to 5, but a record contains 9. Which data-quality dimension is most directly violated?

A. Existence
B. Consistency
C. Relevance
D. Validity

**Answer: D. Validity**
Validity concerns whether values fall within an acceptable range or domain.
**Source: PDF page 114.**

## 91. The same customer's postcode differs between two systems. Which dimension is most directly affected?

A. Integrity
B. Consistency
C. Relevance
D. Existence

**Answer: B. Consistency**
Consistency asks whether the same data stored in different places has the same values.
**Source: PDF page 114.**

## 92. A manager uses daily burger sales and bread inventory to decide how much bread to order. What does this best demonstrate?

A. Uncontextualized data
B. A presentation preference
C. Knowledge
D. Data storage alone

**Answer: C. Knowledge**
The manager applies an understood relationship between sales, inventory and ordering.
**Source: PDF page 9.**

## 93. Which activity best exemplifies data mining?

A. Appending rows from identical monthly tables
B. Discovering hidden patterns in electronically stored data
C. Displaying a saved workbook thumbnail
D. Assigning a geographic role to a column

**Answer: B. Discovering hidden patterns in electronically stored data**
Data mining discovers hidden patterns; the other activities concern preparation or presentation.
**Source: PDF page 28.**

## 94. A dashboard displays the same valid information to every employee, but executives and support staff find it unsuitable for their different jobs. Which capability most directly needs improvement?

A. Information integration
B. Data storage
C. Organizational memory
D. Presentation

**Answer: D. Presentation**
Presentation should adapt information to users' roles, tasks and preferences.
**Source: PDF pages 58, 59.**

## 95. A BI solution can be changed quickly when the business context changes. Which characteristic is most directly illustrated?

A. Accuracy
B. Flexibility
C. Scalability
D. Portability

**Answer: B. Flexibility**
Flexibility is ease and speed of adapting to changing business conditions.
**Source: PDF page 72.**

## 96. A left table contains two rows for ID 1, one for ID 2 and one for ID 3. The right table has three rows for ID 2, two for ID 3 and one for ID 4. A left join matches on ID. How many result rows appear, and how many have null right-side fields?

A. 6 rows; 1 with null right-side fields
B. 7 rows; 2 with null right-side fields
C. 8 rows; 3 with null right-side fields
D. 4 rows; 2 with null right-side fields

**Answer: B. 7 rows; 2 with null right-side fields**
The two ID 1 rows are retained unmatched. ID 2 produces 3 matches and ID 3 produces 2: 2 + 3 + 2 = 7. ID 4 is not retained by this left join.
**Source: PDF pages 183, 184.**

## 97. According to the notes, what is the central purpose of business intelligence?

A. Provide decision makers with useful information and knowledge
B. Replace every operational system with a dashboard
C. Store only external numerical data
D. Convert every business decision into an automatic rule

**Answer: A. Provide decision makers with useful information and knowledge**
BI draws on varied data and information sources to support decisions.
**Source: PDF page 11.**

## 98. You rename and hide fields in Tableau's metadata area. What happens to the underlying source data according to the notes?

A. It is not modified by those metadata changes
B. Its original column names are permanently overwritten
C. All hidden columns are deleted from the database
D. Every row is automatically aggregated

**Answer: A. It is not modified by those metadata changes**
These metadata changes alter Tableau's data-source representation, without changing the underlying data.
**Source: PDF page 188.**

## 99. An archive contains database records, emails, videos and presentation slides. Which conclusion follows from the notes?

A. Only videos qualify as explicit knowledge
B. Organizational memory can contain more than structured database records
C. Archived emails automatically constitute new insights
D. Organizational memory must exclude electronic documents

**Answer: B. Organizational memory can contain more than structured database records**
The organizational-memory examples include many structured and unstructured electronic formats.
**Source: PDF pages 46, 47.**

## 100. An oil and gas company delivers on time but sends invoices a week late. Which BI benefit does detecting this problem most directly support?

A. Complete outsourcing of BI
B. Conversion of all tacit knowledge
C. Improvement in operational performance
D. Increased report decentralization

**Answer: C. Improvement in operational performance**
Identifying delayed invoicing reveals an operational problem that can be corrected.
**Source: PDF page 35.**

## 101. According to the notes, decision support systems use data together with what to create rules guiding decisions?

A. Prior knowledge
B. Only storage-cost estimates
C. Only dashboard colors
D. Only external web pages

**Answer: A. Prior knowledge**
DSS combines data and prior knowledge to form rules for decisions.
**Source: PDF page 28.**

## 102. In the Tesco case, which activity belongs to the broader BI process described in the notes?

A. Replacing all sales transactions with intuition
B. Removing customer categories from analysis
C. Tracking redemption rates in detail
D. Manufacturing rewards cards

**Answer: C. Tracking redemption rates in detail**
The case explicitly includes detailed tracking of redemption rates in the BI process.
**Source: PDF page 15.**

## 103. In Tableau, which field would normally be used as a dimension for categorizing sales?

A. Quantity sold as an aggregated measure
B. Sales amount
C. Profit amount
D. Product category

**Answer: D. Product category**
Dimensions contain qualitative values and categorize or segment data; measures contain quantitative values.
**Source: PDF page 166.**

## 104. An organization collects large amounts of video, geospatial data and machine logs. Which big-data characteristic is most clearly illustrated by the different formats?

A. Consistency
B. Velocity
C. Variety
D. Centralization

**Answer: C. Variety**
Different content types illustrate variety; the speed of generation would illustrate velocity.
**Source: PDF pages 64, 65.**

## 105. BI solutions focus on individual departments, but their reports are centrally provided as standard solution components. Which conclusion is best?

A. Both dimensions are necessarily fully decentralized
B. Solution focus is more decentralized, while report development is more centralized
C. Both dimensions are necessarily fully centralized
D. Centralization cannot be assessed separately for solutions and reports

**Answer: B. Solution focus is more decentralized, while report development is more centralized**
The notes distinguish enterprise versus departmental focus from centralized versus user-developed reports.
**Source: PDF page 122.**

## 106. Which set contains the three interacting aspects of BI management?

A. Planning, hardware and chart colors
B. Volume, variety and velocity
C. Processes, infrastructure and structures
D. Data, information and knowledge

**Answer: C. Processes, infrastructure and structures**
The management framework comprises processes, infrastructure and structures.
**Source: PDF page 101.**

## 107. Which vendor-selection choice best describes strategic buying?

A. Establishing long-term relationships with a few preferred vendors
B. Choosing a vendor independently for every particular need
C. Purchasing only visualization tools
D. Letting each employee buy tools without coordination

**Answer: A. Establishing long-term relationships with a few preferred vendors**
Strategic buying emphasizes long-term preferred relationships; tactical buying selects options for particular needs.
**Source: PDF page 75.**

## 108. A BI pilot has an extensive archive and can display reports. Its recommendations remain outdated because staff analyse only historical records, even though current competitor information is available. Which diagnosis best fits?

A. Presentation alone will create the missing external information
B. Organizational memory is present, but current-source integration must improve to support timely insight creation
C. The archive proves all four capabilities are effective
D. Organizational memory should be eliminated because integration uses only external data

**Answer: B. Organizational memory is present, but current-source integration must improve to support timely insight creation**
Memory supplies accumulated history; integration must synthesize current and external content so insights can reflect ongoing events.
**Source: PDF pages 43, 50, 55.**

## 109. A team creates detailed specifications for all four BI capabilities. Which step is this?

A. Design
B. Review
C. Build
D. Deploy

**Answer: A. Design**
Design produces detailed specifications for the capabilities.
**Source: PDF page 81.**

## 110. Which pairing correctly distinguishes architectural blueprint from implementation planning?

A. Blueprint sets release schedules; planning determines only customer categories
B. Blueprint defines BI structure, funding and reporting; planning defines release schedules and documentation expectations
C. Blueprint handles only data accuracy; planning handles only vendor innovation
D. Blueprint calculates line totals; planning assigns continuous field colors

**Answer: B. Blueprint defines BI structure, funding and reporting; planning defines release schedules and documentation expectations**
The blueprint concerns how BI is organized; implementation planning concerns carrying out the agreed strategy.
**Source: PDF pages 135, 138.**

## 111. A BI solution works on several software and hardware platforms. Which characteristic is most directly illustrated?

A. Flexibility
B. Connectivity
C. Intelligence
D. Portability

**Answer: D. Portability**
Portability concerns operation across different platforms.
**Source: PDF page 72.**

## 112. Which pair correctly distinguishes BI as a product from BI as a process?

A. Raw transaction records; deleting obsolete records
B. Software licensing; purchasing hardware
C. Useful information and knowledge; obtaining, analysing and distributing them
D. A database server; installing that server

**Answer: C. Useful information and knowledge; obtaining, analysing and distributing them**
The product is the useful output; the process produces and distributes it.
**Source: PDF page 13.**

## 113. A user usually consumes reports but occasionally creates queries and performs extra analysis. Which category best fits?

A. Business users who never design reports
B. Middle class
C. Powerful users only
D. External vendors

**Answer: B. Middle class**
The middle class usually behaves like business users but sometimes designs reports, queries or additional analyses.
**Source: PDF page 86.**

## 114. A solution runs on multiple platforms but cannot exchange data effectively with the firm's ERP system. Which characteristic is most clearly deficient?

A. Scalability
B. Intelligence
C. Connectivity
D. Portability

**Answer: C. Connectivity**
Connectivity concerns effective interfaces with other information technologies; portability is already present.
**Source: PDF page 72.**

## 115. Which situation most directly creates a need for information integration?

A. Relevant records reside in disconnected, incompatible systems
B. All information is already unified and complete
C. Users only want a different font size
D. A workbook has too many pinned thumbnails

**Answer: A. Relevant records reside in disconnected, incompatible systems**
Disconnected transactional systems are one of the listed reasons for integration.
**Source: PDF page 51.**

## 116. Which pairing correctly links a BI solution feature to its supporting capability?

A. Benchmarking - presentation
B. Convenience - organizational memory
C. Intelligence - organizational memory alone
D. Convenience - presentation

**Answer: D. Convenience - presentation**
Convenience concerns outputs in an appropriate, user-friendly form and is linked to presentation.
**Source: PDF page 44.**

## 117. A team models business processes, develops metrics and assesses organizational readiness. Which step is this?

A. Plan
B. Build
C. Analyse
D. Deploy

**Answer: C. Analyse**
Process models, metrics, user involvement and readiness assessment belong to analysis.
**Source: PDF page 81.**

## 118. A team finishes one development stage before beginning the next in a strictly sequential process. Which methodology is it using?

A. Waterfall
B. Data blending
C. Agile
D. Environmental scanning

**Answer: A. Waterfall**
Waterfall follows stages sequentially, completing each before moving on.
**Source: PDF page 77.**

## 119. A retailer combines ERP records with competitor web information and customer comments. Which capability is doing the combining?

A. Presentation
B. Organizational memory alone
C. Insight creation alone
D. Information integration

**Answer: D. Information integration**
The combining stage links structured internal records with external and unstructured content.
**Source: PDF pages 50, 54.**

## 120. Which item is the clearest example of tacit knowledge?

A. A written incident report
B. A procedure documented in a manual
C. An experienced manager estimates work using intuition
D. A published financial statement

**Answer: C. An experienced manager estimates work using intuition**
Tacit knowledge is undocumented and often rests on experience or intuition.
**Source: PDF page 24.**
