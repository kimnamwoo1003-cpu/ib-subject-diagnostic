import { buildINSQuestionPool, getINSTopics } from "./ins-bank";
import { buildLanguageMathQuestionPool, getLanguageMathTopics } from "./language-math-bank";
import { buildScienceQuestionPool, getScienceTopics } from "./science-bank";

export type Level = "SL" | "HL";

export type Paper = {
  id: string;
  name: string;
  description: string;
  format: string;
  levels?: Level[];
  topicPrefixes?: string[];
};

export type Topic = {
  code: string;
  title: string;
  level: "both" | "HL";
  definition: string;
  concepts: string[];
  application: string;
  misconception: string;
};

export type Subject = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
  softColor: string;
  levels: Level[];
  group: "Languages" | "Sciences" | "Mathematics" | "I&S";
  selectionMode?: "cumulative" | "multi";
  papers: Paper[];
  topics: Topic[];
};

export type SubjectChoice = {
  id: string;
  name: string;
  group: "Studies in language & literature" | "Language acquisition" | "Individuals & societies" | "Sciences" | "Mathematics" | "The arts";
  levels: string;
  testAvailable: boolean;
  availability?: "available" | "planned" | "unavailable";
};

export type Question = {
  id: string;
  topicCode: string;
  topicTitle: string;
  prompt: string;
  context?: string;
  responseType: "mcq" | "short" | "extended" | "code" | "diagram";
  choices?: string[];
  correctIndex?: number;
  modelAnswer: string;
  keywords: string[];
  marks: number;
  skill: string;
  difficulty: "Foundation" | "Standard" | "Challenge";
  premiumOnly?: boolean;
  visual?: "motion-graph" | "circuit" | "wave" | "network" | "logic" | "erd" | "data-graph" | "function-graph" | "data-table" | "bar-chart" | "geo-map" | "process-flow";
  visualData?: {
    xLabel?: string;
    yLabel?: string;
    x?: number[];
    y?: number[];
    uncertainty?: number;
    title?: string;
    columns?: string[];
    rows?: Array<{ label: string; values: Array<string | number> }>;
    categories?: string[];
    nodes?: string[];
    note?: string;
  };
  starterCode?: string;
  codeLanguage?: "python" | "java";
  format?: "paper" | "concept-mcq";
  variant?: number;
  criterionCodes?: string[];
  commandTerm?: string;
  syllabusPath?: string;
  syllabusProfile?: string;
  difficultyLevel?: 1 | 2 | 3 | 4 | 5;
  estimatedMinutes?: number;
  section?: string;
  markschemePoints?: string[];
  commonErrors?: string[];
};

const questionSignature = (question: Question) => [question.context ?? "", question.prompt, question.starterCode ?? ""]
  .join("||").toLocaleLowerCase().replace(/\s+/g, " ").trim();

const contentHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export function deduplicateQuestionContent(subject: Subject, level: Level, paper: Paper, pool: Question[], excludeIds: string[]) {
  const seen = new Set<string>();
  const excluded = new Set(excludeIds);
  return pool.flatMap((question) => {
    const signature = questionSignature(question);
    if (seen.has(signature)) return [];
    seen.add(signature);
    const normalized = { ...question, id: `${subject.id}-${level}-${paper.id}-content-${contentHash(signature)}` };
    return excluded.has(normalized.id) ? [] : [normalized];
  });
}

export type AssessmentCriterion = {
  code: string;
  name: string;
  description: string;
  keywords: string[];
};

const t = (
  code: string,
  title: string,
  level: "both" | "HL",
  definition: string,
  concepts: string[],
  application: string,
  misconception: string,
): Topic => ({ code, title, level, definition, concepts, application, misconception });

const physicsTopics: Topic[] = [
  t("A1", "Kinematics", "both", "Motion is described using displacement, velocity and acceleration, with gradients and areas linking motion graphs.", ["displacement", "velocity", "acceleration", "motion graphs"], "interpret the gradient and area of a velocity–time graph", "the area under a displacement–time graph gives total displacement"),
  t("A2", "Forces and momentum", "both", "A resultant force changes momentum, while impulse equals the change in momentum of a system.", ["resultant force", "momentum", "impulse", "Newton's laws"], "analyse a collision using system momentum and impulse", "momentum is conserved for each object separately in a collision"),
  t("A3", "Work, energy and power", "both", "Work transfers energy, power is the rate of transfer, and efficiency compares useful output with total input.", ["work", "energy conservation", "power", "efficiency"], "compare two motors lifting the same load", "an object at constant speed has no kinetic energy"),
  t("A4", "Rigid body mechanics", "HL", "Rotational motion is governed by torque, angular acceleration, angular momentum and moment of inertia.", ["torque", "angular momentum", "moment of inertia", "rotational equilibrium"], "predict angular acceleration for different mass distributions", "equal forces always produce equal torques"),
  t("A5", "Galilean and special relativity", "HL", "Physical laws are invariant in inertial frames and measured time and length depend on relative motion.", ["inertial frame", "time dilation", "length contraction", "Lorentz factor"], "compare elapsed time in different inertial frames", "time dilation is caused by a clock malfunction"),
  t("B1", "Thermal energy transfers", "both", "Thermal energy moves by conduction, convection and radiation because of temperature differences.", ["conduction", "convection", "radiation", "thermal equilibrium"], "explain heat loss from an insulated building", "cold flows from a colder object to a warmer object"),
  t("B2", "Greenhouse effect", "both", "Atmospheric gases absorb and re-emit infrared radiation, changing Earth's energy balance.", ["albedo", "infrared radiation", "emissivity", "energy balance"], "predict how albedo changes equilibrium temperature", "the greenhouse effect mainly blocks incoming visible light"),
  t("B3", "Gas laws", "both", "Pressure, volume and absolute temperature of an ideal gas are related through a particle model.", ["pressure", "absolute temperature", "ideal gas", "kinetic model"], "explain pressure change using molecular collisions", "gas particles themselves expand when heated"),
  t("B4", "Thermodynamics", "HL", "The laws of thermodynamics link internal energy, work, heat transfer and entropy.", ["internal energy", "first law", "entropy", "heat engine"], "analyse transfers and efficiency in a heat engine", "all absorbed thermal energy can become useful work"),
  t("B5", "Current and circuits", "both", "Circuit behaviour follows relationships among charge flow, potential difference, resistance, power and emf.", ["current", "potential difference", "resistance", "emf"], "explain terminal potential difference as current rises", "current is used up by a resistor"),
  t("C1", "Simple harmonic motion", "both", "In SHM acceleration is proportional to displacement and directed towards equilibrium.", ["restoring acceleration", "amplitude", "period", "energy exchange"], "link displacement, velocity and acceleration in one cycle", "oscillator speed is greatest at maximum displacement"),
  t("C2", "Wave model", "both", "Waves transfer energy through oscillations described by wavelength, frequency, amplitude and speed.", ["wavelength", "frequency", "wave speed", "intensity"], "read wavelength and phase from a wave graph", "medium particles travel forward with the wave"),
  t("C3", "Wave phenomena", "both", "Reflection, refraction, diffraction and interference follow from wave propagation and superposition.", ["superposition", "interference", "diffraction", "refraction"], "predict how slit width changes diffraction", "destructive interference destroys energy"),
  t("C4", "Standing waves and resonance", "both", "Standing waves have nodes, antinodes and discrete resonant frequencies.", ["node", "antinode", "resonance", "harmonic"], "identify harmonics in a pipe with one closed end", "a standing wave contains no energy"),
  t("C5", "Doppler effect", "both", "Relative source-observer motion changes the observed wave frequency and wavelength.", ["observed frequency", "source motion", "observer motion", "wave speed"], "predict frequency as a source passes an observer", "the emitted source frequency must change"),
  t("D1", "Gravitational fields", "both", "Mass creates a field in which other masses experience force and have potential energy.", ["field strength", "potential", "inverse square", "orbital energy"], "compare field strength and potential with distance", "field strength and potential are the same quantity"),
  t("D2", "Electric and magnetic fields", "both", "Charges and currents create fields that exert forces and store energy.", ["electric field", "electric potential", "magnetic field", "field lines"], "compare forces on charges in electric and magnetic fields", "a magnetic field always changes particle speed"),
  t("D3", "Motion in electromagnetic fields", "both", "Electric and magnetic forces accelerate or deflect charged particles according to charge and velocity.", ["Lorentz force", "circular motion", "velocity selector", "charge-to-mass ratio"], "determine a charged particle's path in a magnetic field", "a stationary charge feels a magnetic force"),
  t("D4", "Induction", "HL", "Changing magnetic flux linkage induces an emf whose direction opposes the change.", ["magnetic flux", "Faraday's law", "Lenz's law", "induced emf"], "predict induced current as a magnet moves through a coil", "a constant field induces current in a stationary loop"),
  t("E1", "Structure of the atom", "both", "Quantized energy levels and nuclear models explain atomic spectra and structure.", ["energy levels", "emission spectrum", "nucleus", "binding energy"], "use a line spectrum to find an energy transition", "a bound electron may have any energy"),
  t("E2", "Quantum physics", "HL", "Quantum objects show wave-particle behaviour described through probability and quantization.", ["photon", "photoelectric effect", "de Broglie wavelength", "wavefunction"], "interpret photoelectric data", "greater intensity releases electrons below threshold frequency"),
  t("E3", "Radioactive decay", "both", "Unstable nuclei decay randomly with constant probability described by activity and half-life.", ["activity", "half-life", "decay constant", "random decay"], "infer half-life after correcting background", "old nuclei are more likely to decay"),
  t("E4", "Fission", "both", "A heavy nucleus can split, releasing binding energy and neutrons that may sustain a chain reaction.", ["mass defect", "chain reaction", "critical mass", "control rods"], "explain a controlled reactor chain reaction", "control rods slow neutrons rather than absorb them"),
  t("E5", "Fusion and stars", "both", "Fusion releases binding energy and powers stars whose properties are inferred from their radiation.", ["fusion", "stellar equilibrium", "luminosity", "black-body spectrum"], "link a star's spectrum and luminosity to an H–R diagram", "brighter-looking stars always have greater luminosity"),
];

const mathTopics: Topic[] = [
  t("M1", "Number and algebra — core", "both", "Algebraic structure includes sequences, series, exponents, logarithms and the binomial theorem.", ["sequences", "logarithms", "binomial theorem", "algebra"], "solve a multi-step exponential or sequence problem", "a logarithm distributes over addition"),
  t("M1H", "Number and algebra — HL extension", "HL", "HL algebra extends to proof, complex numbers, partial fractions and more demanding series.", ["proof", "complex numbers", "partial fractions", "series"], "connect complex roots with polynomial structure", "complex roots of real polynomials never form conjugate pairs"),
  t("M2", "Functions — core", "both", "Functions are analysed through transformations, composites, inverses, roots, domains and asymptotes.", ["domain", "inverse", "transformation", "asymptote"], "infer an equation and domain from graph features", "every function has an inverse on its original domain"),
  t("M2H", "Functions — HL extension", "HL", "HL function work includes deeper polynomial, rational and modelling behaviour and proof of properties.", ["rational function", "polynomial roots", "modulus", "modelling"], "justify the number and nature of roots", "an asymptote can never be crossed"),
  t("M3", "Geometry and trigonometry — core", "both", "Geometric relationships are modelled using trigonometry and spatial reasoning.", ["trigonometric identity", "sine rule", "cosine rule", "geometry"], "solve a three-dimensional trigonometric problem", "inverse trigonometric notation means reciprocal"),
  t("M3H", "Geometry and trigonometry — HL extension", "HL", "HL geometry includes vectors, lines, planes, scalar products and demanding identities.", ["vector", "scalar product", "line and plane", "trigonometric proof"], "determine an angle or distance involving vectors", "two non-zero perpendicular vectors cannot have zero scalar product"),
  t("M4", "Statistics and probability — core", "both", "Data and uncertainty are analysed with probability, distributions, sampling and statistical tests.", ["conditional probability", "distribution", "expected value", "hypothesis test"], "choose a distribution and interpret a result", "a p-value is the probability the null hypothesis is true"),
  t("M4H", "Statistics and probability — HL extension", "HL", "HL probability extends to continuous variables and more sophisticated distribution reasoning.", ["continuous variable", "probability density", "variance", "Bayes' theorem"], "derive or use a probability density function", "the value of a density function is itself a probability"),
  t("M5", "Calculus — core", "both", "Rates and accumulation are studied using differentiation, integration and optimization.", ["derivative", "integral", "optimization", "kinematics"], "construct a derivative-based curve argument", "a zero derivative always means an extremum"),
  t("M5H", "Calculus — HL extension", "HL", "HL calculus includes advanced integration, differential equations, series and proof-based reasoning.", ["differential equation", "Maclaurin series", "integration technique", "limit"], "build and solve a differential equation model", "a series approximation is exact for every input"),
];

const economicsTopics: Topic[] = [
  t("ECO1", "Introduction to economics", "both", "Economics studies choices under scarcity using models, assumptions and positive and normative reasoning.", ["scarcity", "opportunity cost", "PPC", "economic methodology"], "use a PPC to explain productive capacity", "a point inside a PPC is unattainable"),
  t("ECO2", "Microeconomics — core", "both", "Microeconomics examines markets, elasticity, market failure and government intervention.", ["demand and supply", "elasticity", "market failure", "intervention"], "evaluate an indirect tax using stakeholder effects", "the producer always pays the full tax"),
  t("ECO2H", "Microeconomics — HL extension", "HL", "HL microeconomics adds deeper firm behaviour, market structures and quantitative welfare analysis.", ["market structure", "profit", "welfare loss", "theory of the firm"], "compare firm behaviour in contrasting market structures", "profit maximization means charging the highest possible price"),
  t("ECO3", "Macroeconomics — core", "both", "Macroeconomics examines aggregate activity, objectives, inequality and stabilization policies.", ["aggregate demand", "aggregate supply", "inflation", "policy trade-off"], "evaluate lower interest rates in a deflationary gap", "growth improves living standards equally"),
  t("ECO3H", "Macroeconomics — HL extension", "HL", "HL macroeconomics adds more quantitative analysis and competing explanations of macroeconomic outcomes.", ["multiplier", "Phillips curve", "output gap", "policy effectiveness"], "analyse multiplier effects and policy limitations", "a larger multiplier guarantees better policy outcomes"),
  t("ECO4", "The global economy — core", "both", "The global economy covers trade, protectionism, exchange rates and development.", ["comparative advantage", "trade protection", "exchange rate", "development"], "evaluate a tariff using stakeholder effects", "free trade benefits every stakeholder equally"),
  t("ECO4H", "The global economy — HL extension", "HL", "HL global economics adds more quantitative trade, exchange-rate and balance-of-payments analysis.", ["terms of trade", "current account", "exchange-rate calculation", "development strategy"], "recommend a policy for an external imbalance", "a current-account deficit is always harmful"),
];

const csTopics: Topic[] = [
  t("A1.1", "Computer hardware and operation", "both", "The CPU, memory, buses and specialized hardware cooperate to execute instructions.", ["fetch-decode-execute", "register", "bus", "memory"], "trace an instruction through CPU and memory", "the CPU permanently stores user files"),
  t("A1.2", "Data representation and logic", "both", "Binary, hexadecimal, encoding and Boolean logic represent and process data.", ["binary", "hexadecimal", "logic gate", "truth table"], "convert data and evaluate a logic circuit", "binary can represent only whole numbers"),
  t("A1.3", "Operating and control systems", "both", "Operating systems manage resources, processes, files, security and hardware interaction.", ["operating system", "interrupt", "scheduling", "resource management"], "explain process scheduling and interrupts", "polling and interrupts are identical"),
  t("A1.4", "Translation", "HL", "Compilers, interpreters and other translators convert source code for execution.", ["compiler", "interpreter", "machine code", "translation"], "compare compiler and interpreter behaviour", "interpreted code never undergoes translation"),
  t("A2.1", "Network fundamentals", "both", "Networks connect devices using addressing, devices, services and agreed rules.", ["protocol", "packet", "address", "network device"], "explain end-to-end delivery of a packet", "a switch and router have the same role"),
  t("A2.2", "Network architecture", "both", "Architectures organize clients, servers, peers, layers and services.", ["client-server", "peer-to-peer", "layer", "topology"], "justify an architecture for a school service", "peer-to-peer networks have no security risks"),
  t("A2.3", "Data transmission", "both", "Transmission uses packets, media, error control and protocols to move data reliably.", ["bandwidth", "latency", "packet switching", "error checking"], "compare transmission methods for a live service", "greater bandwidth eliminates all latency"),
  t("A2.4", "Network security", "both", "Security controls protect confidentiality, integrity and availability of networked data.", ["encryption", "authentication", "firewall", "malware"], "design layered security for a school network", "encryption prevents every cyberattack"),
  t("A3.1", "Database fundamentals", "both", "Relational databases organize entities, attributes, records and keys.", ["entity", "attribute", "primary key", "relationship"], "identify entities and keys from a scenario", "a primary key may contain duplicate values"),
  t("A3.2", "Database design", "both", "Schemas and normalization reduce problematic redundancy while preserving relationships.", ["schema", "normalization", "foreign key", "referential integrity"], "normalize an unstructured table", "duplicating facts always improves reliability"),
  t("A3.3", "Database programming", "both", "SQL retrieves and changes relational data through structured queries.", ["SELECT", "WHERE", "JOIN", "UPDATE"], "write a query joining related tables", "WHERE and HAVING are always interchangeable"),
  t("A3.4", "Alternative databases and warehouses", "HL", "Non-relational databases and warehouses trade structure and consistency for particular data needs.", ["NoSQL", "data warehouse", "scalability", "consistency"], "choose a database model for large varied data", "relational databases are always the fastest choice"),
  t("A4.1", "Machine-learning fundamentals", "both", "Machine-learning systems use data to learn patterns through supervised and unsupervised approaches.", ["training data", "supervised learning", "unsupervised learning", "validation"], "evaluate a classifier on unseen data", "high training accuracy proves generalization"),
  t("A4.2", "Data preprocessing", "HL", "Data cleaning, feature selection and dimensionality reduction prepare valid inputs for machine-learning models.", ["data cleaning", "feature selection", "normalization", "dimensionality reduction"], "prepare a dataset before training", "more features always improve a model"),
  t("A4.3", "Machine-learning approaches", "HL", "HL students compare neural networks, genetic algorithms and reinforcement learning for different problems.", ["neural network", "genetic algorithm", "reinforcement learning", "model selection"], "select and justify a machine-learning approach", "one machine-learning approach is optimal for every problem"),
  t("A4.4", "Ethical considerations", "both", "Machine-learning systems create ethical questions involving bias, privacy, accountability and social impact.", ["algorithmic bias", "privacy", "accountability", "social impact"], "evaluate an ML system used for a high-stakes decision", "an accurate model must also be fair"),
  t("B1.1", "Computational thinking", "both", "Decomposition, abstraction and pattern recognition support algorithmic solutions.", ["decomposition", "abstraction", "pattern recognition", "algorithm"], "decompose a problem into inputs, rules and edge cases", "abstraction includes every available detail"),
  t("B2.1", "Programming fundamentals", "both", "Variables, types, operators, input, output and scope form program foundations.", ["variable", "data type", "scope", "expression"], "validate and transform user input", "local and global variables always have the same scope"),
  t("B2.2", "Data structures", "both", "Data structures organize values for efficient access and modification.", ["list", "dictionary", "stack", "queue"], "select a structure for a stated operation", "one data structure is optimal for every task"),
  t("B2.3", "Programming constructs", "both", "Selection, iteration and functions control program behaviour.", ["selection", "iteration", "function", "condition"], "trace a nested control-flow algorithm", "a loop condition is checked only once"),
  t("B2.4", "Programming algorithms", "both", "Algorithms search, sort and process data with measurable correctness and efficiency.", ["search", "sort", "efficiency", "trace table"], "compare two algorithms for growing input", "the shortest code is always most efficient"),
  t("B2.5", "File processing", "both", "Programs read, validate, transform and write persistent file data safely.", ["file", "read", "write", "exception handling"], "process a file while handling invalid records", "closing or error-handling files is optional"),
  t("B3.1", "Object-oriented programming", "both", "Classes create objects that combine state and behaviour through encapsulation.", ["class", "object", "attribute", "method"], "design classes for a small system", "a class is the same as one object instance"),
  t("B3.2", "OOP relationships and design", "HL", "HL OOP uses inheritance, polymorphism and composition to design reusable systems.", ["inheritance", "polymorphism", "composition", "encapsulation"], "justify relationships among classes", "inheritance is always better than composition"),
  t("B4", "Abstract data types", "HL", "ADTs specify behaviour independently of implementation, including stacks, queues, trees and graphs.", ["ADT", "stack", "tree", "graph"], "select and implement an ADT for a problem", "an ADT fixes one required internal implementation"),
];

const businessTopics: Topic[] = [
  t("BM1", "Introduction to business management", "both", "Businesses transform inputs into outputs while balancing objectives, stakeholder interests and external change.", ["business objective", "stakeholder", "growth", "external environment"], "analyse a start-up's objectives and stakeholder conflict", "profit is the only objective of every business"),
  t("BM2", "Human resource management", "both", "Human resource decisions shape organizational structure, leadership, motivation and workforce planning.", ["organizational structure", "leadership", "motivation", "workforce planning"], "recommend a leadership and motivation strategy", "financial rewards motivate every employee equally"),
  t("BM2H", "HRM — HL extension", "HL", "HL human resources considers organizational culture, industrial relations and more complex change.", ["organizational culture", "industrial relations", "change", "communication"], "manage resistance during organizational change", "a strong culture always improves performance"),
  t("BM3", "Finance and accounts", "both", "Financial information supports decisions about sources of finance, costs, revenue, profit and cash flow.", ["cash flow", "profit", "break-even", "source of finance"], "interpret accounts and recommend finance", "a profitable business cannot experience cash-flow failure"),
  t("BM3H", "Finance — HL extension", "HL", "HL finance extends quantitative decision-making through investment appraisal, budgets and ratio analysis.", ["investment appraisal", "ratio analysis", "budget", "decision tree"], "compare an investment using quantitative and qualitative evidence", "the project with the highest forecast return is always best"),
  t("BM4", "Marketing", "both", "Marketing identifies customer needs and designs strategies using research, segmentation and the marketing mix.", ["market research", "segmentation", "marketing mix", "positioning"], "develop a marketing strategy for a new product", "promotion is the same as marketing"),
  t("BM4H", "Marketing — HL extension", "HL", "HL marketing applies advanced tools to international strategy, forecasting and competitive positioning.", ["sales forecasting", "international marketing", "position map", "competitive strategy"], "evaluate an international market entry", "a larger market share guarantees higher profit"),
  t("BM5", "Operations management", "both", "Operations decisions coordinate production, quality, location and supply chains to create value.", ["production method", "quality", "location", "supply chain"], "choose an operations method under capacity constraints", "the lowest-cost location is always optimal"),
  t("BM5H", "Operations — HL extension", "HL", "HL operations considers lean production, crisis management, research and development, and information systems.", ["lean production", "crisis management", "innovation", "information system"], "design an operations response to disruption", "holding no inventory removes every operations risk"),
];

const geographyTopics: Topic[] = [
  t("OPT-A", "Freshwater", "both", "Freshwater systems are shaped by physical processes, human demand, scarcity and management choices.", ["drainage basin", "water scarcity", "flood risk", "management"], "evaluate a drainage-basin management strategy", "water scarcity is caused only by low rainfall"),
  t("OPT-B", "Oceans and coastal margins", "both", "Coastal and ocean systems reflect physical processes, resource use, hazards and management.", ["coastal process", "ocean resource", "hazard", "management"], "compare hard and soft coastal management", "coastal erosion can be stopped permanently"),
  t("OPT-C", "Extreme environments", "both", "Extreme environments present distinctive physical processes, opportunities, risks and sustainability challenges.", ["extreme environment", "resource opportunity", "risk", "sustainability"], "assess development in an extreme environment", "extreme environments have no permanent population"),
  t("OPT-D", "Geophysical hazards", "both", "Hazard risk reflects physical events interacting with exposure, vulnerability and capacity.", ["hazard", "vulnerability", "risk", "resilience"], "compare why similar hazards cause different losses", "higher-magnitude hazards always cause more deaths"),
  t("OPT-E", "Leisure, tourism and sport", "both", "Leisure and tourism flows reshape places, economies, cultures and environments.", ["tourism flow", "carrying capacity", "multiplier", "sustainability"], "evaluate a tourism strategy", "more tourists always create greater local development"),
  t("OPT-F", "Food and health", "both", "Food systems and health outcomes vary through access, globalization, environments and policy.", ["food security", "health transition", "access", "policy"], "explain spatial variation in food security", "food insecurity means there is no food nationally"),
  t("OPT-G", "Urban environments", "both", "Urban systems concentrate people, flows, inequality, environmental pressures and planning responses.", ["urbanization", "segregation", "urban system", "sustainability"], "evaluate a sustainable-city strategy", "urban growth and urbanization are identical"),
  t("CORE-1", "Changing population", "both", "Population distribution changes through fertility, mortality, migration and policy.", ["population change", "migration", "demographic transition", "policy"], "analyse a changing population structure", "population ageing is caused only by longer life expectancy"),
  t("CORE-2", "Global climate", "both", "Climate change creates unequal vulnerability, impacts, adaptation and mitigation choices.", ["climate change", "vulnerability", "adaptation", "mitigation"], "compare climate vulnerability between places", "adaptation reduces greenhouse-gas emissions directly"),
  t("CORE-3", "Global resource consumption", "both", "Resource consumption and security reflect unequal demand, supply, trade and management.", ["resource security", "consumption", "ecological footprint", "circular economy"], "evaluate a resource-security strategy", "resource security depends only on domestic reserves"),
  t("HL-1", "Power, places and networks", "HL", "Global interactions create networks and power relationships among states, firms and places.", ["global network", "power", "globalization", "place"], "analyse power within a global network", "globalization affects every place in the same way"),
  t("HL-2", "Human development and diversity", "HL", "Development and diversity are contested, spatially uneven and shaped by identity and governance.", ["development", "inequality", "identity", "governance"], "evaluate a development pathway", "a higher GDP guarantees broader human development"),
  t("HL-3", "Global risks and resilience", "HL", "Global risks spread through interconnected systems while resilience depends on capacity and governance.", ["global risk", "resilience", "interdependence", "governance"], "compare resilience to a transboundary risk", "resilience means returning to exactly the previous condition"),
];

const historyTopics: Topic[] = [
  t("P1-1", "Military leaders", "both", "Source analysis evaluates the rise, rule and impact of selected military leaders.", ["origin", "purpose", "value", "limitation"], "compare sources about a military leader", "a primary source is automatically reliable"),
  t("P1-2", "Conquest and its impact", "both", "Conquest is studied through causes, methods, perspectives and consequences using sources.", ["conquest", "perspective", "cause", "consequence"], "evaluate contrasting accounts of conquest", "the victorious account is the most accurate"),
  t("P1-3", "The move to global war", "both", "Expansion and international responses are analysed through evidence about the move to global war.", ["expansion", "appeasement", "international response", "causation"], "compare explanations for expansion", "one event alone caused global war"),
  t("P1-4", "Rights and protest", "both", "Rights movements are examined through aims, methods, opposition and impact.", ["rights", "protest", "opposition", "impact"], "evaluate the effectiveness of protest methods", "legal reform immediately ends discrimination"),
  t("P1-5", "Conflict and intervention", "both", "Conflict and external intervention are interpreted through contested source evidence.", ["conflict", "intervention", "perspective", "consequence"], "assess why outside intervention changed a conflict", "intervention is always politically neutral"),
  t("P2-1", "Authoritarian states", "both", "Authoritarian states are compared through emergence, consolidation, policy and impact.", ["emergence", "consolidation", "policy", "opposition"], "compare the rise of two authoritarian leaders", "propaganda alone explains authoritarian control"),
  t("P2-2", "Causes and effects of 20th-century wars", "both", "Wars are compared through long- and short-term causes, practices and consequences.", ["long-term cause", "short-term cause", "practice of war", "consequence"], "compare causes of two wars from different regions", "the trigger event is the complete cause of war"),
  t("P2-3", "Cold War: tensions and rivalries", "both", "Cold War rivalry is studied through ideology, crises, leaders, détente and ending.", ["ideology", "superpower rivalry", "crisis", "détente"], "evaluate the role of leaders in ending the Cold War", "the Cold War was only a military conflict"),
  t("P2-4", "Independence movements", "both", "Independence movements combined leadership, ideology, mass participation and changing international contexts.", ["nationalism", "leadership", "mass movement", "decolonization"], "compare methods used by two independence movements", "independence ended colonial influence immediately"),
  t("P3-A", "History of Africa and the Middle East", "HL", "Regional depth studies require precise evidence, historiography and sustained comparative argument.", ["regional evidence", "causation", "continuity", "historiography"], "build a regional evidence-based essay", "more factual detail automatically creates analysis"),
  t("P3-B", "History of the Americas", "HL", "Regional depth studies require precise evidence, historiography and sustained comparative argument.", ["regional evidence", "causation", "change", "historiography"], "build an Americas evidence-based essay", "historiography means listing historians' names"),
  t("P3-C", "History of Asia and Oceania", "HL", "Regional depth studies require precise evidence, historiography and sustained comparative argument.", ["regional evidence", "perspective", "change", "historiography"], "build an Asia and Oceania evidence-based essay", "a narrative automatically answers an analytical question"),
  t("P3-D", "History of Europe", "HL", "Regional depth studies require precise evidence, historiography and sustained comparative argument.", ["regional evidence", "causation", "continuity", "historiography"], "build a European evidence-based essay", "the conclusion should only repeat the introduction"),
];

const globalPoliticsTopics: Topic[] = [
  t("C1", "Understanding power and global politics", "both", "Power operates through states, institutions, non-state actors, legitimacy and interdependence.", ["power", "sovereignty", "legitimacy", "interdependence"], "analyse power in a contemporary political issue", "states are the only actors with political power"),
  t("T1", "Rights and justice", "both", "Rights and justice debates involve competing claims, institutions, implementation and inequality.", ["human rights", "justice", "equality", "accountability"], "evaluate a rights intervention using a case study", "legal recognition guarantees practical protection"),
  t("T2", "Development and sustainability", "both", "Development and sustainability are contested and shaped by power, resources and policy choices.", ["development", "sustainability", "inequality", "governance"], "compare development strategies", "economic growth is identical to development"),
  t("T3", "Peace and conflict", "both", "Conflict and peace reflect causes, actors, violence, security and peacebuilding choices.", ["conflict", "security", "peacebuilding", "violence"], "evaluate a peacebuilding strategy", "the absence of war is always positive peace"),
  t("H1", "HL global political challenges", "HL", "HL inquiry investigates a contemporary global political challenge through researched case studies and sources.", ["political challenge", "case study", "source evaluation", "synthesis"], "synthesize sources and researched cases", "one case study can prove a universal political claim"),
];

const psychologyTopics: Topic[] = [
  t("PSY1", "Biological approach", "both", "Biological explanations connect brain processes, genetics and physiology with behaviour.", ["brain", "chemical messenger", "genetics", "behaviour"], "apply a biological explanation to a behaviour", "a biological correlation proves causation"),
  t("PSY2", "Cognitive approach", "both", "Cognitive explanations use models and research to study memory, thinking and decision-making.", ["cognitive process", "model", "bias", "memory"], "explain a cognitive bias with evidence", "a model is an exact copy of cognition"),
  t("PSY3", "Sociocultural approach", "both", "Sociocultural explanations connect identity, groups, culture and social learning with behaviour.", ["culture", "social learning", "identity", "group"], "apply social learning to an unfamiliar context", "culture determines behaviour in the same way for everyone"),
  t("PSY4", "Contexts and concept integration", "both", "Psychological content is applied across contexts using concepts such as bias, causality, measurement and responsibility.", ["bias", "causality", "measurement", "responsibility"], "evaluate a claim in a new context", "one perspective is enough to explain complex behaviour"),
  t("PSY5", "Research methodology and class practicals", "both", "Psychological research choices affect validity, ethics, sampling, measurement and interpretation.", ["research method", "validity", "ethics", "sampling"], "design and evaluate a class practical", "a larger sample removes every source of bias"),
  t("PSYH1", "Culture, motivation and technology", "HL", "HL psychology evaluates how culture, motivation and technology shape human behaviour.", ["culture", "motivation", "technology", "interaction"], "synthesize an HL extension claim", "technology affects all populations in the same way"),
  t("PSYH2", "Data analysis and interpretation", "HL", "HL students interpret quantitative and qualitative findings and evaluate research conclusions.", ["data interpretation", "quantitative finding", "qualitative finding", "credibility"], "draw a justified conclusion from multiple sources", "statistical significance guarantees practical importance"),
];

const digitalSocietyTopics: Topic[] = [
  t("DS1", "Concepts", "both", "Digital society concepts include change, expression, identity, power, space, systems, values and ethics.", ["change", "identity", "power", "ethics"], "apply two concepts to a digital issue", "technology is neutral because it is only a tool"),
  t("DS2", "Digital content", "both", "Digital systems involve data, algorithms, computers, networks, media, AI, robots and autonomous technologies.", ["data", "algorithm", "network", "artificial intelligence"], "explain how a digital system produces an outcome", "an algorithm cannot contain human values"),
  t("DS3", "Social and cultural contexts", "both", "Digital technologies reshape identity, communities, knowledge and cultural participation.", ["community", "culture", "identity", "knowledge"], "evaluate a platform's cultural impact", "greater connectivity always strengthens communities"),
  t("DS4", "Political and economic contexts", "both", "Digital systems redistribute economic opportunity, governance capacity, surveillance and political power.", ["platform economy", "governance", "surveillance", "digital divide"], "evaluate a digital policy", "more data always improves government decisions"),
  t("DS5", "Environmental and health contexts", "both", "Digital technology creates benefits and risks for health, environments and sustainable systems.", ["e-waste", "health", "sustainability", "risk"], "assess a technology's environmental trade-offs", "digital services have no physical environmental footprint"),
  t("DSH", "HL challenge inquiry", "HL", "HL inquiry integrates concepts, content and sources to evaluate a complex digital-society challenge.", ["challenge", "inquiry", "source", "evaluation"], "synthesize evidence about a digital challenge", "one source is sufficient for a balanced digital inquiry"),
];

const philosophyTopics: Topic[] = [
  t("PHI1", "Core theme: Being human", "both", "The core theme investigates what it means to be human through reasoned philosophical argument.", ["human nature", "personhood", "freedom", "argument"], "evaluate a claim about human freedom", "a personal opinion is a philosophical argument"),
  t("PHI2", "Optional themes", "both", "Optional themes investigate areas such as ethics, political philosophy, epistemology, religion, science or aesthetics.", ["concept", "argument", "counterclaim", "implication"], "compare two positions on an optional theme", "disagreement means one side has no rational support"),
  t("PHI3", "Prescribed text", "both", "A prescribed philosophical text is analysed through its claims, reasoning, context and implications.", ["textual argument", "premise", "conclusion", "implication"], "reconstruct and evaluate a prescribed argument", "quoting a text is the same as analysing it"),
  t("PHIH", "HL unseen text", "HL", "HL students respond philosophically to an unseen text by constructing and evaluating arguments.", ["unseen text", "argument", "evaluation", "response"], "develop a philosophical response to an unseen passage", "summary alone answers an evaluative prompt"),
];

const anthropologyTopics: Topic[] = [
  t("ANT1", "Being human", "both", "Anthropology studies diverse ways of being human through culture, society and ethnographic comparison.", ["culture", "society", "ethnography", "comparison"], "interpret an ethnographic case", "one culture can be judged using another culture's assumptions"),
  t("ANT2", "Power and inequality", "both", "Power and inequality are produced through institutions, identities, resources and everyday practice.", ["power", "inequality", "identity", "institution"], "analyse inequality using ethnographic evidence", "power is held only by formal political leaders"),
  t("ANT3", "Change and continuity", "both", "Social and cultural change involves global flows, local agency, continuity and resistance.", ["change", "continuity", "globalization", "agency"], "compare responses to social change", "globalization makes cultures identical"),
  t("ANT4", "Ethnographic methods and ethics", "both", "Participant observation and reflexive research create situated knowledge with ethical responsibilities.", ["participant observation", "reflexivity", "ethics", "fieldwork"], "evaluate an ethnographic method", "the researcher can be completely objective and invisible"),
  t("ANTH", "Anthropological theory and synthesis", "HL", "HL analysis connects ethnographic material with competing anthropological concepts and theory.", ["theory", "ethnography", "comparison", "synthesis"], "synthesize theory and ethnographic cases", "theory should replace detailed ethnographic evidence"),
];

const worldReligionsTopics: Topic[] = [
  t("WR1", "Introductory unit: five religions", "both", "The introductory unit compares core beliefs and practices across five living religions.", ["belief", "practice", "human condition", "diversity"], "compare how two religions address the human condition", "all adherents practise a religion identically"),
  t("WR2", "In-depth study: beliefs and doctrine", "both", "In-depth study examines central beliefs, sources of authority and interpretations within selected religions.", ["doctrine", "authority", "interpretation", "tradition"], "analyse variation within one religious tradition", "a religion has only one authoritative interpretation"),
  t("WR3", "In-depth study: ritual and experience", "both", "Ritual, worship and religious experience connect belief with individual and community life.", ["ritual", "worship", "experience", "community"], "evaluate the significance of a ritual", "ritual has the same meaning for every participant"),
  t("WR4", "Contemporary issues and investigation", "both", "Religious perspectives interact with contemporary ethical, social and political issues.", ["contemporary issue", "ethics", "religious perspective", "investigation"], "compare religious responses to a contemporary issue", "modernization necessarily removes religion from public life"),
];

const biologyTopics: Topic[] = [
  t("A", "Unity and diversity", "both", "Unity and diversity links water, nucleic acids, cells, viruses, classification and evolution across four levels of organization.", ["water", "nucleic acids", "cell structure", "evolution"], "compare evidence for common ancestry across organisms", "all organisms have the same cellular structures"),
  t("B", "Form and function", "both", "Form and function connects biomolecules, membranes, organelles, transport, gas exchange and adaptation.", ["membrane", "protein", "transport", "adaptation"], "relate a biological structure to its function", "a larger organism always has a larger surface-area-to-volume ratio"),
  t("C", "Interaction and interdependence", "both", "Interaction and interdependence includes enzymes, metabolism, signalling, defence, populations and ecosystems.", ["enzyme", "signalling", "homeostasis", "ecosystem"], "explain how a change in one component affects a biological system", "organisms function independently of their environment"),
  t("D", "Continuity and change", "both", "Continuity and change includes DNA replication, protein synthesis, cell division, reproduction, inheritance and natural selection.", ["DNA replication", "gene expression", "inheritance", "natural selection"], "predict the consequence of selection pressure", "individual organisms evolve during their lifetime"),
  t("AHL", "Additional higher level connections", "HL", "AHL biology deepens molecular mechanisms, regulation and synthesis across all four organizing themes.", ["gene expression", "metabolism", "regulation", "systems"], "connect molecular regulation with an organism-level outcome", "gene expression is controlled by a single factor"),
];

const chemistryTopics: Topic[] = [
  t("S1", "Models of the particulate nature of matter", "both", "Particulate models describe atoms, nuclei, electron configurations, the mole and ideal gases.", ["atom", "electron configuration", "mole", "ideal gas"], "use a particulate model to solve a quantitative problem", "electrons orbit the nucleus in fixed classical paths"),
  t("S2", "Models of bonding and structure", "both", "Ionic, covalent and metallic models connect bonding and intermolecular forces with material properties.", ["ionic", "covalent", "metallic", "intermolecular force"], "compare properties using bonding and structure", "all covalent substances have low melting points"),
  t("S3", "Classification of matter", "both", "The periodic table and organic functional groups classify matter and support predictions of chemical behaviour.", ["periodicity", "functional group", "homologous series", "spectroscopy"], "identify a substance from structural or spectral evidence", "elements in one period have identical chemical properties"),
  t("R1", "What drives chemical reactions?", "both", "Enthalpy, energy cycles, fuels, entropy and spontaneity describe the energetic direction of reactions.", ["enthalpy", "Hess law", "entropy", "spontaneity"], "interpret an energy cycle and predict spontaneity", "a spontaneous reaction must be fast"),
  t("R2", "How much, how fast and how far?", "both", "Stoichiometry, reaction rate and equilibrium quantify the amount, speed and extent of chemical change.", ["stoichiometry", "rate", "equilibrium", "equilibrium constant"], "solve a multistep quantitative reaction problem", "equilibrium means equal reactant and product concentrations"),
  t("R3", "Mechanisms of chemical change", "both", "Proton transfer, electron transfer and electron-pair sharing explain acid-base, redox and organic mechanisms.", ["proton transfer", "redox", "nucleophile", "mechanism"], "use evidence to propose a reaction mechanism", "a catalyst changes the equilibrium constant"),
];

const essTopics: Topic[] = [
  t("1", "Foundation", "both", "Environmental systems are analysed using systems thinking, sustainability and differing value systems.", ["system", "feedback", "sustainability", "value system"], "evaluate a sustainability claim from contrasting perspectives", "one environmental value system gives an objectively correct policy"),
  t("2", "Ecology", "both", "Energy, matter and populations interact within ecosystems that can change over time.", ["energy flow", "nutrient cycle", "population", "succession"], "interpret ecological data and explain a trend", "energy is recycled through an ecosystem"),
  t("3", "Biodiversity and conservation", "both", "Biodiversity has ecological and social value and is affected by human pressures and conservation choices.", ["biodiversity", "conservation", "habitat", "extinction"], "compare conservation strategies for a named case", "ex-situ conservation removes every threat"),
  t("4", "Water", "both", "Water systems link physical processes, human demand, pollution and management.", ["water cycle", "water security", "pollution", "management"], "recommend a water-management strategy using evidence", "water scarcity is caused only by physical supply"),
  t("5", "Land", "both", "Land systems include soil, food production, terrestrial resources and sustainable management.", ["soil", "food system", "land degradation", "management"], "evaluate a land-management strategy", "soil is a rapidly renewable resource"),
  t("6", "Atmosphere and climate change", "both", "Atmospheric systems, pollution, climate change, mitigation and adaptation operate across scales.", ["atmosphere", "climate change", "mitigation", "adaptation"], "analyse climate data and evaluate a response", "adaptation directly reduces greenhouse-gas emissions"),
  t("7", "Natural resources", "both", "Natural-resource use creates flows, scarcity, pollution and competing management choices.", ["resource security", "energy", "circular economy", "sustainability"], "compare resource-management strategies", "recycling removes the need for primary resources"),
  t("8", "Human populations and urban systems", "both", "Population change and urban systems affect resource demand, waste, health and environmental quality.", ["population", "urban system", "carrying capacity", "environmental justice"], "evaluate an urban sustainability strategy", "population size alone determines environmental impact"),
  t("HL", "HL lenses: law, economics and ethics", "HL", "HL study adds environmental law, economics, ethics and more complex systems analysis.", ["environmental law", "externality", "governance", "ethics"], "evaluate a policy using economic and legal evidence", "a market price includes every environmental cost"),
];

const designTechnologyTopics: Topic[] = [
  t("1", "Human factors and ergonomics", "both", "Successful design responds to physical, cognitive and cultural characteristics of users.", ["ergonomics", "anthropometrics", "user research", "accessibility"], "justify a design decision for a defined user", "average measurements produce an inclusive design for everyone"),
  t("2", "Resource management", "both", "Materials, manufacturing and life-cycle choices affect performance and sustainability.", ["material property", "manufacturing", "life cycle", "sustainability"], "select a material and process for a product", "the strongest material is always the best choice"),
  t("3", "Modelling and innovation", "both", "Designers use research, modelling, prototyping and evaluation to develop innovations.", ["prototype", "model", "iteration", "innovation"], "evaluate a prototype against a specification", "a high-fidelity prototype is always needed first"),
  t("HL1", "HL commercial production", "HL", "HL study extends to innovation strategy, commercial production and complex systems.", ["commercial production", "strategy", "systems design", "intellectual property"], "evaluate a design strategy for commercial scale", "mass production automatically reduces environmental impact"),
];

const sehsTopics: Topic[] = [
  t("A", "Exercise physiology and nutrition", "both", "Body systems supply energy and maintain internal conditions during exercise.", ["energy system", "cardiovascular", "respiratory", "nutrition"], "explain a physiological response to exercise", "only one energy system operates at a time"),
  t("B", "Biomechanics", "both", "Forces, motion and anatomy explain technique and performance.", ["force", "leverage", "motion", "technique"], "analyse a movement using biomechanical principles", "greater force always produces better technique"),
  t("C", "Skill and sport psychology", "both", "Learning, motivation and psychological factors influence skill acquisition and performance.", ["skill acquisition", "feedback", "motivation", "arousal"], "recommend a practice method for an athlete", "maximum arousal always improves performance"),
  t("D", "Health and physical activity", "both", "Physical activity is linked to health outcomes through interacting physiological and social factors.", ["health", "training", "risk factor", "public health"], "evaluate an intervention using evidence", "correlation proves that exercise caused the health outcome"),
  t("HL1", "HL performance extension", "HL", "HL content integrates advanced physiology, biomechanics and performance analysis.", ["fatigue", "adaptation", "performance analysis", "recovery"], "synthesize data to recommend a training change", "more training always creates more adaptation"),
];

const englishATopics: Topic[] = [
  t("AOE1", "Readers, writers and texts", "both", "Meaning emerges from choices made by writers and the responses of readers to literary and non-literary texts.", ["authorial choice", "reader", "text type", "effect"], "analyse how a choice shapes meaning for an audience", "identifying a device is the same as analysing its effect"),
  t("AOE2", "Time and space", "both", "Texts are shaped by, and respond to, their cultural and historical contexts.", ["context", "culture", "perspective", "representation"], "connect textual detail to a relevant context", "context replaces close textual analysis"),
  t("AOE3", "Intertextuality", "both", "Texts gain meaning through relationships with other texts, conventions and bodies of work.", ["intertextuality", "convention", "comparison", "body of work"], "compare how two texts construct a shared concern", "comparison means discussing two texts in separate halves"),
  t("HL", "HL essay depth", "HL", "HL responses sustain an independent line of inquiry with precise textual evidence and evaluation.", ["line of inquiry", "thesis", "evidence", "evaluation"], "develop a conceptual thesis across a whole text", "a longer response is automatically more analytical"),
];

const englishBTopics: Topic[] = [
  t("T1", "Identities", "both", "The identities theme explores self, lifestyle, health, beliefs and belonging through purposeful communication.", ["identity", "audience", "purpose", "register"], "write or interpret a text about identity for a defined audience", "advanced vocabulary is effective even when the register is inappropriate"),
  t("T2", "Experiences", "both", "The experiences theme explores leisure, travel, life stories, customs and migration.", ["experience", "narrative", "comparison", "tone"], "select details and tone for an account or reflection", "a narrative needs no clear audience or purpose"),
  t("T3", "Human ingenuity", "both", "Human ingenuity explores innovation, media, technology and artistic expression.", ["innovation", "media", "technology", "impact"], "evaluate an innovation using precise evidence", "complex words always make an argument more convincing"),
  t("T4", "Social organization", "both", "Social organization explores education, work, community, law and social relationships.", ["society", "education", "work", "formal register"], "produce an appropriate formal text about a social issue", "every formal text should sound impersonal"),
  t("T5", "Sharing the planet", "both", "Sharing the planet explores environment, equality, peace and global challenges.", ["sustainability", "equality", "global issue", "perspective"], "synthesize viewpoints on a global challenge", "a balanced argument cannot reach a strong conclusion"),
  t("HL", "HL literary and linguistic depth", "HL", "HL English B requires greater linguistic range and engagement with two literary works.", ["literary work", "nuance", "collocation", "analysis"], "analyse how language creates a literary effect", "using rare vocabulary guarantees accurate expression"),
];

const mathAITopics: Topic[] = [
  t("AI1", "Number and algebra", "both", "Mathematics AI uses numerical methods, sequences, financial models, approximation and technology-supported calculation.", ["sequence", "financial mathematics", "approximation", "technology"], "construct and interpret a financial or numerical model", "a calculator output is sufficient without interpretation"),
  t("AI1H", "Number and algebra — HL extension", "HL", "HL extends numerical modelling through logarithms, complex numbers, matrices and eigenvalue applications.", ["logarithm", "complex number", "matrix", "eigenvalue"], "use matrices to model a transition process", "matrix multiplication is commutative"),
  t("AI2", "Functions", "both", "Functions model real data using linear, exponential, logarithmic, logistic and piecewise relationships.", ["regression", "model", "domain", "parameter"], "fit, interpret and evaluate a function model", "a high correlation proves the model is causal"),
  t("AI2H", "Functions — HL extension", "HL", "HL functions include transformations, composite models and deeper analysis of model assumptions and fit.", ["composite function", "transformation", "residual", "model validity"], "compare two competing models using technology", "the model with the highest coefficient of determination is always best"),
  t("AI3", "Geometry and trigonometry", "both", "Geometry is applied to measurement, bearings, networks, Voronoi diagrams and three-dimensional contexts.", ["bearing", "trigonometry", "Voronoi diagram", "network"], "solve a practical geometry or network problem", "a shortest route must use the fewest edges"),
  t("AI3H", "Geometry and trigonometry — HL extension", "HL", "HL geometry adds vectors, graph theory, adjacency matrices and more complex spatial models.", ["vector", "graph theory", "adjacency matrix", "optimization"], "optimize a network subject to constraints", "every connected graph has an Eulerian circuit"),
  t("AI4", "Statistics and probability", "both", "Statistics uses sampling, probability distributions, correlation, regression and hypothesis testing to interpret evidence.", ["sampling", "distribution", "correlation", "hypothesis test"], "select and perform an appropriate statistical test", "a p-value is the probability the null hypothesis is true"),
  t("AI4H", "Statistics and probability — HL extension", "HL", "HL includes continuous distributions, Poisson processes and more advanced tests and inference.", ["Poisson distribution", "continuous distribution", "confidence interval", "inference"], "justify and interpret an advanced statistical procedure", "statistical significance proves practical importance"),
  t("AI5", "Calculus", "both", "Calculus supports optimization, accumulation and rate-of-change models, normally with technology.", ["derivative", "integral", "optimization", "rate of change"], "interpret calculus within an applied model", "a stationary point must be a maximum"),
  t("AI5H", "Calculus — HL extension", "HL", "HL calculus includes differential equations, slope fields, numerical solution and coupled models.", ["differential equation", "slope field", "Euler method", "numerical solution"], "solve and interpret a differential-equation model", "a numerical solution is exact"),
];

const subjectCatalogBase: SubjectChoice[] = [
  { id: "english-a", name: "English A: Language & Literature", group: "Studies in language & literature", levels: "SL / HL", testAvailable: true, availability: "available" },
  { id: "english-a-literature", name: "English A: Literature", group: "Studies in language & literature", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "french-a", name: "French A: Language & Literature", group: "Studies in language & literature", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "french-a-literature", name: "French A: Literature", group: "Studies in language & literature", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "japanese-a", name: "Japanese A: Language & Literature", group: "Studies in language & literature", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "japanese-a-literature", name: "Japanese A: Literature", group: "Studies in language & literature", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "korean-a", name: "Korean A: Language & Literature", group: "Studies in language & literature", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "korean-a-literature", name: "Korean A: Literature", group: "Studies in language & literature", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "italian-a", name: "Italian A: Language & Literature", group: "Studies in language & literature", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "italian-a-literature", name: "Italian A: Literature", group: "Studies in language & literature", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "chinese-a", name: "Chinese A: Language & Literature", group: "Studies in language & literature", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "chinese-a-literature", name: "Chinese A: Literature", group: "Studies in language & literature", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "literature-performance", name: "Literature & Performance", group: "Studies in language & literature", levels: "SL", testAvailable: false },
  { id: "english-b", name: "English B", group: "Language acquisition", levels: "SL / HL", testAvailable: true, availability: "available" },
  { id: "french-b", name: "French B", group: "Language acquisition", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "japanese-b", name: "Japanese B", group: "Language acquisition", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "korean-b", name: "Korean B", group: "Language acquisition", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "italian-b", name: "Italian B", group: "Language acquisition", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "chinese-b", name: "Chinese B", group: "Language acquisition", levels: "SL / HL", testAvailable: false, availability: "planned" },
  { id: "language-ab-initio", name: "Language ab initio", group: "Language acquisition", levels: "SL", testAvailable: false },
  { id: "classical-languages", name: "Classical Languages", group: "Language acquisition", levels: "SL / HL", testAvailable: false },
  { id: "business", name: "Business Management", group: "Individuals & societies", levels: "SL / HL", testAvailable: true },
  { id: "digital-society", name: "Digital Society", group: "Individuals & societies", levels: "SL / HL", testAvailable: true },
  { id: "economics", name: "Economics", group: "Individuals & societies", levels: "SL / HL", testAvailable: true },
  { id: "geography", name: "Geography", group: "Individuals & societies", levels: "SL / HL", testAvailable: true },
  { id: "global-politics", name: "Global Politics", group: "Individuals & societies", levels: "SL / HL", testAvailable: true },
  { id: "history", name: "History", group: "Individuals & societies", levels: "SL / HL", testAvailable: true },
  { id: "philosophy", name: "Philosophy", group: "Individuals & societies", levels: "SL / HL", testAvailable: true },
  { id: "psychology", name: "Psychology", group: "Individuals & societies", levels: "SL / HL", testAvailable: true },
  { id: "anthropology", name: "Social & Cultural Anthropology", group: "Individuals & societies", levels: "SL / HL", testAvailable: true },
  { id: "world-religions", name: "World Religions", group: "Individuals & societies", levels: "SL", testAvailable: true },
  { id: "biology", name: "Biology", group: "Sciences", levels: "SL / HL", testAvailable: true },
  { id: "chemistry", name: "Chemistry", group: "Sciences", levels: "SL / HL", testAvailable: true },
  { id: "cs", name: "Computer Science", group: "Sciences", levels: "SL / HL", testAvailable: true },
  { id: "design-technology", name: "Design Technology", group: "Sciences", levels: "SL / HL", testAvailable: true },
  { id: "ess", name: "Environmental Systems & Societies", group: "Sciences", levels: "SL / HL", testAvailable: true },
  { id: "physics", name: "Physics", group: "Sciences", levels: "SL / HL", testAvailable: true },
  { id: "sehs", name: "Sports, Exercise & Health Science", group: "Sciences", levels: "SL / HL", testAvailable: true },
  { id: "math", name: "Mathematics: Analysis & Approaches", group: "Mathematics", levels: "SL / HL", testAvailable: true },
  { id: "math-ai", name: "Mathematics: Applications & Interpretation", group: "Mathematics", levels: "SL / HL", testAvailable: true, availability: "available" },
  { id: "dance", name: "Dance", group: "The arts", levels: "SL / HL", testAvailable: false, availability: "unavailable" },
  { id: "film", name: "Film", group: "The arts", levels: "SL / HL", testAvailable: false, availability: "unavailable" },
  { id: "music", name: "Music", group: "The arts", levels: "SL / HL", testAvailable: false, availability: "unavailable" },
  { id: "theatre", name: "Theatre", group: "The arts", levels: "SL / HL", testAvailable: false, availability: "unavailable" },
  { id: "visual-arts", name: "Visual Arts", group: "The arts", levels: "SL / HL", testAvailable: false, availability: "unavailable" },
];

export const subjectCatalog: SubjectChoice[] = subjectCatalogBase.map((choice) => choice.group === "The arts" ? choice : ({
  ...choice,
  testAvailable: true,
  availability: "available",
}));

const languageNames = [
  ["french", "French", "FR"],
  ["japanese", "Japanese", "JA"],
  ["korean", "Korean", "KO"],
  ["italian", "Italian", "IT"],
  ["chinese", "Chinese", "ZH"],
] as const;

function languageA(id: string, name: string, shortName: string, literature: boolean): Subject {
  return {
    id: literature ? `${id}-a-literature` : `${id}-a`,
    name: `${name} A: ${literature ? "Literature" : "Language & Literature"}`,
    shortName: `${shortName}A`,
    description: literature ? `Literary analysis and comparative argument in ${name}` : `Literary and non-literary analysis in ${name}`,
    color: literature ? "#1649b8" : "#1769e0",
    softColor: "#eaf2ff",
    levels: ["SL", "HL"], group: "Languages", selectionMode: "multi",
    papers: [
      { id: "p1", name: "Paper 1", description: literature ? "Guided literary analysis" : "Guided analysis of an unseen text", format: "Interpretation · analysis · focus · language", topicPrefixes: ["P1"] },
      { id: "p2", name: "Paper 2", description: "Comparative essay on two studied works", format: "Knowledge · comparison · analysis · organization", topicPrefixes: ["P2"] },
    ],
    topics: englishATopics,
  };
}

function languageB(id: string, name: string, shortName: string): Subject {
  return {
    id: `${id}-b`, name: `${name} B`, shortName: `${shortName}B`,
    description: `Writing and receptive skills in ${name} across the five prescribed themes`,
    color: "#0b71d9", softColor: "#e9f4ff", levels: ["SL", "HL"], group: "Languages", selectionMode: "multi",
    papers: [
      { id: "p1", name: "Paper 1: Writing", description: `Purposeful written response in ${name}`, format: "Language · message · conceptual understanding", topicPrefixes: ["P1"] },
      { id: "p2r", name: "Paper 2: Reading", description: `Comprehension and interpretation in ${name}`, format: "Comprehension · inference · vocabulary in context", topicPrefixes: ["P2"] },
    ], topics: englishBTopics,
  };
}

const expandedLanguageSubjects: Subject[] = [
  ...languageNames.flatMap(([id, name, shortName]) => [languageA(id, name, shortName, false), languageA(id, name, shortName, true), languageB(id, name, shortName)]),
  { ...languageA("english", "English", "EN", true), id: "english-a-literature" },
  { id: "language-ab-initio", name: "Language ab initio", shortName: "AB", description: "Foundational communication across prescribed themes", color: "#b75452", softColor: "#fdecea", levels: ["SL"], group: "Languages", selectionMode: "multi", papers: [
    { id: "p1", name: "Paper 1: Writing", description: "Two written tasks", format: "Language · message · conceptual understanding" },
    { id: "p2r", name: "Paper 2: Reading", description: "Reading comprehension", format: "Comprehension · inference · vocabulary" },
  ], topics: englishBTopics.filter((topic) => topic.level === "both") },
  { id: "classical-languages", name: "Classical Languages", shortName: "CL", description: "Language, literature and cultural interpretation", color: "#70513d", softColor: "#f5eee9", levels: ["SL", "HL"], group: "Languages", selectionMode: "multi", papers: [
    { id: "p1", name: "Paper 1", description: "Language and translation", format: "Translation · linguistic analysis" },
    { id: "p2", name: "Paper 2", description: "Literature and culture", format: "Textual evidence · interpretation · argument" },
  ], topics: englishATopics },
  { id: "literature-performance", name: "Literature & Performance", shortName: "LP", description: "Literary interpretation through analysis and performance", color: "#74465f", softColor: "#faeaf2", levels: ["SL"], group: "Languages", selectionMode: "multi", papers: [
    { id: "p1", name: "Written examination", description: "Literary analysis and comparative response", format: "Knowledge · analysis · organization · language" },
    { id: "performance", name: "Performance analysis", description: "Transform text into performance choices", format: "Interpretation · justification · reflection" },
  ], topics: englishATopics.filter((topic) => topic.level === "both") },
];

export const subjects: Subject[] = [
  { id: "english-a", name: "English A: Language & Literature", shortName: "EA", description: "Unseen analysis, comparative argument and precise textual evidence", color: "#1769e0", softColor: "#eaf2ff", levels: ["SL", "HL"], group: "Languages", selectionMode: "multi", papers: [
    { id: "p1", name: "Paper 1", description: "Guided analysis of an unseen non-literary text", format: "Textual analysis · authorial choices · audience and purpose", topicPrefixes: ["P1"] },
    { id: "p2", name: "Paper 2", description: "Comparative essay on two studied literary works", format: "Comparative thesis · evidence · evaluation", topicPrefixes: ["P2"] },
  ], topics: englishATopics },
  { id: "english-b", name: "English B", shortName: "EB", description: "Writing and reading across the five prescribed themes", color: "#0b71d9", softColor: "#e9f4ff", levels: ["SL", "HL"], group: "Languages", selectionMode: "multi", papers: [
    { id: "p1", name: "Paper 1: Writing", description: "One written response for a specified audience, context and purpose", format: "Text type · register · organization · language", topicPrefixes: ["P1"] },
    { id: "p2r", name: "Paper 2: Reading", description: "Comprehension and interpretation of written passages", format: "Short answer · inference · reference · vocabulary in context", topicPrefixes: ["P2"] },
  ], topics: englishBTopics },
  ...expandedLanguageSubjects,
  { id: "biology", name: "Biology", shortName: "BI", description: "Conceptual understanding, data analysis and biological synthesis", color: "#297a4b", softColor: "#e9f7ee", levels: ["SL", "HL"], group: "Sciences", papers: [
    { id: "p1a", name: "Paper 1A", description: "Multiple-choice questions across the selected range", format: "Concepts · calculations · experimental understanding" },
    { id: "p1b", name: "Paper 1B", description: "Data-based and experimental skills", format: "Data analysis · uncertainty · investigation" },
    { id: "p2", name: "Paper 2", description: "Short-answer and extended-response questions", format: "Application · synthesis · evaluation" },
  ], topics: biologyTopics },
  { id: "chemistry", name: "Chemistry", shortName: "CH", description: "Structure, reactivity, quantitative chemistry and experimental evidence", color: "#176f8f", softColor: "#e7f5fa", levels: ["SL", "HL"], group: "Sciences", papers: [
    { id: "p1a", name: "Paper 1A", description: "Multiple-choice chemistry questions", format: "Concepts · calculations · structure and reactivity" },
    { id: "p1b", name: "Paper 1B", description: "Data-based and experimental questions", format: "Data analysis · practical design · uncertainty" },
    { id: "p2", name: "Paper 2", description: "Structured and extended chemistry responses", format: "Multistep calculations · explanation · synthesis" },
  ], topics: chemistryTopics },
  { id: "ess", name: "Environmental Systems & Societies", shortName: "ESS", description: "Systems thinking, data, case studies and environmental evaluation", color: "#4f772d", softColor: "#eff7e8", levels: ["SL", "HL"], group: "Sciences", papers: [
    { id: "p1", name: "Data & systems mode", description: "Current-course data, systems and fieldwork response", format: "Sources · processing · systems · limitations" },
    { id: "p2", name: "Structured evaluation mode", description: "Current-course explanation and environmental evaluation", format: "Evidence · perspectives · management · judgement" },
  ], topics: essTopics },
  { id: "design-technology", name: "Design Technology", shortName: "DT", description: "Human-centred design, materials, innovation and evaluation", color: "#8b5e34", softColor: "#f8efe5", levels: ["SL", "HL"], group: "Sciences", papers: [
    { id: "p1", name: "Stimulus response mode", description: "Original product brief, user evidence and short design decisions", format: "Evidence · specification · justified choice" },
    { id: "p2", name: "Integrated design analysis", description: "Product, process, production and life-cycle evaluation", format: "Data · trade-offs · technical judgement" },
  ], topics: designTechnologyTopics },
  { id: "sehs", name: "Sports, Exercise & Health Science", shortName: "SE", description: "Physiology, biomechanics, psychology and performance data", color: "#d05a36", softColor: "#fff0e9", levels: ["SL", "HL"], group: "Sciences", papers: [
    { id: "p1a", name: "Paper 1A", description: "Multiple-choice questions", format: "Recall · application · quantitative reasoning" },
    { id: "p1b", name: "Paper 1B", description: "Data-based and experimental skills", format: "Data · method · interpretation" },
    { id: "p2", name: "Paper 2", description: "Short and extended performance responses", format: "Explanation · analysis · evaluation" },
  ], topics: sehsTopics },
  { id: "physics", name: "Physics", shortName: "PH", description: "Concepts, calculations, data analysis and extended response", color: "#2357d9", softColor: "#eaf0ff", levels: ["SL", "HL"], group: "Sciences", papers: [
    { id: "p1a", name: "Paper 1A", description: "Multiple-choice questions across the selected range", format: "MCQ · calculations · conceptual application" },
    { id: "p1b", name: "Paper 1B", description: "Data-based and experimental skills questions", format: "Graphs · uncertainty · experimental analysis" },
    { id: "p2", name: "Paper 2", description: "Short-answer and extended-response questions", format: "Calculations · explanations · synthesis" },
  ], topics: physicsTopics },
  { id: "math", name: "Mathematics: AA", shortName: "AA", description: "Exact reasoning, calculator strategy and extended problem solving", color: "#155eef", softColor: "#eaf2ff", levels: ["SL", "HL"], group: "Mathematics", papers: [
    { id: "p1", name: "Paper 1", description: "No technology allowed", format: "Short response · extended response · exact values" },
    { id: "p2", name: "Paper 2", description: "Technology allowed", format: "GDC strategy · numerical methods · interpretation" },
    { id: "p3", name: "Paper 3", description: "Two extended problem-solving investigations", format: "Sustained reasoning · unfamiliar contexts", levels: ["HL"] },
  ], topics: mathTopics },
  { id: "math-ai", name: "Mathematics: AI", shortName: "AI", description: "Technology-rich modelling, statistics and applied problem solving", color: "#0b71d9", softColor: "#e9f4ff", levels: ["SL", "HL"], group: "Mathematics", papers: [
    { id: "p1", name: "Paper 1", description: "Technology required · compulsory short-response questions", format: "GDC · modelling · interpretation · concise working" },
    { id: "p2", name: "Paper 2", description: "Technology required · compulsory extended-response questions", format: "Applied contexts · sustained modelling · evaluation" },
    { id: "p3", name: "Paper 3", description: "Two compulsory extended-response problem-solving questions", format: "Technology required · unfamiliar contexts", levels: ["HL"] },
  ], topics: mathAITopics },
  { id: "economics", name: "Economics", shortName: "EC", description: "Theory, diagrams, real-world examples and policy evaluation", color: "#087f65", softColor: "#e7f8f2", levels: ["SL", "HL"], group: "I&S", papers: [
    { id: "p1", name: "Paper 1", description: "Extended-response economics essays", format: "10-mark explanation · 15-mark evaluation" },
    { id: "p2", name: "Paper 2", description: "Data-response questions across the course", format: "Definitions · calculations · diagrams · evaluation" },
    { id: "p3", name: "Paper 3", description: "Quantitative and policy-focused response", format: "Calculations · policy recommendation", levels: ["HL"] },
  ], topics: economicsTopics },
  { id: "cs", name: "Computer Science", shortName: "CS", description: "First assessment 2027 · Theme A systems and Theme B Python/Java problem-solving", color: "#b24b20", softColor: "#fff0e8", levels: ["SL", "HL"], group: "Sciences", papers: [
    { id: "p1", name: "Paper 1", description: "Theme A concepts and case-study thinking", format: "Concepts · systems · case study", topicPrefixes: ["A"] },
    { id: "p2", name: "Paper 2", description: "Theme B computational thinking and programming", format: "Python · algorithms · tracing", topicPrefixes: ["B"] },
  ], topics: csTopics },
  { id: "business", name: "Business Management", shortName: "BM", description: "Business tools, quantitative decisions, case studies and evaluation", color: "#0f766e", softColor: "#e5f7f4", levels: ["SL", "HL"], group: "I&S", papers: [
    { id: "p1", name: "Paper 1", description: "Pre-released statement and unseen case study", format: "Case analysis · business tools · judgement" },
    { id: "p2", name: "Paper 2", description: "Unseen stimulus with a quantitative focus", format: "Calculations · structured response · evaluation" },
    { id: "p3", name: "Paper 3", description: "Social-enterprise decision-making response", format: "Stakeholders · recommendation · strategy", levels: ["HL"] },
  ], topics: businessTopics },
  { id: "geography", name: "Geography", shortName: "GE", description: "Case studies, geographic processes, data and spatial evaluation", color: "#39754a", softColor: "#eaf6ed", levels: ["SL", "HL"], group: "I&S", selectionMode: "multi", papers: [
    { id: "p1", name: "Paper 1", description: "Geographic themes selected by the school", format: "SL two options · HL three options", topicPrefixes: ["GEO1", "GEO2", "GEO3"] },
    { id: "p2", name: "Paper 2", description: "Geographic perspectives—global change", format: "Core themes · data · extended response", topicPrefixes: ["GEO1", "GEO2", "GEO3"] },
    { id: "p3", name: "Paper 3", description: "HL global interactions extension", format: "Synthesis · case studies · evaluation", levels: ["HL"], topicPrefixes: ["GEO4", "GEO5", "GEO6"] },
  ], topics: geographyTopics },
  { id: "history", name: "History", shortName: "HI", description: "Source evaluation, comparative essays and evidence-based argument", color: "#8b5a2b", softColor: "#f8efe6", levels: ["SL", "HL"], group: "I&S", selectionMode: "multi", papers: [
    { id: "p1", name: "Paper 1", description: "Source-based prescribed subject", format: "Comprehension · comparison · origin/purpose/value/limitation" },
    { id: "p2", name: "Paper 2", description: "World history comparative essays", format: "Causation · comparison · sustained argument" },
    { id: "p3", name: "Paper 3", description: "Regional depth-study essays", format: "Precise evidence · historiography · synthesis", levels: ["HL"] },
  ], topics: historyTopics },
  { id: "global-politics", name: "Global Politics", shortName: "GP", description: "Power, sources, contemporary cases and political evaluation", color: "#3656a3", softColor: "#e9effc", levels: ["SL", "HL"], group: "I&S", papers: [
    { id: "p1", name: "Paper 1", description: "Source-based power and global politics", format: "Sources · concepts · contemporary examples" },
    { id: "p2", name: "Paper 2", description: "Extended-response inquiry using course concepts and contemporary cases", format: "SL three essays · HL four essays with HL extension content" },
  ], topics: globalPoliticsTopics },
  { id: "psychology", name: "Psychology", shortName: "PS", description: "2027 concepts, contexts, research methods and evidence", color: "#8e3a70", softColor: "#f9eaf3", levels: ["SL", "HL"], group: "I&S", papers: [
    { id: "p1", name: "Paper 1", description: "Concepts, content and contexts", format: "Short response · application · extended response" },
    { id: "p2", name: "Paper 2", description: "Research methodology and class practicals", format: "Methods · design · unseen research evaluation", topicPrefixes: ["PSY1", "PSY2", "PSY3", "PSY4", "PSY5", "PSY6"] },
    { id: "p3", name: "Paper 3", description: "HL data analysis and interpretation", format: "Multiple sources · data · synthesis", levels: ["HL"] },
  ], topics: psychologyTopics },
  { id: "digital-society", name: "Digital Society", shortName: "DS", description: "Digital systems, social impacts, sources and ethical evaluation", color: "#4e5d6c", softColor: "#edf1f4", levels: ["SL", "HL"], group: "I&S", papers: [
    { id: "p1", name: "Paper 1", description: "Concepts, content and contexts", format: "Structured response · real-world examples" },
    { id: "p2", name: "Paper 2", description: "Source-based digital inquiry", format: "Source evaluation · synthesis · judgement" },
    { id: "p3", name: "Paper 3", description: "HL challenge inquiry", format: "Pre-release · complex digital challenge", levels: ["HL"], topicPrefixes: ["DS-HL"] },
  ], topics: digitalSocietyTopics },
  { id: "philosophy", name: "Philosophy", shortName: "PL", description: "Conceptual argument, prescribed texts and critical evaluation", color: "#653d8c", softColor: "#f1eafa", levels: ["SL", "HL"], group: "I&S", papers: [
    { id: "p1", name: "Paper 1", description: "Core and optional themes", format: "Conceptual analysis · argument · evaluation" },
    { id: "p2", name: "Paper 2", description: "Prescribed philosophical text", format: "Textual argument · critical response" },
    { id: "p3", name: "Paper 3", description: "HL response to unseen philosophical text", format: "Unseen text · philosophical response", levels: ["HL"] },
  ], topics: philosophyTopics },
  { id: "anthropology", name: "Social & Cultural Anthropology", shortName: "AN", description: "Ethnography, culture, inequality and comparative analysis", color: "#9a4d3e", softColor: "#faece9", levels: ["SL", "HL"], group: "I&S", papers: [
    { id: "p1", name: "Paper 1", description: "Concepts and ethnographic material", format: "Unseen material · concepts · comparison" },
    { id: "p2", name: "Paper 2", description: "Extended anthropological response", format: "Ethnography · theory · synthesis" },
  ], topics: anthropologyTopics },
  { id: "world-religions", name: "World Religions", shortName: "WR", description: "Beliefs, practices, religious experience and contemporary issues", color: "#a36b14", softColor: "#fbf1df", levels: ["SL"], group: "I&S", selectionMode: "multi", papers: [
    { id: "p1", name: "Paper 1", description: "Introductory comparative study", format: "Five religions · comparison · explanation", topicPrefixes: ["WR1"] },
    { id: "p2", name: "Paper 2", description: "In-depth thematic study", format: "Two religions · themes · evaluation", topicPrefixes: ["WR2", "WR3", "WR4"] },
  ], topics: worldReligionsTopics },
];

function rotateChoices(correct: string, distractors: string[], seed: number) {
  const raw = [correct, ...distractors.slice(0, 3)];
  const choices = raw.map((_, index) => raw[(index + seed) % raw.length]);
  return { choices, correctIndex: choices.indexOf(correct) };
}

function generateTopicQuestions(subject: Subject, level: Level, paper: Paper, topic: Topic, topicIndex: number, codeLanguage: "python" | "java"): Question[] {
  const others = getLevelTopics(subject, level).filter((item) => item.code !== topic.code);
  const descriptions = rotateChoices(topic.definition, others.map((item) => item.definition), topicIndex % 4);
  const concepts = rotateChoices(topic.concepts[0], others.map((item) => item.concepts[0]), (topicIndex + 2) % 4);
  const id = (suffix: string) => `${subject.id}-${level}-${paper.id}-${topic.code}-${suffix}`;
  const scienceP1A = subject.group === "Sciences" && subject.id !== "cs" && (paper.id === "p1a" || (subject.id === "physics" && paper.id === "p1"));
  const economics = subject.id === "economics";
  const math = subject.id === "math" || subject.id === "math-ai";
  const csP2 = subject.id === "cs" && paper.id === "p2";
  const englishA = subject.id === "english-a";
  const englishB = subject.id === "english-b";
  const individuals = subject.group === "I&S";
  const sourceBased = individuals && (
    (subject.id === "history" && paper.id === "p1") ||
    (subject.id === "global-politics" && paper.id === "p1") ||
    (subject.id === "digital-society" && paper.id === "p2") ||
    (paper.id === "p3" && subject.id !== "economics")
  );
  const depth = level === "HL" ? "Include the additional HL connection or limitation." : "Keep the answer within SL depth.";
  const visual: Question["visual"] = subject.id === "physics"
    ? topic.code === "A1" ? "motion-graph" : topic.code === "B5" ? "circuit" : topic.code.startsWith("C") ? "wave" : "data-graph"
    : subject.id === "cs"
      ? topic.code === "A1.2" ? "logic" : topic.code.startsWith("A2") ? "network" : topic.code.startsWith("A3") ? "erd" : undefined
      : subject.id === "math" || subject.id === "math-ai"
        ? topic.code.includes("4") ? "data-graph" : "function-graph"
        : subject.group === "Sciences" && paper.id === "p1b" ? "data-graph" : undefined;

  const q1: Question = scienceP1A ? {
    id: id("1"), topicCode: topic.code, topicTitle: topic.title,
    prompt: visual ? `Which conclusion is supported by Figure 1 and the principles of ${topic.title}?` : `Which statement best represents ${topic.code} ${topic.title}?`, responseType: "mcq",
    choices: descriptions.choices, correctIndex: descriptions.correctIndex, modelAnswer: topic.definition,
    keywords: topic.concepts, marks: 1, skill: "Concept recognition", difficulty: "Foundation", visual,
  } : {
    id: id("1"), topicCode: topic.code, topicTitle: topic.title,
    prompt: englishA ? `Identify one authorial choice relevant to ${topic.title} and explain its effect on the reader.` : englishB ? `Give a precise meaning or paraphrase for a key expression connected to ${topic.title}, then use it in an appropriate sentence.` : individuals ? `Define one key concept from ${topic.title} and explain its significance in this context.` : `State one principle of ${topic.title} and one condition under which it applies. ${depth}`,
    responseType: "short", modelAnswer: topic.definition, keywords: topic.concepts.slice(0, 3), marks: economics ? 4 : 3,
    skill: "Knowledge and understanding", difficulty: "Foundation",
  };

  const q2: Question = scienceP1A ? {
    id: id("2"), topicCode: topic.code, topicTitle: topic.title,
    prompt: visual ? `Figure 1 represents a situation involving ${topic.title}. Which option correctly interprets the figure?` : `Which quantity or idea is most directly associated with ${topic.title}?`, responseType: "mcq",
    choices: concepts.choices, correctIndex: concepts.correctIndex, modelAnswer: topic.concepts[0], keywords: [topic.concepts[0]],
    marks: 1, skill: "Application", difficulty: "Standard", visual,
  } : {
    id: id("2"), topicCode: topic.code, topicTitle: topic.title,
    prompt: englishA ? (paper.id === "p1" ? `Analyse how tone, structure and one stylistic choice construct meaning in the unseen extract.` : `Construct a comparative thesis showing how two studied works present ${topic.concepts[1]}.`) : englishB ? (paper.id === "p1" ? `Write the opening and one developed paragraph for a suitable text type about ${topic.title}. Make audience, purpose and register clear.` : `Using the text, give one justified inference and one concise paraphrase.`) : csP2 ? `Write a ${codeLanguage === "python" ? "Python function" : "Java method"} to ${topic.application}. Your program must handle at least one boundary case.` : subject.id === "cs" && visual ? `Using Figure 1, analyse the system and explain one change that would improve correctness, efficiency or security.` : economics && paper.id === "p1" ? `Using a fully labelled diagram, explain how to ${topic.application}.` : economics ? `Using the source, explain how to ${topic.application}.` : sourceBased ? `Using the source and your own knowledge, ${topic.application}. Evaluate the source before reaching a conclusion.` : individuals ? `Using precise evidence or a relevant case study, ${topic.application}.` : math && subject.id === "math" && paper.id === "p1" ? `Without using technology, determine a method to ${topic.application}. Show all relevant working.` : math ? `Figure 1 shows a mathematical model. Using technology where appropriate, ${topic.application}, and interpret the result in context.` : visual ? `Using Figure 1, ${topic.application}. Show all relevant working and state an appropriate conclusion.` : `Apply ${topic.title} to ${topic.application}. Show reasoning, not only a conclusion.`,
    context: englishA ? `Unseen extract: The writer moves from a restrained observation to a more urgent appeal, repeating a central image while shifting between collective and personal pronouns.` : englishB && paper.id === "p2r" ? `Short passage: A student-led project began as a small response to a local problem. Although participation was limited at first, the organizers adapted their message and the idea gradually gained support.` : individuals && (paper.id !== "p1" || sourceBased) ? `Unseen stimulus: Evidence connected to ${topic.title} suggests a clear pattern, but the source has a limited sample, a particular perspective and an uncertain wider context.` : undefined,
    responseType: csP2 ? "code" : "short", modelAnswer: `${topic.definition} A strong answer applies ${topic.concepts.join(", ")} to the context.`,
    keywords: topic.concepts, marks: economics ? 10 : math ? 6 : 5, skill: "Application", difficulty: "Standard",
    visual: csP2 ? undefined : visual,
    starterCode: csP2 ? codeLanguage === "python" ? "def solve(data):\n    # write your solution here\n    pass" : "public static Result solve(Data data) {\n    // write your solution here\n    return null;\n}" : undefined,
    codeLanguage: csP2 ? codeLanguage : undefined,
  };

  const q3: Question = {
    id: id("3"), topicCode: topic.code, topicTitle: topic.title,
    prompt: `A student states, “${topic.misconception}.” Explain why this statement is incorrect and give the correct reasoning.`,
    responseType: "short", modelAnswer: `${topic.misconception} is incorrect. ${topic.definition}`,
    keywords: topic.concepts.slice(0, 3), marks: 4, skill: "Misconception diagnosis", difficulty: "Standard",
  };

  const q4: Question = {
    id: id("4"), topicCode: topic.code, topicTitle: topic.title,
    prompt: englishA ? (paper.id === "p1" ? `Write a focused analytical paragraph that moves from textual evidence to authorial purpose and a nuanced effect.` : `Outline a comparative essay with a conceptual thesis, three points of comparison and a qualified conclusion.`) : englishB ? (paper.id === "p1" ? `Produce a complete exam-style response on ${topic.title} using a clearly appropriate text type, register and organization.` : `Explain the writer's attitude and support it with two details, including one inferred rather than directly stated.`) : economics && paper.id === "p1" ? `Discuss the claim using economic theory, a fully labelled diagram, a real-world example and a supported judgement.` : economics ? `Evaluate the policy issue in the source. Consider time, assumptions and at least two stakeholders.` : individuals ? `Evaluate a contestable claim about ${topic.title}. Use specific evidence, a counterargument and a conditional judgement.` : math && paper.id === "p3" ? `Investigate a conjecture involving ${topic.concepts[0]} and ${topic.concepts[1]}. Test cases, generalize and justify your conclusion.` : csP2 ? `Complete a ${codeLanguage === "python" ? "Python program" : "Java method"} that uses ${topic.concepts.join(", ")}. Include validation and comment on the time complexity of your solution.` : visual ? `Explain the relationship between ${topic.concepts[0]} and ${topic.concepts[1]}. Use evidence from Figure 1, then state one limitation.` : `Explain the relationship between ${topic.concepts[0]} and ${topic.concepts[1]}. Use a precise relevant example, then state one limitation.`,
    responseType: csP2 ? "code" : "extended", modelAnswer: `Connect ${topic.concepts.join(", ")} accurately, apply them and reach a supported conclusion. ${topic.definition}`,
    keywords: topic.concepts, marks: economics ? 15 : 8, skill: economics ? "Analysis and evaluation" : "Sustained reasoning", difficulty: "Challenge",
    visual: csP2 ? undefined : visual,
    starterCode: csP2 ? codeLanguage === "python" ? "def process(values):\n    result = []\n    # complete the algorithm\n    return result" : "public static List<Integer> process(int[] values) {\n    List<Integer> result = new ArrayList<>();\n    // complete the algorithm\n    return result;\n}" : undefined,
    codeLanguage: csP2 ? codeLanguage : undefined,
  };

  const premium1: Question = {
    id: id("p1"), topicCode: topic.code, topicTitle: topic.title,
    prompt: `Evaluate a response to ${topic.title}. Identify two features required for a high-scoring ${level} answer and justify each feature.`,
    responseType: "extended", modelAnswer: `A high-scoring answer connects ${topic.concepts.join(", ")}, states assumptions and applies ideas to evidence.`,
    keywords: topic.concepts, marks: 8, skill: "Precision and depth", difficulty: "Challenge", premiumOnly: true,
  };
  const premium2: Question = {
    id: id("p2"), topicCode: topic.code, topicTitle: topic.title,
    prompt: economics ? `Examine how a different time frame, elasticity or stakeholder could change the conclusion about ${topic.title}.` : individuals ? `Examine how a different place, period, perspective or evidence base could change the conclusion about ${topic.title}.` : `Apply ${topic.title} to an unfamiliar context and justify which assumption is most likely to fail.`,
    responseType: "extended", modelAnswer: `Use ${topic.concepts.join(", ")} and explain how a changed assumption or context changes the outcome.`,
    keywords: topic.concepts, marks: 8, skill: "Transfer and evaluation", difficulty: "Challenge", premiumOnly: true,
  };
  return [q1, q2, q3, q4, premium1, premium2];
}

export function getLevelTopics(subject: Subject, level: Level) {
  const detailedLanguageMath = getLanguageMathTopics(subject.id, level);
  if (detailedLanguageMath) return detailedLanguageMath;
  const detailedScience = getScienceTopics(subject.id, level);
  if (detailedScience) return detailedScience;
  const detailedINS = getINSTopics(subject.id, level);
  if (detailedINS) return detailedINS;
  return subject.topics.filter((topic) => level === "HL" || topic.level === "both");
}

export function getPapers(subject: Subject, level: Level) {
  const papers = subject.papers.filter((paper) => !paper.levels || paper.levels.includes(level));
  if (subject.group !== "Languages") papers.push({
    id: "concept",
    name: "Concept Check (MCQ)",
    description: "Adaptive multiple-choice diagnosis separate from IB paper formats",
    format: "Core relationships · misconceptions · missing knowledge",
  });
  return papers;
}

export function getRelevantTopics(subject: Subject, level: Level, paper: Paper) {
  if (paper.id === "concept") return getLevelTopics(subject, level);
  const topics = getLevelTopics(subject, level);
  return topics.filter((topic) => !paper.topicPrefixes?.length || paper.topicPrefixes.some((prefix) => topic.code.startsWith(prefix)));
}

const variantLenses = [
  "identify the missing link in the reasoning", "distinguish cause from correlation", "state the condition that makes the claim valid",
  "connect two syllabus ideas rather than defining them separately", "correct the hidden misconception", "use evidence to rule out a tempting alternative",
  "test the conclusion in an unfamiliar context", "explain what would change if one assumption failed", "separate observation from inference",
  "justify the most important step", "compare two plausible interpretations", "identify the limitation that costs the most marks",
  "show the intermediate reasoning", "make the conclusion conditional on the evidence",
];

const shuffleBySeed = <T,>(items: T[], seed: number) => items.map((item, index) => ({ item, key: Math.sin((seed + 1) * (index + 17)) })).sort((a, b) => a.key - b.key).map(({ item }) => item);

export function isLanguageSubject(subject: Subject) {
  return subject.group === "Languages";
}

export function getAssessmentCriteria(subject: Subject, paper: Paper): AssessmentCriterion[] {
  if (!isLanguageSubject(subject)) return [];
  const acquisition = subject.id.endsWith("-b") || subject.id === "english-b" || subject.id === "language-ab-initio";
  if (acquisition && paper.id === "p1") return [
    { code: "A", name: "Language", description: "Range, accuracy, vocabulary and register", keywords: ["range", "accuracy", "vocabulary", "register"] },
    { code: "B", name: "Message", description: "Relevant ideas developed clearly for the task", keywords: ["relevance", "development", "clarity", "detail"] },
    { code: "C", name: "Conceptual understanding", description: "Audience, context, purpose and text-type conventions", keywords: ["audience", "context", "purpose", "convention"] },
  ];
  if (acquisition) return [
    { code: "R", name: "Receptive understanding", description: "Explicit meaning, inference, reference and vocabulary in context", keywords: ["meaning", "inference", "reference", "context"] },
  ];
  return [
    { code: "A", name: "Knowledge, understanding and interpretation", description: "Accurate understanding supported by relevant references", keywords: ["interpretation", "evidence", "reference", "understanding"] },
    { code: "B", name: "Analysis and evaluation", description: "Analysis of choices and evaluation of their effects", keywords: ["analysis", "choice", "effect", "evaluation"] },
    { code: "C", name: "Focus and organization", description: "Focused, balanced and logically connected argument", keywords: ["focus", "organization", "thesis", "comparison"] },
    { code: "D", name: "Language", description: "Clear, varied and accurate academic expression", keywords: ["language", "accuracy", "register", "clarity"] },
  ];
}

function conceptQuestions(subject: Subject, level: Level, paper: Paper, topic: Topic, variant: number): Question[] {
  const others = getLevelTopics(subject, level).filter((item) => item.code !== topic.code);
  const first = rotateChoices(topic.definition, others.map((item) => item.definition), variant % 4);
  const second = rotateChoices(`The claim is incomplete or incorrect because ${topic.definition}`, [
    `The claim is correct in every context because ${topic.misconception}`,
    `The claim is a definition and needs no evidence`,
    `The claim can be accepted whenever two quantities change together`,
  ], (variant + 1) % 4);
  return [
    { id: `${subject.id}-${level}-${paper.id}-${topic.code}-concept-${variant}-a`, topicCode: topic.code, topicTitle: topic.title,
      prompt: `Which statement gives the most complete explanation of ${topic.title} in this context? Focus on ${variantLenses[variant % variantLenses.length]}.`,
      responseType: "mcq", choices: first.choices, correctIndex: first.correctIndex, modelAnswer: topic.definition, keywords: topic.concepts,
      marks: 1, skill: "Concept depth", difficulty: variant % 3 === 0 ? "Foundation" : variant % 3 === 1 ? "Standard" : "Challenge", format: "concept-mcq", variant },
    { id: `${subject.id}-${level}-${paper.id}-${topic.code}-concept-${variant}-b`, topicCode: topic.code, topicTitle: topic.title,
      prompt: `A student writes, “${topic.misconception}.” Which evaluation best identifies the conceptual gap?`,
      responseType: "mcq", choices: second.choices, correctIndex: second.correctIndex, modelAnswer: second.choices[second.correctIndex], keywords: topic.concepts,
      marks: 1, skill: "Missing knowledge", difficulty: variant % 3 === 0 ? "Standard" : variant % 3 === 1 ? "Challenge" : "Foundation", format: "concept-mcq", variant },
  ];
}

function makeVariant(question: Question, subject: Subject, paper: Paper, variant: number): Question {
  const choices = question.choices ? question.choices.map((_, index, all) => all[(index + variant) % all.length]) : undefined;
  const correctChoice = question.choices && question.correctIndex !== undefined ? question.choices[question.correctIndex] : undefined;
  const criteria = getAssessmentCriteria(subject, paper);
  const criterionCodes = criteria.length ? (question.responseType === "extended" ? criteria.map((item) => item.code) : criteria.slice(0, Math.min(2, criteria.length)).map((item) => item.code)) : undefined;
  const contextTags = ["a new case study", "conflicting evidence", "a boundary case", "a changed assumption", "an unfamiliar dataset", "a student's incomplete answer", "a real-world exception"];
  return {
    ...question,
    id: `${question.id}-v${variant}`,
    prompt: `${question.prompt} In your response, ${variantLenses[variant % variantLenses.length]}.`,
    context: question.context ? `${question.context} Additional condition: consider ${contextTags[variant % contextTags.length]}.` : question.context,
    choices,
    correctIndex: choices && correctChoice ? choices.indexOf(correctChoice) : question.correctIndex,
    format: "paper",
    variant,
    criterionCodes,
  };
}

export function buildQuestionPool(subject: Subject, level: Level, paper: Paper, topics: Topic[], premium: boolean, codeLanguage: "python" | "java" = "python", seed = 0, excludeIds: string[] = []) {
  const detailedLanguageMath = buildLanguageMathQuestionPool(subject, level, paper, topics, premium, seed, excludeIds);
  if (detailedLanguageMath) return detailedLanguageMath;
  const detailedScience = buildScienceQuestionPool(subject, level, paper, topics, premium, seed, excludeIds, codeLanguage);
  if (detailedScience) return detailedScience;
  const detailedINS = buildINSQuestionPool(subject, level, paper, topics, premium, seed, excludeIds);
  if (detailedINS) return detailedINS;
  const excluded = new Set(excludeIds);
  const pool: Question[] = [];
  for (let variant = 0; variant < 14; variant += 1) {
    topics.forEach((topic) => {
      if (paper.id === "concept") pool.push(...conceptQuestions(subject, level, paper, topic, variant));
      else {
        const base = generateTopicQuestions(subject, level, paper, topic, subject.topics.indexOf(topic) + variant, codeLanguage);
        base.filter((question) => premium || !question.premiumOnly).forEach((question) => pool.push(makeVariant(question, subject, paper, variant)));
      }
    });
  }
  const fresh = shuffleBySeed(pool.filter((question) => !excluded.has(question.id)), seed);
  return fresh.length >= Math.min(24, pool.length) ? fresh : shuffleBySeed(pool, seed + 7919);
}

export function buildUniqueQuestionPool(subject: Subject, level: Level, paper: Paper, topics: Topic[], premium: boolean, codeLanguage: "python" | "java" = "python", seed = 0, excludeIds: string[] = []) {
  return deduplicateQuestionContent(subject, level, paper, buildQuestionPool(subject, level, paper, topics, premium, codeLanguage, seed, []), excludeIds);
}

export function buildQuestions(subject: Subject, level: Level, paper: Paper, topics: Topic[], premium: boolean, targetCount?: number, codeLanguage: "python" | "java" = "python", seed = 0, excludeIds: string[] = []) {
  return buildUniqueQuestionPool(subject, level, paper, topics, premium, codeLanguage, seed, excludeIds).slice(0, targetCount ?? (premium ? 16 : 8));
}
