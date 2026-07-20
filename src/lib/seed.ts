import "server-only";
import { nanoid } from "nanoid";
import { embed } from "./gemini";
import { embeddingText, relateItem } from "./relate";
import {
  addItems,
  listItemsWithEmbeddings,
  relationCandidates,
  replaceRelationsFor,
  reset,
} from "./store";
import type { Extraction, Item } from "./types";

/**
 * A synthetic but internally consistent four-year journey. The point of the
 * seed is that the relationship engine has something real to find: the Python
 * certification genuinely precedes the projects that use Python, and the
 * internship genuinely follows the work that earned it.
 */

const RECORDS: Extraction[] = [
  {
    title: "Python for Everybody — Specialization Certificate",
    summary:
      "Completed the five-course University of Michigan specialization on Coursera, covering Python syntax, data structures, web scraping, databases, and data visualisation. Finished with a 96% average across all graded assessments.",
    category: "Certifications",
    date: "2023-03-14",
    dateConfidence: "exact",
    organization: "University of Michigan (Coursera)",
    skills: ["Python", "SQL", "Data Visualization", "Web Scraping"],
    tags: ["mooc", "coursera", "foundations"],
    people: ["Charles Severance"],
    links: ["https://coursera.org/verify/specialization/PY4E-2023"],
    highlights: ["96% average across 5 courses", "Completed in 11 weeks"],
  },
  {
    title: "B.Tech Computer Science — Semester 4 Marksheet",
    summary:
      "Fourth semester academic record covering Data Structures, Database Management Systems, Operating Systems, and Discrete Mathematics. Semester GPA of 9.1 with a department rank of 7.",
    category: "Academics",
    date: "2023-06-30",
    dateConfidence: "exact",
    organization: "Vellore Institute of Technology",
    skills: ["Data Structures", "SQL", "Operating Systems", "Algorithms"],
    tags: ["transcript", "semester-4"],
    people: [],
    links: [],
    highlights: ["SGPA 9.1 / 10", "Department rank 7 of 240"],
  },
  {
    title: "Campus Placement Analytics Dashboard",
    summary:
      "Built an interactive dashboard analysing eight years of campus placement data for the training and placement cell. Used Python and Pandas for the pipeline and Streamlit for the interface, surfacing branch-wise trends that informed the following year's training plan.",
    category: "Projects",
    date: "2023-11-02",
    dateConfidence: "exact",
    organization: "Vellore Institute of Technology",
    skills: ["Python", "Pandas", "Data Analysis", "Streamlit", "Data Visualization"],
    tags: ["dashboard", "analytics", "college"],
    people: [],
    links: ["https://github.com/example/placement-analytics"],
    highlights: [
      "Analysed 8 years of placement records",
      "Adopted by the campus placement cell",
    ],
  },
  {
    title: "Lead — Data Science Club",
    summary:
      "Elected lead of the campus Data Science Club for the 2024 academic year. Ran a weekly workshop series on Python and machine learning, growing active membership from 40 to 180 students and organising a 24-hour intra-campus datathon.",
    category: "Achievements",
    date: "2024-01-15",
    dateConfidence: "exact",
    organization: "Vellore Institute of Technology",
    skills: ["Leadership", "Machine Learning", "Python", "Public Speaking"],
    tags: ["leadership", "community", "club"],
    people: [],
    links: [],
    highlights: [
      "Membership grew 40 to 180",
      "Organised a 24-hour datathon",
      "Ran 22 weekly workshops",
    ],
  },
  {
    title: "Deep Learning Specialization — DeepLearning.AI",
    summary:
      "Completed the five-course DeepLearning.AI specialization covering neural networks, hyperparameter tuning, convolutional networks, and sequence models. Implemented every assignment in NumPy before moving to TensorFlow.",
    category: "Certifications",
    date: "2024-05-20",
    dateConfidence: "exact",
    organization: "DeepLearning.AI (Coursera)",
    skills: [
      "Deep Learning",
      "Machine Learning",
      "TensorFlow",
      "Neural Networks",
      "Python",
    ],
    tags: ["mooc", "coursera", "ai"],
    people: ["Andrew Ng"],
    links: ["https://coursera.org/verify/specialization/DLS-2024"],
    highlights: ["5 courses", "Graded 98% on the CNN course"],
  },
  {
    title: "Regional Winner — Smart India Hackathon 2024",
    summary:
      "Led a team of six to the regional win at Smart India Hackathon with a computer-vision system that flags crop disease from smartphone photographs. The model reached 91% field accuracy across four crop types.",
    category: "Achievements",
    date: "2024-08-11",
    dateConfidence: "exact",
    organization: "Ministry of Education, Government of India",
    skills: [
      "Deep Learning",
      "Computer Vision",
      "TensorFlow",
      "Python",
      "Leadership",
    ],
    tags: ["hackathon", "competition", "award"],
    people: [],
    links: [],
    highlights: [
      "Regional winner among 180 teams",
      "91% field accuracy",
      "Team of 6, served as lead",
    ],
  },
  {
    title: "Machine Learning Intern — Wooble",
    summary:
      "Six-month internship on the recommendations team. Rebuilt the candidate-generation stage of the product recommender using embedding retrieval, cutting p95 latency from 340ms to 90ms while improving click-through by 12%.",
    category: "Internships",
    date: "2025-01-06",
    dateConfidence: "exact",
    organization: "Wooble",
    skills: [
      "Machine Learning",
      "Python",
      "Vector Search",
      "Embeddings",
      "PostgreSQL",
    ],
    tags: ["internship", "industry", "recsys"],
    people: [],
    links: [],
    highlights: [
      "p95 latency 340ms to 90ms",
      "Click-through up 12%",
      "6-month full-time placement",
    ],
  },
  {
    title: "Semantic Résumé Search Engine",
    summary:
      "A retrieval system that answers plain-English questions over a corpus of résumés using sentence embeddings and a reranking pass. Built after the internship to generalise the retrieval work done there, and open-sourced with 200+ GitHub stars.",
    category: "Projects",
    date: "2025-09-18",
    dateConfidence: "exact",
    organization: null,
    skills: [
      "Embeddings",
      "Vector Search",
      "Natural Language Processing",
      "Python",
      "React",
    ],
    tags: ["open-source", "rag", "search"],
    people: [],
    links: ["https://github.com/example/semantic-resume-search"],
    highlights: ["200+ GitHub stars", "Sub-100ms query latency"],
  },
  {
    title: "Résumé — 2026",
    summary:
      "Current résumé covering the B.Tech in Computer Science, the Wooble internship, hackathon results, and the open-source retrieval work. Targeted at applied machine learning and search engineering roles.",
    category: "Other",
    date: "2026-02-01",
    dateConfidence: "exact",
    organization: null,
    skills: [
      "Machine Learning",
      "Python",
      "Embeddings",
      "React",
      "TypeScript",
      "PostgreSQL",
    ],
    tags: ["resume", "cv", "current"],
    people: [],
    links: [],
    highlights: ["Most recent version", "Targeted at applied ML roles"],
  },
];

export async function seed(userId: string): Promise<number> {
  await reset(userId);

  const vectors = await embed(RECORDS.map(embeddingText));
  const now = Date.now();

  const items: Item[] = RECORDS.map((rec, i) => ({
    ...rec,
    id: nanoid(12),
    fileId: null,
    url: rec.links[0] ?? null,
    text: `${rec.title}\n\n${rec.summary}\n\n${rec.highlights.join("\n")}`,
    embedding: vectors[i],
    // Stagger createdAt so "recently added" ordering matches the narrative.
    createdAt: new Date(now - (RECORDS.length - i) * 60_000).toISOString(),
    hidden: false,
  }));

  await addItems(userId, items);

  // Relate only after the whole batch is in, so every record can see every
  // other one and the graph doesn't depend on insertion order.
  const stored = await listItemsWithEmbeddings(userId);
  for (const item of stored) {
    const candidates = await relationCandidates(userId, item);
    await replaceRelationsFor(userId, item.id, await relateItem(item, candidates));
  }

  return items.length;
}
