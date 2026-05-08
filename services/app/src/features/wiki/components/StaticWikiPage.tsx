export type StaticWikiPageId = "getting-started" | "contribute";

type StaticSection = {
  title: string;
  paragraphs: string[];
};

type StaticPage = {
  id: StaticWikiPageId;
  title: string;
  eyebrow: string;
  intro: string[];
  sections: StaticSection[];
};

export const STATIC_WIKI_PAGES: StaticPage[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    eyebrow: "Start here",
    intro: [
      "ATFQ stands for Ask The Fucking Question. It is an open-source platform designed to help self-taught learners, students, and developers understand computer science through better questions.",
      "The core idea is simple: in every area of Computer Science, definitions are not what we lack. What matters are the questions that reveal the essential concepts, trade-offs, and limits.",
    ],
    sections: [
      {
        title: "How the app is structured",
        paragraphs: [
          "ATFQ organizes knowledge into domains, concepts, notions, and essential questions. A domain covers a major area such as systems, networking, compilers, algorithms, web, security, or AI. A concept isolates one subject. Notions give you the vocabulary and mechanisms. Questions guide your understanding.",
          "A page is not only here to answer. It should help you learn what to ask: what is it, why does it exist, how does it work, what problems does it solve, what alternatives exist, why not always use them, and what traps show up often.",
        ],
      },
      {
        title: "How to read the wiki",
        paragraphs: [
          "Start with the article TLDR to understand the concept's role. Then read the notions to build a clean mental model. Finish with the essential questions: if you can answer them in your own words, you probably understand the topic.",
          "If a question still feels blurry, that is useful signal. It shows exactly where to dig next. ATFQ turns learning into a curiosity path, not a resource checklist.",
        ],
      },
      {
        title: "Why this approach",
        paragraphs: [
          "What shapes a strong engineer is not only the amount of knowledge they collect, but the quality of the questions they know how to ask. Questions force comparison, justification, cross-layer thinking, and awareness of hidden constraints.",
          "The long-term goal is to build a large base of essential computer science questions: a living resource that teaches how to think like an engineer, not only what to learn.",
        ],
      },
      {
        title: "Collaborative diagrams",
        paragraphs: [
          "Some ideas become clear only with diagrams: network protocols, distributed architecture, memory models, compiler pipelines, caches, or database indexes. ATFQ is designed to support collaborative boards that make flows, states, and responsibilities visible.",
        ],
      },
    ],
  },
  {
    id: "contribute",
    title: "Contribute",
    eyebrow: "Contribution workflow",
    intro: [
      "ATFQ is collaborative: a user can create an article or propose an edit, then a moderator reviews the contribution before it becomes the published version.",
      "The workflow is close to Wikipedia in spirit: knowledge evolves through contributions, but changes go through review to preserve quality and coherence.",
    ],
    sections: [
      {
        title: "Create or edit an article",
        paragraphs: [
          "A signed-in user can create a page from the Create tab. They choose a parent when the topic belongs under an existing domain, then write a title, TLDR, notions, and essential questions. The creation is submitted for moderation.",
          "For an existing article, the Edit tab proposes a new version. The current version stays visible until the edit is accepted. This makes it possible to improve content without breaking a stable page.",
        ],
      },
      {
        title: "Moderator review",
        paragraphs: [
          "A moderator reviews pending changes from the dashboard. They check accuracy, clarity, structure, alignment with the question-driven approach, and whether the content is genuinely useful to someone learning the topic.",
          "If the contribution is good, it is accepted and becomes the current version. If it has issues, it is rejected with a reason so the contributor can improve the proposal.",
        ],
      },
      {
        title: "What makes a good contribution",
        paragraphs: [
          "A good contribution explains the problem the concept solves, gives the required notions, exposes the mechanisms, shows trade-offs, and formulates questions that help people think. It does not add text just to look complete.",
          "Avoid documentation dumps, isolated definitions, link lists without context, and unsupported opinions. ATFQ needs pages that are pedagogical, structured, and useful.",
        ],
      },
      {
        title: "After a rejection",
        paragraphs: [
          "A rejection is not a failure. It is a normal step in a collaborative workflow. Read the reason, fix the issue, clarify the content, then submit a new version.",
        ],
      },
    ],
  },
];

export const getStaticWikiPage = (id: string | null) => (
  STATIC_WIKI_PAGES.find((page) => page.id === id) ?? null
);

export default function StaticWikiPage({ page }: { page: StaticPage }) {
  return (
    <article className="flex w-full min-w-0 flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="font-bricolage text-sm font-semibold uppercase tracking-widest text-sub">
          {page.eyebrow}
        </span>
        <h1 className="font-bricolage text-3xl font-bold text-sub break-words sm:text-4xl">
          {page.title}
        </h1>
        <div className="h-[1.5px] bg-sub w-full" />
      </div>

      <div className="px-3 sm:px-6">
        {page.intro.map((paragraph) => (
          <p key={paragraph} className="mb-4 font-jakarta text-base leading-7 text-text last:mb-0">
            {paragraph}
          </p>
        ))}
      </div>

      {page.sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-bricolage text-base font-semibold uppercase text-sub">
              {section.title}
            </span>
            <div className="h-[1.5px] bg-sub w-full" />
          </div>
          <div className="px-3 sm:px-6">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mb-4 font-jakarta text-base leading-7 text-text last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
