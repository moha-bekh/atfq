import { Link } from "react-router-dom";

type LegalSection = {
  title: string;
  paragraphs: string[];
  items?: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
};

const contactEmail = "contact@atfq.dev";

function LegalPage({ eyebrow, title, intro, sections }: LegalPageProps) {
  return (
    <article className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-12 sm:px-16 lg:px-24 lg:py-16">
      <header className="flex flex-col gap-4">
        <span className="text-xs font-bold uppercase tracking-widest text-sub">
          {eyebrow}
        </span>
        <h1 className="font-display text-4xl font-semibold leading-tight text-main sm:text-5xl">
          {title}
        </h1>
        <div className="h-0.5 w-full bg-main" />
        <p className="max-w-2xl text-base leading-7 text-text">{intro}</p>
        <p className="text-sm text-sub">Last updated: May 9, 2026</p>
      </header>

      <div className="flex flex-col gap-9">
        {sections.map((section) => (
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
        Questions about this page can be sent to{" "}
        <a className="font-semibold text-main hover:text-text" href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>
        . You can also return to the{" "}
        <Link className="font-semibold text-main hover:text-text" to="/wiki?page=getting-started">
          wiki
        </Link>
        .
      </footer>
    </article>
  );
}

const termsSections: LegalSection[] = [
  {
    title: "About ATFQ",
    paragraphs: [
      "ATFQ is an open-source learning platform and knowledge graph for computer science. It helps learners explore concepts through articles, notions, essential questions, and community contributions.",
      "The service includes public wiki content, account features, profile settings, role-based permissions, contribution workflows, and moderation tools.",
    ],
  },
  {
    title: "Accounts and security",
    paragraphs: [
      "You may need an account to create or edit content, manage a profile, request elevated roles, or access protected features. You are responsible for keeping your credentials and authentication factors secure.",
      "ATFQ supports password-based sign in, OAuth providers, password reset flows, and multi-factor authentication. If you believe your account has been compromised, contact us as soon as possible.",
    ],
  },
  {
    title: "Contributions",
    paragraphs: [
      "Signed-in users can submit new articles or propose edits to existing wiki content. Contributions may be reviewed by moderators before they become publicly visible.",
      "By submitting content, you confirm that you have the right to share it and that it is accurate to the best of your knowledge. Contributions should be educational, structured, and aligned with ATFQ's question-driven approach.",
    ],
    items: [
      "Do not submit plagiarized, malicious, unlawful, or intentionally misleading content.",
      "Do not abuse moderation, role requests, profile features, or collaboration tools.",
      "Do not attempt to disrupt the platform, bypass permissions, or access data you are not authorized to view.",
    ],
  },
  {
    title: "Moderation and access",
    paragraphs: [
      "ATFQ uses roles and permissions to protect the integrity of the knowledge base. Moderators and administrators may approve, reject, archive, or remove content when needed.",
      "We may suspend access to features or accounts that harm the platform, other users, or the reliability of the content.",
    ],
  },
  {
    title: "Availability and changes",
    paragraphs: [
      "ATFQ is provided as an evolving open-source project. Features may change, break, or be removed as the project develops.",
      "We may update these terms when the product, legal requirements, or community workflows change. Continued use of the service after an update means you accept the revised terms.",
    ],
  },
  {
    title: "No professional advice",
    paragraphs: [
      "The wiki is an educational resource. It is not a substitute for professional, security, legal, academic, or employment advice. You should verify important information before relying on it in critical contexts.",
    ],
  },
];

const privacySections: LegalSection[] = [
  {
    title: "Information we collect",
    paragraphs: [
      "ATFQ collects the information needed to run accounts, profiles, authentication, wiki contributions, moderation, and collaboration features.",
      "Depending on how you use the service, this may include your username, email address, password hash, OAuth provider identifiers, multi-factor authentication data, profile picture URL, theme preferences, roles, permissions, role requests, wiki submissions, moderation history, presence status, friendship data, and timestamps related to account activity.",
    ],
  },
  {
    title: "How we use information",
    paragraphs: [
      "We use collected information to authenticate users, secure accounts, keep sessions active, provide profile features, process role requests, publish or moderate wiki contributions, show collaboration state, and maintain the platform.",
      "We also use technical and operational data to debug issues, prevent abuse, improve reliability, and understand whether core services are healthy.",
    ],
  },
  {
    title: "Authentication and OAuth",
    paragraphs: [
      "If you sign in through an OAuth provider, ATFQ stores the provider name and provider identifier needed to link that account. We do not control the provider's own privacy practices.",
      "If you enable multi-factor authentication, ATFQ stores encrypted MFA material required to verify future sign-ins.",
    ],
  },
  {
    title: "Public content",
    paragraphs: [
      "Wiki articles, notions, essential questions, and approved contribution history may be visible to other users or the public. Content submitted for moderation may be reviewed by moderators or administrators.",
      "Avoid adding personal information to wiki content unless you want it to be public and have the right to share it.",
    ],
  },
  {
    title: "Sharing and retention",
    paragraphs: [
      "We do not sell personal information. We may share limited information when needed to operate infrastructure, comply with legal obligations, protect users, or investigate abuse.",
      "Account, profile, OAuth, moderation, and contribution records may be retained while your account exists or while needed for platform integrity, security, auditability, or legal obligations.",
    ],
  },
  {
    title: "Your choices",
    paragraphs: [
      "You can update account details, profile settings, theme preferences, linked providers, password, and multi-factor authentication settings where the app provides those controls.",
      "You may contact us to ask about access, correction, deletion, or other privacy requests. Some records may need to be retained when required for security, moderation, legal compliance, or the integrity of public contributions.",
    ],
  },
  {
    title: "Security",
    paragraphs: [
      "ATFQ uses security measures such as password hashing, token-based sessions, encrypted MFA secrets, role-based permissions, and service boundaries. No system can be guaranteed perfectly secure, but the project is designed to reduce unnecessary exposure.",
    ],
  },
  {
    title: "Updates",
    paragraphs: [
      "We may update this policy as ATFQ evolves. The latest version will be published on this page with an updated date.",
    ],
  },
];

export function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="These terms explain the basic rules for using ATFQ, contributing to the wiki, and interacting with the platform."
      sections={termsSections}
    />
  );
}

export function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="This policy explains what ATFQ collects, why it is used, and how account, profile, authentication, and contribution data are handled."
      sections={privacySections}
    />
  );
}
