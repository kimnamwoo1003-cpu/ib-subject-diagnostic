import type { Question } from "./data";

type AptitudeQuestion = Pick<Question, "prompt" | "choices" | "correctIndex" | "modelAnswer">;

const RAW: Record<string, AptitudeQuestion> = {
  math: {
    prompt: "If x² − 5x + 6 = 0, what are the two possible values of x?",
    choices: ["2 and 3", "-2 and -3", "1 and 6", "2 and -3"],
    correctIndex: 0,
    modelAnswer: "Factoring gives (x − 2)(x − 3) = 0, so x = 2 or x = 3.",
  },
  "math-ai": {
    prompt: "A phone plan costs $20 plus $0.10 per minute used. Which equation models the total cost C for m minutes?",
    choices: ["C = 20 + 0.10m", "C = 0.10 + 20m", "C = 20m + 0.10", "C = (20 + 0.10)m"],
    correctIndex: 0,
    modelAnswer: "The fixed $20 charge is added to the variable cost of $0.10 per minute, giving C = 20 + 0.10m.",
  },
  physics: {
    prompt: "A ball is thrown straight up into the air. At the exact top of its path, which statement is true?",
    choices: [
      "Its velocity is zero and its acceleration is zero",
      "Its velocity is zero but its acceleration is not zero",
      "Its velocity is not zero but its acceleration is zero",
      "Neither its velocity nor its acceleration is zero",
    ],
    correctIndex: 1,
    modelAnswer: "Velocity momentarily reaches zero at the peak, but gravity keeps accelerating the ball downward the whole time.",
  },
  chemistry: {
    prompt: "An atom of chlorine has 17 protons and 18 neutrons, then gains one electron to form an ion. What is the ion's charge and mass number?",
    choices: ["-1 charge, mass number 35", "+1 charge, mass number 35", "-1 charge, mass number 18", "0 charge, mass number 35"],
    correctIndex: 0,
    modelAnswer: "Mass number = protons + neutrons = 35. Gaining one electron makes the ion negatively charged, so it is Cl⁻.",
  },
  biology: {
    prompt: "Which best explains why enzymes stop working properly at very high temperatures?",
    choices: [
      "They run out of energy to react",
      "Their active site changes shape (denaturation)",
      "They turn into a completely different molecule",
      "They run out of available substrate",
    ],
    correctIndex: 1,
    modelAnswer: "Excess heat breaks the bonds holding the enzyme's shape together, distorting the active site so the substrate no longer fits.",
  },
  cs: {
    prompt: "What does this code print?\nfor i in range(3):\n    print(i * 2)",
    choices: ["0 2 4", "1 2 3", "0 1 2", "2 4 6"],
    correctIndex: 0,
    modelAnswer: "range(3) gives i = 0, 1, 2, and each is doubled before printing: 0, 2, 4.",
  },
  ess: {
    prompt: "A lake receives fertilizer runoff from nearby farms, algae grow rapidly, then die off, and decomposers deplete the water's oxygen. What is this process called?",
    choices: ["Eutrophication", "Bioaccumulation", "Ecological succession", "Desertification"],
    correctIndex: 0,
    modelAnswer: "Nutrient enrichment driving algal blooms and subsequent oxygen depletion is the definition of eutrophication.",
  },
  sehs: {
    prompt: "During intense exercise, muscles generate energy without using oxygen. What is this process called, and what byproduct builds up?",
    choices: ["Aerobic respiration, water", "Anaerobic respiration, lactic acid", "Photosynthesis, oxygen", "Osmosis, carbon dioxide"],
    correctIndex: 1,
    modelAnswer: "Without enough oxygen, muscles switch to anaerobic respiration, producing lactic acid as a byproduct.",
  },
  "design-technology": {
    prompt: "A team designs a chair that looks striking but testers find very uncomfortable to sit in. Which design principle did they most likely neglect?",
    choices: ["Aesthetics", "Ergonomics", "Sustainability", "Cost"],
    correctIndex: 1,
    modelAnswer: "Ergonomics concerns how well a product fits and supports the human body — the exact issue described.",
  },
  economics: {
    prompt: "The price of coffee rises sharply, yet people buy almost the same amount as before. What does this suggest about demand for coffee?",
    choices: ["Demand is elastic", "Demand is inelastic", "Supply is elastic", "Supply is inelastic"],
    correctIndex: 1,
    modelAnswer: "Quantity demanded barely changing despite a large price rise is the definition of inelastic demand.",
  },
  business: {
    prompt: "A new company sets a very low launch price to quickly attract customers away from competitors. What pricing strategy is this?",
    choices: ["Penetration pricing", "Price skimming", "Cost-plus pricing", "Premium pricing"],
    correctIndex: 0,
    modelAnswer: "Entering a market with a deliberately low price to build market share quickly is called penetration pricing.",
  },
  psychology: {
    prompt: "A researcher gives one group 8 hours of sleep and another group 4 hours, then tests memory recall. What is the independent variable?",
    choices: ["The amount of sleep", "The memory recall score", "The participants themselves", "The room temperature"],
    correctIndex: 0,
    modelAnswer: "The independent variable is the factor the researcher deliberately manipulates — here, hours of sleep.",
  },
  history: {
    prompt: "A historian reads a soldier's personal diary from World War I to understand daily life in the trenches. What type of historical source is this?",
    choices: ["A primary source", "A secondary source", "A tertiary source", "A statistical source"],
    correctIndex: 0,
    modelAnswer: "A firsthand account written by someone who directly experienced the events is a primary source.",
  },
  "global-politics": {
    prompt: "Which term describes a situation where one country's economic and military power lets it strongly influence global decisions?",
    choices: ["Sovereignty", "Hegemony", "Globalization", "Diplomacy"],
    correctIndex: 1,
    modelAnswer: "Hegemony refers to dominant influence or leadership held by one state over others.",
  },
  geography: {
    prompt: "A river erodes the outer bank of a bend and deposits sediment on the inner bank. Over a long time, what landform can this eventually create?",
    choices: ["An oxbow lake", "A river delta", "A waterfall", "A glacier"],
    correctIndex: 0,
    modelAnswer: "Continued erosion and deposition can cut off a meander loop entirely, leaving behind an oxbow lake.",
  },
  anthropology: {
    prompt: "An anthropologist lives within a community for a year, taking part in daily life to understand their culture from the inside. What is this method called?",
    choices: ["Participant observation", "A structured survey", "A laboratory experiment", "A national census"],
    correctIndex: 0,
    modelAnswer: "Living among and participating with the group being studied is the defining feature of participant observation.",
  },
  "digital-society": {
    prompt: "A social media algorithm keeps showing a user posts that match their existing opinions, rarely showing opposing views. What is this effect called?",
    choices: ["A filter bubble", "A firewall", "Open source software", "Net neutrality"],
    correctIndex: 0,
    modelAnswer: "Personalized recommendation systems that isolate users from differing viewpoints create a filter bubble.",
  },
  philosophy: {
    prompt: "A philosopher claims \"nothing can be known for certain,\" while being completely certain that this claim itself is true. What problem does this create?",
    choices: ["The claim is self-contradictory", "The claim is a valid logical proof", "The claim is an empirical fact", "There is no problem at all"],
    correctIndex: 0,
    modelAnswer: "If nothing can be known for certain, that rule would also apply to the claim itself — making it self-refuting.",
  },
  "english-a": {
    prompt: "Which literary term describes an object, person, or color used to represent a deeper idea beyond its literal meaning?",
    choices: ["A symbol", "A simile", "Onomatopoeia", "Alliteration"],
    correctIndex: 0,
    modelAnswer: "A symbol stands in for a larger, often abstract idea beyond its literal, concrete meaning.",
  },
  "english-b": {
    prompt: "Which sentence correctly uses the word \"their\"?",
    choices: ["Their going to the park.", "The students left their bags on the bus.", "Their is a problem.", "They're bags are here."],
    correctIndex: 1,
    modelAnswer: "\"Their\" is the possessive form, correctly used before a noun (\"their bags\") to show ownership.",
  },
};

export function getAptitudeQuestion(subjectId: string): Question | null {
  const raw = RAW[subjectId];
  if (!raw) return null;
  return {
    id: `aptitude-${subjectId}`,
    topicCode: "APT",
    topicTitle: "Subject aptitude check",
    prompt: raw.prompt,
    responseType: "mcq",
    choices: raw.choices,
    correctIndex: raw.correctIndex,
    modelAnswer: raw.modelAnswer,
    keywords: [],
    marks: 1,
    skill: "Aptitude",
    difficulty: "Standard",
  };
}
