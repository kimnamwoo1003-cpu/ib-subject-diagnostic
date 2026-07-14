import type { Level, Paper, Question, Subject, Topic } from "./data";

type ScienceNode = Topic & { path: string; profile: string };

const PROFILES: Record<string, string> = {
  biology: "BIO_Oxford_2023_Current_SL_AHL",
  chemistry: "CHEM_Oxford_2023_Current_SL_AHL",
  physics: "PHYS_Oxford_2023_Current_SL_AHL",
  cs: "CS_2027_Theme_A_B",
  "design-technology": "DT_IBID_2025_FirstAssessment2027",
  ess: "ESS_Oxford_2024_Current_SL_AHL",
  sehs: "SEHS_Oxford_2024_Current_SL_AHL",
};

const RAW_NODES: Record<string, string> = {
  biology: `
A1.1|Water|both
A1.2|Nucleic acids|both
A2.1|Origins of cells|both
A2.2|Cell structure|both
A2.3|Viruses|both
A3.1|Diversity of organisms|both
A3.2|Classification and cladistics|both
A4.1|Evolution and speciation|both
A4.2|Conservation of biodiversity|both
B1.1|Carbohydrates and lipids|both
B1.2|Proteins|both
B2.1|Membranes and membrane transport|both
B2.2|Organelles and compartmentalization|both
B2.3|Cell specialization|both
B3.1|Gas exchange|both
B3.2|Transport|both
B3.3|Muscle and motility|both
B4.1|Adaptation to environment|both
B4.2|Ecological niches|both
C1.1|Enzymes and metabolism|both
C1.2|Cell respiration|both
C1.3|Photosynthesis|both
C2.1|Chemical signalling|both
C2.2|Neural signalling|both
C3.1|Integration of body systems|both
C3.2|Defence against disease|both
C4.1|Populations and communities|both
C4.2|Transfers of energy and matter|both
D1.1|DNA replication|both
D1.2|Protein synthesis|both
D1.3|Mutation and gene editing|both
D2.1|Cell and nuclear division|both
D2.2|Gene expression|both
D2.3|Water potential|HL
D3.1|Reproduction|both
D3.2|Inheritance|both
D3.3|Homeostasis|both
D4.1|Natural selection|both
D4.2|Stability and change|both
D4.3|Climate change|both`,
  chemistry: `
S1.1|Particulate nature of matter|both
S1.2|The nuclear atom|both
S1.3|Electron configurations|both
S1.4|The mole|both
S1.5|Ideal gases|both
S2.1|Ionic model|both
S2.2|Covalent model|both
S2.3|Metallic model|both
S2.4|From models to materials|both
S3.1|Periodic table|both
S3.2|Functional groups and organic classification|both
R1.1|Measuring enthalpy changes|both
R1.2|Energy cycles and Hess's law|both
R1.3|Energy from fuels|both
R1.4|Entropy and spontaneity|HL
R2.1|Amount of chemical change|both
R2.2|Rate of reaction|both
R2.3|Equilibrium|both
R3.1|Proton transfer|both
R3.2|Electron transfer|both
R3.3|Electron sharing reactions|both
R3.4|Electron-pair sharing reactions|HL
T1|Experimental techniques|both
T2|Technology|both
T3|Mathematics and data processing|both
IA|Scientific investigation|both`,
  physics: `
A1|Kinematics|both
A2|Forces and momentum|both
A3|Work energy and power|both
A4|Rigid body mechanics|HL
A5|Galilean and special relativity|HL
B1|Thermal energy transfers|both
B2|Greenhouse effect|both
B3|Gas laws|both
B4|Thermodynamics|HL
B5|Current and circuits|both
C1|Simple harmonic motion|both
C2|Wave model|both
C3|Wave phenomena|both
C4|Standing waves and resonance|both
C5|Doppler effect|both
D1|Gravitational fields|both
D2|Electric and magnetic fields|both
D3|Motion in electromagnetic fields|HL
D4|Induction|both
E1|Structure of the atom|both
E2|Quantum physics|both
E3|Radioactive decay|both
E4|Fission|both
E5|Fusion and stars|both
TM|Mathematical tools|both
TE|Experimental tools|both
TD|Data analysis and modelling|both
IA|Scientific investigation|both`,
  cs: `
A1.1|Computer fundamentals|both
A1.2|Operating systems and control systems|both
A1.3|Translation|HL
A2.1|Network fundamentals|both
A2.2|Network architecture|both
A2.3|Data transmission|both
A2.4|Network security|both
A3.1|Database fundamentals|both
A3.2|Relational design and normalization|both
A3.3|SQL and database programming|both
A3.4|Alternative databases and data warehouses|HL
A4.1|Machine-learning fundamentals|both
A4.2|Data preprocessing|HL
A4.3|Machine-learning approaches|HL
A4.4|Ethics and social implications of ML|both
B1.1|Computational thinking|both
B2.1|Programming fundamentals|both
B2.2|Data structures and algorithms|both
B3.1|Single-class object-oriented programming|both
B3.2|Multiple-class OOP|HL
B4.1|Abstract data types|HL
IA|Computational solution|both`,
  "design-technology": `
A1.1|Ergonomics|both
B1.1|User-centred design|both
C1.1|Responsibility of the designer|both
C1.2|Inclusive design|both
C1.3|Beyond usability|both
A2.1|User-centred research methods|both
A2.2|Prototyping techniques|both
B2.1|The design process|both
B2.2|Modelling and prototyping|both
C2.1|Design for sustainability|both
C2.2|Circular economy|both
A3.1|Material classification and properties|both
A3.2|Structural systems|both
A3.3|Mechanical systems|both
A3.4|Electronic systems|both
B3.1|Material selection|both
B3.2|Structural application and selection|both
B3.3|Mechanical application and selection|both
B3.4|Electronic application and selection|both
C3.1|Product analysis and evaluation|both
C3.2|Life-cycle analysis|both
A4.1|Manufacturing techniques|both
B4.1|Production systems|both
C4.1|Design for manufacture|both`,
  ess: `
1.1|Perspectives and environmental value systems|both
1.2|Systems|both
1.3|Sustainability|both
1.4|Questionnaires and surveys|both
HL-L|Environmental law lens|HL
HL-E|Environmental economics lens|HL
HL-ET|Environmental ethics lens|HL
2.1|Individuals populations communities and ecosystems|both
2.2|Energy and biomass|both
2.3|Biogeochemical cycles|both
2.4|Climate and biomes|both
2.5|Zonation and succession|both
2.6|Ecology fieldwork|both
3.1|Biodiversity|both
3.2|Origins and threats to biodiversity|both
3.3|Conservation strategies|both
4.1|Water systems and resources|both
4.2|Aquatic food production|both
4.3|Water pollution|both
4.4|Water management|both
5.1|Soil systems|both
5.2|Terrestrial food production|both
6.1|Atmosphere and atmospheric systems|both
6.2|Climate change causes and impacts|both
6.3|Climate mitigation and adaptation|both
6.4|Stratospheric ozone|both
7.1|Natural resources|both
7.2|Energy resources|both
7.3|Solid waste|both
8.1|Human populations|both
8.2|Urban systems|both
8.3|Urban air pollution and sustainable cities|both
M|Maths and statistics for ESS|both
IA|ESS investigation|both`,
  sehs: `
A1.1|Inter-system communication|both
A1.2|Maintaining homeostasis|both
A1.3|Transport|both
A2.1|Water and electrolyte balance|both
A2.2|Fuelling for health and performance|both
A2.3|Energy systems|both
A3.1|Qualities of training|both
A3.2|Benefits to health of being active|both
A3.3|Fatigue and recovery|both
B1.1|Anatomical position planes and movement|both
B1.2|Connective tissues and joints|both
B1.3|Muscular function|both
B1.4|Levers in movement and sport|both
B2.1|Newton's laws of motion|both
B2.2|Fluid mechanics|both
B2.3|Movement analysis and applications|both
B3.1|Causes of injury|both
B3.2|Interventions related to injury|both
C1.1|Personality|both
C1.2|Mental toughness|both
C2.1|Motor learning processes|both
C2.2|Attentional control|both
C3.1|Achievement motivation|both
C3.2|Self-determination|both
C3.3|Motivational climate|both
C4.1|Arousal and anxiety|both
C4.2|Coping|both
C5.1|Goal setting|both
C5.2|Imagery|both
M|Mathematical tools|both
I|Inquiry process|both
IA|Internal assessment and practical work|both`,
};

const FOCUS: Record<string, string[]> = {
  "biology:A1.1": ["polarity", "hydrogen bonding", "cohesion", "thermal properties"],
  "biology:B2.1": ["phospholipid bilayer", "diffusion", "osmosis", "active transport"],
  "biology:C1.1": ["active site", "activation energy", "denaturation", "rate"],
  "biology:C1.2": ["chemiosmosis", "proton gradient", "ATP synthase", "oxidative phosphorylation"],
  "biology:C1.3": ["light-dependent reactions", "carbon fixation", "limiting factor", "photosynthetic rate"],
  "biology:D1.1": ["semi-conservative replication", "helicase", "DNA polymerase", "Okazaki fragments"],
  "biology:D3.2": ["allele", "genotype", "probability", "pedigree"],
  "biology:D3.3": ["negative feedback", "receptor", "effector", "set point"],
  "chemistry:S1.4": ["amount of substance", "molar mass", "Avogadro constant", "limiting reagent"],
  "chemistry:S2.2": ["Lewis structure", "electron domains", "molecular geometry", "polarity"],
  "chemistry:R1.1": ["calorimetry", "q=mcΔT", "enthalpy change", "systematic error"],
  "chemistry:R2.2": ["successful collision", "activation energy", "rate constant", "Maxwell–Boltzmann distribution"],
  "chemistry:R2.3": ["dynamic equilibrium", "equilibrium constant", "Le Châtelier principle", "reaction quotient"],
  "chemistry:R3.1": ["Brønsted–Lowry acid", "conjugate pair", "buffer", "pH"],
  "chemistry:R3.2": ["oxidation state", "half-equation", "standard potential", "electrochemical cell"],
  "chemistry:R3.3": ["nucleophile", "electrophile", "curly arrow", "reaction mechanism"],
  "physics:A1": ["displacement", "velocity", "acceleration", "motion graph"],
  "physics:A2": ["resultant force", "momentum", "impulse", "system boundary"],
  "physics:A3": ["work", "energy conservation", "power", "efficiency"],
  "physics:B5": ["emf", "internal resistance", "terminal potential difference", "power"],
  "physics:C3": ["superposition", "path difference", "phase difference", "interference"],
  "physics:C4": ["node", "antinode", "resonance", "boundary condition"],
  "physics:D4": ["magnetic flux linkage", "Faraday law", "Lenz law", "induced emf"],
  "physics:E2": ["photon energy", "threshold frequency", "work function", "stopping potential"],
  "cs:A2.4": ["threat", "vulnerability", "control", "residual risk"],
  "cs:A3.2": ["functional dependency", "primary key", "foreign key", "normalization"],
  "cs:A4.2": ["data cleaning", "encoding", "scaling", "data leakage"],
  "cs:A4.3": ["training", "validation", "testing", "metric"],
  "cs:B2.2": ["trace table", "search", "sort", "time complexity"],
  "cs:B3.2": ["class relationship", "composition", "association", "encapsulation"],
  "design-technology:A1.1": ["anthropometrics", "percentile", "reach", "clearance"],
  "design-technology:C2.2": ["circular economy", "repair", "remanufacture", "value retention"],
  "design-technology:B3.1": ["material property", "weighted specification", "manufacturing process", "trade-off"],
  "design-technology:C3.2": ["life-cycle assessment", "functional unit", "system boundary", "embodied impact"],
  "ess:1.2": ["system boundary", "storage", "flow", "feedback"],
  "ess:2.2": ["productivity", "trophic efficiency", "biomass", "energy loss"],
  "ess:3.1": ["species richness", "evenness", "diversity index", "sampling"],
  "ess:4.3": ["eutrophication", "biochemical oxygen demand", "dissolved oxygen", "fish mortality"],
  "ess:6.2": ["radiative forcing", "positive feedback", "vulnerability", "uncertainty"],
  "ess:6.3": ["mitigation", "adaptation", "equity", "feasibility"],
  "sehs:A2.3": ["ATP-PC system", "anaerobic glycolysis", "aerobic metabolism", "exercise intensity"],
  "sehs:A3.3": ["acute fatigue", "recovery", "training load", "adaptation"],
  "sehs:B1.4": ["fulcrum", "effort", "load", "mechanical advantage"],
  "sehs:B2.1": ["ground reaction force", "impulse", "momentum", "acceleration"],
  "sehs:C2.1": ["practice schedule", "feedback", "skill stage", "transfer"],
  "sehs:C4.1": ["arousal", "cognitive anxiety", "somatic anxiety", "performance"],
};

const SUBJECT_CONCEPTS: Record<string, string[]> = {
  biology: ["structure", "mechanism", "variation", "biological scale"],
  chemistry: ["particle model", "conservation", "quantitative relationship", "evidence"],
  physics: ["model", "equation", "direction", "uncertainty"],
  cs: ["input", "process", "output", "constraint"],
  "design-technology": ["user need", "specification", "technical constraint", "trade-off"],
  ess: ["system", "stakeholder", "scale", "sustainability"],
  sehs: ["mechanism", "acute response", "chronic adaptation", "individual variation"],
};

function conceptsFor(subjectId: string, code: string, title: string) {
  const exact = FOCUS[`${subjectId}:${code}`];
  if (exact) return exact;
  const titleTerms = title.toLowerCase().split(/\s+(?:and|of|to|for|the)\s+|\s+/).filter((word) => word.length > 3).slice(0, 2);
  return [...titleTerms, ...(SUBJECT_CONCEPTS[subjectId] ?? [])].slice(0, 4);
}

function parseNodes(subjectId: string): ScienceNode[] {
  return (RAW_NODES[subjectId] ?? "").trim().split("\n").filter(Boolean).map((line) => {
    const [code, title, level] = line.split("|") as [string, string, "both" | "HL"];
    const concepts = conceptsFor(subjectId, code, title);
    return {
      code, title, level,
      path: `${code} > ${title} > fine-grained knowledge, representations, misconceptions and transfer`,
      profile: PROFILES[subjectId],
      definition: `${title} is tested through accurate subject knowledge, a named mechanism or representation, and application to unfamiliar evidence.`,
      concepts,
      application: `apply ${title.toLowerCase()} to unfamiliar data or a constrained scenario`,
      misconception: `${title} can be explained by naming a term without giving a mechanism, condition or supporting evidence`,
    };
  });
}

export const SCIENCE_TOPICS: Record<string, ScienceNode[]> = Object.fromEntries(Object.keys(RAW_NODES).map((id) => [id, parseNodes(id)]));

const difficultyName = (d: number): Question["difficulty"] => d <= 2 ? "Foundation" : d === 3 ? "Standard" : "Challenge";
const responseFor = (marks: number): Question["responseType"] => marks >= 8 ? "extended" : "short";
const contexts = ["a coastal research station", "a city teaching hospital", "a school laboratory", "a regional sports institute", "a manufacturing pilot plant", "a restored wetland"];

function meta(node: ScienceNode, commandTerm: string, marks: number, difficulty: number, paper: Paper, points: string[], errors: string[]) {
  return {
    commandTerm,
    syllabusPath: node.path,
    syllabusProfile: node.profile,
    difficultyLevel: difficulty as 1 | 2 | 3 | 4 | 5,
    estimatedMinutes: Math.max(2, Math.ceil(marks * (difficulty >= 4 ? 1.6 : 1.2))),
    section: paper.name,
    markschemePoints: points,
    commonErrors: errors,
  };
}

function base(subject: Subject, paper: Paper, node: ScienceNode, variant: number, difficulty: number, prompt: string, context: string, command: string, marks: number, points: string[], errors: string[], responseType: Question["responseType"] = responseFor(marks)): Question {
  return {
    id: `sci-${subject.id}-${paper.id}-${node.code}-${difficulty}-${variant}`,
    topicCode: node.code,
    topicTitle: node.title,
    prompt,
    context,
    responseType,
    modelAnswer: points.join(" "),
    keywords: node.concepts,
    marks,
    skill: `${command}: ${node.application}`,
    difficulty: difficultyName(difficulty),
    premiumOnly: difficulty >= 4,
    format: "paper",
    variant,
    ...meta(node, command, marks, difficulty, paper, points, errors),
  };
}

function mcq(subject: Subject, paper: Paper, node: ScienceNode, variant: number, difficulty: number, stem: string, context: string, correct: string, distractors: string[], errors: string[]): Question {
  const raw = [correct, ...distractors];
  const shift = variant % 4;
  const choices = raw.map((_, index) => raw[(index + shift) % raw.length]);
  return {
    ...base(subject, paper, node, variant, difficulty, stem, context, "Determine", 1, [correct], errors, "mcq"),
    choices,
    correctIndex: choices.indexOf(correct),
    modelAnswer: correct,
  };
}

function scienceConceptMCQ(subject: Subject, paper: Paper, node: ScienceNode, variant: number, difficulty: number): Question {
  const c = node.concepts;
  const context = `A student analyses an unfamiliar situation involving ${node.title}. The evidence changes when ${c[0]} changes, but the student gives only a correlation and does not state a mechanism or condition.`;
  return mcq(subject, paper, node, variant, difficulty,
    `Which addition would most improve the student's explanation?`, context,
    `Connect ${c[0]} to ${c[1]} through a testable mechanism and state the condition under which the relationship is expected.`,
    [`Repeat that ${c[0]} and ${c[1]} changed together.`, `Replace the evidence with a definition of ${node.title}.`, `Claim causation because the measured values are different.`],
    ["correlation treated as causation", "definition without application", "condition omitted"]);
}

function biologyEvidence(node: ScienceNode, v: number) {
  if (node.code === "A1.1") return {
    context: `Purified water samples were held at four temperatures before surface tension was measured with the same calibrated tensiometer.\nTemperature / °C: 10 | 20 | 30 | 40\nMean surface tension / mN m⁻¹: ${(74.2 - v * 0.03).toFixed(1)} | ${(72.8 - v * 0.03).toFixed(1)} | ${(71.2 - v * 0.03).toFixed(1)} | ${(69.5 - v * 0.03).toFixed(1)}\nStandard deviation / mN m⁻¹: 0.3 | 0.4 | 0.4 | 0.6\nFive fresh samples were used at each temperature.`,
    first: 74.2 - v * 0.03, last: 69.5 - v * 0.03,
  };
  if (["B2.1", "D2.3"].includes(node.code)) return {
    context: `Equal potato cylinders were immersed for 45 minutes in sucrose solutions.\nSucrose concentration / mol dm⁻³: 0.00 | 0.20 | 0.40 | 0.60\nMean mass change / %: ${(9.1 + v * 0.05).toFixed(1)} | ${(3.8 + v * 0.03).toFixed(1)} | ${(-2.4 - v * 0.02).toFixed(1)} | ${(-8.7 - v * 0.04).toFixed(1)}\nStandard deviation / %: 0.8 | 0.7 | 0.9 | 1.2\nSurface liquid was removed using the same blotting procedure.`,
    first: 9.1 + v * 0.05, last: -8.7 - v * 0.04,
  };
  if (node.code === "C1.1") return {
    context: `An enzyme was incubated with increasing substrate concentration at constant pH and temperature.\nSubstrate concentration / mmol dm⁻³: 0.5 | 1.0 | 2.0 | 4.0\nInitial rate / μmol min⁻¹: ${(2.1 + v * 0.02).toFixed(1)} | ${(3.5 + v * 0.02).toFixed(1)} | ${(4.6 + v * 0.02).toFixed(1)} | ${(4.9 + v * 0.02).toFixed(1)}\nStandard deviation / μmol min⁻¹: 0.2 | 0.3 | 0.3 | 0.4\nA separate reaction mixture was used for every replicate.`,
    first: 2.1 + v * 0.02, last: 4.9 + v * 0.02,
  };
  if (["C1.2", "C1.3"].includes(node.code)) return {
    context: `${node.code === "C1.2" ? "Isolated mitochondria were supplied with increasing oxygen concentrations and ATP production was measured." : "Leaf disks were exposed to increasing irradiance at constant carbon-dioxide concentration and net oxygen production was measured."}\nIndependent-variable level / relative units: 1 | 2 | 4 | 8\nMean process rate / relative units min⁻¹: ${(1.4 + v * 0.02).toFixed(1)} | ${(2.6 + v * 0.02).toFixed(1)} | ${(3.9 + v * 0.02).toFixed(1)} | ${(4.2 + v * 0.02).toFixed(1)}\nStandard deviation: 0.2 | 0.3 | 0.3 | 0.5\nTemperature and pH were controlled.`,
    first: 1.4 + v * 0.02, last: 4.2 + v * 0.02,
  };
  if (/^(A4|B4|C4|D4)/.test(node.code)) return {
    context: `Four sites along an environmental gradient were sampled using identical quadrats.\nDistance from disturbed edge / m: 0 | 25 | 50 | 100\nMean abundance / individuals m⁻²: ${5 + v % 3} | ${9 + v % 3} | ${14 + v % 3} | ${16 + v % 3}\nStandard deviation / individuals m⁻²: 2.1 | 2.4 | 3.0 | 4.8\nSampling occurred on one day after rainfall; soil moisture also increased with distance.`,
    first: 5 + v % 3, last: 16 + v % 3,
  };
  if (/^(C2|C3|D3)/.test(node.code)) return {
    context: `A preparation was exposed to increasing concentrations of a biological signal related to ${node.title}.\nSignal concentration / relative units: 0 | 1 | 2 | 4\nMean target response / % of maximum: ${4 + v % 3} | ${31 + v % 3} | ${63 + v % 3} | ${91 + v % 3}\nStandard deviation / %: 2 | 5 | 7 | 9\nReceptor abundance was not measured directly.`,
    first: 4 + v % 3, last: 91 + v % 3,
  };
  return {
    context: `Two controlled treatments were compared in a study of ${node.title}.\nTreatment level / relative units: 0 | 1 | 2 | 4\nMean measured biological response / relative units: ${(2.0 + v * 0.02).toFixed(1)} | ${(3.1 + v * 0.02).toFixed(1)} | ${(4.0 + v * 0.02).toFixed(1)} | ${(4.4 + v * 0.02).toFixed(1)}\nStandard deviation: 0.3 | 0.4 | 0.6 | 1.0\nSix independent biological replicates were used; the measured response is a proxy and not the process itself.`,
    first: 2.0 + v * 0.02, last: 4.4 + v * 0.02,
  };
}

function biology(subject: Subject, paper: Paper, node: ScienceNode, v: number, d: number): Question {
  const evidence = biologyEvidence(node, v);
  const context = evidence.context;
  if (paper.id === "p1a") return mcq(subject, paper, node, v, d,
    `Which conclusion is best supported by the data?`, context,
    `The measured response generally increases to 28 °C, while the larger spread at 36 °C makes the final difference less certain.`,
    [`Temperature causes ${node.title} in every organism.`, `The response is constant because all standard deviations are below 2.0.`, `The value at 36 °C proves the process has stopped completely.`],
    ["variation ignored", "causation overclaimed", "absolute claim from limited data"]);
  if (paper.id === "p1b") {
    const marks = d <= 2 ? 4 : d === 3 ? 6 : 8;
    const prompt = d <= 2
      ? `(a) Calculate the percentage change from the first to the final condition. [2]\n(b) State one conclusion supported by the standard deviations. [2]`
      : d === 3
        ? `(a) Describe the trend in the data. [2]\n(b) Explain the trend using ${node.concepts[0]} and ${node.concepts[1]}. [2]\n(c) Suggest one sample-related or measurement reason for the variation in the final condition. [2]`
        : `(a) Analyse the data, including variation. [3]\n(b) Explain a biological mechanism that could produce the pattern. [3]\n(c) Evaluate one feature of the method and propose a specific improvement. [2]`;
    return base(subject, paper, node, v, d, prompt, context, d <= 2 ? "Calculate" : d === 3 ? "Explain" : "Analyse", marks,
      [`Use values and units from the dataset; for percentage change show (new − original) / original × 100.`, `Distinguish the measured response from the underlying biological process.`, `Link ${node.concepts[0]} to ${node.concepts[1]} at the correct biological scale.`, `Treat overlap/variation cautiously and name a specific error pathway or improvement.`],
      ["proxy treated as the process itself", "variation ignored", "helps without mechanism", "correlation stated as causation"]);
  }
  const marks = d <= 2 ? 4 : d === 3 ? 6 : 10;
  const prompt = d <= 2
    ? `Explain, using named structures or molecules, how ${node.concepts[0]} contributes to ${node.title}.`
    : d === 3
      ? `A change disrupts ${node.concepts[0]}. Predict its effect at two biological scales and explain the mechanism.`
      : `Using the evidence and your biological knowledge, discuss how changes in ${node.concepts[0]} and ${node.concepts[1]} could affect the system from the cellular to organism or ecosystem level.`;
  return base(subject, paper, node, v, d, prompt, context, d >= 4 ? "Discuss" : "Explain", marks,
    [`Name the relevant biological structures, molecules or populations.`, `Give a directional mechanism rather than a statement of benefit.`, `Link at least two scales accurately.`, `Use the data as evidence and qualify any causal claim or limitation.`],
    ["scale changes without explanation", "structure named but function not linked", "correlation treated as causation", "human purpose attributed to evolution"]);
}

function chemistry(subject: Subject, paper: Paper, node: ScienceNode, v: number, d: number): Question {
  const quantitative = /^(S1.4|R2.1|R3.1|T1|T3|IA)$/.test(node.code);
  const energetic = /^R1/.test(node.code);
  const kinetic = node.code === "R2.2";
  const equilibrium = node.code === "R2.3";
  const electrochemical = node.code === "R3.2";
  const context = quantitative
    ? `A titration related to ${node.title} gives concordant titres ${(24.60 + v * 0.08).toFixed(2)}, ${(24.65 + v * 0.08).toFixed(2)} and ${(24.57 + v * 0.08).toFixed(2)} cm³. The standard solution is ${(0.1000 + (v % 3) * 0.0050).toFixed(4)} mol dm⁻³. The burette uncertainty is ±0.05 cm³ per reading. A colour change is observed; identifying any product requires a chemical test or equation.`
    : energetic
      ? `A student burns ${(0.420 + v * 0.006).toFixed(3)} g of a fuel to heat 150.0 g of water. The temperature rises from 20.2 °C to ${(33.8 + v * 0.2).toFixed(1)} °C. The balance uncertainty is ±0.001 g and each temperature reading is ±0.1 °C. Soot forms and the metal calorimeter becomes warm.`
      : kinetic
        ? `The volume of gas formed was measured during a reaction.\nTime / s: 0 | 20 | 40 | 60 | 100\nGas volume / cm³: 0 | ${18 + v} | ${31 + v} | ${39 + v} | ${44 + v}\nEach gas-volume reading has uncertainty ±1 cm³. Temperature was controlled; the same mass of solid was used in each repeat.`
        : equilibrium
          ? `At constant temperature, an equilibrium mixture was diluted and its absorbance followed.\nTime / s: 0 | 20 | 40 | 80 | 120\nAbsorbance: ${(0.78 + v * 0.002).toFixed(2)} | ${(0.61 + v * 0.002).toFixed(2)} | ${(0.54 + v * 0.002).toFixed(2)} | ${(0.50 + v * 0.002).toFixed(2)} | ${(0.50 + v * 0.002).toFixed(2)}\nAbsorbance is proportional to the concentration of the coloured species; equilibrium is dynamic.`
          : electrochemical
            ? `A galvanic cell is assembled using two half-cells under standard conditions. The measured cell potential is ${(1.08 - v * 0.003).toFixed(2)} V compared with a data-booklet prediction of 1.10 V. The salt bridge is initially dry, then wetted with an inert electrolyte. Each voltmeter reading has uncertainty ±0.01 V.`
            : `Four substances related to ${node.title} are tested.\nSample | melting behaviour | electrical conductivity as solid | conductivity when molten/aqueous\nA | high | low | high\nB | low | low | low\nC | high | high | high\nD | softens over a range | low | variable\nThe observations do not by themselves identify a substance; a bonding/particle model is required.`;
  if (paper.id === "p1a") return mcq(subject, paper, node, v, d,
    `Which statement is chemically valid?`, context,
    `The colour change is an observation; identifying a product requires additional chemical evidence or a balanced equation.`,
    [`The colour change proves a particular gas was produced.`, `Concordant titres remove all systematic error.`, `The burette uncertainty is ±0.05 cm³ for the delivered titre.`],
    ["observation confused with inference", "systematic error ignored", "two readings not considered"]);
  if (paper.id === "p1b") {
    const marks = d <= 2 ? 4 : d === 3 ? 6 : 8;
    const prompt = d <= 2
      ? quantitative ? `(a) Calculate the mean concordant titre. [2]\n(b) Calculate the percentage uncertainty due to the burette readings. [2]` : `(a) Extract two quantitative or categorical trends from the evidence. [2]\n(b) State two conclusions that are justified without assuming an unreported identity. [2]`
      : d === 3
        ? `(a) Process one part of the evidence with appropriate precision. [2]\n(b) Distinguish one observation from one inference. [2]\n(c) Explain one specific procedural improvement. [2]`
        : `(a) Analyse the precision and uncertainty of the measurements. [3]\n(b) Explain how the evidence could be used to determine a quantity associated with ${node.title}. [3]\n(c) Evaluate one systematic error, including its direction of effect. [2]`;
    return base(subject, paper, node, v, d, prompt, context, d >= 4 ? "Analyse" : "Calculate", marks,
      [`Show formula, substitution, unit and appropriate significant figures.`, `Use both initial and final burette readings when evaluating uncertainty.`, `Separate observation from chemical inference.`, `For an error, state the physical pathway and whether the final result is too high or too low.`],
      ["unit omitted", "precision and accuracy confused", "human error", "unbalanced chemistry"]);
  }
  const marks = d <= 2 ? 4 : d === 3 ? 6 : 10;
  const prompt = d <= 2
    ? `Explain ${node.title} using a particle, bonding or electron model. Include any equation, charge or state symbol that is chemically relevant.`
    : d === 3
      ? `Use the supplied evidence to deduce a result associated with ${node.title}. Show all chemical and quantitative reasoning.`
      : `Construct a coherent explanation linking ${node.concepts[0]}, ${node.concepts[1]} and the observed evidence. Evaluate one assumption or experimental limitation.`;
  return base(subject, paper, node, v, d, prompt, context, d >= 4 ? "Deduce" : "Explain", marks,
    [`Use a correct particulate/bonding/electron model.`, `Conserve atoms, charge and electrons; include state symbols when relevant.`, `Show any quantitative steps with units and significant figures.`, `Connect the evidence to the conclusion and identify a chemically specific limitation.`],
    ["more collisions without successful-collision reasoning", "charge not conserved", "observation treated as identity", "data-booklet value memorized or invented"]);
}

function physics(subject: Subject, paper: Paper, node: ScienceNode, v: number, d: number): Question {
  const relationships: Record<string, [string, string, string, string]> = {
    A1: ["time / s", "displacement / m", "slope represents velocity", "constant velocity over the measured interval"],
    A2: ["resultant force / N", "acceleration / m s⁻²", "slope represents reciprocal mass", "constant inertial mass and negligible friction"],
    A3: ["time / s", "energy transferred / J", "slope represents power", "approximately constant transfer rate"],
    A4: ["torque / N m", "angular acceleration / rad s⁻²", "slope represents reciprocal moment of inertia", "fixed mass distribution"],
    A5: ["Lorentz factor", "dilated time / s", "slope represents proper time", "inertial frames and constant relative speed"],
    B1: ["temperature difference / K", "thermal-transfer rate / W", "slope represents thermal conductance", "steady state and unchanged geometry"],
    B2: ["absorbed intensity / W m⁻²", "emitted intensity / W m⁻²", "agreement of slope with unity tests energy balance", "steady state and uniform effective temperature"],
    B3: ["absolute temperature / K", "pressure / kPa", "slope represents nR/V", "fixed amount, constant volume and ideal behaviour"],
    B4: ["heat supplied / J", "change in internal energy / J", "departure from unit slope represents work done", "closed system with measured work pathway"],
    B5: ["current / A", "emf − terminal p.d. / V", "slope represents internal resistance", "constant emf and internal resistance"],
    C1: ["displacement / m", "restoring acceleration magnitude / m s⁻²", "slope represents angular frequency squared", "simple harmonic motion"],
    C2: ["frequency / Hz", "reciprocal wavelength / m⁻¹", "slope represents reciprocal wave speed", "same medium and constant wave speed"],
    C3: ["slit separation / mm", "reciprocal fringe spacing / mm⁻¹", "slope is linked to wavelength and screen distance", "small-angle approximation"],
    C4: ["harmonic number", "resonant frequency / Hz", "slope represents the fundamental frequency", "fixed boundary conditions"],
    C5: ["source speed / m s⁻¹", "observed frequency shift / Hz", "slope tests the low-speed Doppler approximation", "source speed much less than wave speed"],
    D1: ["1/r² / m⁻²", "gravitational field strength / N kg⁻¹", "slope represents GM", "spherical source treated as a point mass"],
    D2: ["test charge / μC", "electric force / mN", "slope represents electric field strength", "uniform field and negligible test-charge disturbance"],
    D3: ["1/B / T⁻¹", "path radius / m", "slope represents mv/q", "velocity perpendicular to a uniform magnetic field"],
    D4: ["rate of change of flux linkage / Wb s⁻¹", "induced emf magnitude / V", "slope tests Faraday's law", "negligible measurement loading"],
    E1: ["frequency / 10¹⁴ Hz", "photon energy / 10⁻¹⁹ J", "slope represents Planck's constant after scale conversion", "single-photon transition"],
    E2: ["frequency / 10¹⁴ Hz", "maximum photoelectron energy / eV", "slope represents Planck's constant in eV s", "one-photon photoelectric model"],
    E3: ["time / s", "ln(corrected count rate)", "negative slope magnitude represents decay constant", "constant background and one isotope"],
    E4: ["mass defect / atomic mass unit", "energy released / MeV", "slope represents the mass–energy conversion factor", "all products included in the system"],
    E5: ["T⁴ / 10¹⁴ K⁴", "surface power / 10⁷ W m⁻²", "slope represents emissivity times Stefan's constant after scaling", "black-body approximation"],
  };
  const [xLabel, yLabel, meaning, assumption] = relationships[node.code] ?? ["transformed independent quantity / SI unit", "measured dependent quantity / SI unit", "slope represents the model constant", "control variables remain constant"];
  const x = [0.20, 0.40, 0.60, 0.80, 1.00];
  const gradient = 2.4 + v * 0.12;
  const intercept = 0.08 + (v % 3) * 0.03;
  const y = x.map((value, i) => Number((gradient * value + intercept + [0.01, -0.02, 0.02, -0.01, 0.01][i]).toFixed(2)));
  const context = `A student tests a model connected to ${node.title}. The plotted points show the measured data and the error bars show an absolute uncertainty of ±0.04 in each dependent value. The linearized model predicts y = kx and assumes ${assumption}. For this representation, ${meaning}.`;
  const graph = (question: Question): Question => ({ ...question, visual: "data-graph", visualData: { xLabel, yLabel, x, y, uncertainty: 0.04 } });
  if (paper.id === "p1a") return graph(mcq(subject, paper, node, v, d,
    `Which statement best describes the evidence for the model?`, context,
    `The relationship is approximately linear, but the non-zero intercept should be investigated before concluding that y is directly proportional to x.`,
    [`The graph proves y is directly proportional to x because both quantities increase.`, `The gradient equals ${intercept.toFixed(2)}.`, `Random uncertainty can explain any systematic non-zero intercept without further analysis.`],
    ["linear confused with proportional", "gradient and intercept confused", "systematic effect dismissed"]));
  if (paper.id === "p1b") {
    const marks = d <= 2 ? 4 : d === 3 ? 6 : 8;
    const prompt = d <= 2
      ? `(a) Determine k using two widely separated data points. [2]\n(b) State the SI unit of k from the defined variables. [1]\n(c) State whether the data support direct proportionality. [1]`
      : d === 3
        ? `(a) Determine the gradient and intercept of a best-fit model. [3]\n(b) Interpret the gradient in the context of ${node.title}. [2]\n(c) Comment on whether the intercept is significant. [1]`
        : `(a) Analyse the data to obtain k with an uncertainty estimate. [4]\n(b) Evaluate the model assumptions using the intercept and scatter. [2]\n(c) Propose one specific improvement linked to a physical error pathway. [2]`;
    return graph(base(subject, paper, node, v, d, prompt, context, d >= 4 ? "Analyse" : "Determine", marks,
      [`Write the governing relationship symbolically before substitution.`, `Use a best-fit gradient or clearly chosen widely separated points with units.`, `Distinguish a linear relationship from direct proportionality and interpret the intercept.`, `Relate uncertainty or an improvement to a named physical mechanism.`],
      ["equation omitted", "unit or direction omitted", "gradient taken from one point", "human error"]));
  }
  const marks = d <= 2 ? 4 : d === 3 ? 7 : 10;
  const prompt = d <= 2
    ? `Using an appropriate physical model, determine a quantity associated with ${node.title}. Show symbolic working before substitution.`
    : d === 3
      ? `Explain how ${node.concepts[0]} and ${node.concepts[1]} determine the observed behaviour. Include a labelled representation and a quantitative relationship.`
      : `Develop and evaluate a model for ${node.title} using the data. State assumptions, calculate a prediction and explain one physical reason for any disagreement.`;
  return graph(base(subject, paper, node, v, d, prompt, context, d >= 4 ? "Evaluate" : "Determine", marks,
    [`Define the system and use a relevant diagram, field, ray or force representation where needed.`, `Write equations symbolically and use consistent sign/vector conventions.`, `Substitute with units, appropriate precision and a sanity check.`, `Interpret the result physically and evaluate a stated modelling assumption.`],
    ["formula selected without model", "vector direction ignored", "area/gradient has no defined meaning", "limitation not linked to result"]));
}

function computerScience(subject: Subject, paper: Paper, node: ScienceNode, v: number, d: number, language: "python" | "java"): Question {
  const users = 480 + v * 35;
  const context = `A school platform supports ${users} users in three buildings. It stores student records, processes live sensor data and allows staff to work remotely. The current system uses one shared network, password-only access and nightly backups. Peak response time rises from 0.4 s to ${(2.6 + v * 0.2).toFixed(1)} s. Any proposal must protect confidentiality and availability while remaining within a limited maintenance budget.`;
  if (paper.id === "p1") {
    const marks = d <= 2 ? 4 : d === 3 ? 6 : 8;
    const prompt = d <= 2
      ? `Describe two features of ${node.title} that are relevant to this system.`
      : d === 3
        ? `Analyse one design decision involving ${node.title}. Use two constraints from the scenario.`
        : `Recommend and justify a change involving ${node.title}. Trace its effect through the system and identify one residual risk.`;
    const question = base(subject, paper, node, v, d, prompt, context, d >= 4 ? "Recommend" : d === 3 ? "Analyse" : "Describe", marks,
      [`Use exact technical vocabulary and scenario constraints.`, `Trace input/data → processing/control → output or system consequence.`, `For security use threat → vulnerability → control → residual risk.`, `Distinguish what the technology does from why it fits this scenario.`],
      ["technology described without application", "bandwidth treated as latency", "security control claimed to remove all risk", "constraint ignored"]);
    if (node.code.startsWith("A2")) return { ...question, visual: "network" };
    if (node.code.startsWith("A3")) return { ...question, visual: "erd" };
    return question;
  }
  const upper = 60 + v * 5;
  const pythonTasks: Record<string, { starter: string; action: string; trace: string; rules: string }> = {
    "B1.1": { starter: `def normalise_readings(values, upper):\n    result = []\n    # decompose validation, duplicate removal and ordering\n    return result`, action: "complete a decomposed algorithm that validates, removes duplicates and sorts sensor readings", trace: `trace the validation and duplicate-removal steps for [${v + 7}, 3, ${v + 7}, -1, ${upper}]`, rules: `Accept integers from 0 to ${upper} inclusive and do not modify the original list.` },
    "B2.1": { starter: `def count_alerts(readings, threshold):\n    count = 0\n    # use selection and iteration; ignore invalid negative readings\n    return count`, action: "complete the function so it counts valid readings at or above a threshold", trace: `trace count_alerts([${v + 4}, -1, ${v + 9}, ${v + 2}], ${v + 5})`, rules: "Negative readings are invalid; the threshold itself must count." },
    "B2.2": { starter: `def binary_search(values, target):\n    low, high = 0, len(values) - 1\n    # return the target index, or -1 when absent\n    return -1`, action: "complete an iterative binary search and justify its time complexity", trace: `trace the low, high and middle values while searching [2, 5, ${v + 8}, ${v + 12}, ${v + 20}] for ${v + 12}`, rules: "The input is sorted in ascending order and may be empty." },
    "B3.1": { starter: `class Sensor:\n    def __init__(self, sensor_id):\n        self.__sensor_id = sensor_id\n        self.__readings = []\n\n    def add_reading(self, value):\n        # validate and store one reading\n        pass\n\n    def mean(self):\n        # return None when there are no readings\n        pass`, action: "complete the Sensor class using encapsulation, validation and a safe mean method", trace: `trace the object state after add_reading(${v + 5}), add_reading(-1), add_reading(${v + 9})`, rules: `Only readings from 0 to ${upper} inclusive may be stored.` },
    "B3.2": { starter: `class Building:\n    def __init__(self, name):\n        self.name = name\n        self.sensors = []\n\n    def add_sensor(self, sensor):\n        # prevent duplicate sensor identifiers\n        pass\n\n    def alerting_sensors(self, threshold):\n        # return associated sensors whose latest reading meets threshold\n        pass`, action: "complete the collaboration between Building and Sensor objects without exposing private data", trace: `trace the associations after adding sensor IDs ${v + 1}, ${v + 2}, ${v + 1}`, rules: "A Building composes a collection of Sensors; duplicate sensor identifiers are rejected." },
    "B4.1": { starter: `class BoundedQueue:\n    def __init__(self, capacity):\n        self.items = []\n        self.capacity = capacity\n\n    def enqueue(self, value):\n        # return False when full\n        pass\n\n    def dequeue(self):\n        # return None when empty\n        pass`, action: "complete the bounded FIFO queue and state the invariant maintained by each operation", trace: `trace enqueue(${v + 1}), enqueue(${v + 2}), dequeue(), enqueue(${v + 3}) for capacity 2`, rules: "The first item enqueued must be the first dequeued; underflow and overflow must be handled." },
  };
  const javaTasks: Record<string, { starter: string; action: string; trace: string; rules: string }> = {
    "B1.1": { starter: `public static List<Integer> normaliseReadings(int[] values, int upper) {\n    List<Integer> result = new ArrayList<>();\n    // validate, remove duplicates and order the result\n    return result;\n}`, action: "complete a decomposed algorithm that validates, removes duplicates and sorts sensor readings", trace: `trace the validation and duplicate-removal steps for [${v + 7}, 3, ${v + 7}, -1, ${upper}]`, rules: `Accept integers from 0 to ${upper} inclusive and do not modify the original array.` },
    "B2.1": { starter: `public static int countAlerts(int[] readings, int threshold) {\n    int count = 0;\n    // use selection and iteration; ignore negative readings\n    return count;\n}`, action: "complete the method so it counts valid readings at or above a threshold", trace: `trace countAlerts([${v + 4}, -1, ${v + 9}, ${v + 2}], ${v + 5})`, rules: "Negative readings are invalid; the threshold itself must count." },
    "B2.2": { starter: `public static int binarySearch(int[] values, int target) {\n    int low = 0, high = values.length - 1;\n    // return the target index, or -1 when absent\n    return -1;\n}`, action: "complete an iterative binary search and justify its time complexity", trace: `trace the low, high and middle values while searching [2, 5, ${v + 8}, ${v + 12}, ${v + 20}] for ${v + 12}`, rules: "The input is sorted in ascending order and may be empty." },
    "B3.1": { starter: `class Sensor {\n    private int sensorId;\n    private List<Integer> readings = new ArrayList<>();\n    public boolean addReading(int value) { /* validate and store */ return false; }\n    public Double mean() { /* return null when empty */ return null; }\n}`, action: "complete the Sensor class using encapsulation, validation and a safe mean method", trace: `trace the object state after addReading(${v + 5}), addReading(-1), addReading(${v + 9})`, rules: `Only readings from 0 to ${upper} inclusive may be stored.` },
    "B3.2": { starter: `class Building {\n    private String name;\n    private List<Sensor> sensors = new ArrayList<>();\n    public boolean addSensor(Sensor sensor) { /* reject duplicate IDs */ return false; }\n    public List<Sensor> alertingSensors(int threshold) { return new ArrayList<>(); }\n}`, action: "complete the collaboration between Building and Sensor objects without exposing private data", trace: `trace the associations after adding sensor IDs ${v + 1}, ${v + 2}, ${v + 1}`, rules: "A Building composes a collection of Sensors; duplicate sensor identifiers are rejected." },
    "B4.1": { starter: `class BoundedQueue {\n    private List<Integer> items = new ArrayList<>();\n    private int capacity;\n    public boolean enqueue(int value) { return false; }\n    public Integer dequeue() { return null; }\n}`, action: "complete the bounded FIFO queue and state the invariant maintained by each operation", trace: `trace enqueue(${v + 1}), enqueue(${v + 2}), dequeue(), enqueue(${v + 3}) for capacity 2`, rules: "The first item enqueued must be the first dequeued; underflow and overflow must be handled." },
  };
  const task = (language === "python" ? pythonTasks : javaTasks)[node.code] ?? (language === "python" ? pythonTasks["B2.1"] : javaTasks["B2.1"]);
  const prompt = d <= 2
    ? `Using the supplied code, ${task.trace}. Show each relevant variable or object-state change and the final output.`
    : d === 3
      ? `${task.action}. Explain one boundary decision in your code.`
      : `${task.action}. Include normal, boundary, invalid and extreme tests, then justify the complexity or class-design trade-off.`;
  return {
    ...base(subject, paper, node, v, d, prompt, `Programming case: ${node.title}. ${task.rules} The solution must remain readable and testable.`, d <= 2 ? "Trace" : "Construct", d <= 2 ? 5 : d === 3 ? 8 : 12,
      [`Show every state or variable change and the final output for a trace.`, `Implement the stated boundary and invalid-input rules exactly.`, `Use the data structure or class relationship required by ${node.title}.`, `Use normal, boundary, invalid and extreme tests; justify complexity or design from the implemented code.`],
      ["final output only", "boundary mishandled", "required abstraction ignored", "complexity or design asserted without reference to code"], "code"),
    starterCode: task.starter,
    codeLanguage: language,
  };
}

function designTechnology(subject: Subject, paper: Paper, node: ScienceNode, v: number, d: number): Question {
  const context = `A design team is developing an adjustable study station for shared classrooms. User research includes 24 students aged 12–18, two wheelchair users and three teachers.\nOption | unit cost | mass | recycled content | tool investment | user rating\nA | $${42 + v} | 5.8 kg | 65% | $18 000 | 7.1/10\nB | $${51 + v} | 4.2 kg | 30% | $9 000 | 8.4/10\nThe brief requires reach adjustment, safe cable management, repairable joints and production of 8 000 units. The research sample does not include left-handed users.`;
  const marks = d <= 2 ? 4 : d === 3 ? 6 : 8;
  const prompt = d <= 2
    ? `Identify two pieces of evidence relevant to ${node.title} and explain how each should influence one measurable specification.`
    : d === 3
      ? `Analyse the two options using common criteria from the brief. Recommend one design change and justify a trade-off.`
      : `Evaluate a redesign using ${node.concepts[0]}, ${node.concepts[1]} and life-cycle evidence. Reach a justified decision for the specified users and production volume.`;
  return base(subject, paper, node, v, d, prompt, context, d >= 4 ? "Evaluate" : d === 3 ? "Analyse" : "Explain", marks,
    [`Convert user evidence into measurable specifications.`, `Use the same weighted criteria when comparing alternatives.`, `Connect material/process, cost, production volume and life-cycle consequences.`, `State a trade-off, evidence limitation and justified decision.`],
    ["designer assumption presented as user evidence", "average user treated as inclusive", "properties listed without selection", "sustainability claim lacks system boundary"]);
}

function ess(subject: Subject, paper: Paper, node: ScienceNode, v: number, d: number): Question {
  const upstream = 8 + v;
  const downstream = 22 + v * 2;
  const context = /^([1245]|IA|M)/.test(node.code)
    ? `A catchment study investigates ${node.title}.\nSite | nitrate / mg dm⁻³ | dissolved oxygen / mg dm⁻³ | species richness | households represented\nUpstream | ${(1.2 + v * 0.05).toFixed(2)} | ${upstream} | ${18 + v} | 34\nTown reach | ${(4.8 + v * 0.12).toFixed(2)} | ${(6.2 - v * 0.08).toFixed(2)} | ${13 + v} | 210\nFarm reach | ${(7.1 + v * 0.15).toFixed(2)} | ${(4.5 - v * 0.06).toFixed(2)} | ${9 + v} | ${downstream}\nSampling occurred once after rainfall. The proposed response combines riparian buffers, fertilizer limits and community monitoring.`
    : node.code.startsWith("3")
      ? `Three habitat fragments are assessed for ${node.title}.\nFragment | area / km² | native species richness | isolation / km | evenness index\nA | 42 | ${31 + v} | 1.2 | 0.81\nB | 18 | ${19 + v} | 4.8 | 0.64\nC | 7 | ${11 + v} | 9.1 | 0.43\nCamera traps operated for unequal numbers of nights. A proposed corridor crosses farms and two administrative regions.`
      : node.code.startsWith("6")
        ? `A city evaluates ${node.title}.\nYear | annual mean temperature anomaly / °C | heat-related admissions per 100 000 | transport CO₂ index\n2022 | 0.8 | ${31 + v} | 100\n2024 | 1.1 | ${40 + v} | 96\n2026 | 1.4 | ${54 + v} | 91\nThe hospital changed its reporting system in 2025. Proposed measures include carbon pricing, cool roofs and targeted heat shelters.`
        : `A regional authority investigates ${node.title}.\nDistrict | population density / km⁻² | resource use index | waste recovered / % | low-income households / %\nCentre | ${3200 + v * 40} | 148 | 62 | 21\nOuter | ${1100 + v * 20} | 104 | 39 | 34\nRural | ${180 + v * 5} | 73 | 18 | 29\nThe proposed strategy combines pricing, infrastructure and regulation; enforcement capacity differs among districts.`;
  const marks = d <= 2 ? 4 : d === 3 ? 7 : 10;
  const prompt = d <= 2
    ? `Describe two patterns in the data and identify one limitation of the sampling.`
    : d === 3
      ? `Explain a systems pathway linking two observed variables, including a storage, flow or feedback where relevant.`
      : `Evaluate the proposed response using environmental, social and economic evidence. Consider stakeholders, scale, feasibility, equity and one unintended consequence.`;
  return base(subject, paper, node, v, d, prompt, context, d >= 4 ? "Evaluate" : d === 3 ? "Explain" : "Describe", marks,
    [`Use exact values, units and anomalies from the source.`, `For systems explanation identify boundary, storage/flow and a directional causal pathway.`, `Distinguish perspective or value judgement from empirical evidence.`, `For evaluation integrate environmental, social and economic dimensions and reach a qualified judgement.`],
    ["lists values without pattern", "correlation treated as causation", "raise awareness without mechanism", "stakeholders treated as uniform"]);
}

function sehs(subject: Subject, paper: Paper, node: ScienceNode, v: number, d: number): Question {
  const measure = node.code.startsWith("A") ? "time-trial time / min (lower is better)" : node.code.startsWith("B") ? "movement-error score / points (lower is better)" : "skill accuracy / % (higher is better)";
  const higherBetter = node.code.startsWith("C");
  const pre1 = higherBetter ? 61.0 + v * 0.2 : 48.0 + v * 0.2;
  const post1 = higherBetter ? 73.0 + v * 0.15 : 43.2 + v * 0.15;
  const pre2 = higherBetter ? 60.5 + v * 0.18 : 47.5 + v * 0.18;
  const post2 = higherBetter ? 68.4 + v * 0.12 : 44.1 + v * 0.12;
  const context = `A six-week study at ${contexts[(v + 3) % contexts.length]} examines ${node.title}. Outcome measure: ${measure}.\nGroup | n | pre-test mean | post-test mean | SD of change\nVariable practice | 12 | ${pre1.toFixed(1)} | ${post1.toFixed(1)} | 2.8\nConstant practice | 12 | ${pre2.toFixed(1)} | ${post2.toFixed(1)} | 2.2\nParticipants selected their preferred group. Training load was recorded, but sleep and diet were self-reported. Individual responses overlap between groups.`;
  if (paper.id === "p1a") return mcq(subject, paper, node, v, d,
    `Which interpretation is most appropriate?`, context,
    `Both group means improved, but self-selection and overlapping individual variation limit a causal comparison of the programmes.`,
    [`Interval training is proven superior for every athlete.`, `The standard deviations show that no participant improved.`, `Self-reported sleep removes sleep as a confounding variable.`],
    ["mean generalized to every participant", "variation misread", "causation overclaimed"]);
  if (paper.id === "p1b") {
    const marks = d <= 2 ? 4 : d === 3 ? 6 : 8;
    const prompt = d <= 2
      ? `(a) Calculate the mean change for each group. [2]\n(b) State which group had the larger mean improvement. [1]\n(c) Identify one source of bias. [1]`
      : d === 3
        ? `(a) Compare the group responses using means and variability. [3]\n(b) Explain one physiological, biomechanical or psychological mechanism relevant to ${node.title}. [2]\n(c) State one limitation. [1]`
        : `(a) Analyse the group and individual-response evidence. [3]\n(b) Explain the result from signal/system response to performance or health outcome. [3]\n(c) Propose one ethical or validity improvement. [2]`;
    return base(subject, paper, node, v, d, prompt, context, d >= 4 ? "Analyse" : "Calculate", marks,
      [`Calculate using the direction defined in the stimulus and include units.`, `Discuss variability as well as group means.`, `Link neural/hormonal/mechanical/psychological mechanism to a health or performance outcome.`, `Separate statistical, practical and individual significance.`],
      ["acute response confused with chronic adaptation", "mean applied to every participant", "elite finding generalized to all", "ethics described generically"]);
  }
  const marks = d <= 2 ? 4 : d === 3 ? 6 : 10;
  const prompt = d <= 2
    ? `Explain one mechanism linking ${node.concepts[0]} to a health or performance outcome.`
    : d === 3
      ? `Analyse the study outcome using ${node.concepts[0]} and ${node.concepts[1]}. Distinguish an acute response from chronic adaptation where relevant.`
      : `Discuss how physiology, biomechanics or psychology could explain the pattern. Evaluate whether the evidence supports changing the training programme for all participants.`;
  return base(subject, paper, node, v, d, prompt, context, d >= 4 ? "Discuss" : "Explain", marks,
    [`Identify the relevant body system, movement component or psychological process.`, `Give a directional mechanism ending in a health or performance consequence.`, `Use study evidence and inter-individual variation.`, `Qualify generalization and include an evidence-based practical recommendation.`],
    ["single energy system claimed to act alone", "plane/axis or force direction missing", "psychology treated deterministically", "group mean generalized"]);
}

const builders: Record<string, (subject: Subject, paper: Paper, node: ScienceNode, variant: number, difficulty: number, language: "python" | "java") => Question> = {
  biology: (s, p, n, v, d) => biology(s, p, n, v, d),
  chemistry: (s, p, n, v, d) => chemistry(s, p, n, v, d),
  physics: (s, p, n, v, d) => physics(s, p, n, v, d),
  cs: computerScience,
  "design-technology": (s, p, n, v, d) => designTechnology(s, p, n, v, d),
  ess: (s, p, n, v, d) => ess(s, p, n, v, d),
  sehs: (s, p, n, v, d) => sehs(s, p, n, v, d),
};

export function getScienceTopics(subjectId: string, level: Level): Topic[] | null {
  const nodes = SCIENCE_TOPICS[subjectId];
  return nodes ? nodes.filter((node) => level === "HL" || node.level === "both") : null;
}

export function buildScienceQuestionPool(subject: Subject, level: Level, paper: Paper, topics: Topic[], premium: boolean, seed: number, excludeIds: string[], language: "python" | "java"): Question[] | null {
  const build = builders[subject.id];
  const nodes = SCIENCE_TOPICS[subject.id];
  if (!build || !nodes) return null;
  const selected = topics.map((topic) => nodes.find((node) => node.code === topic.code)).filter((node): node is ScienceNode => Boolean(node));
  const excluded = new Set(excludeIds);
  const pool: Question[] = [];
  for (let variant = 0; variant < 14; variant += 1) {
    for (let difficulty = 1; difficulty <= 5; difficulty += 1) {
      if (!premium && difficulty >= 4) continue;
      selected.forEach((node) => pool.push(paper.id === "concept" ? scienceConceptMCQ(subject, paper, node, variant, difficulty) : build(subject, paper, node, variant, difficulty, language)));
    }
  }
  const fresh = pool.filter((question) => !excluded.has(question.id));
  const available = fresh.length ? fresh : pool;
  return available.sort((a, b) => Math.sin(seed + a.id.length * 31 + (a.variant ?? 0) * 17 + (a.difficultyLevel ?? 1)) - Math.sin(seed + b.id.length * 31 + (b.variant ?? 0) * 17 + (b.difficultyLevel ?? 1)));
}
