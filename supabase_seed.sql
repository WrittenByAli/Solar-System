-- ============================================================
-- SOLAR Archive — Phase 2A Seed Data
-- Run AFTER supabase_schema.sql.
-- Inserts 64 static subjects as approved archive entries,
-- spread across L4-L8 depth and all ten hubs so neither the
-- map nor any single hub reads as clustered.
--
-- Distribution: L4=20, L5=16, L6=12, L7=10, L8=6 (64 total)
-- Hub sizes: mercury/venus/sun/earth=7 each, remaining six hubs=6 each
--
-- Coordinates deliberately sit at lx/ly 18-21 (a +20/+20 offset from the
-- natural 0-3 range). Every hub's L2/L3 compass taxonomy (see
-- compileHubTaxonomy.js) places its own topic leaves at lx in [-4,4] and
-- ly in [-4,4] -- seeding inside that box silently overwrites real
-- curriculum topics (e.g. "Maxwell's Four Equations") with generic seed
-- content, since ArchiveGrid merges DB rows over static/taxonomy content
-- keyed by the same coordinate. Keep new seed coordinates well outside
-- [-4,4]x[-4,4] for every hub, including star/Foundation.
-- ============================================================

-- Clear existing seed data before re-seeding (idempotent).
-- Only removes approved entries without a submitted_by author
-- (i.e. seeded entries, not user submissions).
delete from archive_entries
where status = 'approved' and submitted_by is null;

insert into archive_entries
  (title, short_summary, content, layer, planet_id, hub_id, coord_x, coord_y, status)
values

-- ══════════════════════════════════════════════════════════
-- SUN — Physics / Energy  (7 entries: L4x2 L5x2 L6x2 L7x1)
-- ══════════════════════════════════════════════════════════
(
  $$Geothermal Energy$$,
  $$Under the ground of each planet or hub is heat. The Sun hub studies how to use this heat for energy. This includes drilling deep to reach hot areas and using systems that store heat for later use. By combining geothermal energy with solar power, the hubs can have constant energy. For example, Mars uses geothermal heat to keep habitats warm, and Earth can use it to reduce fossil fuel use. This energy is steady, reliable, and always available.$$,
  '', 4, 'sun', 'sun', 18, 23, 'approved'
),
(
  $$Solar Power$$,
  $$The Sun hub uses solar panels and mirrors to collect sunlight. Some panels are built into windows or rooftops. Others use large mirrors to focus sunlight and store it in molten salts, which hold heat for hours. This energy is shared with other hubs. Venus's greenhouses use thin-film solar panels, while Neptune uses sunlight to help clean water. Mars has panels designed to survive dust storms. This shows how solar energy can be adapted to different conditions.$$,
  '', 4, 'sun', 'sun', 19, 23, 'approved'
),
(
  $$Fusion Research$$,
  $$Fusion is the long-term energy solution. The Sun hub tests tokamaks, stellarators, and laser-based fusion methods. Success in fusion would provide almost limitless clean energy. Mars, Jupiter, and Earth all use lessons from fusion experiments to power other systems. Fusion could eventually make the entire SOLAR system almost independent from solar panels or batteries.$$,
  '', 5, 'sun', 'sun', 20, 22, 'approved'
),
(
  $$Materials for Energy Systems$$,
  $$Energy systems need special materials. The Sun hub develops strong metals, heat-resistant ceramics, and lightweight composites. These materials are used in turbines, solar panels, batteries, and fusion reactors. Mars tests them under harsh conditions, Mercury uses them in production, and Neptune applies them in water systems. Good materials make energy systems last longer and work better.$$,
  '', 5, 'sun', 'sun', 21, 22, 'approved'
),
(
  $$Hydrogen Energy$$, '',
  $$Hydrogen stores energy that solar panels and geothermal plants generate throughout the day. The Sun hub produces hydrogen from electricity through electrolysis, splitting water into oxygen and hydrogen gas. Compressed and liquefied hydrogen can be stored safely in tanks for weeks without significant energy loss. Fuel cells convert stored hydrogen back into electricity whenever a hub's demand spikes unexpectedly. Jupiter's data systems track hydrogen flows in real time, routing surplus tanks toward hubs running low. Earth uses hydrogen fuel cells to cut fossil fuel use in transport, while Saturn uses it to keep nutrient-cycling equipment running during outages.$$,
  6, 'sun', 'sun', 20, 23, 'approved'
),
(
  $$Sodium-Based Batteries$$, '',
  $$Lithium reserves are limited, so the Sun hub researches sodium-ion batteries as a cheaper alternative. Sodium is abundant and can be extracted from seawater and common mineral deposits at low cost. These batteries store surplus energy from solar arrays and geothermal plants for use after dark. Sodium-ion cells tolerate cold better than lithium, which matters for Mars habitat battery banks. Venus integrates sodium battery packs into greenhouse control systems to prevent power interruptions. Large-scale sodium battery farms are cheaper to build than lithium equivalents, letting more hubs afford grid-level storage.$$,
  6, 'sun', 'sun', 21, 23, 'approved'
),
(
  $$Smart Energy Distribution$$, '',
  $$Energy only matters if it reaches the hub that needs it at the moment it needs it. The Sun hub builds smart grids that reroute power automatically without waiting for human operators. Microgrids let individual hubs keep operating even if the main connection to the Sun hub fails. Machine learning models predict demand spikes hours in advance by watching weather and usage patterns. When Neptune's desalination plants draw a sudden surge, the grid shifts spare capacity from Saturn's farms automatically. Redundant transmission paths mean a single line failure never blacks out an entire hub. During simulated disaster drills, the smart grid rerouted full power within four seconds of a fault.$$,
  7, 'sun', 'sun', 18, 22, 'approved'
),

-- ══════════════════════════════════════════════════════════
-- MERCURY — Mathematics / Manufacturing  (7 entries: L4x2 L5x2 L6x1 L7x1 L8x1)
-- ══════════════════════════════════════════════════════════
(
  $$High-Efficiency Manufacturing Techniques$$,
  $$Mercury's industrial identity begins with how things are made. Manufacturing has always been the heart of industry, but in SOLAR it is transformed into a living system of precision where machines, energy, and intelligence cooperate to maximise efficiency while eliminating waste. AI-integrated production lines powered by the Sun's distributed energy network can reconfigure from structural alloys for Mars to turbines for Neptune within days. Lean manufacturing reduces scrap to near zero; waste is redirected into circular economy streams. Quality control is embedded in the process itself so failure is prevented, not corrected.$$,
  '', 4, 'mercury', 'mercury', 19, 23, 'approved'
),
(
  $$Advanced Metallurgy$$,
  $$Every structure, tool, machine, and habitat relies on the properties of metals and alloys to function. In Mercury's research hubs, computational metallurgy tests millions of element combinations in simulation before a single ingot is cast. Special attention goes to corrosion resistance for Neptune's desalination systems, lightweight strength for space transport, and extreme-heat superalloys for the Sun hub's fusion reactors. Molecular reconstitution during recycling ensures metal from a Martian dome can be reborn as a Neptune turbine blade.$$,
  '', 4, 'mercury', 'mercury', 20, 23, 'approved'
),
(
  $$Precision Robotics Calibration$$,
  $$Mercury's assembly robots recalibrate themselves every shift using laser interferometry, holding tolerances tighter than a human hair's width across thousands of repeated motions. Small drift is caught before it ever reaches a finished part.$$,
  '', 5, 'mercury', 'mercury', 21, 23, 'approved'
),
(
  $$Computational Design Optimization$$,
  $$Before a single part is machined, Mercury's engineers run thousands of simulated variants through generative design software, letting the computer find shapes no human would draw but which use less material for the same strength.$$,
  '', 5, 'mercury', 'mercury', 19, 22, 'approved'
),
(
  $$Supply Chain Mathematics$$, '',
  $$Mercury coordinates raw material shipments across nine hubs using linear optimization models. Each shipment route is recalculated daily as fuel costs, weather, and demand shift. Buffer stock levels are set mathematically, just enough to absorb delays without wasting warehouse space. A single formula balances the cost of holding inventory against the risk of a hub running dry. When Neptune's desalination parts run low, the model reroutes a shipment meant for Saturn within hours.$$,
  6, 'mercury', 'mercury', 20, 22, 'approved'
),
(
  $$Quality Control Systems$$, '',
  $$Every part leaving a Mercury factory passes through automated inspection before it ships anywhere. High-resolution cameras compare each unit against a digital reference model, flagging deviations invisible to the eye. Statistical process control charts catch a machine drifting out of tolerance before it produces a single bad part. Failed units are not discarded outright; their defect data trains the inspection system to catch similar flaws faster next time. A part destined for Mars's habitat domes is held to tighter tolerances than one destined for Earth's greenhouses. Full traceability records let any hub recall the exact batch and machine that produced a faulty component. This closed inspection loop has cut Mercury's defect rate to under one part in twenty thousand.$$,
  7, 'mercury', 'mercury', 21, 22, 'approved'
),
(
  $$Zero-Waste Production Modeling$$, '',
  $$Mercury's long-term goal is a factory floor that produces no material waste at all. Every offcut of metal or polymer is tracked from the moment it leaves the primary part. Computational models sort scrap by alloy composition before it even reaches the recycling bins. Small offcuts are melted and recast into structural brackets used inside Mercury's own machines. Larger offcuts are reserved for Neptune's turbine housings, which tolerate a wider range of alloy mixes. Dust and swarf from machining are filtered and compacted rather than swept into landfill. A digital twin of the entire factory floor simulates a full production run before it starts. The simulation flags any step likely to generate waste that current recycling paths cannot absorb. Engineers adjust the cutting plan in software, often saving material before a single machine powers on. Water used in cooling and cleaning cycles is filtered and returned to the same closed loop. Energy recovered from cooling systems is redirected to warm the factory's employee spaces in winter. Mercury now diverts over ninety percent of its production byproducts back into use somewhere in the system.$$,
  8, 'mercury', 'mercury', 19, 21, 'approved'
),

-- ══════════════════════════════════════════════════════════
-- VENUS — Agriculture / Controlled Environments  (7 entries: L4x2 L5x2 L6x1 L7x1 L8x1)
-- ══════════════════════════════════════════════════════════
(
  $$Climate-Controlled Greenhouses$$,
  $$Greenhouses are the cornerstone of Venus's agricultural system. Climate-controlled facilities act as fully enclosed biospheres capable of producing food in environments as hostile as the Martian surface. Advanced sensors monitor plant health at the cellular level; AI-driven climate models adjust lighting, irrigation, and nutrient composition in real time. A tight circular loop recaptures water through condensation, replenishes nutrients precisely, and converts plant waste into compost or bio-gas — enabling yields several times higher than conventional farms at less than 10 percent of the water.$$,
  '', 4, 'venus', 'venus', 19, 23, 'approved'
),
(
  $$Hydroponics & Aeroponics$$,
  $$Hydroponics and aeroponics eliminate soil entirely, replacing it with carefully balanced nutrient delivery systems. Hydroponic systems use 90–95 percent less water than conventional soil farming because every drop circulates in closed loops monitored in real time. In aeroponic systems, mist delivers nutrients directly to root surfaces with almost no loss. Crops grow faster because they expend less energy searching for water or nutrients. Systems can be stacked vertically inside controlled facilities, multiplying productivity per square metre by orders of magnitude.$$,
  '', 4, 'venus', 'venus', 20, 23, 'approved'
),
(
  $$Automated Nutrient Dosing$$,
  $$Venus's hydroponic bays test the nutrient solution every few minutes and adjust nitrogen, potassium, and micronutrient ratios automatically, so no two harvests ever grow in exactly the same mix twice, yet every plant finishes within its ideal range.$$,
  '', 5, 'venus', 'venus', 21, 23, 'approved'
),
(
  $$Pollination Without Bees$$,
  $$Enclosed greenhouses have no wind or bees, so Venus engineers use small vibrating wands and controlled airflow to move pollen between flowers, achieving fruit-set rates that match open-field yields without a single insect.$$,
  '', 5, 'venus', 'venus', 19, 22, 'approved'
),
(
  $$Vertical Growing Racks$$, '',
  $$Venus stacks growing trays six levels high to multiply yield per square meter of greenhouse floor. Each rack level gets its own LED spectrum tuned to that crop's growth stage. Water and nutrients drip from the top rack down through each level before recirculating. Sensors on every shelf catch early signs of nutrient burn before it spreads to a whole rack. The stacked design lets one greenhouse feed as many people as five times the same floor area of open field.$$,
  6, 'venus', 'venus', 20, 22, 'approved'
),
(
  $$Closed-Loop Water Cycling$$, '',
  $$A sealed greenhouse loses almost no water to the outside air once its loop is balanced. Plants release moisture through their leaves, which condenses on cooled glass and drips back to the reservoir. Venus recovers roughly ninety-five percent of all irrigation water inside a single growing cycle. The remaining loss is replaced with water reclaimed from Neptune's desalination shipments. Dissolved salts are monitored constantly so recirculated water never stresses the root systems. A single sensor fault once let salinity climb for six hours before the system caught it. Since that incident, three independent sensors must agree before the loop accepts a reading as safe.$$,
  7, 'venus', 'venus', 21, 22, 'approved'
),
(
  $$Greenhouse Climate Modeling$$, '',
  $$Every Venus greenhouse runs a live digital twin that predicts its internal climate hours ahead. The model factors in outside weather, crop transpiration, and even how many workers are inside. A sudden cloud cover event triggers heater pre-warming before the temperature actually drops. Humidity spikes from a large watering cycle are predicted and vented before mold risk rises. The system learns each greenhouse's quirks, since no two structures behave identically even with the same design. Older greenhouses with worn seals need earlier heating cycles than newly built ones. Crop-specific models exist for tomatoes, leafy greens, and root vegetables, each with different tolerances. During a Mars-bound seed shipment prep, the model held conditions steady within half a degree for ten days straight. Energy use dropped by nearly a third once predictive heating replaced simple thermostats. Operators can override the model manually, but logs show they rarely need to. Every override is recorded and fed back into the model to improve its next prediction. Venus now shares its climate models with Mars, whose domes face harsher and faster swings.$$,
  8, 'venus', 'venus', 19, 21, 'approved'
),

-- ══════════════════════════════════════════════════════════
-- EARTH — Earth & Environmental Science / Biotech  (7 entries: L4x2 L5x2 L6x1 L7x1 L8x1)
-- ══════════════════════════════════════════════════════════
(
  $$Human Genomics$$,
  $$Unlocking the secrets of resilience, disease resistance, and human adaptability. Whole-genome sequencing identifies markers for genetic disorders, drug metabolism variants, and environmental resilience. CRISPR-Cas9 gene editing enables precise corrections to inherited conditions.$$,
  '', 4, 'earth', 'earth', 18, 23, 'approved'
),
(
  $$Plant Genetics & Bioengineering$$,
  $$Engineering crops for extreme conditions: drought tolerance, salt resistance, nutrient density. Gene editing accelerates breeding cycles from years to months. Synthetic biology designs organisms that produce fuels, medicines, and materials from simple feedstocks.$$,
  '', 4, 'earth', 'earth', 19, 23, 'approved'
),
(
  $$Medical Biotechnology$$,
  $$Vaccine development using mRNA platforms achieves rapid response to novel pathogens. Regenerative medicine uses stem cells to repair damaged organs. Bioprinting creates functional tissue scaffolds. Point-of-care diagnostics enable testing without laboratories.$$,
  '', 5, 'earth', 'earth', 20, 23, 'approved'
),
(
  $$Ecology & Ecosystem Modeling$$,
  $$Digital twin models simulate entire ecosystems. Mycorrhizal fungi networks mapped and optimized. Soil microbiome health monitored with DNA sequencing. Biodiversity indices tracked across all SOLAR habitats to maintain ecological balance.$$,
  '', 5, 'earth', 'earth', 20, 22, 'approved'
),
(
  $$Neuroscience & Mental Health$$, '',
  $$Isolation and long shifts wear on mental health faster than most physical strain does. Earth's neurofeedback systems train residents to recognize their own stress signals in real time. Community Health Workers deliver basic mental health support without waiting for a specialist referral. Telemedicine links isolated hubs to psychiatrists based anywhere in the system within minutes. Sleep and mood tracking data flags at-risk individuals weeks before a crisis point is reached. Peer support groups meeting weekly cut reported burnout rates nearly in half over one growing season.$$,
  6, 'earth', 'earth', 18, 22, 'approved'
),
(
  $$Epidemiology & Disease Control$$, '',
  $$A disease outbreak anywhere in the system can spread through shared supply routes within days. Earth's surveillance network watches wastewater and clinic visit data for early outbreak signals. Mathematical models estimate how fast a pathogen will spread before the first confirmed case appears elsewhere. Rapid diagnostic kits let any hub confirm an infection without shipping samples back to Earth. Mobile labs travel to remote hubs during suspected outbreaks rather than waiting for patients to travel. Essential medicine protocols cover ninety percent of primary care needs without specialist intervention. A recent containment drill isolated a simulated outbreak to a single hub within eighteen hours.$$,
  7, 'earth', 'earth', 19, 22, 'approved'
),
(
  $$Genomic Data Integration$$, '',
  $$Earth's labs generate more genetic sequence data each month than the archive can easily index. Every genome sequenced feeds into a shared database used across all nine research hubs. Rare disease markers found in one patient can be checked instantly against thousands of prior records. Cross-referencing crop genomes with human nutrition data has revealed unexpected deficiency risks. Mars's habitat crews are screened against markers linked to radiation sensitivity before assignment. Privacy protocols strip identifying information before any genome enters the shared research pool. Jupiter's AI systems flag genetic patterns too subtle for a human researcher to notice unaided. A pattern linking a soil bacterium to improved crop drought tolerance was found by cross-hub search. That discovery was implemented in Mars's arid agriculture program within a single growing season. Version control on genomic records lets researchers trace exactly which dataset produced a finding. Ambiguous or corrupted samples are quarantined from the shared pool until manually verified. The genomic database has become the single most cross-referenced resource in the entire archive.$$,
  8, 'earth', 'earth', 21, 23, 'approved'
),

-- ══════════════════════════════════════════════════════════
-- MARS — Applied Technology  (6 entries: L4x2 L5x1 L6x1 L7x1 L8x1)
-- ══════════════════════════════════════════════════════════
(
  $$Civil & Structural Engineering$$,
  $$Designing buildings to withstand earthquakes (base isolation, moment frames), floods (elevated foundations, waterproof barriers), and extreme winds (aerodynamic profiles, reinforced connections). Compressed Earth Blocks achieve 3–5 MPa compressive strength using local materials.$$,
  '', 4, 'mars', 'mars', 18, 23, 'approved'
),
(
  $$Desert & Arid Agriculture$$,
  $$Food production in water-scarce environments. Zai pits concentrate water for dryland farming. Fog harvesting nets collect atmospheric moisture. Solar-powered drip irrigation reduces water use by 60%. Halophyte crops tolerate saline soils.$$,
  '', 4, 'mars', 'mars', 19, 23, 'approved'
),
(
  $$Robotics & Automation$$,
  $$Autonomous construction robots for hazardous environments. Drone-based structural inspection and damage assessment. Robotic maintenance systems extend infrastructure lifespan. Teleoperation enables repairs in contaminated or collapsed structures.$$,
  '', 5, 'mars', 'mars', 20, 22, 'approved'
),
(
  $$Water Purification & Recycling$$, '',
  $$Biosand filters remove more than ninety-nine percent of harmful bacteria using only sand and gravel layers. Solar disinfection bags kill most pathogens in about six hours of direct sunlight exposure. Ceramic pot filters coated with colloidal silver produce one to three liters of clean water per hour. Closed-loop greywater systems recycle roughly ninety-five percent of household water use. Mars habitats depend on these layered methods because shipping replacement water from Earth is not practical. A failed filter is caught quickly because output turbidity is monitored continuously, not just checked by hand.$$,
  6, 'mars', 'mars', 20, 23, 'approved'
),
(
  $$Extreme Architecture$$, '',
  $$Earthship-style buildings use thick rammed-tire walls to store heat absorbed during the day. That stored heat releases slowly overnight, keeping interior temperatures between eighteen and twenty-one degrees without powered heating. Integrated rain catchment systems feed directly into greywater botanical cells built into the structure. Glazed growing spaces along the sun-facing wall produce food using the same heat that warms the building. The same core design has been proven from New Mexico's deserts to the cold Netherlands lowlands. Mars adapted the technique using regolith-based composite blocks instead of rammed tires. A prototype dome held stable internal temperatures through a simulated seventy-hour dust storm.$$,
  7, 'mars', 'mars', 18, 22, 'approved'
),
(
  $$Disaster Preparedness$$, '',
  $$Mars habitats train every resident, not just specialists, in basic disaster response. Community Emergency Response Teams rehearse evacuation routes monthly, not just after an incident. Mutual aid networks between neighboring habitat sections often respond faster than centralized teams. Pre-positioned supply caches hold water, oxygen candles, and first aid within reach of every section. Communication plans specify a backup channel for every primary channel that might fail during a storm. Dust storm drills simulate zero-visibility conditions to test whether residents can navigate by memory alone. A real dust storm in the second habitat year tested these drills for the first time under pressure. Response teams reached every resident within the planned window despite total sensor blackout outside. After-action reviews are mandatory, and every drill or real event updates the response plan. Evacuation routes are redesigned whenever a review finds a bottleneck, not just when one causes injury. Supply caches are audited quarterly so nothing critical is found empty during an actual emergency. Mars's preparedness data now informs disaster drills being adopted on Earth and Venus as well.$$,
  8, 'mars', 'mars', 19, 21, 'approved'
),

-- ══════════════════════════════════════════════════════════
-- JUPITER — Social Science / AI  (6 entries: L4x2 L5x1 L6x1 L7x1 L8x1)
-- ══════════════════════════════════════════════════════════
(
  $$Artificial Intelligence & Machine Learning$$,
  $$Neural networks process sensor data from every hub. Computer vision monitors crop health, structural integrity, and environmental conditions. Natural Language Processing indexes and retrieves knowledge across the archive. Reinforcement learning optimizes energy distribution and resource allocation in real-time.$$,
  '', 4, 'jupiter', 'jupiter', 18, 23, 'approved'
),
(
  $$Data Integration & Analytics$$,
  $$Every hub produces data: nutrient balances from Saturn's farms, genetic libraries from Earth's labs, ocean sensor arrays from Neptune. Jupiter integrates them, recognizes patterns invisible to the human eye, and directs responses across the system. Prediction replaces reaction.$$,
  '', 4, 'jupiter', 'jupiter', 19, 23, 'approved'
),
(
  $$Knowledge Management$$,
  $$The SOLAR Archive itself is managed by Jupiter. Coordinate-based indexing, semantic search, and automated summarization ensure knowledge is accessible. Multi-criteria decision analysis helps communities make complex trade-off decisions involving energy, water, food, and social factors.$$,
  '', 5, 'jupiter', 'jupiter', 20, 22, 'approved'
),
(
  $$Autonomous Sensor Networks$$, '',
  $$Self-powered wireless sensors monitor environmental conditions without needing battery replacement for years. Small solar cells harvest between fifty and one hundred milliwatts, enough for continuous low-power sensing. Ultra-low-power processors sleep between readings, drawing under ten microamps while idle. Edge AI inference happens on the sensor itself, cutting network traffic by roughly ninety percent. Time-synchronized networks let thousands of sensors report without their signals colliding on the same channel.$$,
  6, 'jupiter', 'jupiter', 20, 23, 'approved'
),
(
  $$Cybersecurity & Trust$$, '',
  $$Every inter-hub message travels through a zero-trust network that verifies identity at each step. No device is trusted by default, even one that connected successfully a moment earlier. Quantum key distribution secures the most sensitive links against future code-breaking techniques. A distributed ledger records every resource allocation decision in a way no single hub can alter alone. That ledger let auditors catch a misrouted shipment discrepancy within hours instead of weeks. Automated intrusion detection flags unusual access patterns before a human operator would notice them. Jupiter runs simulated attacks against its own systems quarterly to find weaknesses before anyone else does.$$,
  7, 'jupiter', 'jupiter', 18, 22, 'approved'
),
(
  $$Digital Twin Modeling$$, '',
  $$Every hub in the system has a living digital twin that mirrors its physical state in real time. Sensor data streams continuously update each twin, so the model never drifts far from reality. Engineers test a proposed change on the twin long before touching the physical hub itself. A simulated crop disease outbreak on Saturn's digital twin revealed a containment gap before it was real. That gap was fixed in the actual greenhouse within a week of the simulation flagging it. Energy grid failures are rehearsed virtually so operators know their response before an actual outage. Extreme weather scenarios run against Mars's twin months ahead of the actual dust storm season. Twins are cross-linked, so a change simulated on Neptune can show ripple effects reaching Earth's supply chains. Not every twin is equally detailed; newer hubs start with simpler models that improve over time. Jupiter's team prioritizes twin accuracy for whichever hub faces the most immediate physical risk. A twin's predictions are only as good as its sensor data, so faulty sensors are flagged and excluded automatically. This simulate-first approach has prevented at least three real equipment failures across the system.$$,
  8, 'jupiter', 'jupiter', 19, 22, 'approved'
),

-- ══════════════════════════════════════════════════════════
-- SATURN — Astronomy & Cosmology / Agriculture  (6 entries: L4x2 L5x2 L6x1 L7x1)
-- ══════════════════════════════════════════════════════════
(
  $$Vertical Farm Operations$$,
  $$Multi-story growing facilities with controlled lighting, temperature, and nutrients. LED arrays tuned to optimal photosynthetic wavelengths. Automated seeding, monitoring, and harvest systems. Year-round production independent of climate or season.$$,
  '', 4, 'saturn', 'saturn', 18, 23, 'approved'
),
(
  $$Composting & Anaerobic Digestion$$,
  $$Organic residues are never treated as useless. Anaerobic digestion produces biogas (methane) and nutrient-rich digestate. Thermophilic composting reaches 65 °C, killing pathogens while producing stable humus. Vermicomposting with red wigglers processes food waste at household scale.$$,
  '', 4, 'saturn', 'saturn', 19, 23, 'approved'
),
(
  $$Soil Regeneration$$,
  $$Controlled soil chambers test regeneration techniques. Biochar application (5–20 t/ha) improves cation exchange capacity and hosts beneficial microbes. Cover cropping prevents erosion and feeds soil life. Mycorrhizal inoculants extend root reach by 100x.$$,
  '', 5, 'saturn', 'saturn', 18, 22, 'approved'
),
(
  $$Waste-to-Energy Integration$$,
  $$Biogas from anaerobic digestion powers cooking and heating. Pyrolysis converts non-compostable waste to biochar and syngas. Waste heat from composting warms greenhouse spaces. Every waste stream becomes an energy or material input.$$,
  '', 5, 'saturn', 'saturn', 20, 22, 'approved'
),
(
  $$Algae & Fungi Cultivation$$, '',
  $$Spirulina and chlorella grow in enclosed photobioreactors that use a fraction of open-pond farmland. These microalgae deliver complete protein along with vitamins and omega-3 fatty acids in one harvest. Mycelium grown on leftover crop waste forms structural packaging that fully composts after use. Mushroom cultivation turns low-value agricultural byproducts into high-value nutrition within days. Saturn ships surplus spirulina protein to hubs facing temporary crop shortfalls.$$,
  6, 'saturn', 'saturn', 20, 23, 'approved'
),
(
  $$Nutrient Recovery Systems$$, '',
  $$Struvite crystallization pulls phosphorus back out of wastewater before it is ever lost. Ammonia stripping captures nitrogen that would otherwise escape as gas, turning it into usable fertilizer. Potassium recovered from wood ash closes yet another gap in Saturn's nutrient cycle. Complete nutrient cycling means decades of continuous farming without depleting any single mineral. A single farm block recovers enough phosphorus in one year to fertilize itself the next season. Saturn shares its recovery ratios with Mars, whose arid farms cannot afford to waste any nutrient input. Independent audits confirm Saturn's nutrient loss rate is under two percent per growing cycle.$$,
  7, 'saturn', 'saturn', 19, 22, 'approved'
),

-- ══════════════════════════════════════════════════════════
-- URANUS — Chemistry / Governance  (6 entries: L4x2 L5x2 L6x1 L7x1)
-- ══════════════════════════════════════════════════════════
(
  $$Governance & Policy Systems$$,
  $$Scalable, transparent, and participatory decision-making models that extend across all hubs. Liquid democracy enables flexible delegation. Constitutional frameworks protect minority rights while enabling rapid collective action. Policies ensure fair distribution of Saturn's food, Neptune's water, and Sun's energy.$$,
  '', 4, 'uranus', 'uranus', 18, 23, 'approved'
),
(
  $$Ethical Frameworks$$,
  $$Principles that protect equality, sustainability, and intergenerational responsibility. AI ethics boards oversee Jupiter's algorithms. Bioethics committees review Earth's genetic research. Environmental impact assessments required for all hub operations.$$,
  '', 4, 'uranus', 'uranus', 19, 23, 'approved'
),
(
  $$Education & Knowledge Transfer$$,
  $$Lifelong learning programs connect to every research hub. Apprenticeship models build practical skills. Open-source curricula freely shared. Education flows in both directions: hub specialists teach communities, communities teach hubs what knowledge they need.$$,
  '', 5, 'uranus', 'uranus', 18, 22, 'approved'
),
(
  $$Intergenerational Responsibility$$,
  $$Long-term planning horizons: 7-generation thinking embedded in all policy. Youth councils have formal advisory roles. Elder knowledge systematically documented and preserved. Time capsule programs ensure continuity of values and wisdom.$$,
  '', 5, 'uranus', 'uranus', 20, 22, 'approved'
),
(
  $$Arts & Cultural Identity$$, '',
  $$Music, visual art, and storytelling are documented the same way a research finding would be. Cultural diversity across hubs is treated as a resource worth protecting, not a difference to smooth over. Each hub's artistic traditions are archived alongside its technical output, not in a separate system. Uranus catalogs festival records, oral histories, and performance recordings from every hub each season. A shared cultural archive has helped new residents feel connected before they even arrive at a hub.$$,
  6, 'uranus', 'uranus', 20, 23, 'approved'
),
(
  $$Social Cohesion & Conflict Resolution$$, '',
  $$Restorative justice practices replace punitive systems across every hub in the network. Every adult resident completes basic mediation training within their first year at a hub. Social capital surveys track community trust levels the same way a hub tracks crop yields. Mutual aid networks that started informally have been formalized into recognized hub-level programs. A dispute between two habitat sections was resolved through mediation before it reached a formal grievance. Trained mediators are rotated between hubs so no single community relies only on local volunteers. Conflict data is reviewed quarterly to catch recurring tensions before they escalate further.$$,
  7, 'uranus', 'uranus', 19, 22, 'approved'
),

-- ══════════════════════════════════════════════════════════
-- NEPTUNE — Biology / Ocean Systems  (6 entries: L4x2 L5x1 L6x2 L7x1)
-- ══════════════════════════════════════════════════════════
(
  $$Aquaculture & Ocean Farming$$,
  $$3D ocean farming stacks kelp, mussels, scallops, oysters and fish on a 1-acre footprint. Kelp grows 30 cm/day, sequesters 174 kg CO2/tonne. Shellfish filter 200 L water/day each. Circular aquaculture converts waste from one species into nutrients for another.$$,
  '', 4, 'neptune', 'neptune', 18, 23, 'approved'
),
(
  $$Desalination Technology$$,
  $$Seawater Reverse Osmosis at 55 bar achieves 99.6% salt rejection at 3–4 kWh/m³. Energy recovery devices capture 96% of pressure from reject brine. Solar-powered manual RO produces 15 L/hr at 50 W. Humidification-dehumidification achieves 500 L/day/kW.$$,
  '', 4, 'neptune', 'neptune', 19, 23, 'approved'
),
(
  $$Climate Regulation$$,
  $$Ocean thermal energy conversion (OTEC) uses temperature differential between surface and deep water. Arctic ice monitoring via satellite and autonomous underwater vehicles. Carbon sequestration through enhanced ocean alkalinity. Seagrass restoration projects for coastal protection.$$,
  '', 5, 'neptune', 'neptune', 20, 22, 'approved'
),
(
  $$Storm & Flood Management$$, '',
  $$Predictive hydrological models forecast floods up to seventy-two hours before they arrive. Bioswales and constructed wetlands absorb urban runoff before it overwhelms drainage systems. Levee systems include redundant failsafes so one breach does not cascade into total failure. Coastal communities follow managed retreat plans agreed on years before any storm forces the issue. Rain gardens cut peak stormwater flow by roughly eighty percent during heavy events. A recent storm test confirmed the network could handle three simultaneous flood warnings without conflict.$$,
  6, 'neptune', 'neptune', 20, 23, 'approved'
),
(
  $$Water Recycling & Purification$$, '',
  $$Closed-loop systems recycle about ninety-eight percent of all water used across Neptune's facilities. Membrane bioreactors combine biological treatment with ultrafiltration in a single compact step. UV disinfection achieves a four-log reduction in pathogens before water returns to circulation. Real-time quality sensors check every tap continuously rather than relying on periodic sampling. A sensor fault is treated as seriously as a contamination event until proven otherwise.$$,
  6, 'neptune', 'neptune', 18, 22, 'approved'
),
(
  $$Ocean Energy Harvesting$$, '',
  $$Tidal stream turbines reach forty to fifty percent efficiency in currents of two to four meters per second. The main current channel Neptune taps carries roughly thirty million cubic meters of water per second. Oscillating water column devices convert wave motion into airflow that drives dedicated turbines. Global wave energy potential is estimated at around two terawatts, though only a fraction is captured today. Submerged buoy systems have been proven at the one-megawatt scale in open trials. Neptune blends tidal, wave, and thermal gradient sources so no single calm day cuts power output. Excess ocean-harvested energy is exported to the Sun hub's grid during peak tidal windows.$$,
  7, 'neptune', 'neptune', 19, 22, 'approved'
),

-- ══════════════════════════════════════════════════════════
-- STAR — North Star Foundation  (6 entries: L4x2 L5x1 L6x1 L7x1 L8x1)
-- ══════════════════════════════════════════════════════════
(
  $$Charter & Jurisdictional Scope$$,
  $$North Star documents what the archive is for and what it is not: institutional memory and binding canon for contributors, distinct from planet-scale research corpora. Scope covers governance memoranda, procedural amendments, and definitions that other hubs inherit by reference. When a hub policy cites "Foundation standards," the authoritative text lives here at documented coordinates so reviewers and submitters share one source of truth.$$,
  '', 4, 'star', 'star', 18, 23, 'approved'
),
(
  $$Submission Intake & Formatting$$,
  $$Memoranda submitted into North Star follow the same coordinate and layer conventions as domain hubs, with additional tags for policy tier and revision lineage. Formatting rules ensure every entry can be diffed across revisions and linked from hub-side citations. Templates distinguish institutional prose from research summaries so Grade queues and automated checks know which rubric applies.$$,
  '', 4, 'star', 'star', 19, 23, 'approved'
),
(
  $$Cross-Hub Linkage Patterns$$,
  $$Hub articles reference North Star for definitions; it references hubs for empirical grounding. Standard linkage patterns are documented so parsers and human editors resolve citations consistently. That symmetry is what makes the Foundation archive feel like part of the same map rather than a separate silo.$$,
  '', 5, 'star', 'star', 20, 22, 'approved'
),
(
  $$Peer Review & Institutional Grades$$, '',
  $$Foundation-facing material passes through review tracks aligned with the same leaderboard used hub-side. Reviewers weigh clarity, auditability, and cross-hub impact ahead of experimental novelty for this tier. A high-grade North Star entry becomes a canonical reference other hubs are expected to cite. Lower-tier drafts stay visible for transparency rather than being hidden until they improve. Three independent reviewers must agree before any institutional memorandum reaches canonical status.$$,
  6, 'star', 'star', 20, 23, 'approved'
),
(
  $$Attribution, Provenance & Versioning$$, '',
  $$Every North Star cell records its author and full reviewer chain before publication. A semantic version number lets downstream hubs cite a stable identifier even as wording evolves later. Provenance blocks link to supporting evidence in domain archives without duplicating entire corpora. This keeps institutional claims accountable while preserving lean storage in the Foundation layer. A superseded version remains archived rather than deleted, so historical citations never break. Editors can trace exactly which revision introduced a disputed claim within seconds. Cross-hub citations automatically flag when the memorandum they reference has been revised.$$,
  7, 'star', 'star', 18, 22, 'approved'
),
(
  $$Long-Term Stewardship & Continuity$$, '',
  $$Stewardship memoranda describe the backup cadences that keep the archive intelligible across decades. Format migrations are planned years ahead, so no file type is ever orphaned by outdated software. Succession-of-custodian protocols specify exactly who takes over if a steward becomes unavailable. North Star cells hold runbooks that operators follow during outages or governance transitions. A runbook drill once restored full archive access within four hours of a simulated total failure. Cross-links to Uranus appear whenever a memorandum touches civic norms rather than pure infrastructure. Cross-links to Jupiter appear whenever automation or tooling changes are the subject instead. Backups are stored in at least two physically separate locations, verified on a fixed schedule. Every backup verification failure triggers an immediate re-run rather than waiting for the next cycle. New stewards complete a full walkthrough of every runbook before taking on any live responsibility. The stewardship layer has never lost a canonical record since the Foundation archive began. This continuity record is itself stored as a North Star entry, reviewed the same as any other.$$,
  8, 'star', 'star', 19, 22, 'approved'
);
