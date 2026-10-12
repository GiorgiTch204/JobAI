#!/usr/bin/env node
/**
 * Fills the database with a working data set: one admin, a handful of members
 * with real CV documents, a job board, and applications already in flight so
 * the dashboards and the admin console have something to show.
 *
 *   node scripts/db-seed.mjs
 */
import { loadEnv } from "./load-env.mjs";

loadEnv();

const { getDb } = await import("../lib/db/client.js");
const { hashPassword } = await import("../lib/auth/password.js");
const { createUser, findUserByEmail, recordLogin } =
  await import("../lib/db/users.repo.js");
const { createResume, updateResume } =
  await import("../lib/db/resumes.repo.js");
const { createJob } = await import("../lib/db/jobs.repo.js");
const { createApplication, updateApplicationStatus } =
  await import("../lib/db/applications.repo.js");
const { saveJob } = await import("../lib/db/saved-jobs.repo.js");
const { logActivity } = await import("../lib/db/activity.repo.js");
const { createSession } = await import("../lib/db/sessions.repo.js");
const { scoreResume } = await import("../lib/ats.js");
const { matchResumeToJob } = await import("../lib/match.js");

const db = getDb();

/* -------------------------------------------------------------------------- */
/* wipe (seed data only — the schema stays)                                   */
/* -------------------------------------------------------------------------- */

const wipe = db.transaction(() => {
  for (const table of [
    "application_events",
    "applications",
    "saved_jobs",
    "resumes",
    "jobs",
    "activity_log",
    "login_attempts",
    "sessions",
    "users",
  ]) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
});
wipe();

/* -------------------------------------------------------------------------- */
/* accounts                                                                   */
/* -------------------------------------------------------------------------- */

const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@jobai.dev";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin12345";
const userEmail = process.env.SEED_USER_EMAIL || "demo@jobai.dev";
const userPassword = process.env.SEED_USER_PASSWORD || "Demo12345";

const admin = createUser({
  name: "JobAI Operations",
  email: adminEmail,
  passwordHash: await hashPassword(adminPassword),
  role: "ADMIN",
  headline: "Platform administrator",
  location: "Tbilisi, Georgia",
});

const people = [
  {
    name: "Luka Danelia",
    email: userEmail,
    password: userPassword,
    headline: "Full-stack web developer",
    location: "Tbilisi, Georgia",
    phone: "+995 555 10 20 30",
    website: "https://github.com/lukadanelia",
    bio: "Fourth-year computer science student. I build Next.js front ends and ASP.NET services for public-sector teams.",
    resume: {
      title: "Full-stack CV",
      summary:
        "Full-stack developer finishing a computer science degree in Tbilisi. I build Next.js interfaces and ASP.NET MVC services for government teams, and I care about accessible markup, measurable performance work and clean API boundaries.",
      skills: [
        "React",
        "Next.js",
        "JavaScript",
        "TypeScript",
        "Tailwind CSS",
        "Node.js",
        "REST API",
        "C#",
        "ASP.NET MVC",
        "SQL Server",
        "Git",
        "Figma",
      ],
      experience: [
        {
          id: "exp_1",
          role: "Web developer intern",
          company: "Ministry of Environmental Protection and Agriculture",
          location: "Tbilisi, Georgia",
          startDate: "Jun 2025",
          endDate: "",
          current: true,
          achievements: [
            "Built a Georgian-language intranet in ASP.NET MVC now used by 420 staff every week.",
            "Reduced first-contentful paint by 38% by removing render-blocking scripts and inlining critical CSS.",
            "Shipped a reusable Razor component library that cut new page build time from 2 days to 4 hours.",
          ],
        },
        {
          id: "exp_2",
          role: "Frontend developer",
          company: "Nuclear and Radiation Safety Agency",
          location: "Tbilisi, Georgia",
          startDate: "Feb 2025",
          endDate: "May 2025",
          current: false,
          achievements: [
            "Delivered a JSON-driven form engine that replaced 24 hand-written React forms.",
            "Cut form validation bugs by 60% by moving rules into one shared schema.",
          ],
        },
      ],
      education: [
        {
          id: "edu_1",
          degree: "BSc Computer Science and Web Development",
          school: "International Black Sea University",
          location: "Tbilisi, Georgia",
          startDate: "2022",
          endDate: "2026",
          grade: "GPA 3.8",
        },
      ],
      projects: [
        {
          id: "prj_1",
          name: "MovieSearch — semantic search engine",
          url: "https://github.com/lukadanelia/moviesearch",
          description:
            "Semantic movie search built on Sentence-BERT embeddings with a FastAPI service and a Next.js front end. Returns results for plot descriptions rather than exact titles.",
          stack: ["Python", "FastAPI", "ChromaDB", "Next.js"],
        },
      ],
      languages: [
        { id: "lang_1", name: "Georgian", level: "Native" },
        { id: "lang_2", name: "English", level: "Fluent" },
        { id: "lang_3", name: "Russian", level: "Intermediate" },
      ],
      certifications: [
        {
          id: "cert_1",
          name: "Google Cloud Digital Leader",
          issuer: "Google Cloud",
          year: "2025",
        },
      ],
    },
  },
  {
    name: "Nino Beridze",
    email: "nino.beridze@example.com",
    password: "Member12345",
    headline: "Frontend developer",
    location: "Batumi, Georgia",
    phone: "+995 555 44 55 66",
    resume: {
      title: "Frontend CV",
      summary:
        "Frontend developer with three years building design systems and marketing sites. I work in React and TypeScript and run the accessibility review on every release.",
      skills: [
        "React",
        "TypeScript",
        "CSS",
        "Storybook",
        "Jest",
        "Accessibility",
        "Figma",
        "Vite",
      ],
      experience: [
        {
          id: "exp_1",
          role: "Frontend developer",
          company: "Caucasus Digital",
          location: "Batumi, Georgia",
          startDate: "Mar 2023",
          endDate: "",
          current: true,
          achievements: [
            "Rebuilt the component library in TypeScript, adopted by 4 product teams.",
            "Raised Lighthouse accessibility scores from 72 to 98 across 11 templates.",
          ],
        },
      ],
      education: [
        {
          id: "edu_1",
          degree: "BA Information Technology",
          school: "Batumi State University",
          startDate: "2019",
          endDate: "2023",
          grade: "",
        },
      ],
      projects: [],
      languages: [
        { id: "lang_1", name: "Georgian", level: "Native" },
        { id: "lang_2", name: "English", level: "Advanced" },
      ],
      certifications: [],
    },
  },
  {
    name: "Giorgi Cheishvili",
    email: "giorgi.cheishvili@example.com",
    password: "Member12345",
    headline: "Backend engineer",
    location: "Tbilisi, Georgia",
    resume: {
      title: "Backend CV",
      summary:
        "Backend engineer working on payment services. I write Node.js and Go, and I own the on-call rota for three production services.",
      skills: [
        "Node.js",
        "Go",
        "PostgreSQL",
        "Docker",
        "Kubernetes",
        "REST API",
        "Redis",
        "AWS",
      ],
      experience: [
        {
          id: "exp_1",
          role: "Backend engineer",
          company: "PayBridge",
          location: "Remote",
          startDate: "Jan 2022",
          endDate: "",
          current: true,
          achievements: [
            "Moved settlement jobs to a queue, cutting end-of-day processing from 90 to 12 minutes.",
            "Owned the migration of 14 services to Kubernetes with no customer-facing downtime.",
          ],
        },
      ],
      education: [
        {
          id: "edu_1",
          degree: "MSc Software Engineering",
          school: "Tbilisi State University",
          startDate: "2019",
          endDate: "2021",
          grade: "",
        },
      ],
      projects: [],
      languages: [{ id: "lang_1", name: "English", level: "Fluent" }],
      certifications: [],
    },
  },
  {
    name: "Mariam Kapanadze",
    email: "mariam.kapanadze@example.com",
    password: "Member12345",
    headline: "Junior developer, career switcher",
    location: "Kutaisi, Georgia",
    resume: {
      title: "First CV",
      summary:
        "Career switcher from accounting, six months into learning web development.",
      skills: ["HTML", "CSS", "JavaScript"],
      experience: [],
      education: [
        {
          id: "edu_1",
          degree: "Web development bootcamp",
          school: "Tbilisi Coding School",
          startDate: "2025",
          endDate: "2026",
          grade: "",
        },
      ],
      projects: [],
      languages: [],
      certifications: [],
    },
  },
];

/* -------------------------------------------------------------------------- */
/* jobs                                                                       */
/* -------------------------------------------------------------------------- */

const jobSeeds = [
  {
    title: "Frontend developer (React / Next.js)",
    company: "Bank of Georgia — Digital",
    location: "Tbilisi, Georgia",
    workMode: "HYBRID",
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 3200,
    salaryMax: 4800,
    salaryCurrency: "GEL",
    description:
      "Join the digital channels team building the internet bank used by 1.4 million customers. You will work in a squad with a designer, a backend engineer and a product manager, own features end to end, and help us finish the migration from the legacy Angular app to Next.js.",
    requirements: [
      "Two or more years writing React in production",
      "Comfortable with TypeScript and modern CSS",
      "Experience consuming REST APIs and handling auth flows",
      "Georgian and English, written and spoken",
    ],
    benefits: [
      "Private health insurance",
      "Hybrid, 2 days in office",
      "Conference budget",
    ],
    tags: ["React", "Next.js", "TypeScript", "Tailwind CSS", "REST API"],
  },
  {
    title: "Full-stack developer (.NET + React)",
    company: "Ministry of Justice — IT Department",
    location: "Tbilisi, Georgia",
    workMode: "ONSITE",
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 2800,
    salaryMax: 4000,
    salaryCurrency: "GEL",
    description:
      "We maintain the public registry services used by every notary in the country. The role covers ASP.NET MVC services, a React front end and the SQL Server data layer behind them. Expect long-lived code, real users and strict accessibility requirements.",
    requirements: [
      "C# and ASP.NET MVC or ASP.NET Core",
      "React for the front end",
      "SQL Server, including writing and reading stored procedures",
      "Active Directory authentication is a plus",
    ],
    benefits: ["Public sector stability", "Training budget", "28 days leave"],
    tags: ["C#", "ASP.NET MVC", "React", "SQL Server", "Active Directory"],
  },
  {
    title: "Junior frontend developer",
    company: "Theneo",
    location: "Tbilisi, Georgia",
    workMode: "HYBRID",
    employmentType: "FULL_TIME",
    seniority: "JUNIOR",
    salaryMin: 1800,
    salaryMax: 2600,
    salaryCurrency: "GEL",
    description:
      "A first developer job with real mentoring. You will pair with a senior engineer every week, start on contained UI work in our React app, and move to owning small features within three months.",
    requirements: [
      "Solid HTML, CSS and JavaScript",
      "Some React, from courses or personal projects",
      "A portfolio or GitHub we can look at",
    ],
    benefits: ["Weekly mentoring", "Equipment provided", "Flexible hours"],
    tags: ["JavaScript", "React", "CSS", "HTML", "Git"],
  },
  {
    title: "Senior backend engineer (Node.js)",
    company: "Pulsar AI",
    location: "Remote (Europe)",
    workMode: "REMOTE",
    employmentType: "FULL_TIME",
    seniority: "SENIOR",
    salaryMin: 70000,
    salaryMax: 95000,
    salaryCurrency: "EUR",
    description:
      "Own the services behind our conversational sales product: ingestion pipelines, the inference gateway and the billing layer. You will set the standard for observability and lead the design reviews for new services.",
    requirements: [
      "Five or more years in backend engineering",
      "Deep Node.js and PostgreSQL knowledge",
      "Experience running services on Kubernetes",
      "Comfortable being on call for what you ship",
    ],
    benefits: ["Fully remote", "Stock options", "Home office budget"],
    tags: ["Node.js", "PostgreSQL", "Kubernetes", "Docker", "AWS", "REST API"],
  },
  {
    title: "React Native developer",
    company: "TBC Bank",
    location: "Tbilisi, Georgia",
    workMode: "HYBRID",
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 3500,
    salaryMax: 5200,
    salaryCurrency: "GEL",
    description:
      "Build the mobile banking app used daily across Georgia. The team ships every two weeks and keeps crash-free sessions above 99.8%.",
    requirements: [
      "React Native in production, iOS and Android",
      "Comfortable with native modules when needed",
      "Experience with secure storage and biometric auth",
    ],
    benefits: ["Health insurance", "Sport subsidy", "Internal mobility"],
    tags: ["React Native", "React", "TypeScript", "iOS", "Android"],
  },
  {
    title: "Web developer intern",
    company: "Rural Development Agency",
    location: "Tbilisi, Georgia",
    workMode: "ONSITE",
    employmentType: "INTERNSHIP",
    seniority: "INTERN",
    salaryMin: 900,
    salaryMax: 1200,
    salaryCurrency: "GEL",
    description:
      "A six-month paid internship on the agency's public website and internal CMS. You will work on real tickets from week one with a developer reviewing every pull request.",
    requirements: [
      "Studying computer science or self-taught equivalent",
      "Basic JavaScript and willingness to learn Next.js",
      "Georgian language",
    ],
    benefits: [
      "Paid internship",
      "Possible full-time offer",
      "Flexible exam schedule",
    ],
    tags: ["JavaScript", "Next.js", "HTML", "CSS", "Git"],
  },
  {
    title: "Frontend engineer (design systems)",
    company: "Lightfold",
    location: "Remote (Global)",
    workMode: "REMOTE",
    employmentType: "CONTRACT",
    seniority: "SENIOR",
    salaryMin: 60,
    salaryMax: 85,
    salaryCurrency: "USD",
    description:
      "Six-month contract to rebuild our component library and document it properly. You will work directly with the design lead and ship a themeable system used by three products.",
    requirements: [
      "Strong React and TypeScript",
      "Experience building a component library used by other teams",
      "Accessibility testing as part of your normal workflow",
      "Storybook or equivalent documentation tooling",
    ],
    benefits: ["Hourly rate", "Asynchronous team", "Contract extension likely"],
    tags: [
      "React",
      "TypeScript",
      "Storybook",
      "Accessibility",
      "Design System",
      "CSS",
    ],
  },
  {
    title: "Data analyst (SQL + Python)",
    company: "Wissol Group",
    location: "Tbilisi, Georgia",
    workMode: "ONSITE",
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 2600,
    salaryMax: 3800,
    salaryCurrency: "GEL",
    description:
      "Turn retail and fuel sales data into the weekly numbers the board actually uses. You will own three dashboards and the models behind them.",
    requirements: [
      "Confident SQL, including window functions",
      "Python with pandas for analysis",
      "Experience building dashboards people rely on",
    ],
    benefits: ["Performance bonus", "Corporate fuel card", "Health insurance"],
    tags: ["SQL", "Python", "Data Analysis", "Power BI", "Excel"],
  },
  {
    title: "DevOps engineer",
    company: "Cloudhub Georgia",
    location: "Tbilisi, Georgia",
    workMode: "HYBRID",
    employmentType: "FULL_TIME",
    seniority: "SENIOR",
    salaryMin: 4500,
    salaryMax: 6500,
    salaryCurrency: "GEL",
    description:
      "Run the platform that hosts 60 customer workloads. The job is equal parts Terraform, Kubernetes and making developers faster.",
    requirements: [
      "Kubernetes in production, not just in a lab",
      "Terraform or Pulumi",
      "CI/CD pipelines, ideally GitHub Actions",
      "Linux fundamentals",
    ],
    benefits: ["Certification paid", "On-call allowance", "Hybrid"],
    tags: ["Kubernetes", "Terraform", "Docker", "CI/CD", "Linux", "AWS"],
  },
  {
    title: "QA automation engineer",
    company: "Space Neobank",
    location: "Tbilisi, Georgia",
    workMode: "HYBRID",
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 3000,
    salaryMax: 4200,
    salaryCurrency: "GEL",
    description:
      "Own the automated test suite for the app and the APIs behind it. You will decide what gets automated and keep the pipeline honest.",
    requirements: [
      "Playwright or Cypress experience",
      "JavaScript or TypeScript",
      "API testing and some performance testing",
    ],
    benefits: ["Health insurance", "Learning budget", "Hybrid"],
    tags: ["Playwright", "TypeScript", "JavaScript", "API Testing", "CI/CD"],
  },
  {
    title: "Product designer (UI focus)",
    company: "Optio.ai",
    location: "Remote (Europe)",
    workMode: "REMOTE",
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 45000,
    salaryMax: 60000,
    salaryCurrency: "EUR",
    description:
      "Design the interfaces for our finance automation product and keep the design system current. You will work with two engineers and talk to customers every week.",
    requirements: [
      "A portfolio of shipped product work",
      "Figma, including component libraries",
      "Comfortable writing the words in the interface too",
    ],
    benefits: ["Remote first", "Four-day summer weeks", "Equipment budget"],
    tags: ["Figma", "Design System", "UI Design", "Prototyping"],
  },
  {
    title: "WordPress developer (part time)",
    company: "Adjara Media House",
    location: "Batumi, Georgia",
    workMode: "REMOTE",
    employmentType: "PART_TIME",
    seniority: "JUNIOR",
    salaryMin: 1200,
    salaryMax: 1800,
    salaryCurrency: "GEL",
    description:
      "Twenty hours a week keeping six news sites fast and online, plus building landing pages for campaigns.",
    requirements: [
      "PHP and WordPress themes",
      "Basic JavaScript",
      "Page speed basics",
    ],
    benefits: ["Part time", "Remote", "Flexible hours"],
    tags: ["WordPress", "PHP", "JavaScript", "CSS"],
  },
  {
    title: "Machine learning engineer (NLP)",
    company: "Georgian Language Technologies",
    location: "Tbilisi, Georgia",
    workMode: "HYBRID",
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 4000,
    salaryMax: 6000,
    salaryCurrency: "GEL",
    description:
      "Work on Georgian-language models: tokenisation, embeddings and a retrieval service used by public-sector search. Research with a production deadline.",
    requirements: [
      "Python and PyTorch",
      "Experience with transformer models and embeddings",
      "Vector databases such as ChromaDB or pgvector",
      "Comfortable reading papers and shipping from them",
    ],
    benefits: ["Research time", "Conference travel", "Hybrid"],
    tags: [
      "Python",
      "PyTorch",
      "NLP",
      "Machine Learning",
      "FastAPI",
      "ChromaDB",
    ],
  },
  {
    title: "Technical support engineer",
    company: "Veziro Systems",
    location: "Tbilisi, Georgia",
    workMode: "ONSITE",
    employmentType: "FULL_TIME",
    seniority: "JUNIOR",
    salaryMin: 1600,
    salaryMax: 2200,
    salaryCurrency: "GEL",
    description:
      "First line of support for our logistics software. You will debug customer issues, write the fix when it is small, and hand over the rest with a clear reproduction.",
    requirements: [
      "SQL basics",
      "Clear written Georgian and English",
      "Patience on the phone",
    ],
    benefits: ["Health insurance", "Clear promotion path"],
    tags: ["SQL", "Support", "Debugging", "Windows"],
  },
  {
    title: "Lead frontend engineer",
    company: "Redberry",
    location: "Tbilisi, Georgia",
    workMode: "HYBRID",
    employmentType: "FULL_TIME",
    seniority: "LEAD",
    salaryMin: 6000,
    salaryMax: 9000,
    salaryCurrency: "GEL",
    description:
      "Lead six frontend engineers across client projects. Half the week is architecture and review, half is still writing code.",
    requirements: [
      "Five or more years in frontend, some of it leading",
      "React and Next.js at scale",
      "You have run code review and mentoring before",
    ],
    benefits: ["Leadership coaching", "Profit share", "Hybrid"],
    tags: ["React", "Next.js", "TypeScript", "Leadership", "Architecture"],
  },
  {
    title: "Cloud support associate (closed role)",
    company: "Datacom Caucasus",
    location: "Tbilisi, Georgia",
    workMode: "ONSITE",
    employmentType: "FULL_TIME",
    seniority: "JUNIOR",
    salaryMin: 1800,
    salaryMax: 2400,
    salaryCurrency: "GEL",
    status: "CLOSED",
    description:
      "This position has been filled. Kept here so the admin console shows how closed roles behave in the job board and in reporting.",
    requirements: ["Linux basics", "Networking fundamentals"],
    benefits: [],
    tags: ["Linux", "Networking", "AWS"],
  },
];

/* -------------------------------------------------------------------------- */
/* build                                                                      */
/* -------------------------------------------------------------------------- */

const jobs = jobSeeds.map((seed) => createJob(seed, admin.id));

// Back-date the postings so the job board does not show 16 identical timestamps.
jobs.forEach((job, index) => {
  const created = new Date(
    Date.now() - (index * 34 + 6) * 3_600_000,
  ).toISOString();
  db.prepare(
    "UPDATE jobs SET created_at = ?, updated_at = ?, views = ? WHERE id = ?",
  ).run(created, created, Math.floor(Math.random() * 180) + 12, job.id);
});

logActivity({
  userId: admin.id,
  actorName: admin.name,
  actorRole: "ADMIN",
  action: "job.create",
  entity: "job",
  summary: `Published ${jobs.length} job postings`,
  ip: "seed",
});

const members = [];

for (const [index, person] of people.entries()) {
  const user = createUser({
    name: person.name,
    email: person.email,
    passwordHash: await hashPassword(person.password),
    headline: person.headline,
    location: person.location,
    phone: person.phone || "",
  });

  if (person.bio || person.website) {
    db.prepare("UPDATE users SET bio = ?, website = ? WHERE id = ?").run(
      person.bio || "",
      person.website || "",
      user.id,
    );
  }

  // Back-date signups across the last two weeks for the admin charts.
  const created = new Date(
    Date.now() - (index * 3 + 1) * 86_400_000,
  ).toISOString();
  db.prepare("UPDATE users SET created_at = ? WHERE id = ?").run(
    created,
    user.id,
  );

  const document = {
    ...person.resume,
    fullName: person.name,
    headline: person.headline,
    email: person.email,
    phone: person.phone || "",
    location: person.location,
    website: person.website || "",
  };

  const report = scoreResume(document);
  const resume = createResume(user.id, document, {
    atsScore: report.score,
    atsReport: report,
  });

  recordLogin(user.id);
  createSession({
    userId: user.id,
    ip: "127.0.0.1",
    userAgent: "Chrome on Windows (seed)",
    device: "Chrome on Windows",
    ttlDays: 7,
  });

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: "USER",
    action: "user.register",
    entity: "user",
    entityId: user.id,
    summary: "Account created",
    ip: "127.0.0.1",
  });
  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: "USER",
    action: "resume.create",
    entity: "resume",
    entityId: resume.id,
    summary: `Created "${resume.title}" (ATS ${report.score})`,
    ip: "127.0.0.1",
  });

  members.push({ user, resume: { ...resume, ...document } });
}

/* -------------------------------------------------------------------------- */
/* applications                                                               */
/* -------------------------------------------------------------------------- */

const openJobs = jobs.filter((job) => (job.status || "OPEN") === "OPEN");

const plan = [
  {
    member: 0,
    job: 0,
    status: "INTERVIEW",
    note: "Technical interview booked for Thursday.",
  },
  { member: 0, job: 1, status: "IN_REVIEW", note: "" },
  { member: 0, job: 5, status: "SUBMITTED", note: "" },
  {
    member: 1,
    job: 6,
    status: "OFFER",
    note: "Offer sent, awaiting signature.",
  },
  {
    member: 1,
    job: 0,
    status: "REJECTED",
    note: "Looking for more TypeScript depth.",
  },
  { member: 2, job: 3, status: "IN_REVIEW", note: "" },
  { member: 2, job: 8, status: "SUBMITTED", note: "" },
  { member: 3, job: 2, status: "SUBMITTED", note: "" },
  {
    member: 3,
    job: 5,
    status: "REJECTED",
    note: "Needs more JavaScript practice first.",
  },
];

for (const [index, item] of plan.entries()) {
  const member = members[item.member];
  const job = openJobs[item.job];
  if (!member || !job) continue;

  const match = matchResumeToJob(member.resume, job);
  const application = createApplication({
    jobId: job.id,
    userId: member.user.id,
    resumeId: member.resume.id,
    resumeSnapshot: member.resume,
    coverLetter:
      item.member === 0 && item.job === 0
        ? "I have spent the last year building Next.js interfaces for a government team, including a component library that other developers now use. I would like to do that at a larger scale on the internet bank."
        : "",
    matchScore: match.score,
    atsScore: member.resume.atsScore ?? 0,
    actorName: member.user.name,
  });

  const created = new Date(
    Date.now() - (index * 19 + 3) * 3_600_000,
  ).toISOString();
  db.prepare(
    "UPDATE applications SET created_at = ?, updated_at = ? WHERE id = ?",
  ).run(created, created, application.id);
  db.prepare(
    "UPDATE application_events SET created_at = ? WHERE application_id = ?",
  ).run(created, application.id);

  logActivity({
    userId: member.user.id,
    actorName: member.user.name,
    actorRole: "USER",
    action: "application.create",
    entity: "application",
    entityId: application.id,
    summary: `Applied to ${job.title} at ${job.company} (${match.score}% match)`,
    ip: "127.0.0.1",
  });

  if (item.status !== "SUBMITTED") {
    updateApplicationStatus(application.id, item.status, {
      actorId: admin.id,
      actorName: admin.name,
      note: item.note,
    });
    logActivity({
      userId: admin.id,
      actorName: admin.name,
      actorRole: "ADMIN",
      action: "application.status",
      entity: "application",
      entityId: application.id,
      summary: `Moved ${member.user.name} to ${item.status} for ${job.title}`,
      ip: "127.0.0.1",
    });
  }
}

/* saved jobs */
saveJob(members[0].user.id, openJobs[6].id);
saveJob(members[0].user.id, openJobs[9].id);
saveJob(members[1].user.id, openJobs[2].id);

/* admin session + login trail */
recordLogin(admin.id);
createSession({
  userId: admin.id,
  ip: "127.0.0.1",
  userAgent: "Chrome on macOS (seed)",
  device: "Chrome on macOS",
});
logActivity({
  userId: admin.id,
  actorName: admin.name,
  actorRole: "ADMIN",
  action: "user.login",
  entity: "user",
  entityId: admin.id,
  summary: "Signed in",
  ip: "127.0.0.1",
});

/* -------------------------------------------------------------------------- */
/* report                                                                     */
/* -------------------------------------------------------------------------- */

const count = (table) =>
  db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

console.log(`
Seed complete
  users          ${count("users")}
  jobs           ${count("jobs")}
  CV documents   ${count("resumes")}
  applications   ${count("applications")}
  activity rows  ${count("activity_log")}

Sign in with
  admin   ${adminEmail}  /  ${adminPassword}
  member  ${userEmail}  /  ${userPassword}
`);

if (!findUserByEmail(adminEmail)) {
  console.error("Admin account missing after seed — something went wrong.");
  process.exit(1);
}
