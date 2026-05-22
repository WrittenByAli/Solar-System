/** Client 4:4:4 taxonomy — 9 science hubs (L2/L3 compass). Domain order: tl, tr, bl, br. */
export const HUB_TAXONOMY_RAW = {
  sun: {
    discipline: 'Physics',
    centerLabel: 'SUN',
    accentColor: '#ff6b35',
    domains: [
      {
        label: 'Classical Mechanics & Thermodynamics',
        subfields: [
          {
            label: 'Newtonian Mechanics & Motion',
            topics: [
              "Newton's Laws & Force",
              'Kinematics & Equations of Motion',
              'Momentum, Impulse & Collisions',
              'Work, Energy & Conservation Laws',
            ],
          },
          {
            label: 'Statics, Dynamics & Fluid Mechanics',
            topics: [
              'Equilibrium & Static Systems',
              'Rotational Motion & Torque',
              'Fluid Statics & Buoyancy',
              "Fluid Dynamics & Bernoulli's Principle",
            ],
          },
          {
            label: 'Heat, Temperature & Thermodynamic Laws',
            topics: [
              'Temperature, Heat Transfer & Conduction',
              'The Laws of Thermodynamics',
              'Entropy & the Arrow of Time',
              'Engines, Refrigerators & Efficiency',
            ],
          },
          {
            label: 'Waves, Sound & Oscillations',
            topics: [
              'Simple Harmonic Motion & Pendulums',
              'Wave Properties, Frequency & Amplitude',
              'Sound Waves, Acoustics & the Doppler Effect',
              'Resonance, Standing Waves & Harmonics',
            ],
          },
        ],
      },
      {
        label: 'Electromagnetism & Optics',
        subfields: [
          {
            label: 'Electric Fields & Circuits',
            topics: [
              "Electric Charge & Coulomb's Law",
              "Electric Fields & Gauss's Law",
              'Electric Potential & Capacitance',
              "Current, Resistance & Ohm's Law",
            ],
          },
          {
            label: 'Magnetic Fields & Induction',
            topics: [
              'Magnetic Fields & the Lorentz Force',
              "Ampere's Law & Biot-Savart Law",
              'Electromagnetic Induction & Faraday\'s Law',
              'Inductance, Transformers & Motors',
            ],
          },
          {
            label: "Maxwell's Equations & Electromagnetic Waves",
            topics: [
              "Maxwell's Four Equations",
              'Electromagnetic Wave Propagation',
              'The Electromagnetic Spectrum',
              'Radiation, Antennas & Signal Transmission',
            ],
          },
          {
            label: 'Geometrical & Physical Optics',
            topics: [
              "Reflection, Refraction & Snell's Law",
              'Lenses, Mirrors & Optical Instruments',
              "Diffraction, Interference & Young's Experiment",
              'Polarization & the Nature of Light',
            ],
          },
        ],
      },
      {
        label: 'Quantum Mechanics',
        subfields: [
          {
            label: 'Wave-Particle Duality & the Uncertainty Principle',
            topics: [
              'The Photoelectric Effect & Photons',
              'De Broglie Wavelength & Matter Waves',
              "Heisenberg's Uncertainty Principle",
              'The Double Slit Experiment',
            ],
          },
          {
            label: 'Schrödinger Equation & Quantum States',
            topics: [
              'The Schrödinger Wave Equation',
              'Wavefunctions & Probability Distributions',
              'Quantum Numbers & Atomic Orbitals',
              'Energy Levels & Quantum Transitions',
            ],
          },
          {
            label: 'Quantum Entanglement & Superposition',
            topics: [
              'Superposition & Quantum States',
              'Quantum Entanglement & Nonlocality',
              "Bell's Theorem & Hidden Variables",
              'Quantum Measurement & the Collapse Problem',
            ],
          },
          {
            label: 'Quantum Field Theory & QED',
            topics: [
              'Field Quantization & Virtual Particles',
              'Quantum Electrodynamics',
              'Feynman Diagrams & Perturbation Theory',
              'Renormalization & Divergences',
            ],
          },
        ],
      },
      {
        label: 'Relativity & Particle Physics',
        subfields: [
          {
            label: 'Special Relativity & Spacetime',
            topics: [
              'The Postulates of Special Relativity',
              'Time Dilation & Length Contraction',
              'Mass-Energy Equivalence & E=mc²',
              'Spacetime Diagrams & Minkowski Space',
            ],
          },
          {
            label: 'General Relativity & Gravity',
            topics: [
              'The Equivalence Principle',
              "Curved Spacetime & Einstein's Field Equations",
              'Gravitational Waves & LIGO',
              'Black Holes, Event Horizons & Singularities',
            ],
          },
          {
            label: 'The Standard Model & Fundamental Particles',
            topics: [
              'Quarks, Leptons & Bosons',
              'The Four Fundamental Forces',
              'The Higgs Field & Mass',
              'Antimatter & CP Violation',
            ],
          },
          {
            label: 'Particle Accelerators & High Energy Physics',
            topics: [
              'Cyclotrons, Synchrotrons & the LHC',
              'Particle Detectors & Collision Experiments',
              'Supersymmetry & Beyond the Standard Model',
              'Grand Unified Theories & String Theory',
            ],
          },
        ],
      },
    ],
  },
  mercury: {
    discipline: 'Mathematics',
    centerLabel: 'MERCURY',
    accentColor: '#9ca3af',
    domains: [
      {
        label: 'Arithmetic, Algebra & Number Theory',
        subfields: [
          {
            label: 'Arithmetic & Number Systems',
            topics: [
              'Natural Numbers, Integers & Rational Numbers',
              'Real Numbers, Irrational Numbers & the Number Line',
              'Complex Numbers & Imaginary Numbers',
              'Number Bases & Modular Arithmetic',
            ],
          },
          {
            label: 'Elementary & Abstract Algebra',
            topics: [
              'Variables, Expressions & Equations',
              'Polynomials, Factoring & Quadratics',
              'Groups, Rings & Fields',
              'Linear Algebra & Vector Spaces',
            ],
          },
          {
            label: 'Number Theory & Prime Numbers',
            topics: [
              'Divisibility, Factors & Multiples',
              'Prime Numbers & the Sieve of Eratosthenes',
              "Fermat's Last Theorem & Diophantine Equations",
              'Cryptography & Number Theoretic Applications',
            ],
          },
          {
            label: 'Combinatorics & Probability',
            topics: [
              'Counting Principles, Permutations & Combinations',
              'Probability Theory & Axioms',
              "Conditional Probability & Bayes' Theorem",
              'Random Variables & Probability Distributions',
            ],
          },
        ],
      },
      {
        label: 'Geometry & Topology',
        subfields: [
          {
            label: 'Euclidean & Non-Euclidean Geometry',
            topics: [
              'Points, Lines, Angles & Triangles',
              'Circles, Polygons & Area',
              'Hyperbolic & Elliptic Geometry',
              'Projective Geometry & Duality',
            ],
          },
          {
            label: 'Coordinate & Analytic Geometry',
            topics: [
              'The Cartesian Plane & Linear Equations',
              'Conic Sections, Parabolas & Ellipses',
              'Polar Coordinates & Parametric Equations',
              'Vectors & Geometry in 3D Space',
            ],
          },
          {
            label: 'Differential Geometry & Manifolds',
            topics: [
              'Curves, Curvature & Torsion',
              'Surfaces & the Gauss-Bonnet Theorem',
              'Riemannian Geometry & Metrics',
              'Manifolds, Tangent Spaces & Lie Groups',
            ],
          },
          {
            label: 'Topology & Knot Theory',
            topics: [
              'Topological Spaces & Continuity',
              'Homeomorphisms & Topological Equivalence',
              'Algebraic Topology & Homotopy',
              'Knot Theory & Invariants',
            ],
          },
        ],
      },
      {
        label: 'Calculus & Analysis',
        subfields: [
          {
            label: 'Differential Calculus',
            topics: [
              'Limits & Continuity',
              'The Derivative & Differentiation Rules',
              'Chain Rule, Product Rule & Quotient Rule',
              'Applications of Derivatives & Optimization',
            ],
          },
          {
            label: 'Integral Calculus',
            topics: [
              'The Definite & Indefinite Integral',
              'The Fundamental Theorem of Calculus',
              'Integration Techniques & Substitution',
              'Applications of Integration & Area',
            ],
          },
          {
            label: 'Multivariable & Vector Calculus',
            topics: [
              'Partial Derivatives & Gradient',
              'Multiple Integrals & Volume',
              'Line Integrals & Surface Integrals',
              "Divergence, Curl & Stokes' Theorem",
            ],
          },
          {
            label: 'Real & Complex Analysis',
            topics: [
              'Sequences, Series & Convergence',
              'Fourier Series & Transforms',
              'Complex Functions & Analytic Functions',
              "Cauchy's Theorem & Residue Calculus",
            ],
          },
        ],
      },
      {
        label: 'Logic, Set Theory & Discrete Math',
        subfields: [
          {
            label: 'Formal Logic & Proof Theory',
            topics: [
              'Propositional Logic & Truth Tables',
              'Predicate Logic & Quantifiers',
              'Proof Techniques & Mathematical Induction',
              "Gödel's Incompleteness Theorems",
            ],
          },
          {
            label: 'Set Theory & Model Theory',
            topics: [
              'Sets, Subsets & Set Operations',
              'Functions, Relations & Mappings',
              "Cardinality, Infinity & Cantor's Theorem",
              'Axiomatic Set Theory & the ZFC Axioms',
            ],
          },
          {
            label: 'Graph Theory & Networks',
            topics: [
              'Graphs, Vertices & Edges',
              'Trees, Paths & Connectivity',
              'Planar Graphs & Graph Coloring',
              'Network Flow & Optimization',
            ],
          },
          {
            label: 'Algorithms & Computational Complexity',
            topics: [
              'Algorithm Design & Analysis',
              'Sorting, Searching & Recursion',
              'Complexity Classes P, NP & NP-Completeness',
              'Computability & the Halting Problem',
            ],
          },
        ],
      },
    ],
  },
  venus: {
    discipline: 'Psychology & Neuroscience',
    centerLabel: 'VENUS',
    accentColor: '#fbbf24',
    domains: [
      {
        label: 'Neuroanatomy & Brain Function',
        subfields: [
          {
            label: 'Brain Structures & the Nervous System',
            topics: [
              'Central vs Peripheral Nervous System',
              'The Cerebral Cortex & Lobes',
              'The Limbic System & Subcortical Structures',
              'The Brainstem, Cerebellum & Spinal Cord',
            ],
          },
          {
            label: 'Neurons, Synapses & Neurotransmitters',
            topics: [
              'Neuron Structure & Function',
              'Action Potentials & Signal Transmission',
              'Synaptic Transmission & Plasticity',
              'Neurotransmitter Systems & Receptors',
            ],
          },
          {
            label: 'Sensory & Motor Systems',
            topics: [
              'Vision & the Visual Cortex',
              'Auditory, Olfactory & Somatosensory Systems',
              'The Motor Cortex & Voluntary Movement',
              'The Basal Ganglia, Cerebellum & Motor Control',
            ],
          },
          {
            label: 'Sleep, Consciousness & Arousal',
            topics: [
              'Sleep Stages, REM & Circadian Rhythms',
              'The Neural Basis of Consciousness',
              'Attention, Arousal & the Reticular System',
              'Altered States, Anesthesia & Coma',
            ],
          },
        ],
      },
      {
        label: 'Cognitive & Behavioral Psychology',
        subfields: [
          {
            label: 'Perception & Attention',
            topics: [
              'Sensation vs Perception',
              'Perceptual Organization & Gestalt Principles',
              'Selective Attention & the Spotlight Model',
              'Multisensory Perception & Illusions',
            ],
          },
          {
            label: 'Memory & Learning',
            topics: [
              'Encoding, Storage & Retrieval',
              'Short-Term & Working Memory',
              'Long-Term Memory, Episodic & Semantic',
              'Classical & Operant Conditioning',
            ],
          },
          {
            label: 'Language & Thought',
            topics: [
              'Language Acquisition & Development',
              'Brain Areas for Language & Aphasia',
              'Concepts, Categories & Mental Representations',
              'Problem Solving & Creative Thinking',
            ],
          },
          {
            label: 'Decision Making & Problem Solving',
            topics: [
              'Heuristics & Cognitive Biases',
              'Prospect Theory & Risk Assessment',
              'Dual Process Theory & System 1 vs 2',
              'Judgment Under Uncertainty & Rationality',
            ],
          },
        ],
      },
      {
        label: 'Developmental & Social Psychology',
        subfields: [
          {
            label: 'Child Development & Attachment',
            topics: [
              'Prenatal Development & Infancy',
              "Piaget's Stages of Cognitive Development",
              'Attachment Theory & Bowlby',
              'Language Development in Children',
            ],
          },
          {
            label: 'Adolescent & Adult Development',
            topics: [
              "Puberty, Identity & Erikson's Stages",
              'Moral Development & Kohlberg',
              'Adult Milestones, Aging & Cognitive Decline',
              'Death, Dying & Grief',
            ],
          },
          {
            label: 'Social Influence & Group Dynamics',
            topics: [
              'Conformity, Obedience & Milgram',
              'Group Thinking, Polarization & Deindividuation',
              'Leadership, Power & Authority',
              'Persuasion, Propaganda & Attitude Change',
            ],
          },
          {
            label: 'Identity, Culture & Interpersonal Behavior',
            topics: [
              'Self-Concept, Self-Esteem & Identity',
              'Cultural Psychology & Cross-Cultural Differences',
              'Prejudice, Stereotyping & Discrimination',
              'Attraction, Love & Interpersonal Relationships',
            ],
          },
        ],
      },
      {
        label: 'Mental Health & Clinical Psychology',
        subfields: [
          {
            label: 'Mood & Anxiety Disorders',
            topics: [
              'Depression & Bipolar Disorder',
              'Generalized Anxiety & Panic Disorder',
              'Phobias, OCD & Obsessive Spectrum',
              'Seasonal, Postpartum & Atypical Mood Disorders',
            ],
          },
          {
            label: 'Psychotic & Personality Disorders',
            topics: [
              'Schizophrenia & Psychosis',
              'Cluster A, B & C Personality Disorders',
              'Borderline & Narcissistic Personality Disorder',
              'Delusional Disorder & Shared Psychosis',
            ],
          },
          {
            label: 'Trauma, Stress & PTSD',
            topics: [
              'Acute Stress Response & the HPA Axis',
              'Post-Traumatic Stress Disorder',
              'Childhood Trauma & Adverse Experiences',
              'Resilience, Recovery & Post-Traumatic Growth',
            ],
          },
          {
            label: 'Therapy, Treatment & Psychiatric Medicine',
            topics: [
              'Cognitive Behavioral Therapy',
              'Psychoanalysis & Psychodynamic Therapy',
              'Antidepressants, Antipsychotics & Mood Stabilizers',
              'Electroconvulsive Therapy & Emerging Treatments',
            ],
          },
        ],
      },
    ],
  },
  earth: {
    discipline: 'Earth & Environmental Science',
    centerLabel: 'EARTH',
    accentColor: '#34d399',
    domains: [
      {
        label: 'Geology & Plate Tectonics',
        subfields: [
          {
            label: "Earth's Interior & Geophysics",
            topics: [
              "Earth's Core, Mantle & Crust",
              "Seismic Waves & Earth's Internal Structure",
              'Gravity, Geomagnetism & the Magnetosphere',
              'Isostasy & Crustal Deformation',
            ],
          },
          {
            label: 'Plate Tectonics & Continental Drift',
            topics: [
              "Wegener's Theory & Evidence for Drift",
              'Divergent, Convergent & Transform Boundaries',
              'Subduction, Rifting & Mountain Building',
              'Supercontinents & the Wilson Cycle',
            ],
          },
          {
            label: 'Rocks, Minerals & the Rock Cycle',
            topics: [
              'Igneous Rocks & Volcanic Processes',
              'Sedimentary Rocks & Stratigraphy',
              'Metamorphic Rocks & Pressure-Temperature Conditions',
              'The Rock Cycle & Geologic Time',
            ],
          },
          {
            label: 'Volcanoes, Earthquakes & Seismology',
            topics: [
              'Types of Volcanoes & Eruption Styles',
              'Earthquake Mechanics & Fault Types',
              'Seismographs, Magnitude & Richter Scale',
              'Tsunamis, Lahars & Volcanic Hazards',
            ],
          },
        ],
      },
      {
        label: 'Climatology & Atmospheric Science',
        subfields: [
          {
            label: 'Atmospheric Composition & Structure',
            topics: [
              'Nitrogen, Oxygen & Trace Gases',
              'The Troposphere, Stratosphere & Beyond',
              'The Ozone Layer & UV Radiation',
              'Atmospheric Pressure & Density',
            ],
          },
          {
            label: 'Weather Systems & Meteorology',
            topics: [
              'Solar Radiation, Albedo & Heat Distribution',
              'Air Masses, Fronts & Pressure Systems',
              'Clouds, Precipitation & Storm Formation',
              'Hurricanes, Tornadoes & Severe Weather',
            ],
          },
          {
            label: 'Climate Patterns & Climate Change',
            topics: [
              'The Greenhouse Effect & Global Warming',
              'El Niño, La Niña & Ocean-Atmosphere Coupling',
              'Arctic Amplification & Feedback Loops',
              'Climate Modeling & Future Projections',
            ],
          },
          {
            label: 'Paleoclimatology & Ice Ages',
            topics: [
              'Ice Cores, Tree Rings & Proxy Data',
              'Milankovitch Cycles & Orbital Forcing',
              'Mass Extinction Events & Climate',
              'The Snowball Earth & Hothouse Episodes',
            ],
          },
        ],
      },
      {
        label: 'Oceanography & Hydrology',
        subfields: [
          {
            label: 'Ocean Currents & Circulation',
            topics: [
              'Surface Currents & Wind-Driven Circulation',
              'Thermohaline Circulation & the Global Conveyor',
              'Upwelling, Downwelling & Nutrient Cycling',
              'Tides, Waves & Coastal Dynamics',
            ],
          },
          {
            label: 'Marine Chemistry & Ocean Composition',
            topics: [
              'Salinity, pH & Ocean Chemistry',
              'Ocean Acidification & CO₂ Absorption',
              'Dissolved Oxygen & Marine Dead Zones',
              'Hydrothermal Vents & Deep Sea Chemistry',
            ],
          },
          {
            label: 'Freshwater Systems, Rivers & Aquifers',
            topics: [
              'River Systems, Drainage Basins & Watersheds',
              'Lakes, Wetlands & Inland Seas',
              'Groundwater, Aquifers & the Water Table',
              'Glaciers, Ice Sheets & Meltwater',
            ],
          },
          {
            label: 'The Water Cycle & Precipitation',
            topics: [
              'Evaporation, Transpiration & Evapotranspiration',
              'Condensation, Cloud Formation & Precipitation',
              'Runoff, Infiltration & Soil Moisture',
              'Droughts, Floods & Hydrological Extremes',
            ],
          },
        ],
      },
      {
        label: 'Ecology & Environmental Systems',
        subfields: [
          {
            label: 'Ecosystems & Biomes',
            topics: [
              'Tropical Rainforests & Temperate Forests',
              'Grasslands, Savannas & Deserts',
              'Tundra, Boreal Forests & Polar Regions',
              'Freshwater & Marine Ecosystems',
            ],
          },
          {
            label: 'Food Webs & Energy Flow',
            topics: [
              'Producers, Consumers & Decomposers',
              'Trophic Levels & Energy Pyramids',
              'Nutrient Cycles: Carbon, Nitrogen & Phosphorus',
              'Keystone Species & Trophic Cascades',
            ],
          },
          {
            label: 'Biodiversity & Conservation',
            topics: [
              'Species Richness, Endemism & Hotspots',
              'Habitat Loss, Fragmentation & Extinction',
              'Conservation Biology & Protected Areas',
              'Invasive Species & Ecological Disruption',
            ],
          },
          {
            label: 'Human Impact & Sustainability',
            topics: [
              'Deforestation, Land Use & Urbanization',
              'Pollution: Air, Water & Soil',
              'Renewable Energy & Carbon Footprints',
              'Sustainable Development & Global Policy',
            ],
          },
        ],
      },
    ],
  },
  mars: {
    discipline: 'Applied Technology',
    centerLabel: 'MARS',
    accentColor: '#f87171',
    domains: [
      {
        label: 'Engineering & Materials Science',
        subfields: [
          {
            label: 'Civil & Structural Engineering',
            topics: [
              'Structural Loads, Forces & Stress Analysis',
              'Foundations, Bridges & Building Design',
              'Roads, Tunnels & Infrastructure Systems',
              'Hydraulic Engineering & Water Management',
            ],
          },
          {
            label: 'Mechanical & Thermal Engineering',
            topics: [
              'Machine Design & Mechanical Systems',
              'Thermodynamic Cycles & Heat Engines',
              'Fluid Mechanics & Aerodynamics',
              'Manufacturing Processes & Robotics',
            ],
          },
          {
            label: 'Electrical & Electronic Engineering',
            topics: [
              'Circuit Design & Signal Processing',
              'Semiconductor Devices & Transistors',
              'Power Systems & Electrical Grids',
              'Telecommunications & Wireless Systems',
            ],
          },
          {
            label: 'Materials, Metals & Nanomaterials',
            topics: [
              'Metals, Alloys & Crystalline Structures',
              'Polymers, Ceramics & Composites',
              'Nanomaterials, Graphene & Carbon Nanotubes',
              'Biomaterials & Smart Materials',
            ],
          },
        ],
      },
      {
        label: 'Computer Science & Information Technology',
        subfields: [
          {
            label: 'Programming Languages & Software Engineering',
            topics: [
              'Programming Paradigms & Language Design',
              'Object-Oriented & Functional Programming',
              'Software Development & Agile Methods',
              'Version Control, Testing & Debugging',
            ],
          },
          {
            label: 'Data Structures, Databases & Algorithms',
            topics: [
              'Arrays, Lists, Trees & Graphs',
              'Relational & Non-Relational Databases',
              'SQL, Query Optimization & Indexing',
              'Big Data, Data Mining & Analytics',
            ],
          },
          {
            label: 'Artificial Intelligence & Machine Learning',
            topics: [
              'Supervised, Unsupervised & Reinforcement Learning',
              'Neural Networks & Deep Learning',
              'Natural Language Processing & Computer Vision',
              'AI Ethics, Bias & Explainability',
            ],
          },
          {
            label: 'Networks, Cybersecurity & the Internet',
            topics: [
              'Network Protocols, TCP/IP & DNS',
              'The Internet, Cloud Computing & Web Architecture',
              'Encryption, Cryptography & Authentication',
              'Cyber Threats, Malware & Intrusion Detection',
            ],
          },
        ],
      },
      {
        label: 'Medicine & Biomedical Science',
        subfields: [
          {
            label: 'Anatomy, Physiology & Pathology',
            topics: [
              'Human Body Systems & Homeostasis',
              'Cellular Pathology & Disease Mechanisms',
              'Inflammation, Immunity & Infection',
              'Genetic Disorders & Congenital Conditions',
            ],
          },
          {
            label: 'Pharmacology & Drug Development',
            topics: [
              'Drug Receptors, Agonists & Antagonists',
              'Pharmacokinetics & Drug Metabolism',
              'Drug Discovery & Clinical Trials',
              'Antibiotic Resistance & New Therapeutics',
            ],
          },
          {
            label: 'Surgery, Diagnostics & Medical Imaging',
            topics: [
              'Surgical Principles & Techniques',
              'X-Ray, CT, MRI & Ultrasound Imaging',
              'Laboratory Diagnostics & Biomarkers',
              'Minimally Invasive & Robotic Surgery',
            ],
          },
          {
            label: 'Public Health & Epidemiology',
            topics: [
              'Disease Surveillance & Outbreak Investigation',
              'Vaccines, Herd Immunity & Immunization Programs',
              'Global Health, Pandemics & the WHO',
              'Health Disparities & Social Determinants',
            ],
          },
        ],
      },
      {
        label: 'Agriculture & Food Science',
        subfields: [
          {
            label: 'Soil Science & Crop Production',
            topics: [
              'Soil Composition, Texture & Fertility',
              'Crop Genetics, Breeding & GMOs',
              'Irrigation, Fertilization & Pesticides',
              'Crop Rotation, Cover Crops & Soil Health',
            ],
          },
          {
            label: 'Animal Husbandry & Livestock',
            topics: [
              'Livestock Breeds, Genetics & Selection',
              'Animal Nutrition & Feed Management',
              'Veterinary Medicine & Animal Health',
              'Dairy, Poultry & Aquaculture Systems',
            ],
          },
          {
            label: 'Food Processing & Nutrition Science',
            topics: [
              'Food Preservation & Safety',
              'Macronutrients, Micronutrients & Dietary Science',
              'Food Chemistry & Flavor Science',
              'Food Manufacturing & Supply Chains',
            ],
          },
          {
            label: 'Sustainable Agriculture & Food Systems',
            topics: [
              'Organic Farming & Permaculture',
              'Agroforestry & Regenerative Agriculture',
              'Food Security, Access & Distribution',
              'Urban Farming & Vertical Agriculture',
            ],
          },
        ],
      },
    ],
  },
  jupiter: {
    discipline: 'Social Science',
    centerLabel: 'JUPITER',
    accentColor: '#fb923c',
    domains: [
      {
        label: 'History & Archaeology',
        subfields: [
          {
            label: 'Prehistoric & Ancient Civilizations',
            topics: [
              'Human Origins & the Paleolithic Era',
              'The Neolithic Revolution & Early Settlements',
              'Mesopotamia, Egypt & the Fertile Crescent',
              'Ancient Greece, Rome & Classical Civilizations',
            ],
          },
          {
            label: 'Medieval & Early Modern History',
            topics: [
              'The Fall of Rome & the Dark Ages',
              'The Byzantine & Islamic Empires',
              'The Renaissance, Reformation & Scientific Revolution',
              'Age of Exploration & Early Colonialism',
            ],
          },
          {
            label: 'Modern & Contemporary History',
            topics: [
              'The Industrial Revolution & its Social Impact',
              'World War I, II & the Cold War',
              'Decolonization, Independence Movements & the UN',
              'Globalization, the Digital Age & the 21st Century',
            ],
          },
          {
            label: 'Archaeological Methods & Material Culture',
            topics: [
              'Excavation Techniques & Stratigraphy',
              'Dating Methods: Carbon-14 & Dendrochronology',
              'Artifacts, Ceramics & Material Analysis',
              'Underwater, Aerial & Remote Sensing Archaeology',
            ],
          },
        ],
      },
      {
        label: 'Economics & Political Science',
        subfields: [
          {
            label: 'Microeconomics & Market Theory',
            topics: [
              'Supply, Demand & Price Equilibrium',
              'Consumer Theory & Utility',
              'Firm Theory, Competition & Monopoly',
              'Market Failures, Externalities & Public Goods',
            ],
          },
          {
            label: 'Macroeconomics & Global Finance',
            topics: [
              'GDP, Inflation & Unemployment',
              'Monetary Policy & Central Banking',
              'Fiscal Policy, Taxation & Government Spending',
              'International Trade, Exchange Rates & Globalization',
            ],
          },
          {
            label: 'Political Theory & Systems of Government',
            topics: [
              'Democracy, Authoritarianism & Hybrid Regimes',
              'Liberalism, Conservatism & Political Ideologies',
              'Constitutional Design & Separation of Powers',
              'Elections, Voting Systems & Political Parties',
            ],
          },
          {
            label: 'International Relations & Geopolitics',
            topics: [
              'Realism, Liberalism & Constructivism in IR',
              'War, Conflict & Peace Studies',
              'International Organizations: UN, NATO & WTO',
              'Diplomacy, Sanctions & Foreign Policy',
            ],
          },
        ],
      },
      {
        label: 'Anthropology & Sociology',
        subfields: [
          {
            label: 'Physical & Evolutionary Anthropology',
            topics: [
              'Human Evolution & the Fossil Record',
              'Comparative Primatology',
              'Human Variation, Genetics & Race',
              'Paleoanthropology & Hominin Species',
            ],
          },
          {
            label: 'Cultural & Linguistic Anthropology',
            topics: [
              'Culture, Symbols & Meaning',
              'Ritual, Religion & Myth',
              'Language Families & Linguistic Diversity',
              'Fieldwork, Ethnography & Participant Observation',
            ],
          },
          {
            label: 'Social Structures & Institutions',
            topics: [
              'Family, Kinship & Marriage Systems',
              'Education, Religion & Political Institutions',
              'Social Stratification & Class Systems',
              'Urbanization, Migration & Community',
            ],
          },
          {
            label: 'Gender, Race & Social Inequality',
            topics: [
              'Gender Roles, Feminism & Gender Studies',
              'Race, Ethnicity & Racism',
              'Intersectionality & Multiple Identities',
              'Poverty, Mobility & Social Justice',
            ],
          },
        ],
      },
      {
        label: 'Law & Philosophy',
        subfields: [
          {
            label: 'Legal Systems & Constitutional Law',
            topics: [
              'Common Law vs Civil Law Traditions',
              'Constitutional Frameworks & Judicial Review',
              'Human Rights Law & International Conventions',
              'Legal Interpretation & Jurisprudence',
            ],
          },
          {
            label: 'Criminal, Civil & International Law',
            topics: [
              'Criminal Law, Punishment & Penology',
              'Tort Law, Contract Law & Property Rights',
              'International Humanitarian Law & War Crimes',
              'Environmental, Corporate & Cyber Law',
            ],
          },
          {
            label: 'Ethics & Moral Philosophy',
            topics: [
              'Consequentialism & Utilitarianism',
              'Deontology & Kantian Ethics',
              'Virtue Ethics & Moral Character',
              'Applied Ethics: Bioethics, AI Ethics & Environmental Ethics',
            ],
          },
          {
            label: 'Epistemology, Metaphysics & Philosophy of Mind',
            topics: [
              'Knowledge, Justification & Skepticism',
              'Reality, Existence & Ontology',
              'The Mind-Body Problem & Consciousness',
              'Free Will, Determinism & Personal Identity',
            ],
          },
        ],
      },
    ],
  },
  saturn: {
    discipline: 'Astronomy & Cosmology',
    centerLabel: 'SATURN',
    accentColor: '#fde68a',
    domains: [
      {
        label: 'Planetary Science & the Solar System',
        subfields: [
          {
            label: 'The Sun & Solar Physics',
            topics: [
              'Solar Structure: Core, Radiative & Convective Zones',
              'The Solar Atmosphere, Corona & Solar Wind',
              'Sunspots, Solar Flares & Coronal Mass Ejections',
              "The Sun's Life Cycle & Future Evolution",
            ],
          },
          {
            label: 'Terrestrial Planets & the Moon',
            topics: [
              'Mercury & Venus: Atmospheres & Surfaces',
              "Earth's Formation, Structure & Magnetic Field",
              'The Moon: Origin, Geology & Tidal Effects',
              'Mars: Geology, Atmosphere & Habitability',
            ],
          },
          {
            label: 'Gas Giants, Ice Giants & their Moons',
            topics: [
              'Jupiter: Atmosphere, Great Red Spot & Magnetosphere',
              'Saturn: Ring System, Structure & Titan',
              'Uranus & Neptune: Ice Giant Composition & Moons',
              'Europa, Ganymede & Icy Moon Habitability',
            ],
          },
          {
            label: 'Asteroids, Comets & the Kuiper Belt',
            topics: [
              'The Asteroid Belt & Near-Earth Objects',
              'Comet Composition, Tails & Orbits',
              'The Kuiper Belt, Scattered Disk & Pluto',
              'The Oort Cloud & Long-Period Comets',
            ],
          },
        ],
      },
      {
        label: 'Stellar Astronomy & Astrophysics',
        subfields: [
          {
            label: 'Star Formation & Stellar Evolution',
            topics: [
              'Molecular Clouds, Nebulae & Protostar Formation',
              'Pre-Main Sequence Stars & T Tauri Phase',
              'Stellar Nucleosynthesis & Energy Generation',
              'Stellar Aging: Giants, Supergiants & Instability',
            ],
          },
          {
            label: 'Main Sequence Stars & the HR Diagram',
            topics: [
              'The Hertzsprung-Russell Diagram',
              'Spectral Classification: O, B, A, F, G, K, M',
              'Stellar Masses, Radii & Luminosities',
              'Variable Stars, Pulsars & Stellar Oscillations',
            ],
          },
          {
            label: 'Supernovae, Neutron Stars & Black Holes',
            topics: [
              'Core Collapse & Type II Supernovae',
              'Type Ia Supernovae & Standard Candles',
              'Neutron Stars, Pulsars & Magnetars',
              'Stellar Black Holes & Accretion Disks',
            ],
          },
          {
            label: 'Binary Stars & Star Clusters',
            topics: [
              'Visual, Spectroscopic & Eclipsing Binaries',
              'Mass Transfer, Novae & X-Ray Binaries',
              'Open Clusters & Stellar Associations',
              'Globular Clusters & Their Role in Galactic History',
            ],
          },
        ],
      },
      {
        label: 'Galactic & Extragalactic Astronomy',
        subfields: [
          {
            label: 'The Milky Way & its Structure',
            topics: [
              'The Galactic Disk, Bulge & Halo',
              'Spiral Arms, Star-Forming Regions & the ISM',
              'The Galactic Center & Sagittarius A*',
              'Dark Matter Halo & Galactic Rotation Curves',
            ],
          },
          {
            label: 'Galaxy Types, Formation & Evolution',
            topics: [
              'Elliptical, Spiral & Irregular Galaxies',
              'Galaxy Formation in the Early Universe',
              'Mergers, Interactions & Galactic Cannibalism',
              'Galaxy Scaling Relations & the Hubble Sequence',
            ],
          },
          {
            label: 'Galaxy Clusters & Large Scale Structure',
            topics: [
              'Galaxy Groups & the Local Group',
              'Galaxy Clusters, Intracluster Medium & Dark Matter',
              'Superclusters, Filaments & Cosmic Voids',
              'The Cosmic Web & Large Scale Structure Surveys',
            ],
          },
          {
            label: 'Active Galaxies, Quasars & Black Hole Jets',
            topics: [
              'Active Galactic Nuclei & Seyfert Galaxies',
              'Quasars, Blazars & Radio Galaxies',
              'Supermassive Black Holes & the M-Sigma Relation',
              'Relativistic Jets & Feedback Mechanisms',
            ],
          },
        ],
      },
      {
        label: 'Cosmology & the Origin of the Universe',
        subfields: [
          {
            label: 'The Big Bang & Early Universe',
            topics: [
              'Evidence for the Big Bang: Redshift & the CMB',
              'The Planck Epoch & Quantum Gravity',
              'Baryogenesis & Matter-Antimatter Asymmetry',
              'Nucleosynthesis & the Formation of Light Elements',
            ],
          },
          {
            label: 'Cosmic Inflation & the CMB',
            topics: [
              'The Horizon & Flatness Problems',
              'Inflationary Models & the Inflaton Field',
              'The Cosmic Microwave Background & WMAP/Planck',
              'CMB Anisotropies & Structure Formation',
            ],
          },
          {
            label: 'Dark Matter & Dark Energy',
            topics: [
              'Evidence for Dark Matter: Rotation Curves & Lensing',
              'Dark Matter Candidates: WIMPs, Axions & Sterile Neutrinos',
              'Evidence for Dark Energy: Type Ia Supernovae',
              'The Cosmological Constant & Vacuum Energy',
            ],
          },
          {
            label: 'The Fate & Ultimate Structure of the Universe',
            topics: [
              'The Big Freeze, Big Rip & Big Crunch Scenarios',
              'Entropy, Heat Death & the Arrow of Time',
              'The Multiverse & Eternal Inflation',
              'Quantum Cosmology & the Wave Function of the Universe',
            ],
          },
        ],
      },
    ],
  },
  uranus: {
    discipline: 'Chemistry',
    centerLabel: 'URANUS',
    accentColor: '#67e8f9',
    domains: [
      {
        label: 'Inorganic & Physical Chemistry',
        subfields: [
          {
            label: 'Atomic Structure & the Periodic Table',
            topics: [
              'Protons, Neutrons, Electrons & Atomic Number',
              'Electron Configuration & Quantum Numbers',
              'Periodic Trends: Electronegativity, Ionization & Radius',
              "The Periodic Table's History & Organization",
            ],
          },
          {
            label: 'Chemical Bonding & Molecular Structure',
            topics: [
              'Ionic, Covalent & Metallic Bonding',
              'Lewis Structures, VSEPR & Molecular Geometry',
              'Hybridization, Orbital Theory & MO Theory',
              'Intermolecular Forces: Hydrogen Bonds, Van der Waals',
            ],
          },
          {
            label: 'Thermodynamics & Chemical Equilibrium',
            topics: [
              'Enthalpy, Entropy & Gibbs Free Energy',
              "Hess's Law & Thermochemistry",
              "Chemical Equilibrium & Le Chatelier's Principle",
              'Phase Diagrams & State Transitions',
            ],
          },
          {
            label: 'Kinetics & Reaction Rates',
            topics: [
              'Rate Laws & Reaction Orders',
              'Activation Energy & the Arrhenius Equation',
              'Reaction Mechanisms & Elementary Steps',
              'Catalysis: Homogeneous, Heterogeneous & Enzymatic',
            ],
          },
        ],
      },
      {
        label: 'Organic Chemistry',
        subfields: [
          {
            label: 'Hydrocarbons & Functional Groups',
            topics: [
              'Alkanes, Alkenes & Alkynes',
              'Aromatic Compounds & Benzene',
              'Alcohols, Ethers & Carbonyl Groups',
              'Amines, Amides & Nitrogen-Containing Compounds',
            ],
          },
          {
            label: 'Reaction Mechanisms & Synthesis',
            topics: [
              'Nucleophilic Substitution: SN1 & SN2',
              'Elimination Reactions: E1 & E2',
              'Addition, Oxidation & Reduction Reactions',
              'Retrosynthetic Analysis & Multi-Step Synthesis',
            ],
          },
          {
            label: 'Stereochemistry & Isomerism',
            topics: [
              'Constitutional Isomers & Conformations',
              'Chirality, Enantiomers & Optical Activity',
              'Diastereomers, Meso Compounds & Racemic Mixtures',
              'R/S & E/Z Nomenclature Systems',
            ],
          },
          {
            label: 'Polymers & Macromolecules',
            topics: [
              'Addition & Condensation Polymerization',
              'Natural Polymers: Rubber, Cellulose & Silk',
              'Synthetic Polymers: Nylon, Polyester & Plastics',
              'Polymer Properties, Structures & Applications',
            ],
          },
        ],
      },
      {
        label: 'Biochemistry & Molecular Chemistry',
        subfields: [
          {
            label: 'Proteins, Enzymes & Amino Acids',
            topics: [
              'Amino Acid Structure & Properties',
              'Protein Primary, Secondary, Tertiary & Quaternary Structure',
              'Enzyme Kinetics & Michaelis-Menten Theory',
              'Protein Folding, Misfolding & Prion Diseases',
            ],
          },
          {
            label: 'Carbohydrates, Lipids & Membranes',
            topics: [
              'Monosaccharides, Disaccharides & Polysaccharides',
              'Fatty Acids, Triglycerides & Phospholipids',
              'The Lipid Bilayer & Membrane Dynamics',
              'Glycolipids, Glycoproteins & Cell Signaling',
            ],
          },
          {
            label: 'DNA, RNA & Molecular Genetics',
            topics: [
              'DNA Structure, Base Pairing & the Double Helix',
              'DNA Replication, Repair & Recombination',
              'Transcription, RNA Processing & Translation',
              'Gene Regulation, Operons & Epigenetics',
            ],
          },
          {
            label: 'Metabolic Pathways & Cellular Energy',
            topics: [
              'Glycolysis & Pyruvate Metabolism',
              'The Citric Acid Cycle & Oxidative Phosphorylation',
              'Fatty Acid Oxidation & Lipid Metabolism',
              'Photosynthesis: Light Reactions & the Calvin Cycle',
            ],
          },
        ],
      },
      {
        label: 'Analytical & Industrial Chemistry',
        subfields: [
          {
            label: 'Spectroscopy & Chromatography',
            topics: [
              'UV-Vis, IR & Raman Spectroscopy',
              'NMR Spectroscopy & Structure Determination',
              'Mass Spectrometry & Molecular Identification',
              'Gas & Liquid Chromatography (GC & HPLC)',
            ],
          },
          {
            label: 'Electrochemistry & Chemical Sensors',
            topics: [
              'Oxidation-Reduction Reactions & Half-Cells',
              'The Nernst Equation & Electrochemical Cells',
              'Batteries, Fuel Cells & Electrolysis',
              'Chemical Sensors, Biosensors & Lab-on-a-Chip',
            ],
          },
          {
            label: 'Industrial & Green Chemistry',
            topics: [
              'The Twelve Principles of Green Chemistry',
              'Industrial Synthesis: Haber-Bosch & Contact Process',
              'Petrochemical Refining & the Chemical Industry',
              'Waste Reduction, Atom Economy & Sustainable Processes',
            ],
          },
          {
            label: 'Pharmaceutical & Materials Chemistry',
            topics: [
              'Drug Design, Medicinal Chemistry & SAR',
              'Polymorphism, Crystallography & Drug Formulation',
              'Semiconductor Chemistry & Electronic Materials',
              'Superconductors, Liquid Crystals & Functional Materials',
            ],
          },
        ],
      },
    ],
  },
  neptune: {
    discipline: 'Biology',
    centerLabel: 'NEPTUNE',
    accentColor: '#818cf8',
    domains: [
      {
        label: 'Cell Biology & Genetics',
        subfields: [
          {
            label: 'Cell Structure & Organelles',
            topics: [
              'Prokaryotic vs Eukaryotic Cell Architecture',
              'The Nucleus, Chromosomes & Nuclear Envelope',
              'Mitochondria, Chloroplasts & Endosymbiosis',
              'The Endomembrane System, Cytoskeleton & Cell Wall',
            ],
          },
          {
            label: 'Cell Division, Mitosis & Meiosis',
            topics: [
              'The Cell Cycle: G1, S, G2 & M Phases',
              'Mitosis: Prophase, Metaphase, Anaphase & Telophase',
              'Meiosis, Crossing Over & Genetic Recombination',
              'Cell Cycle Regulation, Checkpoints & Cancer',
            ],
          },
          {
            label: 'Mendelian & Classical Genetics',
            topics: [
              "Mendel's Laws of Segregation & Independent Assortment",
              'Dominance, Recessiveness & Incomplete Dominance',
              'Sex-Linked Traits, Linkage & Genetic Mapping',
              'Pedigree Analysis & Human Genetic Disorders',
            ],
          },
          {
            label: 'Genomics, Epigenetics & Gene Expression',
            topics: [
              'The Human Genome Project & Genome Sequencing',
              'Gene Regulation: Promoters, Enhancers & Silencers',
              'Epigenetic Modifications: Methylation & Histone Modification',
              'CRISPR, Gene Editing & Functional Genomics',
            ],
          },
        ],
      },
      {
        label: 'Anatomy & Physiology',
        subfields: [
          {
            label: 'Skeletal, Muscular & Connective Systems',
            topics: [
              'Bone Structure, Growth & Remodeling',
              'Joints, Cartilage & the Synovial System',
              'Skeletal, Smooth & Cardiac Muscle',
              'Tendons, Ligaments & Connective Tissue',
            ],
          },
          {
            label: 'Cardiovascular & Respiratory Systems',
            topics: [
              'The Heart: Structure, Conduction & Cardiac Cycle',
              'Blood Vessels, Blood Pressure & Circulation',
              'Blood Composition, Clotting & Hematopoiesis',
              'The Lungs, Gas Exchange & Respiratory Control',
            ],
          },
          {
            label: 'Nervous, Endocrine & Immune Systems',
            topics: [
              'The Central & Peripheral Nervous System',
              'Hormones, Glands & the Endocrine System',
              'Innate Immunity & the Inflammatory Response',
              'Adaptive Immunity, Antibodies & Vaccines',
            ],
          },
          {
            label: 'Digestive, Reproductive & Excretory Systems',
            topics: [
              'Digestion: From Mouth to Large Intestine',
              'Nutrient Absorption, Liver Function & the Microbiome',
              'Male & Female Reproductive Systems & Fertilization',
              'The Kidneys, Urinary System & Osmoregulation',
            ],
          },
        ],
      },
      {
        label: 'Ecology & Evolutionary Biology',
        subfields: [
          {
            label: 'Natural Selection & Mechanisms of Evolution',
            topics: [
              "Darwin's Theory & Evidence for Evolution",
              'Variation, Heritability & Fitness',
              'Genetic Drift, Gene Flow & Mutation',
              'Sexual Selection & Kin Selection',
            ],
          },
          {
            label: 'Speciation & the Tree of Life',
            topics: [
              'Allopatric & Sympatric Speciation',
              'Phylogenetics & Cladistics',
              'The Major Transitions in Evolution',
              'The Five Kingdoms & Domain Classification',
            ],
          },
          {
            label: 'Population Ecology & Dynamics',
            topics: [
              'Population Growth: Exponential & Logistic Models',
              'Carrying Capacity, Limiting Factors & Density Dependence',
              'Predator-Prey Dynamics & the Lotka-Volterra Equations',
              'Metapopulations, Extinction & Island Biogeography',
            ],
          },
          {
            label: 'Behavioral Ecology & Animal Communication',
            topics: [
              'Foraging Theory & Optimal Behavior',
              'Mating Systems: Monogamy, Polygamy & Promiscuity',
              'Animal Communication: Visual, Acoustic & Chemical',
              'Altruism, Cooperation & Evolutionary Game Theory',
            ],
          },
        ],
      },
      {
        label: 'Microbiology & Virology',
        subfields: [
          {
            label: 'Bacteria & Prokaryotic Life',
            topics: [
              'Bacterial Cell Structure & Morphology',
              'Bacterial Metabolism: Aerobic & Anaerobic',
              'Bacterial Genetics: Transformation, Transduction & Conjugation',
              'Pathogenic Bacteria & Mechanisms of Infection',
            ],
          },
          {
            label: 'Fungi, Protists & Eukaryotic Microbes',
            topics: [
              'Fungal Structure, Reproduction & Lifecycle',
              'Pathogenic Fungi & Mycoses',
              'Protist Diversity: Algae, Amoebae & Ciliates',
              'Parasitic Protists: Malaria, Toxoplasma & Trypanosomes',
            ],
          },
          {
            label: 'Viruses, Bacteriophages & Prions',
            topics: [
              'Virus Structure, Classification & Lifecycle',
              'DNA vs RNA Viruses & Retroviruses',
              'Bacteriophages, Lysogeny & Phage Therapy',
              'Prions, Misfolded Proteins & Neurodegenerative Disease',
            ],
          },
          {
            label: 'Microbial Ecology & the Human Microbiome',
            topics: [
              'Soil, Marine & Extreme Environment Microbiomes',
              'The Gut Microbiome & Human Health',
              'Biofilms, Quorum Sensing & Microbial Communities',
              'Horizontal Gene Transfer & Microbial Evolution',
            ],
          },
        ],
      },
    ],
  },

  nexus: {
    discipline: 'Nexus · Practical Knowledge Hub',
    centerLabel: 'NEXUS',
    accentColor: '#06b6d4',
    domains: [
      {
        label: 'How to Make',
        color: '#10b981',
        subfields: [
          { label: 'Materials & Sourcing', topics: ['Raw materials', 'Recycled inputs', 'Local sourcing', 'Material specs'] },
          { label: 'Tools & Equipment', topics: ['Hand tools', 'Power tools', 'Fabrication gear', 'Safety kit'] },
          { label: 'Construction Methods', topics: ['Assembly', 'Joining techniques', 'Finishing', 'Quality checks'] },
          { label: 'DIY Projects', topics: ['Step-by-step builds', 'Plans & blueprints', 'Modifications', 'Troubleshooting'] },
        ],
      },
      {
        label: 'Processes',
        color: '#f59e0b',
        subfields: [
          { label: 'Workflows', topics: ['Planning stages', 'Task sequencing', 'Decision trees', 'Feedback loops'] },
          { label: 'Protocols', topics: ['Standard procedures', 'Safety protocols', 'Emergency steps', 'Quality control'] },
          { label: 'Automation', topics: ['Process automation', 'Sensors & triggers', 'Control systems', 'Monitoring'] },
          { label: 'Optimisation', topics: ['Efficiency gains', 'Waste reduction', 'Energy savings', 'Time management'] },
        ],
      },
      {
        label: 'How to Use',
        color: '#6366f1',
        subfields: [
          { label: 'Getting Started', topics: ['Setup & install', 'First use', 'Configuration', 'Calibration'] },
          { label: 'Operation', topics: ['Daily use', 'Best practices', 'Adjustments', 'Maintenance routines'] },
          { label: 'Troubleshooting', topics: ['Common errors', 'Diagnostics', 'Repairs', 'When to replace'] },
          { label: 'Advanced Use', topics: ['Advanced settings', 'Customisation', 'Integration', 'Performance tuning'] },
        ],
      },
      {
        label: 'Documentation',
        color: '#ec4899',
        subfields: [
          { label: 'Specifications', topics: ['Technical specs', 'Dimensions & tolerances', 'Standards compliance', 'BOM lists'] },
          { label: 'Manuals', topics: ['User manuals', 'Service manuals', 'Quick-start guides', 'Reference cards'] },
          { label: 'Records', topics: ['Build logs', 'Test reports', 'Maintenance logs', 'Revision history'] },
          { label: 'Sharing', topics: ['Open-source licensing', 'Publishing guides', 'Version control', 'Community review'] },
        ],
      },
    ],
  },

  core: {
    discipline: 'Core · Cross-field Fundamentals',
    centerLabel: 'CORE',
    accentColor: '#a855f7',
    domains: [
      {
        label: 'Energy & Matter',
        color: '#ff6b35',
        subfields: [
          { label: 'Energy Basics', topics: ['Energy forms', 'Conversion & loss', 'Storage', 'Efficiency'] },
          { label: 'Materials Science', topics: ['States of matter', 'Properties', 'Chemical reactions', 'Phase change'] },
          { label: 'Electricity', topics: ['Circuits', 'Current & voltage', 'Power', 'Electrical safety'] },
          { label: 'Thermodynamics', topics: ['Heat transfer', 'Entropy', 'Engines', 'Refrigeration'] },
        ],
      },
      {
        label: 'Life & Systems',
        color: '#34d399',
        subfields: [
          { label: 'Biology Basics', topics: ['Cells & organisms', 'Ecosystems', 'Evolution', 'Genetics'] },
          { label: 'Systems Thinking', topics: ['Feedback loops', 'Complexity', 'Emergence', 'Resilience'] },
          { label: 'Food & Water', topics: ['Nutrition basics', 'Water cycles', 'Agriculture intro', 'Food safety'] },
          { label: 'Health Fundamentals', topics: ['Human body', 'Disease prevention', 'First aid', 'Mental health'] },
        ],
      },
      {
        label: 'Society & Tools',
        color: '#67e8f9',
        subfields: [
          { label: 'Governance', topics: ['Decision-making', 'The commons', 'Rights & duties', 'Conflict resolution'] },
          { label: 'Communication', topics: ['Language & writing', 'Digital tools', 'Networks', 'Media literacy'] },
          { label: 'Mathematics', topics: ['Arithmetic', 'Geometry', 'Statistics', 'Logic'] },
          { label: 'Economy', topics: ['Exchange & trade', 'Resources', 'Value creation', 'Local economies'] },
        ],
      },
      {
        label: 'Build & Create',
        color: '#f87171',
        subfields: [
          { label: 'Engineering Basics', topics: ['Forces & structures', 'Simple machines', 'Design process', 'Prototyping'] },
          { label: 'Computing', topics: ['Algorithms', 'Data & storage', 'Networks', 'AI basics'] },
          { label: 'Making & Craft', topics: ['Hand skills', 'Measuring', 'Joining methods', 'Finishing'] },
          { label: 'Science Method', topics: ['Hypothesis', 'Experiment design', 'Observation', 'Evidence & peer review'] },
        ],
      },
    ],
  },
}
