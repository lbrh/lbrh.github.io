export type ProjectLink = {
  href: string;
  label: string;
};

export type ProjectItem = {
  title: string;
  org: string;
  dates: string;
  bullets: string[];
  links?: ProjectLink[];
};

export const PROJECTS: ProjectItem[] = [
  {
    title: "Cognoscere",
    org: "Telltale Solutions",
    dates: "Nov 2024 to present",
    bullets: [
      "Ingests binary VKX race files into structured, queryable data for Vakaros workflows.",
      "Lets sailors merge personal telemetry with shared datasets for clearer insights.",
      "Frontend on Next.js and React, hosted on Firebase with Realtime Database and Storage.",
      "Designed cloud flows for ingestion, processing, and retrieval at scale.",
    ],
    links: [{ href: "https://telltalesolutions.com.au/cognoscere/", label: "Open Cognoscere" }],
  },
  {
    title: "RMIT Sailing Club website",
    org: "RMIT Sailing Club",
    dates: "Nov 2025 to present",
    bullets: [
      "Full stack club hub: events, registrations, announcements, and media from training and regattas.",
      "Next.js and TypeScript on AWS for hosting and responsive performance.",
      "AWS S3-backed media with APIs for events, users, and editorial content.",
      "Automated tests around events, data integrity, and API contracts for core paths.",
    ],
    links: [{ href: "https://www.rmitsailing.club/", label: "RMIT Sailing Club site" }],
  },
  {
    title: "FormGuard",
    org: "Macathon 2026 (top 5 of 32)",
    dates: "Apr 2026",
    bullets: [
      "Real-time MediaPipe pose tracking in the browser across full sets, not single snapshots.",
      "Joint angles, depth, and rep cadence to spot where form breaks down mid-set.",
      "Next.js frontend plus Python FastAPI for sessions, fatigue modelling, and analytics.",
      "Supabase auth and persistence with Gemini 2.5 Flash for tailored coaching copy.",
    ],
    links: [
      { href: "https://devpost.com/software/tbd-hjti67", label: "Devpost submission" },
      { href: "https://form-guard.vercel.app", label: "Live demo" },
    ],
  },
  {
    title: "University software engineering projects",
    org: "RMIT University · team coursework",
    dates: "Jul 2023 to present",
    bullets: [
      "Webby (2025): Python web app and RMIT AI chatbot with vector search and scraping for fresh answers.",
      "EventHub (2025): Scrum Master for a six-person event platform; SRS, architecture, and Scrum hygiene.",
      "TeachTeam (2025): Next.js and Express tutor application portal with multi-role dashboards.",
      "Minecraft MazeRunner (2024): C++ maze generation and solving via the Minecraft C++ API.",
      "Social impact web app (2023): Census dashboards with HTML, CSS, JS, and SQLite plus usability testing.",
    ],
  },
  {
    title: "Personal portfolio site",
    org: "Design and deployment practice",
    dates: "Jun 2025 onward",
    bullets: [
      "Ongoing frontend playground for deploying polished static experiences.",
      "This repository powers the shipped GitHub Pages build you are browsing.",
    ],
    links: [
      { href: "https://lbrh.space", label: "lbrh.space" },
      { href: "https://github.com/lbrh/lbrh.github.io", label: "View source on GitHub" },
    ],
  },
  {
    title: "VangBot",
    org: "High school · Discord.js v14",
    dates: "Sep 2019 to Aug 2023",
    bullets: [
      "Feature-rich Discord bot written before reliable LLM code assist, focused on handcrafted logic.",
      "Modular commands and events with OpenAI integrations for utility and moderation.",
      "Demonstrates scalable handler patterns and pragmatic hosting choices.",
    ],
    links: [{ href: "https://github.com/lbrh/VangBot", label: "VangBot on GitHub" }],
  },
];
