/**
 * Chronicle's string table.
 *
 * Flat keys rather than nested objects so a missing translation is a compile
 * error, not a silent `undefined` deep in an object path — `Dict` is derived
 * from the English table, so `hi` must supply every key.
 *
 * Hindi copy is written to be read, not transliterated: product nouns that
 * students actually say in English (resume, project, internship) stay in
 * English rather than being forced into Sanskritised Hindi nobody uses.
 */

export const en = {
  // -- navigation ----------------------------------------------------------
  "nav.how": "How it works",
  "nav.what": "What it does",
  "nav.retrieval": "Retrieval",
  "nav.dashboard": "Dashboard",
  "nav.open": "Open Chronicle",
  "nav.search": "Search",
  "nav.overview": "Overview",
  "nav.timeline": "Timeline",
  "nav.graph": "Graph",
  "nav.add": "Add",
  "nav.settings": "Settings",
  "nav.telegram": "Telegram",
  "nav.signOut": "Sign out",
  "nav.signedIn": "Signed in",
  "nav.back": "Back",

  // -- landing: hero -------------------------------------------------------
  "hero.title1": "Your whole journey,",
  "hero.title2": "instantly findable",
  "hero.sub":
    "Every certificate, project and letter you collect — read, understood, and connected into one graph you can ask questions of.",
  "hero.tagline": "Understands · Organises · Connects · Retrieves",
  "hero.cta": "Start your Chronicle",
  "hero.demo": "Open my Chronicle",
  "hero.telegram": "Chat on Telegram",
  "hero.reads": "Reads PDFs & scans",
  "hero.langs": "English & Hindi",
  "panel.cert": "Certifications",
  "panel.date": "Mar 2023",
  "panel.title": "Python for Everybody",
  "panel.org": "University of Michigan · Coursera",
  "panel.file": "certificate_final_v2.pdf",
  "panel.rec1": "Placement Dashboard",
  "panel.rec2": "ML Intern · Wooble",
  "panel.reads": "Gemini reads it",
  "panel.filed": "96% average · filed automatically",
  "panel.found": "3 connections found",
  "panel.appliedIn": "applied in",
  "panel.ledTo": "led to",
  "panel.proves": "proves",

  // -- landing: problem ----------------------------------------------------
  "problem.eyebrow": "FOR STUDENTS",
  "problem.title1": "Storage remembers files.",
  "problem.title2": "It doesn't remember",
  "problem.title3": "you",
  "problem.body":
    "A drive can hold a certificate for three years and still not know it's the reason you got the internship. Chronicle models the journey, not the directory — so a filename stops being the only thing your history knows about itself.",

  // -- landing: modules ----------------------------------------------------
  "modules.title1": "Six things,",
  "modules.title2": "one system",
  "mod.ingest.t": "Ingest anything",
  "mod.ingest.b":
    "PDFs, photos of certificates, transcripts, DOCX, and portfolio links. Scans are read natively — there is no OCR step to configure.",
  "mod.cat.t": "Categorise itself",
  "mod.cat.b":
    "Every upload lands in Projects, Skills, Certifications, Internships, Achievements or Academics. You never file anything by hand.",
  "mod.connect.t": "Connect the dots",
  "mod.connect.b":
    "A certification proves a skill; a skill is applied in a project; a project leads to an internship. The graph assembles itself.",
  "mod.ask.t": "Ask in plain English",
  "mod.ask.b":
    "“Show my AI projects.” “My latest resume.” Vector retrieval over embeddings, not filename matching.",
  "mod.orig.t": "Originals, untouched",
  "mod.orig.b":
    "Every source file is preserved byte-for-byte and downloadable in its original format, forever.",
  "mod.identity.t": "One shareable identity",
  "mod.identity.b":
    "A timeline and a knowledge graph that explain not just what you did, but how each thing led to the next.",

  // -- landing: how it works ----------------------------------------------
  "how.title": "How Chronicle works",
  "how.sub": "No folders. No tagging. Drop a file in and it files itself.",
  "how.1.t": "Drop in a document",
  "how.1.b":
    "A certificate, a project report, an internship letter, or a portfolio link. PDFs and photos go straight to Gemini as bytes.",
  "how.2.t": "Gemini reads it",
  "how.2.b":
    "Structured extraction returns the title, issuer, dates, canonical skills and measurable outcomes — never invented, only what the document supports.",
  "how.3.t": "It joins the graph",
  "how.3.b":
    "Shared skills and issuers create provable edges. Semantic neighbours are labelled with a real relationship: proves, applies, led to.",
  "how.4.t": "Ask for it back",
  "how.4.b":
    "Your question becomes filters plus a vector search over pgvector, answered in a sentence with the originals attached.",

  // -- landing: retrieval + closer ----------------------------------------
  "ret.eyebrow": "INSTANT RETRIEVAL",
  "ret.title1": "Ask the way you'd ask",
  "ret.title2": "a friend",
  "ret.body":
    "Your question is parsed into filters, ranked by an HNSW vector index in Postgres, boosted by exact matches, and answered in a sentence — with every original one click away.",
  "ret.cta": "Try it in search",
  "ret.query": "everything that proves I know machine learning",
  "ret.answer":
    "Three records establish it: the DeepLearning.AI specialization certifies the theory, the hackathon win applies it in the field, and the Wooble internship shipped it to production.",
  "closer.title1": "I never have to search through folders",
  "closer.title2": "again",
  "closer.body":
    "Add it once. Ask for any of it in plain English, forever after.",

  // -- footer --------------------------------------------------------------
  "footer.title1": "Your journey,",
  "footer.title2": "made searchable.",
  "footer.about":
    "An AI digital identity system that understands a student's growth, achievements, skills and experiences — and makes every one of them instantly retrievable.",
  "footer.product": "Product",
  "footer.modules": "Modules",
  "footer.knowledge": "Knowledge graph",
  "footer.ingestion": "Ingestion",
  "footer.categorisation": "Categorisation",
  "footer.relationships": "Relationship engine",
  "footer.rights": "© 2026 Chronicle · Originals preserved, never rewritten",

  // -- auth ----------------------------------------------------------------
  "login.title": "Sign in to Chronicle",
  "login.body":
    "Your records are private to your account. Nobody else can see or download them.",
  "login.google": "Continue with Google",
  "login.note":
    "Chronicle stores the documents you upload so it can hand them back. Sign out any time; deleting a record deletes its original file too.",

  // -- dashboard -----------------------------------------------------------
  "fit.eyebrow": "Opportunity fit",
  "fit.title": "Paste a job posting. See what you can already prove.",
  "fit.sub":
    "Chronicle checks the posting against your own records, cites the ones that satisfy each requirement, and names what is genuinely missing.",
  "fit.placeholder":
    "Paste the full job or internship description here…",
  "fit.cta": "Check my fit",
  "fit.working": "Reading the posting…",
  "fit.alsoResume": "Also draft a tailored résumé",
  "fit.upload": "Upload posting",
  "fit.notStored": "read once, never stored",
  "fit.requirementsMet": "requirements backed by your records",
  "fit.must": "must-have",
  "fit.closeGaps": "To close the gaps",
  "fit.resumeTitle": "Résumé, tailored to this role",
  "fit.resumeNote":
    "Written only from records you actually hold — reordered and re-emphasised for this posting, never invented.",
  "fit.grounded":
    "Every tick is backed by a record you can open. Nothing here is inferred from a CV Chronicle has not read.",
  "nav.fit": "Fit",
  "dash.eyebrow": "Overview",
  "dash.records": "records",
  "dash.connections": "connections",
  "dash.addRecords": "Add records",
  "dash.distribution": "Distribution",
  "dash.skills": "Skills detected",
  "dash.viewGraph": "View graph",
  "dash.all": "All",
  "dash.emptyTitle": "Your Chronicle is empty.",
  "dash.emptyBody":
    "Add a certificate, a project report, or an internship letter, and it will organise, categorise, and connect itself.",
  "dash.addFirst": "Add your first record",

  // -- timeline / graph ----------------------------------------------------
  "time.eyebrow": "Digital journey",
  "time.title": "How you got here, year by year.",
  "time.sub": "Assembled from the dates inside your own documents.",
  "time.empty": "Nothing on the timeline yet.",
  "time.addRecord": "Add a record",
  "graph.eyebrow": "Knowledge graph",
  "graph.sub":
    "Click a node to trace what it connects to. Size reflects how central a record is to your journey.",
  "graph.empty": "No records to map yet.",
  "graph.addFew": "Add a few",
  "graph.select": "Select a node to see what it connects to.",
  "graph.hint":
    "Edges come from two places: shared skills and issuers, which are provable, and semantic neighbours that Gemini labelled with a relationship.",
  "graph.open": "Open record",
  "graph.connection": "connection",
  "graph.connectionsN": "connections",

  // -- search --------------------------------------------------------------
  "search.eyebrow": "Retrieval",
  "search.title": "Ask for anything you've ever done.",
  "search.placeholder":
    "show me everything that proves I know machine learning",
  "search.understood": "Understood as",
  "search.none": "Nothing matched that query.",
  "search.matched": "matched on",
  "search.ex1": "Show all my certificates",
  "search.ex2": "Show my AI projects",
  "search.ex3": "Show internship documents",
  "search.ex4": "Show my latest resume",
  "search.ex5": "What proves I know Python?",
  "search.ex6": "Everything from 2024",

  // -- upload --------------------------------------------------------------
  "up.eyebrow": "Add to Chronicle",
  "up.title": "Drop it in. It files itself.",
  "up.sub":
    "Certificates, résumés, project reports, internship letters, transcripts, portfolio links. PDFs and photos of certificates are read directly — no OCR setup needed.",
  "up.drop": "Drop files here, or click to browse",
  "up.formats": "PDF, PNG, JPG, DOCX, TXT, MD · max",
  "up.url": "…or paste a portfolio, GitHub, or LinkedIn URL",
  "up.add": "Add",
  "up.processed": "processed",
  "up.goOverview": "Go to overview",
  "up.duplicate": "Looks like a duplicate of",
  "up.reading": "Reading, categorising, and connecting…",
  "up.found": "found",
  "up.connectionsFound": "connections found",

  // -- record --------------------------------------------------------------
  "rec.original": "Original, preserved",
  "rec.open": "Open",
  "rec.download": "Download",
  "rec.visit": "Visit",
  "rec.skills": "Skills",
  "rec.highlights": "Highlights",
  "rec.connectedTo": "Connected to",
  "rec.otherRecords": "other records",
  "rec.otherRecord": "other record",
  "rec.source": "Source text read by the model",
  "rec.delete": "Delete record",
  "rec.deleteConfirm":
    "Delete this record and its original file? This can't be undone.",
  "rec.gone": "That record no longer exists.",
  "rec.backOverview": "Back to overview",
  "rec.approx": "(approx.)",

  // -- settings ------------------------------------------------------------
  "explore.eyebrow": "Explore",
  "explore.title": "Discover other journeys.",
  "explore.sub": "Public profiles from people who chose to be listed. Search by name or skill.",
  "explore.search": "Search by name or skill…",
  "explore.records": "records",
  "explore.empty": "No one is listed yet. Publish your profile and opt in to be the first.",
  "explore.noMatch": "No profiles match that.",
  "profile.listTitle": "List me in Explore",
  "profile.listSub": "Appear in the public directory at /explore, searchable by name and skill. Separate from your shareable link — off by default.",
  "nav.explore": "Explore",
  "profile.title": "Public profile",
  "profile.sub":
    "Share your journey as one link — timeline, skills and connections. Your original files are never included.",
  "profile.handle": "Your link",
  "profile.headline": "Headline",
  "profile.headlinePlaceholder": "Final-year CS student · applied ML and search",
  "profile.save": "Save",
  "profile.publish": "Publish profile",
  "profile.makePrivate": "Make private",
  "profile.copyLink": "Copy link",
  "profile.view": "View",
  "profile.needHandle": "Pick a link first",
  "profile.privacy":
    "A public profile shows record titles, categories, dates, skills and connections. It never exposes your uploaded files or their contents. Hide any single record from the record page.",
  "profile.hidden": "Hidden from profile",
  "profile.hide": "Hide from public profile",
  "profile.show": "Show on public profile",
  "set.eyebrow": "Settings",
  "set.title": "Connect Telegram",
  "set.sub":
    "Ask for any record from your phone and get the original file back as a download — without opening Chronicle.",
  "set.connected": "Telegram connected",
  "set.connectedSub":
    "Message the bot and ask for anything in your Chronicle.",
  "set.disconnect": "Disconnect",
  "set.step1a": "Open",
  "set.step1b": "the Chronicle bot",
  "set.step1c": "in Telegram and press Start.",
  "set.step2":
    "Generate a code and send it to the bot as a message. It expires in 15 minutes and works once.",
  "set.generate": "Generate linking code",
  "set.copy": "Copy",
  "set.copied": "Copied",
  "set.sent": "I've sent it",
  "set.howTitle": "How it works once connected",
  "set.how1": "Message the bot in plain English — “show my certificates”, “my latest resume”, “what proves I know Python?”",
  "set.how2": "It searches your Chronicle and replies with a one-line answer plus what matched.",
  "set.how3": "The best match's original file arrives as a download. Tap a button for any of the others.",
  "set.how4": "Hindi works too — ask in Hindi and it answers in Hindi, even for English documents.",
  "set.stepsTitle": "Connect in three steps",
  "set.warning":
    "A linked chat can read and download everything in your Chronicle, so only link a chat you control. Disconnecting revokes access immediately.",
  "set.noBot": "No bot is configured on this server.",
  "set.activate": "The bot is not activated yet",
  "set.activateBody":
    "Telegram does not know where to deliver messages for this bot, so it will not reply to anything. Activating registers this deployment as its webhook.",
  "set.activateCta": "Activate bot",
  "set.pending": "messages are queued and will arrive once activated",
  "set.language": "Language",
  "set.languageSub": "Applies across the app, and to what the assistant speaks.",

  // -- categories ----------------------------------------------------------
  "cat.Projects": "Projects",
  "cat.Skills": "Skills",
  "cat.Certifications": "Certifications",
  "cat.Internships": "Internships",
  "cat.Achievements": "Achievements",
  "cat.Academics": "Academics",
  "cat.Other": "Other",

  // -- shared --------------------------------------------------------------
  "common.undated": "Undated",
  "common.loading": "Loading…",
  "common.signIn": "Sign in",
} as const;

export type DictKey = keyof typeof en;
export type Dict = Record<DictKey, string>;

export const hi: Dict = {
  "nav.how": "यह कैसे काम करता है",
  "nav.what": "यह क्या करता है",
  "nav.retrieval": "खोज",
  "nav.dashboard": "डैशबोर्ड",
  "nav.open": "Chronicle खोलें",
  "nav.search": "खोजें",
  "nav.overview": "अवलोकन",
  "nav.timeline": "टाइमलाइन",
  "nav.graph": "ग्राफ़",
  "nav.add": "जोड़ें",
  "nav.settings": "सेटिंग्स",
  "nav.telegram": "Telegram",
  "nav.signOut": "साइन आउट",
  "nav.signedIn": "साइन इन किया हुआ",
  "nav.back": "वापस",

  "hero.title1": "आपकी पूरी यात्रा,",
  "hero.title2": "पल भर में हाज़िर",
  "hero.sub":
    "आपका हर प्रमाणपत्र, प्रोजेक्ट और पत्र — पढ़ा गया, समझा गया, और एक ऐसे ग्राफ़ में जुड़ा हुआ जिससे आप सवाल पूछ सकते हैं।",
  "hero.tagline": "समझता है · व्यवस्थित करता है · जोड़ता है · ढूँढता है",
  "hero.cta": "Chronicle शुरू करें",
  "hero.demo": "मेरा Chronicle खोलें",
  "hero.telegram": "Telegram पर बात करें",
  "hero.reads": "PDF और स्कैन पढ़ता है",
  "hero.langs": "अंग्रेज़ी और हिंदी",
  "panel.cert": "प्रमाणपत्र",
  "panel.date": "मार्च 2023",
  "panel.title": "Python for Everybody",
  "panel.org": "University of Michigan · Coursera",
  "panel.file": "certificate_final_v2.pdf",
  "panel.rec1": "Placement Dashboard",
  "panel.rec2": "ML Intern · Wooble",
  "panel.reads": "Gemini इसे पढ़ता है",
  "panel.filed": "96% औसत · अपने आप दर्ज",
  "panel.found": "3 कड़ियाँ मिलीं",
  "panel.appliedIn": "इसमें लगा",
  "panel.ledTo": "आगे ले गया",
  "panel.proves": "साबित करता है",

  "problem.eyebrow": "छात्रों के लिए",
  "problem.title1": "स्टोरेज को फ़ाइलें याद रहती हैं।",
  "problem.title2": "उसे याद नहीं रहते",
  "problem.title3": "आप",
  "problem.body":
    "एक ड्राइव तीन साल तक प्रमाणपत्र रख सकती है, फिर भी उसे नहीं पता कि वही आपकी इंटर्नशिप की वजह था। Chronicle फ़ोल्डर नहीं, आपकी यात्रा को समझता है — ताकि फ़ाइल का नाम ही आपके इतिहास की एकमात्र पहचान न रह जाए।",

  "modules.title1": "छह काम,",
  "modules.title2": "एक सिस्टम",
  "mod.ingest.t": "कुछ भी अपलोड करें",
  "mod.ingest.b":
    "PDF, प्रमाणपत्रों की तस्वीरें, अंकपत्र, DOCX और पोर्टफोलियो लिंक। स्कैन सीधे पढ़े जाते हैं — कोई OCR सेटअप नहीं।",
  "mod.cat.t": "खुद वर्गीकृत होता है",
  "mod.cat.b":
    "हर अपलोड Projects, Skills, Certifications, Internships, Achievements या Academics में चला जाता है। आपको कुछ भी हाथ से छाँटना नहीं पड़ता।",
  "mod.connect.t": "कड़ियाँ जोड़ता है",
  "mod.connect.b":
    "एक प्रमाणपत्र किसी स्किल को साबित करता है; वह स्किल किसी प्रोजेक्ट में लगती है; वह प्रोजेक्ट इंटर्नशिप तक ले जाता है। ग्राफ़ खुद बनता है।",
  "mod.ask.t": "आम भाषा में पूछें",
  "mod.ask.b":
    "“मेरे AI प्रोजेक्ट दिखाओ।” “मेरा नवीनतम resume।” फ़ाइल के नाम से नहीं, अर्थ के आधार पर खोज।",
  "mod.orig.t": "मूल फ़ाइलें, ज्यों की त्यों",
  "mod.orig.b":
    "हर फ़ाइल बिल्कुल वैसी ही सुरक्षित रहती है और अपने मूल रूप में हमेशा डाउनलोड की जा सकती है।",
  "mod.identity.t": "एक साझा करने योग्य पहचान",
  "mod.identity.b":
    "एक टाइमलाइन और ज्ञान-ग्राफ़ जो बताते हैं कि आपने क्या किया — और एक चीज़ दूसरी तक कैसे पहुँची।",

  "how.title": "Chronicle कैसे काम करता है",
  "how.sub":
    "कोई फ़ोल्डर नहीं। कोई टैगिंग नहीं। फ़ाइल डालिए, वह खुद अपनी जगह ढूँढ लेगी।",
  "how.1.t": "दस्तावेज़ डालें",
  "how.1.b":
    "प्रमाणपत्र, प्रोजेक्ट रिपोर्ट, इंटर्नशिप पत्र या पोर्टफोलियो लिंक। PDF और तस्वीरें सीधे Gemini तक जाती हैं।",
  "how.2.t": "Gemini उसे पढ़ता है",
  "how.2.b":
    "शीर्षक, जारीकर्ता, तारीख़ें, स्किल और ठोस परिणाम निकाले जाते हैं — कुछ भी गढ़ा नहीं जाता, केवल वही जो दस्तावेज़ में है।",
  "how.3.t": "वह ग्राफ़ से जुड़ता है",
  "how.3.b":
    "साझा स्किल और संस्थान पक्की कड़ियाँ बनाते हैं। अर्थ में पास के रिकॉर्ड को Gemini असली रिश्ता देता है: साबित करता है, इस्तेमाल हुआ, आगे ले गया।",
  "how.4.t": "जब चाहें, माँग लें",
  "how.4.b":
    "आपका सवाल फ़िल्टर और pgvector पर वेक्टर खोज बनता है, और एक वाक्य में जवाब मिलता है — मूल फ़ाइल के साथ।",

  "ret.eyebrow": "तुरंत खोज",
  "ret.title1": "ऐसे पूछिए जैसे",
  "ret.title2": "किसी दोस्त से",
  "ret.body":
    "आपका सवाल फ़िल्टर में बदलता है, Postgres के HNSW वेक्टर इंडेक्स से क्रम पाता है, सटीक मिलान से ऊपर आता है — और एक वाक्य में जवाब मिलता है, हर मूल फ़ाइल एक क्लिक दूर।",
  "ret.cta": "खोज में आज़माएँ",
  "ret.query": "वह सब जो साबित करे कि मुझे machine learning आती है",
  "ret.answer":
    "तीन रिकॉर्ड इसे साबित करते हैं: DeepLearning.AI का specialization सिद्धांत प्रमाणित करता है, हैकाथॉन की जीत उसे मैदान में लागू करती है, और Wooble की इंटर्नशिप उसे production तक ले जाती है।",
  "closer.title1": "अब मुझे फ़ोल्डरों में कभी नहीं ढूँढना पड़ेगा",
  "closer.title2": "दोबारा",
  "closer.body":
    "एक बार जोड़ दीजिए। उसके बाद हमेशा आम भाषा में माँग लीजिए।",

  "footer.title1": "आपकी यात्रा,",
  "footer.title2": "अब खोजी जा सकती है।",
  "footer.about":
    "एक AI डिजिटल पहचान प्रणाली जो एक छात्र की प्रगति, उपलब्धियों, स्किल और अनुभवों को समझती है — और हर एक को तुरंत सामने ले आती है।",
  "footer.product": "प्रोडक्ट",
  "footer.modules": "मॉड्यूल",
  "footer.knowledge": "ज्ञान-ग्राफ़",
  "footer.ingestion": "अपलोड",
  "footer.categorisation": "वर्गीकरण",
  "footer.relationships": "रिश्ता इंजन",
  "footer.rights": "© 2026 Chronicle · मूल फ़ाइलें सुरक्षित, कभी बदली नहीं गईं",

  "login.title": "Chronicle में साइन इन करें",
  "login.body":
    "आपके रिकॉर्ड सिर्फ़ आपके खाते तक सीमित हैं। कोई और उन्हें न देख सकता है, न डाउनलोड कर सकता है।",
  "login.google": "Google से जारी रखें",
  "login.note":
    "Chronicle आपके अपलोड किए दस्तावेज़ इसलिए रखता है ताकि उन्हें लौटा सके। कभी भी साइन आउट करें; रिकॉर्ड मिटाने पर उसकी मूल फ़ाइल भी मिट जाती है।",

  "fit.eyebrow": "अवसर से मेल",
  "fit.title": "कोई job posting चिपकाइए। देखिए आप क्या साबित कर सकते हैं।",
  "fit.sub":
    "Chronicle उस posting को आपके अपने रिकॉर्ड से जाँचता है, हर शर्त के लिए सबूत देता है, और बताता है कि असल में क्या कमी है।",
  "fit.placeholder": "पूरा job या internship विवरण यहाँ चिपकाएँ…",
  "fit.cta": "मेरा मेल जाँचें",
  "fit.working": "posting पढ़ी जा रही है…",
  "fit.alsoResume": "इस role के लिए résumé भी बनाएँ",
  "fit.upload": "posting अपलोड करें",
  "fit.notStored": "एक बार पढ़ा गया, कहीं सहेजा नहीं गया",
  "fit.requirementsMet": "शर्तें आपके रिकॉर्ड से सिद्ध",
  "fit.must": "अनिवार्य",
  "fit.closeGaps": "कमी पूरी करने के लिए",
  "fit.resumeTitle": "इस role के अनुसार résumé",
  "fit.resumeNote":
    "केवल आपके मौजूद रिकॉर्ड से लिखा गया — इस posting के हिसाब से क्रम और ज़ोर बदला गया है, कुछ गढ़ा नहीं गया।",
  "fit.grounded":
    "हर सही का निशान किसी असली रिकॉर्ड पर टिका है जिसे आप खोल सकते हैं। कुछ भी अनुमान से नहीं कहा गया।",
  "nav.fit": "मेल",
  "dash.eyebrow": "अवलोकन",
  "dash.records": "रिकॉर्ड",
  "dash.connections": "कड़ियाँ",
  "dash.addRecords": "रिकॉर्ड जोड़ें",
  "dash.distribution": "वितरण",
  "dash.skills": "पहचानी गई स्किल",
  "dash.viewGraph": "ग्राफ़ देखें",
  "dash.all": "सभी",
  "dash.emptyTitle": "आपका Chronicle अभी खाली है।",
  "dash.emptyBody":
    "कोई प्रमाणपत्र, प्रोजेक्ट रिपोर्ट या इंटर्नशिप पत्र जोड़ें — वह खुद व्यवस्थित और वर्गीकृत हो जाएगा।",
  "dash.addFirst": "अपना पहला रिकॉर्ड जोड़ें",

  "time.eyebrow": "डिजिटल यात्रा",
  "time.title": "आप यहाँ तक कैसे पहुँचे, साल दर साल।",
  "time.sub": "आपके अपने दस्तावेज़ों की तारीख़ों से बनाया गया।",
  "time.empty": "टाइमलाइन पर अभी कुछ नहीं है।",
  "time.addRecord": "रिकॉर्ड जोड़ें",
  "graph.eyebrow": "ज्ञान-ग्राफ़",
  "graph.sub":
    "किसी नोड पर क्लिक करके देखें वह किससे जुड़ा है। आकार बताता है कि रिकॉर्ड आपकी यात्रा में कितना केंद्रीय है।",
  "graph.empty": "अभी मैप करने के लिए कोई रिकॉर्ड नहीं।",
  "graph.addFew": "कुछ जोड़ें",
  "graph.select": "किसी नोड को चुनें और देखें वह किससे जुड़ा है।",
  "graph.hint":
    "कड़ियाँ दो जगह से आती हैं: साझा स्किल और संस्थान, जो पक्के हैं; और अर्थ में पास के रिकॉर्ड, जिन्हें Gemini ने रिश्ता दिया।",
  "graph.open": "रिकॉर्ड खोलें",
  "graph.connection": "कड़ी",
  "graph.connectionsN": "कड़ियाँ",

  "search.eyebrow": "खोज",
  "search.title": "जो कुछ भी आपने किया है, पूछ लीजिए।",
  "search.placeholder": "वह सब दिखाओ जो साबित करे कि मुझे machine learning आती है",
  "search.understood": "ऐसे समझा गया",
  "search.none": "इससे कुछ मेल नहीं खाया।",
  "search.matched": "मिलान",
  "search.ex1": "मेरे सारे प्रमाणपत्र दिखाओ",
  "search.ex2": "मेरे AI प्रोजेक्ट दिखाओ",
  "search.ex3": "इंटर्नशिप के दस्तावेज़ दिखाओ",
  "search.ex4": "मेरा नवीनतम resume दिखाओ",
  "search.ex5": "क्या साबित करता है कि मुझे Python आती है?",
  "search.ex6": "2024 का सब कुछ",

  "up.eyebrow": "Chronicle में जोड़ें",
  "up.title": "डाल दीजिए। बाकी यह खुद कर लेगा।",
  "up.sub":
    "प्रमाणपत्र, resume, प्रोजेक्ट रिपोर्ट, इंटर्नशिप पत्र, अंकपत्र, पोर्टफोलियो लिंक। PDF और प्रमाणपत्रों की तस्वीरें सीधे पढ़ी जाती हैं — कोई OCR सेटअप नहीं।",
  "up.drop": "फ़ाइलें यहाँ छोड़ें, या क्लिक करके चुनें",
  "up.formats": "PDF, PNG, JPG, DOCX, TXT, MD · अधिकतम",
  "up.url": "…या कोई पोर्टफोलियो, GitHub या LinkedIn लिंक चिपकाएँ",
  "up.add": "जोड़ें",
  "up.processed": "पूरे हुए",
  "up.goOverview": "अवलोकन पर जाएँ",
  "up.duplicate": "Looks like a duplicate of",
  "up.reading": "पढ़ा जा रहा है, वर्गीकृत और जोड़ा जा रहा है…",
  "up.found": "मिले",
  "up.connectionsFound": "कड़ियाँ मिलीं",

  "rec.original": "मूल फ़ाइल, सुरक्षित",
  "rec.open": "खोलें",
  "rec.download": "डाउनलोड",
  "rec.visit": "देखें",
  "rec.skills": "स्किल",
  "rec.highlights": "मुख्य बातें",
  "rec.connectedTo": "जुड़ा हुआ है",
  "rec.otherRecords": "अन्य रिकॉर्ड से",
  "rec.otherRecord": "अन्य रिकॉर्ड से",
  "rec.source": "मॉडल ने जो टेक्स्ट पढ़ा",
  "rec.delete": "रिकॉर्ड मिटाएँ",
  "rec.deleteConfirm":
    "यह रिकॉर्ड और इसकी मूल फ़ाइल मिटाएँ? यह वापस नहीं आएगा।",
  "rec.gone": "यह रिकॉर्ड अब मौजूद नहीं है।",
  "rec.backOverview": "अवलोकन पर वापस",
  "rec.approx": "(लगभग)",

  "explore.eyebrow": "खोजें",
  "explore.title": "दूसरों की यात्राएँ देखें।",
  "explore.sub": "उन लोगों की सार्वजनिक प्रोफ़ाइलें जिन्होंने सूचीबद्ध होना चुना। नाम या स्किल से खोजें।",
  "explore.search": "नाम या स्किल से खोजें…",
  "explore.records": "रिकॉर्ड",
  "explore.empty": "अभी कोई सूचीबद्ध नहीं है। अपनी प्रोफ़ाइल प्रकाशित करें और पहले बनें।",
  "explore.noMatch": "इससे कोई प्रोफ़ाइल मेल नहीं खाती।",
  "profile.listTitle": "मुझे Explore में सूचीबद्ध करें",
  "profile.listSub": "/explore की सार्वजनिक निर्देशिका में दिखें, नाम और स्किल से खोजने योग्य। आपके साझा लिंक से अलग — डिफ़ॉल्ट रूप से बंद।",
  "nav.explore": "खोजें",
  "profile.title": "सार्वजनिक प्रोफ़ाइल",
  "profile.sub":
    "अपनी यात्रा एक लिंक में साझा करें — टाइमलाइन, स्किल और कड़ियाँ। आपकी मूल फ़ाइलें कभी शामिल नहीं होतीं।",
  "profile.handle": "आपका लिंक",
  "profile.headline": "परिचय पंक्ति",
  "profile.headlinePlaceholder": "अंतिम वर्ष CS छात्र · applied ML और search",
  "profile.save": "सहेजें",
  "profile.publish": "प्रोफ़ाइल प्रकाशित करें",
  "profile.makePrivate": "निजी करें",
  "profile.copyLink": "लिंक कॉपी करें",
  "profile.view": "देखें",
  "profile.needHandle": "पहले एक लिंक चुनें",
  "profile.privacy":
    "सार्वजनिक प्रोफ़ाइल में रिकॉर्ड के नाम, श्रेणी, तारीख़, स्किल और कड़ियाँ दिखती हैं। आपकी अपलोड की गई फ़ाइलें या उनका विषय कभी नहीं दिखता। किसी भी रिकॉर्ड को उसके पेज से छिपाया जा सकता है।",
  "profile.hidden": "प्रोफ़ाइल से छिपा है",
  "profile.hide": "सार्वजनिक प्रोफ़ाइल से छिपाएँ",
  "profile.show": "सार्वजनिक प्रोफ़ाइल पर दिखाएँ",
  "set.eyebrow": "सेटिंग्स",
  "set.title": "Telegram जोड़ें",
  "set.sub":
    "फ़ोन से कोई भी रिकॉर्ड माँगिए और मूल फ़ाइल डाउनलोड के रूप में पाइए — Chronicle खोले बिना।",
  "set.connected": "Telegram जुड़ गया",
  "set.connectedSub": "बॉट को संदेश भेजें और अपने Chronicle से कुछ भी माँगें।",
  "set.disconnect": "हटाएँ",
  "set.step1a": "Telegram में",
  "set.step1b": "Chronicle बॉट",
  "set.step1c": "खोलें और Start दबाएँ।",
  "set.step2":
    "कोड बनाएँ और उसे बॉट को संदेश के रूप में भेजें। यह 15 मिनट में समाप्त होता है और एक ही बार चलता है।",
  "set.generate": "जोड़ने का कोड बनाएँ",
  "set.copy": "कॉपी",
  "set.copied": "कॉपी हो गया",
  "set.sent": "भेज दिया",
  "set.howTitle": "जुड़ने के बाद यह कैसे काम करता है",
  "set.how1": "बॉट को आम भाषा में लिखें — “मेरे प्रमाणपत्र दिखाओ”, “मेरा नवीनतम resume”, “क्या साबित करता है कि मुझे Python आती है?”",
  "set.how2": "वह आपका Chronicle खोजकर एक पंक्ति में जवाब देता है, साथ में जो मिला वह भी।",
  "set.how3": "सबसे मिलती-जुलती फ़ाइल डाउनलोड के रूप में आ जाती है। बाकी के लिए बटन दबाएँ।",
  "set.how4": "हिंदी भी चलती है — हिंदी में पूछिए, हिंदी में जवाब मिलेगा, चाहे दस्तावेज़ अंग्रेज़ी में हों।",
  "set.stepsTitle": "तीन चरणों में जोड़ें",
  "set.warning":
    "जुड़ा हुआ चैट आपके Chronicle का सब कुछ पढ़ और डाउनलोड कर सकता है, इसलिए केवल अपना चैट जोड़ें। हटाते ही पहुँच तुरंत बंद हो जाती है।",
  "set.noBot": "इस सर्वर पर कोई बॉट सेट नहीं है।",
  "set.activate": "बॉट अभी चालू नहीं है",
  "set.activateBody":
    "Telegram को नहीं पता कि इस बॉट के संदेश कहाँ भेजने हैं, इसलिए वह किसी बात का जवाब नहीं देगा। चालू करने पर यह deployment उसका webhook बन जाएगा।",
  "set.activateCta": "बॉट चालू करें",
  "set.pending": "संदेश कतार में हैं और चालू होते ही पहुँच जाएँगे",
  "set.language": "भाषा",
  "set.languageSub": "पूरे ऐप पर लागू होती है, और सहायक की बोली पर भी।",

  "cat.Projects": "प्रोजेक्ट",
  "cat.Skills": "स्किल",
  "cat.Certifications": "प्रमाणपत्र",
  "cat.Internships": "इंटर्नशिप",
  "cat.Achievements": "उपलब्धियाँ",
  "cat.Academics": "शैक्षणिक",
  "cat.Other": "अन्य",

  "common.undated": "बिना तारीख़",
  "common.loading": "लोड हो रहा है…",
  "common.signIn": "साइन इन करें",
};

export const dictionaries = { en, hi } as const;
