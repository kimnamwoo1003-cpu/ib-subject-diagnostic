import type { Question } from "./data";

type Item = { prompt: string; correct: string; wrong: [string, string, string] };
type SubjectQuiz = { kind: "myp" | "thinking"; items: Item[] };

// "myp": hardest-level MYP content (Year 5 / extended / eAssessment style) for subjects that continue an MYP course.
// "thinking": subjects with no MYP counterpart, so the questions test whether the student reasons the way that subject does.
const BANK: Record<string, SubjectQuiz> = {
  math: { kind: "myp", items: [
    { prompt: "Solve for x:  log₂(x) + log₂(x − 2) = 3", correct: "x = 4", wrong: ["x = 4 and x = −2", "x = 2", "x = 5"] },
    { prompt: "f(x) = 2(x − 3)² + 5 is transformed into g(x) = f(x + 1) − 2. What is the vertex of g?", correct: "(2, 3)", wrong: ["(4, 3)", "(2, 7)", "(4, 7)"] },
    { prompt: "A geometric series has first term 12 and a sum to infinity of 18. What is the common ratio?", correct: "1/3", wrong: ["2/3", "−1/3", "3/2"] },
  ] },
  "math-ai": { kind: "myp", items: [
    { prompt: "The number of cars passing a junction is modelled by y = −0.05x² + x + 6, where x is minutes. What is the maximum number of cars and when does it occur?", correct: "11 cars at x = 10 minutes", wrong: ["6 cars at x = 0 minutes", "10 cars at x = 11 minutes", "11 cars at x = 20 minutes"] },
    { prompt: "A line of best fit for revision hours (x) against test score out of 100 (y) is y = 6x + 28. A student revises for 15 hours. What should you conclude about the prediction?", correct: "It predicts 118, which is impossible out of 100, so the model is not valid for this value", wrong: ["It predicts 90, which is a reasonable score", "It predicts 118, so the student will get full marks", "The line cannot be used because the correlation is positive"] },
    { prompt: "A bag holds 5 red and 3 blue counters. Two counters are taken without replacement. What is the probability they are the same colour?", correct: "13/28", wrong: ["17/32", "1/2", "15/28"] },
  ] },
  physics: { kind: "myp", items: [
    { prompt: "A 2 kg trolley is pushed with a force of 10 N while friction acts against it with 4 N. What is its acceleration?", correct: "3 m/s²", wrong: ["5 m/s²", "7 m/s²", "6 m/s²"] },
    { prompt: "A 6 Ω and a 3 Ω resistor are connected in parallel to a 12 V cell. What current does the cell supply?", correct: "6 A", wrong: ["1.3 A", "2 A", "4 A"] },
    { prompt: "A wave has a frequency of 50 Hz and a wavelength of 0.4 m. How long does it take to travel 100 m?", correct: "5 s", wrong: ["2 s", "250 s", "20 s"] },
  ] },
  chemistry: { kind: "myp", items: [
    { prompt: "Why does magnesium oxide have a much higher melting point than carbon dioxide?", correct: "MgO is a giant lattice held by strong attractions between ions, whereas CO₂ has only weak forces between separate molecules", wrong: ["The covalent bonds in CO₂ are weaker than the ionic bonds in MgO, so they break first", "Magnesium is a metal, so it conducts heat better", "Oxygen atoms in MgO have more protons than in CO₂"] },
    { prompt: "2H₂ + O₂ → 2H₂O.  What mass of water forms from 4 g of hydrogen with excess oxygen? (H = 1, O = 16)", correct: "36 g", wrong: ["18 g", "72 g", "4 g"] },
    { prompt: "An atom X has the electron arrangement 2,8,6. Which statement is correct?", correct: "It is in Group 16 and forms an X²⁻ ion", wrong: ["It is in Group 6 and forms an X⁶⁺ ion", "It is in Group 16 and forms an X²⁺ ion", "It is in Period 6 and forms an X⁶⁻ ion"] },
  ] },
  biology: { kind: "myp", items: [
    { prompt: "Potato cylinders lose mass in a concentrated sugar solution. What is the best explanation?", correct: "The solution is more concentrated than the cell contents, so water leaves the cells by osmosis", wrong: ["Sugar diffuses into the cells and makes them lighter", "Active transport pumps water out of the cells", "The cells use up their water during respiration"] },
    { prompt: "Bacteria in a hospital become resistant to an antibiotic. Which explanation fits natural selection?", correct: "Resistant bacteria were already present, survived the antibiotic, reproduced and passed on the resistance allele", wrong: ["The bacteria chose to change when the antibiotic appeared", "The antibiotic caused the same mutation in every bacterium", "Bacteria exposed to more antibiotic grew stronger and passed that strength on"] },
    { prompt: "A green plant is kept in complete darkness for 24 hours. Which statement is true?", correct: "It still respires but cannot photosynthesise, so it takes in oxygen and releases carbon dioxide", wrong: ["It stops respiring because there is no light", "It photosynthesises more slowly but still releases oxygen overall", "It takes in carbon dioxide because plants only respire at night"] },
  ] },
  ess: { kind: "myp", items: [
    { prompt: "In the food chain grass → grasshopper → frog → snake, about 10% of energy passes to the next level. If the grass captures 10,000 kJ, roughly how much reaches the snake?", correct: "10 kJ", wrong: ["100 kJ", "1 kJ", "1,000 kJ"] },
    { prompt: "A forest is cleared and replaced by farmland. What is the most likely effect on the carbon cycle?", correct: "Less carbon is stored in biomass, so more CO₂ stays in the atmosphere", wrong: ["More carbon is stored because crops grow faster than trees", "Photosynthesis increases, so atmospheric CO₂ falls sharply", "There is no effect because carbon is not found in soil or plants"] },
    { prompt: "Which is an example of POSITIVE feedback?", correct: "Melting ice exposes darker sea, which absorbs more heat and melts more ice", wrong: ["A thermostat switches the heater off when a room is warm enough", "A rise in rabbit numbers leads to more foxes, which then reduces the rabbits", "Plants grow toward a light source"] },
  ] },
  sehs: { kind: "myp", items: [
    { prompt: "Why does your heart rate stay high for several minutes after intense exercise has stopped?", correct: "Extra oxygen is still needed to break down lactic acid and restore the muscles' energy stores", wrong: ["The muscles are still contracting hard", "The lungs have run out of oxygen", "Body temperature falls, which makes the heart beat faster"] },
    { prompt: "Which is the best example of progressive overload in training?", correct: "Gradually increasing the weight lifted each week", wrong: ["Lifting the same weight on more days of the week", "Resting for a full month before competing", "Changing sport every month to stay interested"] },
    { prompt: "A runner's resting heart rate falls from 72 to 60 beats per minute after 8 weeks of training. What is the most likely reason?", correct: "The heart muscle has strengthened, so each beat pumps more blood", wrong: ["The lungs have become smaller", "Blood volume has fallen, so the heart does less work", "The runner's muscles now need more oxygen at rest"] },
  ] },
  "design-technology": { kind: "myp", items: [
    { prompt: "A designer tests a prototype and finds the handle slips when wet. What should happen next in the design cycle?", correct: "Return to developing ideas, modify the handle, make a new prototype and test again", wrong: ["Start mass production because the prototype already works", "Write a brand-new design brief for a different product", "Ask only the designer whether they like the handle"] },
    { prompt: "Which design specification is best because it can be tested and measured?", correct: "The chair must support a 100 kg adult for 10,000 sit cycles without deforming", wrong: ["The chair should be strong", "The chair should look good", "The chair should feel comfortable"] },
    { prompt: "Which material property describes the ability to absorb energy from an impact without fracturing?", correct: "Toughness", wrong: ["Hardness", "Ductility", "Conductivity"] },
  ] },
  economics: { kind: "myp", items: [
    { prompt: "The price of a good rises from $10 to $12 and the quantity demanded falls from 100 to 95. What does this show?", correct: "Demand is inelastic: quantity fell by a smaller percentage than price rose", wrong: ["Demand is elastic: quantity fell as price rose", "Supply is inelastic: producers cannot change output", "Demand is perfectly elastic: no one buys at a higher price"] },
    { prompt: "A government spends $1 billion on a new stadium. What is the opportunity cost?", correct: "The schools or hospitals that could have been funded with that money", wrong: ["The $1 billion itself", "The cost of the concrete and steel", "The taxes collected to pay for it"] },
    { prompt: "Inflation is 3% and workers' wages rise by 2%. What has happened to real wages?", correct: "They have fallen, because prices rose faster than wages", wrong: ["They have risen by 2%", "They have risen by 5%", "They are unchanged because wages went up"] },
  ] },
  business: { kind: "myp", items: [
    { prompt: "A business has fixed costs of $2,000 a month, variable costs of $5 per unit and sells each unit for $9. How many units must it sell to break even?", correct: "500 units", wrong: ["222 units", "400 units", "1,000 units"] },
    { prompt: "Revenue is $50,000, cost of sales is $30,000 and other expenses are $12,000. What is the net profit margin?", correct: "16%", wrong: ["40%", "24%", "8%"] },
    { prompt: "Which is the clearest example of a conflict between stakeholders?", correct: "Shareholders want higher dividends while employees want higher wages from the same profit", wrong: ["Customers and the business both want a safe product", "Suppliers and the business both want regular orders", "Managers and owners both want the business to survive"] },
  ] },
  history: { kind: "myp", items: [
    { prompt: "A newspaper printed in Britain during World War I reports an easy victory. Why is it limited as evidence of what really happened in the battle?", correct: "Propaganda and censorship may have shaped it to keep morale high", wrong: ["Newspapers can never be primary sources", "It is too old to be useful", "Only soldiers' diaries can ever be reliable"] },
    { prompt: "Which was a long-term cause of World War I rather than the immediate trigger?", correct: "Rivalry between empires and a system of military alliances", wrong: ["The assassination of Archduke Franz Ferdinand", "The Treaty of Versailles", "The Great Depression"] },
    { prompt: "Two historians study the same sources on a protest movement but reach different conclusions. What is the most likely reason?", correct: "They select and interpret the evidence differently, so interpretations can differ", wrong: ["One of them must have invented evidence", "Historical sources never contain useful information", "The past changes every time someone studies it"] },
  ] },
  geography: { kind: "myp", items: [
    { prompt: "A country has a birth rate of 12 per 1,000, a death rate of 14 per 1,000 and no migration. What happens to its population?", correct: "It slowly declines through natural decrease", wrong: ["It grows steadily", "It stays exactly the same", "It rises because of immigration"] },
    { prompt: "In many cities land values are highest in the central business district. Why?", correct: "Accessibility is greatest there, so competition for sites pushes prices up", wrong: ["The land is the largest in area", "Few businesses want to be in the centre", "Planning laws forbid building on cheaper land"] },
    { prompt: "Which is a push factor in rural-to-urban migration?", correct: "Lack of jobs and services in the countryside", wrong: ["Better hospitals in the city", "Higher wages in the city", "More schools in the city"] },
  ] },
  "global-politics": { kind: "myp", items: [
    { prompt: "Which is the best example of a supranational organisation?", correct: "The European Union, where member states share some decision-making power", wrong: ["A trade treaty between two countries", "A multinational company", "A national parliament"] },
    { prompt: "A UN force enters a country to stop atrocities without the government's consent. Which tension does this show?", correct: "State sovereignty versus the responsibility to protect human rights", wrong: ["Free trade versus protectionism", "Urban versus rural development", "Inflation versus unemployment"] },
    { prompt: "What does it mean to call a state a 'superpower'?", correct: "It has military, economic and political influence that can shape events well beyond its own region", wrong: ["It has the largest population in the world", "It is a member of the United Nations", "It has never been involved in a war"] },
  ] },
  "english-a": { kind: "myp", items: [
    { prompt: "\"The old house sighed as the wind pushed through its broken windows.\"  Which technique is used and what is its effect?", correct: "Personification, which gives the house human feeling and creates a lonely, sad atmosphere", wrong: ["A simile, which directly compares the house to a person", "Onomatopoeia, which imitates the sound of the wind", "Hyperbole, which exaggerates the size of the house"] },
    { prompt: "A writer describes a character's 'gray' clothes, 'gray' mood and 'gray' town. What is the best interpretation?", correct: "The repeated colour is a motif that reinforces a mood of dullness or hopelessness", wrong: ["The writer ran out of other adjectives", "The story is set in a place where only gray exists", "The colour has no meaning because it is only description"] },
    { prompt: "Which is the strongest thesis statement for an essay about a poem?", correct: "The poet uses fragmented lines and enjambment to mirror the speaker's confusion, suggesting that grief resists order", wrong: ["The poem is about grief", "The poet uses many different literary devices", "I like the poem because it is sad"] },
  ] },
  "english-b": { kind: "myp", items: [
    { prompt: "Which sentence is grammatically correct?", correct: "If I had had more time, I would have finished the project.", wrong: ["If I would have more time, I would finish the project.", "If I have had more time, I will have finished the project.", "If I had more time, I would have finish the project."] },
    { prompt: "\"Although Mia had studied for weeks, she felt her stomach tighten as she opened the exam paper. 'Just breathe,' she whispered.\"  What does the passage suggest?", correct: "She was well prepared but still anxious", wrong: ["She had not studied at all", "She was angry at the teacher", "She was confident and relaxed"] },
    { prompt: "Choose the best word: \"The new law was highly ___; thousands marched in protest.\"", correct: "controversial", wrong: ["negligible", "voluntary", "ordinary"] },
  ] },
  cs: { kind: "thinking", items: [
    { prompt: "What does this program print?\n\nx = 1\nfor i in range(4):\n    x = x * 2\nprint(x)", correct: "16", wrong: ["8", "32", "4"] },
    { prompt: "A ticket machine should let someone in only if they are older than 12 AND hold a ticket. Which condition is correct?", correct: "age > 12 and has_ticket", wrong: ["age > 12 or has_ticket", "age < 12 and has_ticket", "age > 12 and not has_ticket"] },
    { prompt: "You must find one name in an alphabetically sorted list of 1,000 names. Which strategy needs the fewest checks?", correct: "Check the middle name, discard the half that cannot contain it, and repeat", wrong: ["Check the names one by one from the start", "Check the names one by one from the end", "Pick names at random until you find it"] },
  ] },
  psychology: { kind: "thinking", items: [
    { prompt: "Ice-cream sales and drowning deaths both rise in the same months. Which conclusion is best supported?", correct: "A third factor, such as hot weather, may explain both; correlation does not prove cause", wrong: ["Ice cream causes drowning", "Drowning makes people buy ice cream", "The two trends must be a coincidence"] },
    { prompt: "A researcher wants to test whether background music affects concentration. Which design is best?", correct: "Randomly assign students to music or silence, give everyone the same task and compare scores", wrong: ["Ask students whether they like music", "Test the music group in the morning and the silence group in the evening", "Only test students who already enjoy music"] },
    { prompt: "A survey asks: \"How terrible was the boring lecture?\"  What is the main problem?", correct: "The wording is leading and pushes people toward a negative answer", wrong: ["The question is too short", "Surveys cannot measure opinions", "The question has no problem"] },
  ] },
  anthropology: { kind: "thinking", items: [
    { prompt: "A visitor sees a community eating with their hands and calls it unhygienic. Which approach avoids ethnocentrism?", correct: "Try to understand the practice through the community's own values and rules", wrong: ["Judge it against the visitor's own customs", "Ignore the practice completely", "Teach the community the visitor's way of eating"] },
    { prompt: "Why might an anthropologist live in a community for a year instead of sending a questionnaire?", correct: "To observe what people actually do, not only what they say they do", wrong: ["Questionnaires are illegal in other countries", "Living there is cheaper than printing questionnaires", "People always give more accurate answers on paper"] },
    { prompt: "One culture greets by bowing, another by shaking hands. What can we conclude?", correct: "Both are culturally constructed ways of showing respect; neither is more natural", wrong: ["Bowing is more polite than handshaking", "Handshaking is the original human greeting", "One of the cultures has made a mistake"] },
  ] },
  "digital-society": { kind: "thinking", items: [
    { prompt: "A video app recommends clips based on what you watched before. A critic says this narrows what people see. Which idea does the critic describe?", correct: "A filter bubble created by algorithmic personalisation", wrong: ["A firewall protecting user data", "Open-source software", "Network speed throttling"] },
    { prompt: "A school proposes using facial recognition to take attendance. Which question should be asked first?", correct: "Who benefits, who could be harmed, and who controls and stores the data?", wrong: ["Which camera brand is cheapest?", "How fast can the software run?", "Will students find it fun?"] },
    { prompt: "Which is the best example of the digital divide?", correct: "Students in some regions lack the reliable internet needed for online coursework", wrong: ["A student prefers paper books to e-books", "A phone battery runs out during class", "Two apps use different colour themes"] },
  ] },
  philosophy: { kind: "thinking", items: [
    { prompt: "\"All philosophers ask questions. Socrates asks questions. Therefore, Socrates is a philosopher.\"  What is wrong with this argument?", correct: "It is invalid: asking questions does not mean someone is a philosopher, because others ask questions too", wrong: ["Nothing; it is a valid argument", "Socrates was not a real person", "The conclusion is false, so the premises must be false"] },
    { prompt: "If every plank of a ship is replaced one at a time, is it still the same ship? What is this puzzle mainly about?", correct: "What makes something the same thing over time (identity)", wrong: ["Whether wood is better than metal", "How fast ships can sail", "Whether ships have rights"] },
    { prompt: "In the argument \"Cheating harms others, so cheating is wrong,\" which statement is the premise?", correct: "Cheating harms others", wrong: ["Cheating is wrong", "Everyone dislikes cheating", "Cheating is common"] },
  ] },
};

export type AptitudeQuestion = Question & { subjectId: string; kind: "myp" | "thinking" };

function shuffle<T>(list: T[]) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function getAptitudeQuestions(subjectId: string): AptitudeQuestion[] {
  const quiz = BANK[subjectId];
  if (!quiz) return [];
  return quiz.items.map((item, index) => {
    const choices = shuffle([item.correct, ...item.wrong]);
    return {
      id: `aptitude-${subjectId}-${index}`,
      subjectId,
      kind: quiz.kind,
      topicCode: "APT",
      topicTitle: quiz.kind === "myp" ? "MYP Year 5 level" : "Subject thinking check",
      prompt: item.prompt,
      responseType: "mcq",
      choices,
      correctIndex: choices.indexOf(item.correct),
      modelAnswer: item.correct,
      keywords: [],
      marks: 1,
      skill: "Aptitude",
      difficulty: "Challenge",
    };
  });
}
