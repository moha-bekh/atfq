import { Link } from "react-router-dom";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/config/contact";

type AboutSection = {
  title: string;
  paragraphs: string[];
  items?: string[];
};

const aboutSections: AboutSection[] = [
  {
    title: "Why this project exists",
    paragraphs: [
      "ATFQ started from a real personal problem: learning programming deeply often means following a chain of questions far beyond one tutorial, one course, or one documentation page.",
      "The project comes from a habit of deep diving into computer science: not only asking how something works, but why it exists, what came before it, and how older ideas led to modern software. Books like Code: The Hidden Language of Computer Hardware and Software reinforced that way of learning by connecting hardware, language, and software into one larger story.",
      "Over time, that curiosity created another problem: memory. Notes in tools like Notion or Obsidian helped, but no personal note system can capture the whole internet or keep up with knowledge that keeps moving.",
    ],
  },
  {
    title: "The learning idea",
    paragraphs: [
      "ATFQ is built around a simple idea: instead of only exposing knowledge, expose the right questions to ask. The project imagines a CSFAQ, a computer science knowledge base where each concept starts with the questions someone should ask to truly understand it.",
      "The goal is to help learners, especially self-taught developers, avoid getting lost, skipping foundations, or missing the existence of important concepts. ATFQ is for people who want a path from the history of computing to current technologies.",
    ],
    items: [
      "What is it?",
      "Why does it exist?",
      "What problem did it solve?",
      "What came before it?",
      "How does it work internally?",
      "What tradeoffs does it introduce?",
      "What should I learn next?",
    ],
  },
  {
    title: "Collaboration and roadmap",
    paragraphs: [
      "The product is designed as a collaborative computer science roadmap. Domains, languages, tools, and concepts can be broken down into articles, notions, essential questions, and resources.",
      "In spirit, it is close to a specialized Wikipedia for computer science, but with a stronger learning direction. Contributors can share knowledge, discuss ideas, propose changes, and help create a clearer path for others.",
    ],
  },
  {
    title: "Design direction",
    paragraphs: [
      "The visual direction is intentionally technical and minimal. The interface uses strong contrast, clear spacing, geometric forms, and restrained components so the content remains the focus.",
      "The ATFQ logo is built around the letter Q, the visual anchor of the project. It connects the idea of questioning with knowledge graphs, technical structure, and intellectual clarity.",
      "The circular shape represents the core question. The connected satellite circle suggests a graph node, showing how one strong question can connect multiple areas of computer science. The central eye-like form suggests focus: the ability to see through complexity.",
    ],
    items: [
      "Geometric clarity: circles, tangent lines, and scalable forms.",
      "Open-source minimalism: a clean identity compatible with developer tools.",
      "Functional abstraction: a Q, a graph node, a technical diagram, and an eye in one mark.",
    ],
  },
  {
    title: "Proof of concept",
    paragraphs: [
      "This version of ATFQ is also an engineering showcase. It was built as a full-stack, production-style system to demonstrate product thinking, service boundaries, infrastructure, security, design, and delivery.",
      "If ATFQ became a long-term public product, the architecture would be rebuilt with simpler and more conservative decisions. This deployment remains a proof of concept and public demo.",
    ],
  },
];

export function About() {
  return (
    <article className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-12 sm:px-16 lg:px-24 lg:py-16">
      <header className="flex flex-col gap-4">
        <span className="text-xs font-bold uppercase tracking-widest text-sub">
          About
        </span>
        <h1 className="font-display text-4xl font-semibold leading-tight text-main sm:text-5xl">
          Why ATFQ exists
        </h1>
        <div className="h-0.5 w-full bg-main" />
        <p className="max-w-2xl text-base leading-7 text-text">
          ATFQ is a question-driven computer science roadmap built from
          curiosity, memory, and the desire to transmit knowledge.
        </p>
        <p className="text-sm text-sub">Project story and design direction</p>
      </header>

      <div className="flex flex-col gap-9">
        {aboutSections.map((section) => (
          <section key={section.title} className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-semibold text-main">
              {section.title}
            </h2>
            <div className="h-px w-full bg-sub" />
            <div className="flex flex-col gap-4 px-0 sm:px-4">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-base leading-7 text-text">
                  {paragraph}
                </p>
              ))}
              {section.items ? (
                <ul className="list-disc space-y-2 pl-5 text-base leading-7 text-text">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <footer className="border-t border-main/20 pt-6 text-sm leading-6 text-text">
        Questions about ATFQ can be sent to{" "}
        <a className="font-semibold text-main hover:text-text" href={CONTACT_MAILTO}>
          {CONTACT_EMAIL}
        </a>
        . You can also explore the{" "}
        <Link className="font-semibold text-main hover:text-text" to="/wiki?page=getting-started">
          wiki
        </Link>
        .
      </footer>
    </article>
  );
}
