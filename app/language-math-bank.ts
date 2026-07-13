import type { Level, Paper, Question, Subject, Topic } from "./data";

type DetailedTopic = Topic & { path: string; profile: string };

const node = (code: string, title: string, level: "both" | "HL", profile: string, concepts: string[]): DetailedTopic => ({
  code,
  title,
  level,
  path: `${code} ${title}`,
  profile,
  definition: `${title} requires accurate use of ${concepts.join(", ")} within the selected course and paper conditions.`,
  concepts,
  application: `select and connect ${concepts.slice(0, 3).join(", ")}`,
  misconception: `A correct answer can name ${concepts[0]} without showing how it affects the result.`,
});

const parseNodes = (raw: string, profile: string) => raw.trim().split("\n").map((line) => {
  const [code, title, level, conceptList] = line.split("|");
  return node(code, title, level as "both" | "HL", profile, conceptList.split(";"));
});

const AA_NODES = parseNodes(`
1.1|Representation, accuracy and exact form|both|exact form;significant figures;bounds;standard form
1.2|Proof, identities and binomial theorem|both|deductive proof;identity;binomial coefficient;counterexample
1.3|Arithmetic and geometric sequences and series|both|nth term;common ratio;sigma notation;convergence
1.4|Exponents and logarithms|both|index laws;logarithm laws;exponential equation;change of base
1.5|HL algebra, polynomials and partial fractions|HL|factor theorem;polynomial roots;partial fractions;induction
1.6|HL complex numbers|HL|Cartesian form;modulus-argument form;De Moivre's theorem;roots
2.1|Function concept, notation, domain and range|both|function notation;domain;range;inverse
2.2|Linear, quadratic and polynomial functions|both|roots;discriminant;vertex;intersection
2.3|Rational, exponential and logarithmic functions|both|asymptote;intercept;exponential growth;logarithmic inverse
2.4|Transformations, symmetry and modulus|both|translation;stretch;reflection;modulus
3.1|Geometry in two and three dimensions|both|distance;angle;arc length;surface area
3.2|Trigonometric ratios, identities and equations|both|sine rule;cosine rule;identity;general solution
3.3|Trigonometric functions and periodic models|both|amplitude;period;phase shift;sinusoidal model
3.4|HL vectors in two and three dimensions|HL|vector equation;scalar product;line-plane intersection;distance
4.1|Descriptive statistics|both|quartiles;standard deviation;outlier;data representation
4.2|Correlation and regression|both|Pearson coefficient;regression line;residual;extrapolation
4.3|Probability and distributions|both|conditional probability;expected value;binomial distribution;normal distribution
5.1|Limits and differentiation|both|limit;derivative;chain rule;tangent
5.2|Applications of differentiation|both|stationary point;optimization;kinematics;rate of change
5.3|Integration and area|both|antiderivative;definite integral;area;volume
5.4|HL advanced calculus|HL|differential equation;Maclaurin series;integration by parts;limit
`, "MATH_AA_Current_SL_AHL");

const AI_NODES = parseNodes(`
1.1|Real numbers, approximation and error|both|percentage error;upper bound;standard form;technology output
1.2|Sequences, series and financial mathematics|both|compound interest;annuity;amortization;geometric sequence
1.3|AHL algebra and systems|HL|simultaneous equations;parameter;inequality;technology-assisted solution
1.4|AHL complex numbers|HL|Cartesian form;polar form;modulus;argument
1.5|AHL matrices and matrix algebra|HL|matrix product;inverse matrix;eigenvalue;linear system
2.1|Lines, functions and model parameters|both|gradient;intercept;domain;parameter interpretation
2.2|Quadratic, cubic, power and rational models|both|regression;turning point;residual;model validity
2.3|Exponential and logarithmic models|both|growth factor;half-life;logistic behaviour;parameter
2.4|Composite and inverse functions|both|composition;inverse;restricted domain;interpretation
2.5|Periodic and sinusoidal modelling|both|amplitude;period;phase shift;forecast
3.1|Triangle geometry, sectors, surface area and volume|both|bearing;trigonometry;sector;volume
3.2|Voronoi diagrams|both|site;perpendicular bisector;cell;nearest-neighbour region
3.3|Vectors and coordinate applications|both|displacement vector;scalar product;intersection;position
3.4|AHL matrix transformations|HL|transformation matrix;composition;inverse;determinant
3.5|AHL graph theory and networks|HL|degree;Euler trail;minimum spanning tree;adjacency matrix
4.1|Descriptive statistics and sampling|both|sampling method;median;standard deviation;bias
4.2|Correlation, regression and validation|both|correlation coefficient;regression;residual plot;extrapolation
4.3|Probability and discrete random variables|both|conditional probability;expected value;discrete distribution;independence
4.4|Normal and Poisson distributions|both|normal distribution;Poisson rate;standardization;assumption
4.5|Statistical tests|both|null hypothesis;p-value;significance level;conclusion
4.6|AHL transformed and combined random variables|HL|linear transformation;expectation;variance;independence
4.7|AHL confidence intervals and inference|HL|confidence interval;standard error;population parameter;interpretation
4.8|AHL transition matrices and Markov chains|HL|transition matrix;state vector;steady state;long-term behaviour
5.1|Differentiation and optimization|both|numerical derivative;stationary point;optimization;contextual constraint
5.2|Integration and accumulation|both|numerical integral;accumulation;area;units
5.3|AHL differential equations and numerical modelling|HL|differential equation;Euler method;slope field;model limitation
`, "MATH_AI_Current_SL_AHL");

const LANGUAGE_A_NODES = parseNodes(`
P1.1|Central idea, tension and interpretation|both|central idea;tension;interpretation;textual evidence
P1.2|Authorial choices and local effects|both|diction;imagery;syntax;local effect
P1.3|Structure, form and wider meaning|both|structure;form;pattern;wider meaning
P1.4|Audience, purpose and ideology|both|audience;purpose;positioning;ideology
P1.5|Perspective, representation and context|both|perspective;representation;context;values
P2.1|Comparative conceptual thesis|both|conceptual thesis;similarity;difference;line of inquiry
P2.2|Integrated comparison of two works|both|comparative topic sentence;evidence;analysis;balance
P2.3|Form, genre and literary convention|both|genre;form;convention;effect
P2.4|Context, values and transformation|both|context;values;transformation;interpretation
P2.5|Alternative readings and qualified judgement|HL|alternative reading;qualification;evaluation;synthesis
`, "LANGUAGE_A_2019_Literature_and_LangLit");

const LANGUAGE_B_NODES = parseNodes(`
P1.ID|Identities — productive writing|both|identity;audience;purpose;register
P1.EX|Experiences — productive writing|both|experience;development;text type;tone
P1.HI|Human ingenuity — productive writing|both|innovation;impact;audience;recommendation
P1.SO|Social organization — productive writing|both|community;formal register;proposal;organization
P1.SP|Sharing the planet — productive writing|both|sustainability;perspective;action;justification
P2.ID|Identities — receptive reading|both|explicit meaning;inference;reference;vocabulary
P2.EX|Experiences — receptive reading|both|sequence;attitude;detail;inference
P2.HI|Human ingenuity — receptive reading|both|purpose;claim;evidence;vocabulary
P2.SO|Social organization — receptive reading|both|viewpoint;reference;detail;implication
P2.SP|Sharing the planet — receptive reading|both|main idea;supporting detail;inference;context
`, "LANGUAGE_B_2020_Themes_and_Assessment");

const LANGUAGE_IDS = /^(english|french|japanese|korean|italian|chinese)-(a|b)/;

function languageKind(id: string) {
  if (!LANGUAGE_IDS.test(id)) return null;
  if (id.endsWith("-b")) return "B" as const;
  return id.includes("-literature") ? "A Literature" as const : "A LangLit" as const;
}

export function getLanguageMathTopics(subjectId: string, level: Level): Topic[] | null {
  const source = subjectId === "math" ? AA_NODES : subjectId === "math-ai" ? AI_NODES : languageKind(subjectId)?.startsWith("A") ? LANGUAGE_A_NODES : languageKind(subjectId) === "B" ? LANGUAGE_B_NODES : null;
  return source?.filter((item) => level === "HL" || item.level === "both") ?? null;
}

type Localized = { name: string; analysis: string[]; literary: string[]; nonLiterary: string[]; bReading: string[]; writing: string[] };

const LANG: Record<string, Localized> = {
  english: {
    name: "English", analysis: ["evidence", "choice", "effect", "purpose"],
    literary: [
      `At six each morning, Mina opened the bakery shutters before the street had chosen its voice. The metal rattled like a small storm. Across the road, the new tower returned the sunrise in perfect squares, while her window held yesterday's flour in its corners. “One day,” her father had said, “the city will learn our name.” Mina wrote the day's prices on the board, then rubbed out the family name above them—not completely, only until it looked like a shadow.`,
      `The last bus waited with its doors open. Arun could hear the driver tapping the wheel, a patient clock. Behind him, the station café was stacking its chairs; ahead, the road disappeared into rain. He lifted the suitcase, surprised again by its lightness. Everything he had refused to pack seemed heavier now.`,
    ],
    nonLiterary: [
      `BORROW THE NIGHT BACK. Our library will remain open until midnight every Friday this winter—not because students should work longer, but because everyone deserves a warm, quiet place to begin. Bring a book, a half-finished idea, or simply yourself. Light belongs to the whole neighbourhood. City Library: more than shelves.`,
      `We were promised that the new app would save time. It does—if time means the seconds between wanting something and buying it. But what happens to the slower moments in which we compare, hesitate and change our minds? Convenience is not neutral; it quietly teaches us what deserves our attention.`,
    ],
    bReading: [
      `Last autumn, our school opened a “repair corner” at lunchtime. At first, students brought only broken phone chargers. Soon, grandparents and local technicians began teaching simple sewing and bicycle repair. The project reduced waste, but its biggest effect was less measurable: students who rarely spoke in class became the people others asked for help.`,
      `When Lea moved to a new city, she joined a weekend walking group to practise the language. She expected vocabulary lessons, but the group mostly exchanged stories about buildings that no longer existed. After several months, Lea realized that knowing a place meant remembering what could not be seen.`,
    ],
    writing: ["formal email", "speech", "blog post"],
  },
  korean: {
    name: "한국어", analysis: ["근거", "표현", "효과", "목적"],
    literary: [
      `새벽 여섯 시, 민아는 골목이 목소리를 고르기 전에 빵집 셔터를 올렸다. 철판 소리가 작은 폭풍처럼 울렸다. 맞은편 새 건물은 햇빛을 반듯한 네모로 돌려주었지만, 빵집 창틀에는 어제의 밀가루가 남아 있었다. “언젠가 도시는 우리 이름을 기억할 거야.” 아버지는 그렇게 말했었다. 민아는 가격표를 쓰다가 그 위의 성을 지웠다. 완전히는 아니고, 그림자처럼 보일 만큼만.`,
      `마지막 버스는 문을 연 채 기다렸다. 운전기사가 손가락으로 운전대를 두드리는 소리는 참을성 있는 시계 같았다. 뒤에서는 역 카페가 의자를 포개고 있었고, 앞에서는 빗속으로 길이 사라졌다. 준은 가방을 들며 다시 한 번 그 가벼움에 놀랐다. 넣지 않기로 한 것들이 오히려 더 무거웠다.`,
    ],
    nonLiterary: [
      `밤을 다시 빌려드립니다. 이번 겨울, 우리 도서관은 매주 금요일 자정까지 문을 엽니다. 더 오래 공부하라는 뜻이 아닙니다. 누구에게나 따뜻하고 조용하게 시작할 장소가 필요하기 때문입니다. 책 한 권, 덜 끝난 생각 하나, 혹은 그냥 당신만 오세요. 빛은 동네 모두의 것입니다.`,
      `새 앱은 시간을 아껴 준다고 했다. 실제로 그렇다. 원하는 순간과 결제하는 순간 사이의 몇 초는 사라졌다. 그러나 비교하고, 망설이고, 마음을 바꾸는 느린 시간은 어디로 갔을까? 편리함은 중립적이지 않다. 무엇에 주의를 기울일지 조용히 가르친다.`,
    ],
    bReading: [
      `지난가을 우리 학교는 점심시간에 ‘수리 모퉁이’를 열었다. 처음에는 고장 난 충전기만 들어왔다. 곧 지역 기술자와 할머니, 할아버지들이 바느질과 자전거 수리를 가르치기 시작했다. 쓰레기도 줄었지만 더 큰 변화는 따로 있었다. 수업에서 말이 적던 학생들이 다른 사람이 먼저 도움을 청하는 사람이 된 것이다.`,
      `유나는 새 도시로 이사한 뒤 주말 걷기 모임에 가입했다. 언어를 연습하려고 시작했지만, 사람들은 사라진 건물에 관한 이야기를 더 많이 나누었다. 몇 달 뒤 유나는 장소를 안다는 것이 눈에 보이지 않는 것까지 기억하는 일임을 깨달았다.`,
    ],
    writing: ["공식 이메일", "연설문", "블로그 글"],
  },
  french: {
    name: "français", analysis: ["preuve", "choix", "effet", "but"],
    literary: [
      `À six heures, Mina levait le rideau de la boulangerie avant que la rue ne choisisse sa voix. Le métal grondait comme un petit orage. En face, la tour neuve renvoyait le soleil en carrés parfaits, tandis que la farine d'hier restait dans les coins de sa vitrine. Mina écrivit les prix, puis effaça le nom de sa famille—pas entièrement, juste assez pour qu'il devienne une ombre.`,
      `Le dernier bus attendait, portes ouvertes. Le conducteur tapait le volant comme une horloge patiente. Derrière, le café empilait ses chaises; devant, la route disparaissait sous la pluie. Noé souleva sa valise, encore surpris par sa légèreté. Tout ce qu'il avait refusé d'emporter semblait plus lourd.`,
    ],
    nonLiterary: [
      `REPRENEZ LA NUIT. Cet hiver, la bibliothèque restera ouverte jusqu'à minuit chaque vendredi—non pour travailler davantage, mais parce que chacun mérite un lieu calme et chaud pour commencer. Apportez un livre, une idée inachevée, ou simplement vous-même. La lumière appartient à tout le quartier.`,
      `On nous promet que l'application fait gagner du temps. C'est vrai, si le temps désigne les secondes entre le désir et l'achat. Mais que deviennent les moments lents où l'on compare, hésite et change d'avis? La commodité n'est jamais neutre.`,
    ],
    bReading: [
      `L'automne dernier, notre école a ouvert un «coin réparation» à midi. D'abord, les élèves apportaient seulement des chargeurs cassés. Puis des techniciens du quartier ont enseigné la couture et la réparation des vélos. Le projet a réduit les déchets, mais il a surtout donné confiance aux élèves les plus discrets.`,
      `Quand Léa a changé de ville, elle a rejoint un groupe de promenade pour pratiquer la langue. Elle attendait des leçons de vocabulaire, mais le groupe racontait surtout l'histoire de bâtiments disparus. Elle a compris qu'habiter un lieu, c'était aussi se souvenir de l'invisible.`,
    ],
    writing: ["courriel formel", "discours", "article de blog"],
  },
  italian: {
    name: "italiano", analysis: ["prova", "scelta", "effetto", "scopo"],
    literary: [`Alle sei Mina alzava la serranda del forno prima che la strada scegliesse la propria voce. Il metallo tuonava come un piccolo temporale. Di fronte, la torre nuova restituiva il sole in quadrati perfetti; nella vetrina di Mina restava la farina di ieri. Scrisse i prezzi, poi cancellò il cognome—non del tutto, solo finché parve un'ombra.`, `L'ultimo autobus aspettava con le porte aperte. L'autista batteva le dita sul volante, un orologio paziente. Dietro, il bar impilava le sedie; davanti, la strada spariva nella pioggia. Luca sollevò la valigia, sorpreso dalla sua leggerezza. Ciò che aveva deciso di non portare pesava di più.`],
    nonLiterary: [`RIPRENDIAMOCI LA NOTTE. Ogni venerdì d'inverno la biblioteca resterà aperta fino a mezzanotte: non per lavorare di più, ma perché tutti meritano un luogo caldo e tranquillo da cui cominciare. Porta un libro, un'idea incompleta o semplicemente te stesso. La luce appartiene al quartiere.`, `Ci hanno promesso che la nuova app farà risparmiare tempo. È vero, se il tempo è quello tra il desiderio e l'acquisto. Ma dove finiscono i momenti lenti in cui confrontiamo, esitiamo e cambiamo idea? La comodità non è neutrale.`],
    bReading: [`Lo scorso autunno la scuola ha aperto un «angolo delle riparazioni». All'inizio arrivavano solo caricabatterie rotti. Poi tecnici e nonni del quartiere hanno insegnato cucito e manutenzione delle biciclette. Il progetto ha ridotto i rifiuti e ha dato un nuovo ruolo agli studenti più silenziosi.`, `Quando Lea si è trasferita, ha partecipato a un gruppo di passeggiate per praticare la lingua. Si aspettava lezioni di vocabolario, ma il gruppo parlava soprattutto di edifici scomparsi. Ha capito che conoscere un luogo significa ricordare anche ciò che non si vede.`],
    writing: ["email formale", "discorso", "articolo di blog"],
  },
  japanese: {
    name: "日本語", analysis: ["根拠", "表現", "効果", "目的"],
    literary: [`朝六時、ミナは通りがまだ声を選ぶ前にパン屋のシャッターを上げた。金属音は小さな嵐のように響いた。向かいの新しいビルは朝日を四角く返したが、店の窓の隅には昨日の小麦粉が残っていた。ミナは値段を書き、家族の名字を消した。完全にではなく、影に見える程度に。`, `最終バスは扉を開けたまま待っていた。運転手がハンドルをたたく音は、辛抱強い時計のようだった。後ろでは駅のカフェが椅子を片づけ、前では道が雨に消えていた。蓮は軽いかばんを持ち上げた。入れなかった物の方が重く感じられた。`],
    nonLiterary: [`夜を、みんなの手に。冬の毎週金曜日、図書館は夜十二時まで開館します。長く勉強させるためではありません。誰にでも、温かく静かに始められる場所が必要だからです。本でも、途中の考えでも、あなた自身だけでも。光は地域全体のものです。`, `新しいアプリは時間を節約すると約束した。確かに、欲しいと思ってから買うまでの数秒は消えた。しかし、比べ、迷い、考え直すための遅い時間はどこへ行ったのか。便利さは中立ではない。`],
    bReading: [`昨年の秋、学校は昼休みに「修理コーナー」を始めた。最初は壊れた充電器だけだったが、地域の技術者や祖父母が裁縫や自転車修理を教えるようになった。ごみが減っただけでなく、授業で静かだった生徒が人から頼られるようになった。`, `ユキは新しい町で言葉を練習するため、週末の散歩会に入った。単語の勉強を期待したが、参加者はもう存在しない建物の話をした。数か月後、場所を知るとは見えないものも覚えることだと気づいた。`],
    writing: ["正式なメール", "スピーチ", "ブログ記事"],
  },
  chinese: {
    name: "中文", analysis: ["证据", "手法", "效果", "目的"],
    literary: [`每天清晨六点，街道还没有选好自己的声音，米娜就拉开面包店的卷帘门。金属声像一场小小的暴雨。对面的新楼把阳光切成整齐的方块，而她的窗角还留着昨天的面粉。米娜写下今日价格，又擦掉上方的姓氏——没有完全擦掉，只让它像一道影子。`, `末班车开着门等待。司机敲着方向盘，像一只耐心的钟。身后，车站咖啡馆正把椅子叠起；前方，道路消失在雨里。林提起行李箱，再次惊讶它如此轻。那些他拒绝带走的东西，反而更沉。`],
    nonLiterary: [`把夜晚借回来。这个冬天，市图书馆每周五开放至午夜——不是为了让大家学习更久，而是因为每个人都应该拥有一个温暖、安静的起点。带一本书、一个未完成的想法，或者只带你自己。灯光属于整个社区。`, `新应用承诺为我们节省时间。的确如此——如果时间只是从想要到购买之间的几秒。那么，用来比较、犹豫和改变主意的缓慢时刻去了哪里？便利并不中立，它悄悄教会我们什么值得注意。`],
    bReading: [`去年秋天，学校在午休时开设了“修理角”。起初，学生只带来坏掉的充电器。后来，社区技术人员和老人开始教缝纫与自行车维修。项目减少了垃圾，但更难衡量的变化是：课堂上很少说话的学生，成了大家主动请教的人。`, `丽雅搬到新城市后，参加了周末步行小组来练习语言。她原以为会学词汇，大家却总在讲述已经消失的建筑。几个月后，她明白了：了解一个地方，也意味着记住那些看不见的东西。`],
    writing: ["正式邮件", "演讲稿", "博客文章"],
  },
};

function languageProfile(subject: Subject) {
  const id = subject.id.split("-")[0];
  return LANG[id] ?? LANG.english;
}

const B_WRITING_SCENARIOS: Record<string, string[]> = {
  English: [
    "Your school wants to replace one weekly lesson with an independent online-learning period. Address school leaders, discuss one benefit and one concern, and recommend a practical safeguard.",
    "A youth centre plans to stop accepting cash. Address its management, explain how this could affect different users, and propose an inclusive solution.",
    "Your town is creating a night-time study space. Inform other students, explain why it matters, and persuade them to help shape the rules.",
    "A local festival wants to reduce waste without losing community traditions. Address volunteers, evaluate one tension, and propose two realistic actions.",
  ],
  한국어: [
    "학교가 매주 한 수업을 자율 온라인 학습 시간으로 바꾸려 한다. 학교 운영진에게 장점 한 가지와 우려 한 가지를 설명하고, 현실적인 보호 방안을 제안하시오.",
    "청소년 센터가 현금 결제를 중단하려 한다. 운영진에게 서로 다른 이용자가 받을 영향을 설명하고, 포용적인 해결책을 제안하시오.",
    "지역에서 야간 학습 공간을 만들고 있다. 다른 학생들에게 필요성을 알리고, 운영 규칙을 함께 만드는 데 참여하도록 설득하시오.",
    "지역 축제가 공동체 전통을 유지하면서 쓰레기를 줄이려 한다. 자원봉사자에게 갈등 요소 한 가지를 평가하고 현실적인 행동 두 가지를 제안하시오.",
  ],
  français: [
    "Votre école souhaite remplacer un cours par semaine par une période d'apprentissage autonome en ligne. Adressez-vous à la direction, présentez un avantage et une inquiétude, puis recommandez une mesure de protection réaliste.",
    "Une maison de jeunes veut supprimer les paiements en espèces. Expliquez à la direction les conséquences pour différents usagers et proposez une solution inclusive.",
    "Votre ville crée un espace d'étude ouvert le soir. Informez les autres élèves, expliquez son importance et persuadez-les de participer à l'élaboration des règles.",
    "Un festival local souhaite réduire ses déchets sans perdre ses traditions. Adressez-vous aux bénévoles, analysez une tension et proposez deux actions réalistes.",
  ],
  italiano: [
    "La tua scuola vuole sostituire una lezione settimanale con un periodo di studio autonomo online. Rivolgiti alla direzione, presenta un vantaggio e una preoccupazione e raccomanda una tutela concreta.",
    "Un centro giovanile vuole eliminare i pagamenti in contanti. Spiega alla direzione l'effetto su utenti diversi e proponi una soluzione inclusiva.",
    "La tua città sta creando uno spazio di studio serale. Informa gli altri studenti, spiega perché è importante e convincili a partecipare alla definizione delle regole.",
    "Un festival locale vuole ridurre i rifiuti senza perdere le tradizioni della comunità. Rivolgiti ai volontari, valuta una tensione e proponi due azioni realistiche.",
  ],
  日本語: [
    "学校では、週一回の授業を自主的なオンライン学習時間に変更する案が出ている。学校の責任者に向けて、利点と懸念を一つずつ説明し、現実的な対策を提案しなさい。",
    "青少年センターが現金の受付をやめる予定である。運営者に対して、利用者ごとの影響を説明し、誰も排除しない解決策を提案しなさい。",
    "町に夜間学習スペースが作られる。他の生徒に必要性を伝え、運営ルール作りへの参加を促しなさい。",
    "地域の祭りが伝統を守りながらごみを減らそうとしている。ボランティアに向けて一つの課題を評価し、現実的な行動を二つ提案しなさい。",
  ],
  中文: [
    "学校计划把每周一节课改为自主在线学习时间。请面向学校管理层，讨论一个好处与一个担忧，并提出一项可行的保障措施。",
    "青少年中心计划停止接受现金。请向管理人员说明这会如何影响不同使用者，并提出一个包容性的解决方案。",
    "你的城市正在建立夜间学习空间。请向其他学生说明其重要性，并说服他们参与制定使用规则。",
    "本地节庆希望在保留社区传统的同时减少垃圾。请面向志愿者，分析一个矛盾，并提出两项现实行动。",
  ],
};

function bWritingPrompt(language: string, level: Level) {
  const length = level === "HL" ? "450–600" : "250–400";
  if (language === "한국어") return `${length}단어로 답하시오. 독자, 목적, 격식 수준과 글 유형의 관습이 분명히 드러나야 한다.`;
  if (language === "français") return `Rédigez une réponse de ${length} mots. Rendez clairs le destinataire, le but, le registre et les conventions du type de texte.`;
  if (language === "italiano") return `Scrivi una risposta di ${length} parole. Rendi chiari destinatario, scopo, registro e convenzioni del tipo di testo.`;
  if (language === "日本語") return `${length}語程度で書きなさい。読み手、目的、文体、文章形式の特徴を明確に示しなさい。`;
  if (language === "中文") return `写一篇${length}词的回答，清楚体现受众、目的、语域与文本类型惯例。`;
  return `Produce a ${length}-word response. Make the audience, purpose, register and text-type conventions unmistakable.`;
}

function bWritingInstruction(language: string, forms: string[]) {
  if (language === "한국어") return `가장 적절한 형식을 선택하시오: ${forms.join(" · ")}. 한국어로만 작성하시오.`;
  if (language === "français") return `Choisissez la forme la plus appropriée : ${forms.join(" · ")}. Rédigez entièrement en français.`;
  if (language === "italiano") return `Scegli la forma più adatta: ${forms.join(" · ")}. Scrivi interamente in italiano.`;
  if (language === "日本語") return `最も適切な形式を選びなさい：${forms.join(" · ")}。日本語だけで書きなさい。`;
  if (language === "中文") return `选择最合适的文本形式：${forms.join(" · ")}。请全部使用中文。`;
  return `Choose the most appropriate form: ${forms.join(" · ")}. Write entirely in English.`;
}

function aComparativeTask(language: string, lens: string) {
  if (language === "한국어") return { context: "수업에서 학습한 두 문학 작품을 사용하시오. 인용문이나 작품 세부 내용을 만들어 내지 말고, 정확한 작품 근거를 제시하시오.", prompt: `학습한 두 작품이 ${lens}을(를) 어떻게 제시하는지 비교·대조하시오.` };
  if (language === "français") return { context: "Utilisez deux œuvres littéraires étudiées. N'inventez ni citations ni détails; appuyez-vous sur des références précises.", prompt: `Comparez et opposez la manière dont deux œuvres étudiées présentent ${lens}.` };
  if (language === "italiano") return { context: "Usa due opere letterarie studiate. Non inventare citazioni o dettagli; fai riferimenti precisi alle opere.", prompt: `Confronta il modo in cui due opere studiate presentano ${lens}.` };
  if (language === "日本語") return { context: "学習した二つの文学作品を用いなさい。引用や作品の細部を作らず、正確な作品参照を示しなさい。", prompt: `学習した二作品が「${lens}」をどのように表現しているか、比較しなさい。` };
  if (language === "中文") return { context: "使用课堂上学过的两部文学作品。不要编造引文或作品细节；请提供准确的作品依据。", prompt: `比较两部作品如何呈现“${lens}”。` };
  return { context: "Use two literary works you have studied. Do not invent quotations or details; precise references to the studied works are required.", prompt: `Compare and contrast how two studied works present ${lens}.` };
}

function aPaper1Prompt(language: string, hl: boolean) {
  const first = language === "한국어" ? "이 글에서 형식과 어조의 변화가 독자의 관점 형성에 어떤 역할을 하는지 분석하시오."
    : language === "日本語" ? "この文章において、形式と語調の変化が読者の見方をどのように形作っているか分析しなさい。"
      : language === "中文" ? "分析本文的形式与语调变化如何塑造读者的视角。"
        : language === "français" ? "Analysez comment les changements de forme et de ton construisent le point de vue du lecteur."
          : language === "italiano" ? "Analizza come i cambiamenti di forma e tono costruiscono il punto di vista del lettore."
            : "Analyse how shifts in form and tone shape the reader's perspective.";
  if (!hl) return first;
  const second = language === "한국어" ? "그런 다음 두 번째 글에 대해 이미지와 구조가 중심 긴장과 목적을 어떻게 발전시키는지 별도의 분석문을 작성하시오."
    : language === "日本語" ? "次に、第二の文章について、イメージと構成が中心的な緊張と目的をどのように展開するか、別の分析を書きなさい。"
      : language === "中文" ? "然后另写一篇分析，说明第二篇文本的意象与结构如何发展核心张力与目的。"
        : language === "français" ? "Rédigez ensuite une analyse distincte du second texte, en étudiant comment l'image et la structure développent la tension centrale et le but."
          : language === "italiano" ? "Scrivi poi un'analisi separata del secondo testo, mostrando come immagini e struttura sviluppino la tensione centrale e lo scopo."
            : "Then write a separate analysis of the second text, exploring how imagery and structure develop its central tension and purpose.";
  return `${first} ${second}`;
}

const rotate = <T,>(items: T[], by: number) => items.map((_, index) => items[(index + by) % items.length]);
const difficulty = (d: number): Question["difficulty"] => d <= 2 ? "Foundation" : d <= 4 ? "Standard" : "Challenge";
const shuffled = <T,>(items: T[], seed: number) => items.map((item, index) => ({ item, key: Math.sin((seed + 13) * (index + 29)) })).sort((a, b) => a.key - b.key).map(({ item }) => item);

function languageQuestion(subject: Subject, level: Level, paper: Paper, topic: DetailedTopic, variant: number): Question {
  const profile = languageProfile(subject);
  const kind = languageKind(subject.id)!;
  const d = ((variant + topic.code.length) % 5 + 1) as 1 | 2 | 3 | 4 | 5;
  const common = { topicCode: topic.code, topicTitle: topic.title, difficulty: difficulty(d), difficultyLevel: d, syllabusPath: topic.path, syllabusProfile: topic.profile, variant, format: "paper" as const };

  if (kind.startsWith("A") && paper.id === "p1") {
    const isLiterature = kind === "A Literature";
    const texts = isLiterature ? profile.literary : profile.nonLiterary;
    const text = texts[variant % 2];
    const secondText = texts[(variant + 1) % 2];
    const prompt = aPaper1Prompt(profile.name, level === "HL");
    return {
      ...common, id: `${subject.id}-${level}-p1-${topic.code}-v${variant}`, context: level === "HL" ? `Original unseen texts · ${profile.name}\n\nTEXT 1\n${text}\n\nTEXT 2\n${secondText}` : `Original unseen ${isLiterature ? "literary extract" : "non-literary text"} · ${profile.name}\n\n${text}`,
      prompt, responseType: "extended", modelAnswer: `A strong analysis establishes a central interpretation, selects precise evidence, connects each choice to a local effect and wider purpose, and considers a defensible alternative reading.`,
      keywords: [...profile.analysis, ...topic.concepts], marks: level === "HL" ? 40 : 20, skill: "Guided analysis", commandTerm: "Analyse", estimatedMinutes: level === "HL" ? 135 : 75, section: `${kind} Paper 1`, criterionCodes: ["A", "B", "C", "D"],
      markschemePoints: ["A: sustained interpretation supported by precise references", "B: evidence → choice/form → local effect → wider meaning/purpose", "C: focused, coherent line of inquiry", "D: clear, varied and accurate academic expression"],
      commonErrors: ["unsupported_interpretation", "feature_spotting_without_effect", "quotation_dump", "generic_audience_effect"],
    };
  }

  if (kind.startsWith("A")) {
    const lensSets: Record<string, string[]> = {
      English: ["the conflict between belonging and independence", "the representation of memory", "the use of silence and absence", "the relationship between power and responsibility", "the transformation of private experience into public meaning"],
      한국어: ["소속감과 독립성의 갈등", "기억의 재현", "침묵과 부재의 사용", "권력과 책임의 관계", "사적 경험이 공적 의미로 변하는 과정"],
      français: ["le conflit entre appartenance et indépendance", "la représentation de la mémoire", "l'emploi du silence et de l'absence", "le rapport entre pouvoir et responsabilité", "la transformation de l'expérience privée en sens public"],
      italiano: ["il conflitto tra appartenenza e indipendenza", "la rappresentazione della memoria", "l'uso del silenzio e dell'assenza", "il rapporto tra potere e responsabilità", "la trasformazione dell'esperienza privata in significato pubblico"],
      日本語: ["帰属と自立の葛藤", "記憶の表象", "沈黙と不在の用い方", "権力と責任の関係", "個人的経験が公共的な意味へ変化する過程"],
      中文: ["归属与独立之间的冲突", "记忆的呈现", "沉默与缺席的运用", "权力与责任的关系", "私人经验向公共意义的转化"],
    };
    const lenses = lensSets[profile.name] ?? lensSets.English;
    const task = aComparativeTask(profile.name, lenses[variant % lenses.length]);
    return {
      ...common, id: `${subject.id}-${level}-p2-${topic.code}-v${variant}`, context: task.context,
      prompt: task.prompt, responseType: "extended",
      modelAnswer: `A top response builds one comparative conceptual thesis, integrates both works in every main section, analyses form as well as content, balances similarity and difference, and qualifies the final judgement.`,
      keywords: [...profile.analysis, "comparison", "thesis", ...topic.concepts], marks: 30, skill: "Comparative literary essay", commandTerm: "Compare and contrast", estimatedMinutes: 105, section: `${kind} Paper 2`, criterionCodes: ["A", "B", "C", "D"],
      markschemePoints: ["knowledge and interpretation of both works", "comparative analysis of authorial choices", "sustained comparative focus and balanced organization", "clear and accurate academic language"],
      commonErrors: ["weak_comparison", "separate_text_blocks", "imbalanced_works", "thesis_not_sustained"],
    };
  }

  if (paper.id === "p1") {
    const scenarios = B_WRITING_SCENARIOS[profile.name] ?? B_WRITING_SCENARIOS.English;
    return {
      ...common, id: `${subject.id}-${level}-p1-${topic.code}-v${variant}`, context: `Original productive-writing scenario · ${profile.name}\n\n${scenarios[variant % scenarios.length]}\n\n${bWritingInstruction(profile.name, profile.writing)}`,
      prompt: bWritingPrompt(profile.name, level), responseType: "extended",
      modelAnswer: `The response selects a defensible text type, uses its conventions naturally, addresses every prompt part, develops relevant ideas with detail, and sustains an audience-appropriate register in ${profile.name}.`,
      keywords: [...profile.analysis, ...topic.concepts], marks: 30, skill: "Purposeful productive writing", commandTerm: "Produce", estimatedMinutes: level === "HL" ? 90 : 75, section: "Language B Paper 1", criterionCodes: ["A", "B", "C"],
      markschemePoints: ["A: range, accuracy, vocabulary and register", "B: relevant ideas developed clearly; every task part addressed", "C: audience, purpose, context and text-type conventions"],
      commonErrors: ["wrong_text_type", "audience_mismatch", "register_inconsistent", "prompt_part_omitted", "ideas_underdeveloped"],
    };
  }

  const passage = profile.bReading[variant % profile.bReading.length];
  const correct = variant % 2 === 0 ? `It changed who was recognized as knowledgeable in the community.` : `Belonging to a place also depends on shared memory.`;
  const distractors = variant % 2 === 0 ? ["It replaced all formal lessons.", "It mainly raised money for new equipment.", "It made technical experts unnecessary."] : ["Language learning is only effective indoors.", "The visible architecture of a city never changes.", "New residents should avoid local history."];
  const options = rotate([correct, ...distractors], variant % 4);
  return {
    ...common, id: `${subject.id}-${level}-p2r-${topic.code}-v${variant}`, context: `Original authentic-style reading text · ${profile.name}\n\n${passage}`,
    prompt: `Which statement best expresses an implied idea in the text? Answer from the text, not from outside knowledge.`, responseType: "mcq", choices: options, correctIndex: options.indexOf(correct),
    modelAnswer: correct, keywords: topic.concepts, marks: 1, skill: "Inference from written text", commandTerm: "Identify", estimatedMinutes: 3, section: "Language B Paper 2 Reading", criterionCodes: ["R"],
    markschemePoints: ["selects the single inference supported by the passage"], commonErrors: ["copies an unrelated detail", "uses outside knowledge", "chooses an overgeneralization"],
  };
}

type MathTask = { context: (n: number) => string; prompt: (n: number) => string; answer: (n: number) => string; points: (n: number) => string[]; errors: string[] };

const baseMathErrors = ["unsupported calculator output", "premature rounding", "missing domain, units or contextual interpretation"];
const mt = (context: (n: number) => string, prompt: (n: number) => string, answer: (n: number) => string, points: string[]): MathTask => ({ context, prompt, answer, points: () => points, errors: baseMathErrors });

const MATH_TASKS: Record<string, MathTask> = {
  "math:1.1": mt(
    (n) => `A metal rod is recorded as ${(12 + n / 10).toFixed(1)} cm, correct to the nearest 0.1 cm. Its mass is ${80 + n} g, correct to the nearest gram.`,
    () => `Write the exact interval for the rod's length and determine the upper bound for its density. Give the final answer to three significant figures.`,
    () => `Use half-unit bounds, divide the upper mass bound by the lower length bound, and round only the final density.`,
    ["correct length interval", "correct mass and length bounds for a maximum", "valid upper-bound calculation", "final value to 3 s.f."],
  ),
  "math:1.2": mt(
    (n) => `Let S(n) be the statement that ${n + 2}ⁿ − 1 is divisible by ${n + 1} for every positive integer n.`,
    () => `Test the statement for three values, decide whether it is an identity or a proposition, and either prove it or give the least counterexample.`,
    () => `Checking cases suggests a claim but is not proof. A valid response identifies the least counterexample if false or gives a complete deductive argument if true.`,
    ["correct classification of the statement", "accurate test cases", "valid counterexample or deductive step", "logical conclusion"],
  ),
  "math:1.3": mt(
    (n) => `A geometric sequence has first term ${3 + n} and common ratio ${(1.12 + n / 100).toFixed(2)}.`,
    (n) => `Find an exact expression for Sₖ and determine the least k for which Sₖ exceeds ${300 + 25 * n}. Justify why the previous integer fails.`,
    () => `Use the finite geometric-series formula, solve the threshold and check the two consecutive integer values.`,
    ["correct finite-series expression", "valid logarithmic inequality or testing", "least integer k", "check of k − 1"],
  ),
  "math:1.4": mt(
    (n) => `For x > 0, log₂(x) + log₂(x − ${n}) = ${3 + (n % 3)}.`,
    () => `Solve the equation exactly and reject any extraneous solution using the original domain.`,
    (n) => `Combine logarithms, solve x(x−${n}) = 2 raised to the stated power, then retain only x > ${n}.`,
    ["correct logarithm law", "correct algebraic equation", "candidate roots", "domain-based rejection and exact answer"],
  ),
  "math:1.5": mt(
    (n) => `P(x) = x³ − ${n + 2}x² − x + ${n + 2}.`,
    () => `Factor P(x) fully. Hence decompose (2x + 1)/P(x) into partial fractions.`,
    (n) => `P(x)=(x−${n + 2})(x−1)(x+1). Write three simple fractions and solve their coefficients consistently.`,
    ["factor theorem or grouping", "complete factorization", "valid partial-fraction form", "correct coefficients"],
  ),
  "math:1.6": mt(
    (n) => `The complex number z has modulus ${n + 1} and argument π/${n + 2}.`,
    () => `Write z in Cartesian form and determine all cube roots of z in modulus–argument form. Describe their arrangement on an Argand diagram.`,
    () => `Convert with cosine and sine, divide the argument plus 2kπ by 3 for k=0,1,2, and identify equal angular spacing.`,
    ["correct Cartesian conversion", "correct root modulus", "three correct root arguments", "Argand arrangement described"],
  ),
  "math:2.1": mt(
    (n) => `f(x) = (2x − ${n})/(x + 3), with x ≠ −3.`,
    () => `Find f⁻¹(x), state its domain and range, and explain why one value must be excluded from each.`,
    () => `Set y=f(x), rearrange for x, then exchange variables. The horizontal asymptote of f becomes the excluded input of the inverse.`,
    ["correct rearrangement", "correct inverse", "domain and range exclusions", "reason for exclusions"],
  ),
  "math:2.2": mt(
    (n) => `f(x) = (x − 1)²(x + ${n}).`,
    () => `State the zeros with multiplicity, find the equation of the tangent at x = 0, and determine the exact area between the curve and x-axis from x = −n to x = 1.`,
    () => `Use the repeated root, differentiate for the tangent, and integrate with the correct sign on the stated interval.`,
    ["zeros and multiplicities", "derivative and tangent", "correct definite integral", "exact positive area"],
  ),
  "math:2.3": mt(
    (n) => `g(x) = ${n + 2}/(x − 1) + 3.`,
    () => `State both asymptotes and intercepts, sketch the graph with correct branch placement, and solve g(x)=x exactly.`,
    () => `Read transformations from the reciprocal parent, calculate intercepts, and solve the resulting quadratic with restrictions.`,
    ["vertical and horizontal asymptotes", "intercepts", "correct branch placement", "valid intersection solutions"],
  ),
  "math:2.4": mt(
    (n) => `The graph of y=f(x) has a local maximum at (${n}, ${n + 3}) and a zero at x=${n + 4}.`,
    () => `Describe the transformations producing y = 2|f(x − 1)| − 3 and give the images of the two stated features.`,
    () => `Apply the horizontal translation first, then modulus, vertical stretch and downward translation to each coordinate/value.`,
    ["correct transformation order", "horizontal coordinate images", "effect of modulus", "final feature coordinates"],
  ),
  "math:3.1": mt(
    (n) => `A right prism has a triangular cross-section with sides ${n + 3}, ${n + 4} and ${n + 5} cm and length ${2 * n + 6} cm.`,
    () => `Determine the cross-sectional area, total surface area and the angle between the longest diagonal of the prism and its base.`,
    () => `Use Heron's formula, assemble all faces, then use three-dimensional Pythagoras and trigonometry for the angle.`,
    ["cross-sectional area", "complete surface area", "correct 3D diagonal relation", "angle with units/degree accuracy"],
  ),
  "math:3.2": mt(
    (n) => `For 0 ≤ x < 2π, 2sin²x − ${n % 2 + 1}sin x = 0.`,
    () => `Solve the equation exactly and explain how the complete set follows from the unit circle.`,
    () => `Factor in sin x, solve each factor and list every solution in the interval without duplicating endpoints.`,
    ["correct factorization", "solutions from first factor", "solutions from second factor", "complete interval control"],
  ),
  "math:3.3": mt(
    (n) => `A tide has maximum depth ${7 + n / 2} m, minimum depth ${2 + n / 4} m and consecutive maxima 12.4 hours apart. A maximum occurs at t=3.`,
    () => `Construct a cosine model d(t)=a cos(b(t−c))+k and find the first time after t=3 when the depth equals the midline.`,
    () => `Use half-range for amplitude, mean for vertical shift, 2π/period for b and the maximum time for phase shift.`,
    ["amplitude and midline", "angular frequency", "phase shift", "first valid time"],
  ),
  "math:3.4": mt(
    (n) => `Line L: r=(1,2,−1)+λ(2,${n},1). Plane Π: x−2y+${n}z=${n + 3}.`,
    () => `Find the intersection of L and Π, determine the acute angle between the line and plane, and state the condition for no intersection.`,
    () => `Substitute the line into the plane, use the direction vector and plane normal for the angle, and compare their scalar product for parallelism.`,
    ["correct parameter at intersection", "intersection coordinates", "angle using direction and normal", "parallel/no-intersection condition"],
  ),
  "math:4.1": mt(
    (n) => `The ordered data are 4, 6, ${n + 5}, ${n + 7}, 13, 16, 19, 24.`,
    () => `Find the median and interquartile range, test for outliers using the 1.5IQR rule, and explain which summary measures are most appropriate.`,
    () => `Calculate quartiles consistently, form both fences, identify any outlier, then justify median/IQR or mean/standard deviation from shape/outliers.`,
    ["median", "quartiles and IQR", "outlier fences and decision", "justified summary choice"],
  ),
  "math:4.2": mt(
    (n) => `For paired data, the regression of y on x is y=${n + 2}+1.8x and r=0.84. One observation is (6, ${n + 15}).`,
    () => `Calculate its residual, interpret the gradient and correlation coefficient, and explain why the line must not be used to predict x from y.`,
    () => `Residual is observed minus predicted. Interpret both statistics in context and distinguish the two regression directions.`,
    ["predicted value", "signed residual", "gradient and r interpreted", "regression-direction limitation"],
  ),
  "math:4.3": mt(
    (n) => `A biased coin has P(H)=${(0.35 + n / 100).toFixed(2)}. It is tossed ${6 + n} times.`,
    () => `Find the probability of exactly three heads and the probability of at least one head, then calculate the expected number of heads.`,
    () => `Use the binomial probability formula, the complement of zero heads and E(X)=np.`,
    ["correct distribution parameters", "exactly-three probability", "complement probability", "expected value"],
  ),
  "math:5.1": mt(
    (n) => `f(x)=(x²+${n})e⁻ˣ.`,
    () => `Differentiate f, find the stationary points exactly where possible, and determine their nature using a valid sign or second-derivative argument.`,
    () => `Use the product rule, factor the exponential term, solve the remaining quadratic and classify each root.`,
    ["product-rule derivative", "stationary equation", "valid roots", "classification with justification"],
  ),
  "math:5.2": mt(
    (n) => `An open box has square base x cm by x cm and volume ${500 + 50 * n} cm³.`,
    () => `Express its surface area as a function of x, find the dimensions that minimize material, and verify a minimum.`,
    () => `Eliminate height using volume, differentiate the area, solve the positive stationary condition and verify it is a minimum.`,
    ["one-variable surface-area model", "derivative", "positive optimal x and height", "minimum verification"],
  ),
  "math:5.3": mt(
    (n) => `The curves y=x² and y=${n + 2}x intersect in the first quadrant.`,
    () => `Find their intersection points and the exact area enclosed. Hence find the volume when the region is rotated through 2π about the x-axis.`,
    () => `Solve for intersections, integrate upper minus lower, then use washers with outer and inner radii.`,
    ["intersection limits", "exact enclosed area", "correct washer integral", "exact volume"],
  ),
  "math:5.4": mt(
    (n) => `A population P satisfies dP/dt=${n / 10}P(1−P/${1000 + 100 * n}), with P(0)=${80 + 5 * n}.`,
    () => `Separate variables to obtain an implicit solution, identify the limiting population, and determine when the growth rate is greatest.`,
    () => `Use partial fractions in the separation, apply the initial condition, read the carrying capacity and set P equal to half that value for maximum growth.`,
    ["correct separation/partial fractions", "integrated relationship", "initial condition", "limit and maximum-growth condition"],
  ),
  "math-ai:1.1": mt(
    (n) => `A journey is recorded as ${120 + n} km to the nearest kilometre and ${1.8 + n / 100} hours to the nearest 0.01 hour.`,
    () => `Use technology to calculate the stated average speed and determine a justified interval containing the true average speed.`,
    () => `Divide stated values for the estimate, then combine distance and time bounds in opposite directions for minimum and maximum speed.`,
    ["calculator estimate", "distance bounds", "time bounds", "correct speed interval with units"],
  ),
  "math-ai:1.2": mt(
    (n) => `A student deposits $${1200 + n * 80} at the end of each year into an account paying ${3.2 + n * .1}% annual interest, compounded yearly.`,
    (n) => `Use technology to find the value after ${8 + n} deposits and the first year the balance exceeds $20 000. Interpret the payment timing.`,
    () => `Use an ordinary-annuity model, solve the threshold numerically and interpret an end-of-period deposit.`,
    ["correct finance model", "accurate balance", "threshold year", "payment timing interpreted"],
  ),
  "math-ai:1.3": mt(
    (n) => `A café mixes two drinks. x+y=${90 + n} and ${2 + n / 10}x+${1 + n / 10}y=${150 + 2 * n}.`,
    () => `Solve the system using technology, interpret both variables, and determine how the solution changes if the second total rises by 10%.`,
    () => `Enter the simultaneous system, report the feasible solution with units, modify the parameter and compare both variables.`,
    ["correct system entry", "original solution", "modified solution", "comparison in context"],
  ),
  "math-ai:1.4": mt(
    (n) => `z=${n + 2}+${n}i.`,
    () => `Use technology to write z in polar form, find z⁵, and locate z⁵ by quadrant and argument on an Argand diagram.`,
    () => `Find modulus and argument, apply De Moivre's theorem and reduce the resulting argument to a standard interval.`,
    ["modulus and argument", "polar form", "fifth power", "Argand interpretation"],
  ),
  "math-ai:1.5": mt(
    (n) => `A=[[${n + 1},1],[2,${n + 2}]] and b=[[${2 * n + 3}],[${n + 7}]].`,
    () => `Use matrix technology to solve Ax=b, verify the result by multiplication, and explain what det(A) indicates about uniqueness.`,
    () => `Calculate A⁻¹b, multiply A by the result and connect a non-zero determinant with a unique solution.`,
    ["correct matrix setup", "technology solution", "multiplication check", "determinant interpretation"],
  ),
  "math-ai:2.1": mt(
    (n) => `A taxi fare is modelled by C=${n + 3}+${1.4 + n / 20}d, where d is distance in km.`,
    () => `Interpret both parameters, state a sensible domain, and use the model to compare a 12 km journey with a quoted fixed fare of $25.`,
    () => `Interpret intercept as initial charge and gradient as cost per kilometre, restrict distance and compare two numerical costs.`,
    ["intercept interpreted", "gradient with units", "sensible domain", "calculation and decision"],
  ),
  "math-ai:2.2": mt(
    (n) => `A technology fit gives h(t)=−4.9t²+${12 + n}t+${1 + n / 2} for the height of a ball.`,
    () => `Find the maximum height and when it occurs, determine when the model predicts ground contact, and assess one physical limitation.`,
    () => `Use the vertex/maximum command, solve h=0 for the positive root and comment on assumptions such as drag or model domain.`,
    ["time of maximum", "maximum height", "positive ground-contact time", "physical limitation"],
  ),
  "math-ai:2.3": mt(
    (n) => `A medicine concentration follows C(t)=${80 + 5 * n}(0.${82 + n})ᵗ mg L⁻¹.`,
    () => `Find the percentage decrease per hour, the half-life and the first whole hour when C<10. Interpret the discrete time result.`,
    () => `Read the decay factor, solve the half-life and threshold logarithmically/numerically, then round the threshold upward.`,
    ["decay percentage", "half-life", "threshold solution", "whole-hour interpretation"],
  ),
  "math-ai:2.4": mt(
    (n) => `f(x)=${n + 2}x+1 and g(x)=x² for x≥0.`,
    () => `Find (g∘f)(x), (f∘g)(x) and g⁻¹(x). State a domain on which each inverse/composite expression is meaningful.`,
    () => `Substitute in the correct order, use the principal square root for g⁻¹ and track all domain restrictions.`,
    ["first composition", "second composition", "inverse", "domain control"],
  ),
  "math-ai:2.5": mt(
    (n) => `Daily temperature is modelled by T(t)=${15 + n / 2}+${4 + n / 3}sin(π(t−${4 + n})/12), 0≤t≤24.`,
    () => `Use technology to find the maximum, minimum and first time T exceeds the midline after t=0. Interpret the phase shift.`,
    () => `Read amplitude/midline, solve on the specified domain and connect the phase parameter to the cycle timing.`,
    ["maximum and minimum", "valid crossing time", "domain respected", "phase interpreted"],
  ),
  "math-ai:3.1": mt(
    (n) => `A conical container has radius ${n + 2} cm, slant height ${n + 7} cm and is filled to 70% of its volume.`,
    () => `Determine its vertical height, full volume and liquid volume. Give a justified final accuracy and units.`,
    () => `Use Pythagoras for height, the cone-volume formula and multiply by 0.70 without premature rounding.`,
    ["vertical height", "full volume", "70% volume", "accuracy and units"],
  ),
  "math-ai:3.2": mt(
    (n) => `Service sites are A(1,2), B(${7 + n},3) and C(4,${8 + n}); a household is at P(4,4).`,
    () => `Construct the relevant perpendicular-bisector equations, identify P's Voronoi cell and test whether moving P one unit north changes the nearest site.`,
    () => `Compare squared distances, identify equality boundaries and repeat for the shifted point.`,
    ["bisector or equal-distance setup", "original nearest site", "shifted comparison", "Voronoi interpretation"],
  ),
  "math-ai:3.3": mt(
    (n) => `A drone travels from A(2,1,0) to B(${n + 5},4,${n}) and then to C(${n + 7},${n + 4},2).`,
    () => `Find both displacement vectors, the total path length and the direct distance AC. Interpret the difference between path length and displacement.`,
    () => `Subtract position vectors, use vector magnitudes and distinguish a scalar route length from the resultant displacement.`,
    ["two displacement vectors", "path length", "direct distance", "interpretation"],
  ),
  "math-ai:3.4": mt(
    (n) => `A transformation has matrix [[1,${n}/2],[0,${n + 1}]].`,
    () => `Find the image of the unit square, calculate its area scale factor and determine the inverse transformation when it exists.`,
    () => `Transform all vertices, use the determinant for area scale and calculate the inverse from a non-zero determinant.`,
    ["transformed vertices", "image described", "determinant/area scale", "inverse and existence condition"],
  ),
  "math-ai:3.5": mt(
    (n) => `A weighted network has edges AB=${n + 1}, AC=${n + 4}, BC=3, BD=${n + 2}, CD=4 and CE=${n + 5}, DE=2.`,
    () => `Use a suitable algorithm to find a minimum spanning tree, give its total weight and state whether the network has an Euler trail.`,
    () => `Apply Kruskal or Prim without cycles, total the chosen edges and use odd vertex degrees for the Euler condition.`,
    ["valid algorithm trace", "correct spanning edges", "total weight", "Euler decision from degrees"],
  ),
  "math-ai:4.1": mt(
    (n) => `A school surveys every ${n + 3}rd student entering the cafeteria about sleep. Students absent that day are not sampled.`,
    () => `Name the sampling method, identify two possible biases and recommend a design that better represents the school.`,
    () => `Recognize systematic sampling, distinguish frame/non-response or timing bias and propose stratification/random selection.`,
    ["sampling method", "first bias", "second bias", "improved design"],
  ),
  "math-ai:4.2": mt(
    (n) => `For 12 observations, r=${(.76 + n / 100).toFixed(2)} and y=${n + 4}+${(1.7 + n / 20).toFixed(2)}x. One point is (${n + 2}, ${3 * n + 12}).`,
    () => `Calculate the residual, interpret the gradient and r, and assess a prediction at an x-value twice the observed maximum.`,
    () => `Compute observed minus predicted, interpret both measures in context and reject/qualify strong extrapolation.`,
    ["prediction", "signed residual", "gradient and r interpreted", "validation/extrapolation judgement"],
  ),
  "math-ai:4.3": mt(
    (n) => `X has values 0, 1, 3 with probabilities 0.2, ${(0.35 + n / 100).toFixed(2)} and k.`,
    () => `Find k, E(X) and Var(X). A reward is R=5X−4; determine E(R) without constructing a second table.`,
    () => `Normalize probabilities, calculate first and second moments and use linearity E(5X−4)=5E(X)−4.`,
    ["k", "expectation", "variance", "transformed expectation"],
  ),
  "math-ai:4.4": mt(
    (n) => `Calls arrive at a mean rate of ${2 + n / 2} per 10 minutes.`,
    () => `Use technology to find the probability of at least three calls in 10 minutes and exactly six in 20 minutes. State the assumptions of the model.`,
    () => `Use Poisson distributions with the correct interval rates, a complement where helpful, and state independence/constant rate.`,
    ["correct first rate", "at-least probability", "scaled 20-minute rate and probability", "assumptions"],
  ),
  "math-ai:4.5": mt(
    (n) => `A sample of ${40 + 2 * n} students gives a p-value of ${(0.018 + n / 1000).toFixed(3)} when testing whether a new schedule changes mean sleep.`,
    () => `State suitable hypotheses, reach a conclusion at 5% and 1% significance, and explain what the p-value does not mean.`,
    () => `Use a two-sided alternative, compare p with both α levels and reject the claim that p is the probability H₀ is true.`,
    ["hypotheses", "5% conclusion", "1% conclusion", "correct p-value interpretation"],
  ),
  "math-ai:4.6": mt(
    (n) => `Independent X and Y have E(X)=${n + 2}, Var(X)=3, E(Y)=${2 * n}, Var(Y)=5. Let Z=2X−Y+4.`,
    () => `Determine E(Z) and Var(Z), then explain exactly where independence is used.`,
    () => `Apply linearity to expectation and add squared-coefficient variances only because covariance is zero under independence.`,
    ["expectation transformation", "squared coefficients", "variance", "independence/covariance explanation"],
  ),
  "math-ai:4.7": mt(
    (n) => `A sample mean is ${52 + n / 2}, with sample standard deviation ${8 + n / 3} and sample size ${40 + n}.`,
    () => `Use technology to construct a 95% confidence interval for the population mean and interpret it without assigning a probability to the fixed parameter.`,
    () => `Use an appropriate t interval, report endpoints and interpret the repeated-sampling method rather than saying the parameter has 95% probability.`,
    ["correct interval procedure", "standard error/technology input", "interval endpoints", "valid confidence interpretation"],
  ),
  "math-ai:4.8": mt(
    (n) => `Customers move between Basic and Premium plans with transition matrix [[0.${80 + n},0.${20 - n}],[0.${15 + n},0.${85 - n}]], using row state vectors.`,
    () => `Starting from (0.7,0.3), find the distribution after six periods and the steady-state distribution. Interpret the long-term result.`,
    () => `Multiply the row vector repeatedly/use a matrix power, solve πP=π with components summing to 1 and interpret proportions.`,
    ["orientation and valid transition matrix", "six-period state", "steady-state equations", "long-term interpretation"],
  ),
  "math-ai:5.1": mt(
    (n) => `Profit is P(x)=−0.04x³+${1 + n / 10}x²+${8 + n}x−${100 + 5 * n} for 0≤x≤40.`,
    () => `Use technology to find the production level giving maximum profit, compare endpoint values and interpret any non-integer optimum.`,
    () => `Find numerical stationary points on the domain, compare all candidates/endpoints and choose a feasible integer policy if required.`,
    ["stationary candidates", "domain/endpoints", "maximum value and x", "integer/context interpretation"],
  ),
  "math-ai:5.2": mt(
    (n) => `Water enters a tank at R(t)=${8 + n}+${3 + n / 2}sin(πt/12) litres per minute for 0≤t≤24.`,
    () => `Use technology to find the total volume added, the mean inflow rate and the time by which half the total volume has entered.`,
    () => `Integrate over the interval, divide by interval length for the mean, then solve an accumulation equation for half the total.`,
    ["total definite integral", "units", "mean value", "half-accumulation time"],
  ),
  "math-ai:5.3": mt(
    (n) => `dy/dt=${n / 10}(20−y), y(0)=${2 + n}.`,
    () => `Use Euler's method with step 0.5 to estimate y(2), compare it with a technology solution of the differential equation and discuss one source of numerical error.`,
    () => `Construct four Euler updates, solve or graph the exact model with technology, compare values and connect error to finite step size.`,
    ["Euler recurrence", "four correct steps", "technology/exact comparison", "numerical-error discussion"],
  ),
};

const mathTask = (topic: DetailedTopic, ai: boolean, paper: Paper): MathTask => {
  const unit = Number(topic.code.split(".")[0]);
  const title = topic.title;
  const errors = ["unsupported calculator output", "premature rounding", "missing domain, units or contextual interpretation"];
  const exactTask = MATH_TASKS[`${ai ? "math-ai" : "math"}:${topic.code}`];
  if (exactTask) return exactTask;
  if (!ai && unit === 1) return { context: (n) => `Let uₙ = ${n + 2}(${n + 1}/2)ⁿ⁻¹ for n ≥ 1. Give exact values unless otherwise stated.`, prompt: (n) => `${paper.id === "p1" ? "Without technology, " : ""}determine the first n for which uₙ > ${5000 + 400 * n}, and justify the transition from n − 1 to n.`, answer: () => `Substitute consecutive integer values, establish the first crossing, and show the preceding term does not satisfy the inequality.`, points: () => ["forms or uses the correct term", "tests the threshold with sufficient accuracy", "checks n − 1", "states the least integer n"], errors };
  if (!ai && unit === 2) return { context: (n) => `The function f(x) = x³ − ${n + 2}x² − x + ${n + 2} is defined for real x.`, prompt: () => `${paper.id === "p1" ? "Without technology, factor f(x) fully, " : "Find all zeros of f, "}then determine the exact area enclosed by its graph and the x-axis between the two smallest zeros.`, answer: (n) => `Group terms to obtain (x − ${n + 2})(x − 1)(x + 1), identify the relevant interval, integrate |f(x)| exactly and evaluate the bounds.`, points: () => ["correct factorization", "correct zeros and interval", "correct antiderivative", "exact positive area"], errors };
  if (!ai && unit === 3) return { context: (n) => `In triangle ABC, AB = ${n + 5}, AC = ${n + 7} and angle BAC = ${40 + n}°.`, prompt: () => `Determine BC and then find angle ABC. State why the second angle solution is rejected.`, answer: () => `Apply the cosine rule for BC, then the sine rule; reject the supplementary angle because it is inconsistent with the side ordering/angle sum.`, points: () => ["correct cosine-rule substitution", "value of BC", "sine-rule equation", "valid angle with ambiguity resolved"], errors };
  if (!ai && unit === 4) return { context: (n) => `A discrete random variable X has P(X = 0) = 0.18, P(X = 1) = ${0.28 + n * .01}, P(X = 2) = k and P(X = 4) = 0.16.`, prompt: (n) => `Find k, E(X) and Var(X). A game pays $3X and costs $${4 + (n % 3)} to play. Determine whether the game is fair and justify your conclusion.`, answer: () => `Use total probability to find k, compute Σxp and Σx²p − μ², then compare expected payout with the entry cost.`, points: () => ["normalizes probabilities", "correct expectation", "correct variance", "fairness decision from expected net value"], errors };
  if (!ai && unit === 5) return { context: (n) => `A particle has velocity v(t) = 3t² − ${2 * n + 6}t + ${n + 4} for 0 ≤ t ≤ ${n + 4}.`, prompt: () => `Find the times when the particle changes direction and determine its total distance travelled over the interval.`, answer: () => `Solve v(t)=0 in the interval, integrate velocity piecewise and sum absolute displacements.`, points: () => ["solves v(t)=0", "identifies sign changes", "integrates over correct subintervals", "sums absolute displacements with units"], errors };
  if (ai && unit === 1) return { context: (n) => `A student deposits $${1200 + n * 80} at the end of each year into an account paying ${3.2 + n * .1}% annual interest, compounded yearly.`, prompt: (n) => `Use technology to find the value after ${8 + n} deposits. Determine the first year the balance exceeds $20 000 and interpret the timing of the final deposit.`, answer: () => `Use an annuity model with end-of-period payments, solve the threshold numerically and interpret the integer year in context.`, points: () => ["correct financial model and payment timing", "accurate technology result", "threshold year", "contextual interpretation"], errors };
  if (ai && unit === 2) return { context: (n) => `The monthly users y (thousands) of a service are modelled by y = ${20 + n}/(1 + ${5 + n}e⁻⁰·³ᵗ), where t is months after launch.`, prompt: (n) => `Use technology to find when y first exceeds 80% of its limiting value. Interpret the parameter ${20 + n} and comment on the model outside the observed 18 months.`, answer: () => `Identify the horizontal limit, solve the inequality/equation numerically, interpret carrying capacity and flag extrapolation uncertainty.`, points: () => ["correct limiting value", "sets 80% target", "numerical time", "parameter and extrapolation interpretation"], errors };
  if (ai && unit === 3) return { context: (n) => `Three emergency sites are A(1, 2), B(${7 + n}, 3) and C(4, ${8 + n}). A proposed clinic is at P(4, 4).`, prompt: () => `Construct the perpendicular-bisector conditions for the Voronoi cells, determine which site serves P, and explain whether moving P one unit north changes the assignment.`, answer: () => `Compare squared distances, identify the nearest site, repeat for the shifted point and relate equality boundaries to perpendicular bisectors.`, points: () => ["valid distance or bisector method", "correct original cell", "correct shifted comparison", "geometric interpretation"], errors };
  if (ai && unit === 4) return { context: (n) => `For 12 weeks, advertising spend x and enquiries y give r = ${(.78 + n * .01).toFixed(2)} and regression y = ${6 + n} + ${2.1 + n * .05}x. One week has x = 10 and y = ${29 + n}.`, prompt: () => `Use the model to calculate the residual for that week, interpret the gradient, and assess whether predicting at x = 35 is reliable.`, answer: (n) => `Predicted y = ${6 + n} + (${2.1 + n * .05})(10); residual = observed − predicted. Interpret enquiries per spend unit and reject/qualify extrapolation beyond the data range.`, points: () => ["correct prediction", "signed residual", "gradient in context", "extrapolation judgement"], errors };
  return { context: (n) => `The rate of water use is modelled by R(t) = ${8 + n} + ${3 + n / 2}sin(πt/12) litres per minute for 0 ≤ t ≤ 24.`, prompt: () => `Use technology to determine the maximum rate and the total volume used. State the units of each answer and one limitation of extending the model to a second day.`, answer: () => `Find the numerical maximum on the domain and integrate R over 0–24. Rate uses L min⁻¹; accumulation uses L. A repeated day assumes unchanged behaviour.`, points: () => ["correct maximum", "correct definite integral", "both units", "valid model limitation"], errors };
};

function mathQuestion(subject: Subject, level: Level, paper: Paper, topic: DetailedTopic, variant: number): Question {
  const ai = subject.id === "math-ai";
  const d = ((variant + topic.code.charCodeAt(0)) % 5 + 1) as 1 | 2 | 3 | 4 | 5;
  const n = 2 + (variant % 7);
  if (paper.id === "concept") {
    const correct = `${topic.concepts[0]} must be connected to ${topic.concepts[1]} and the stated conditions.`;
    const options = rotate([correct, `${topic.concepts[0]} is enough without working or interpretation.`, `A decimal answer proves the method is valid.`, `The domain and assumptions never affect the conclusion.`], variant % 4);
    return { id: `${subject.id}-${level}-concept-${topic.code}-v${variant}`, topicCode: topic.code, topicTitle: topic.title, context: `A student's conclusion about ${topic.title} contains one missing justification.`, prompt: `Which statement repairs the conceptual gap most precisely?`, responseType: "mcq", choices: options, correctIndex: options.indexOf(correct), modelAnswer: correct, keywords: topic.concepts, marks: 1, skill: "Conceptual connection", difficulty: difficulty(d), commandTerm: "Identify", syllabusPath: topic.path, syllabusProfile: topic.profile, difficultyLevel: d, estimatedMinutes: 2, section: "Adaptive concept check", markschemePoints: [correct], commonErrors: ["method omitted", "assumption ignored", "technology output not interpreted"], format: "concept-mcq", variant };
  }
  const task = mathTask(topic, ai, paper);
  const paper3 = paper.id === "p3";
  const technology = ai ? "Technology is required." : paper.id === "p1" ? "Technology is not permitted." : "Technology is allowed.";
  const prompt = paper3 ? `${task.prompt(n)} Then vary one parameter, formulate a conjecture about the resulting behaviour, test it with at least three cases and justify the conjecture.` : task.prompt(n);
  return {
    id: `${subject.id}-${level}-${paper.id}-${topic.code}-v${variant}`, topicCode: topic.code, topicTitle: topic.title, context: `${technology}\n\n${task.context(n)}`, prompt,
    responseType: paper3 ? "extended" : "short", modelAnswer: `${task.answer(n)}${paper3 ? " A complete Paper 3 response records cases, states a general conjecture and supplies a valid justification or limitation." : ""}`,
    keywords: topic.concepts, marks: paper3 ? 12 : paper.id === "p2" ? 8 : 6, skill: paper3 ? "Extended problem solving" : ai ? "Modelling and interpretation" : "Mathematical reasoning",
    difficulty: difficulty(d), commandTerm: paper3 ? "Investigate" : "Determine", syllabusPath: topic.path, syllabusProfile: topic.profile, difficultyLevel: d, estimatedMinutes: paper3 ? 22 : paper.id === "p2" ? 12 : 8,
    section: `${subject.shortName} ${level} ${paper.name} · ${technology}`, markschemePoints: task.points(n), commonErrors: task.errors, format: "paper", variant,
  };
}

export function buildLanguageMathQuestionPool(subject: Subject, level: Level, paper: Paper, topics: Topic[], premium: boolean, seed: number, excludeIds: string[]): Question[] | null {
  const kind = languageKind(subject.id);
  if (!kind && subject.id !== "math" && subject.id !== "math-ai") return null;
  const excluded = new Set(excludeIds);
  const questions: Question[] = [];
  const variants = premium ? 24 : 18;
  for (let variant = 0; variant < variants; variant += 1) {
    for (const rawTopic of topics) {
      const topic = rawTopic as DetailedTopic;
      const question = kind ? languageQuestion(subject, level, paper, topic, variant) : mathQuestion(subject, level, paper, topic, variant);
      if (!excluded.has(question.id)) questions.push(question);
    }
  }
  const fresh = shuffled(questions, seed);
  return fresh.length ? fresh : shuffled(questions, seed + 7919);
}
