export type Verification = "verified" | "disputed" | "unverified";

export type Citation = {
  id: string;
  label: string;
  detail: string;
  status: Verification;
  archive: string;
};

export type CommentarySection = {
  id: string;
  title: string;
  body: string;
  citations: Citation[];
};

export type Rebuttal = {
  id: string;
  perspective: string;
  claim: string;
  status: Verification;
  counter?: { author: string; body: string; status: Verification };
  citations: Citation[];
};

export type MapNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  status: Verification;
  root?: boolean;
};

export type Entry = {
  id: string;
  kind: "verse" | "premise";
  collection: string;
  breadcrumb: string;
  title: string;
  subtitle: string;
  primary: string;
  secondary: string;
  sections: CommentarySection[];
  rebuttals: Rebuttal[];
  map: { nodes: MapNode[]; edges: [string, string][] };
};

export const collections = [
  { id: "religious", label: "Religious texts" },
  { id: "philosophy", label: "Philosophy" },
  { id: "ethics", label: "Ethics" },
];

export const entries: Entry[] = [
  {
    id: "discourses-4-1",
    kind: "verse",
    collection: "religious",
    breadcrumb: "Sources / Religious texts / Stoicism",
    title: "Epictetus — Discourses IV.1",
    subtitle: "On the faculty of assent & the control of impressions",
    primary:
      "Nothing is our own, except the use of it. For this alone, to prefer and avoid, belongs to us — and no one can take it from us.",
    secondary:
      "The impressions that come to us: some are within our power, others are not. We are to examine each before we assent to it.",
    sections: [
      {
        id: "commentary",
        title: "Commentary",
        body: "The \u201cfaculty of assent\u201d (hupolepsis) is the Stoic seat of judgment. Long underscores that assent, unlike the impression itself, is what lies within our power.",
        citations: [
          {
            id: "burnet-1931",
            label: "Burnet 1931",
            detail: "Burnet, J. Epictetus: Discourses, Bk IV. Oxford, 1931, p. 212.",
            status: "verified",
            archive: "Perseus 1.2.3",
          },
          {
            id: "whitman-1995",
            label: "Whitman 1995",
            detail: "Whitman, E. \u201cTrained Assent.\u201d Ancient Philosophy 15 (1995).",
            status: "unverified",
            archive: "Pending archive match",
          },
        ],
      },
      {
        id: "references",
        title: "References",
        body: "Two source families carry this reading: the Oxford commentary tradition and the Cambridge logic tradition, which diverge on whether assent admits degrees.",
        citations: [
          {
            id: "long-1996",
            label: "Long 1996",
            detail: "Long, A. A. Stoicism: Studies. OUP, 1996, ch. 4.",
            status: "verified",
            archive: "JSTOR 0.91",
          },
          {
            id: "inwood-1985",
            label: "Inwood 1985",
            detail: "Inwood, B. Stoic Logic. CUP, 1985 \u2014 disputed reading.",
            status: "disputed",
            archive: "Conflicting recension",
          },
        ],
      },
      {
        id: "variants",
        title: "Manuscript variants",
        body: "The Vatican witness omits \u201cand no one can take it from us\u201d; editors since Schenkl restore it from the Salamanca copy.",
        citations: [
          {
            id: "schenkl-1916",
            label: "Schenkl 1916",
            detail: "Schenkl, H. Epicteti Dissertationes. Teubner, 1916, apparatus ad loc.",
            status: "verified",
            archive: "Teubner facsimile",
          },
        ],
      },
    ],
    rebuttals: [
      {
        id: "r1",
        perspective: "Stoic",
        claim: "Assent is wholly internal; the impression is not.",
        status: "verified",
        counter: {
          author: "E. Whitman",
          body: "Assent is trained, not free — habit fixes it before judgment.",
          status: "disputed",
        },
        citations: [
          {
            id: "long-1996b",
            label: "Long 1996, ch. 4",
            detail: "Long, A. A. Stoicism: Studies. OUP, 1996.",
            status: "verified",
            archive: "JSTOR 0.91",
          },
        ],
      },
      {
        id: "r2",
        perspective: "Stoic",
        claim: "The good is reducible to virtue alone.",
        status: "disputed",
        counter: {
          author: "M. Brennan",
          body: "\u201cIndifferents\u201d function as real goods in practice.",
          status: "verified",
        },
        citations: [
          {
            id: "brennan-2005",
            label: "Brennan 2005",
            detail: "Brennan, T. The Stoic Life. OUP, 2005, pp. 118\u2013124.",
            status: "verified",
            archive: "OUP DOI resolved",
          },
        ],
      },
      {
        id: "r3",
        perspective: "Aristotelian",
        claim: "Eudaimonia requires external goods the Stoics deny.",
        status: "unverified",
        citations: [
          {
            id: "ne-1-9",
            label: "Nicomachean Ethics I.9",
            detail: "Aristotle, Nicomachean Ethics I.9, 1099a31.",
            status: "unverified",
            archive: "Awaiting line collation",
          },
        ],
      },
    ],
    map: {
      nodes: [
        { id: "assent", label: "Assent", x: 46, y: 16, status: "verified", root: true },
        { id: "virtue", label: "Virtue", x: 72, y: 44, status: "verified" },
        { id: "habit", label: "Habit", x: 20, y: 44, status: "disputed" },
        { id: "eudaimonia", label: "Eudaimonia", x: 40, y: 78, status: "unverified" },
        { id: "indifferents", label: "Indifferents", x: 74, y: 78, status: "unverified" },
      ],
      edges: [
        ["assent", "virtue"],
        ["assent", "habit"],
        ["virtue", "indifferents"],
        ["habit", "eudaimonia"],
      ],
    },
  },
  {
    id: "genesis-1-1",
    kind: "verse",
    collection: "religious",
    breadcrumb: "Sources / Religious texts / Torah",
    title: "Genesis 1:1–2",
    subtitle: "On formlessness and the ordering of creation",
    primary:
      "In the beginning the heavens and the earth were without form, and darkness was upon the face of the deep.",
    secondary:
      "And the spirit moved over the face of the waters — the ordering, not yet the making, of the world.",
    sections: [
      {
        id: "commentary",
        title: "Commentary",
        body: "The Hebrew tohu wa-bohu is read by Rashi as chaos rather than vacancy, framing the passage as the ordering of pre-existing matter rather than creation ex nihilo.",
        citations: [
          {
            id: "rashi",
            label: "Rashi, ad loc.",
            detail: "Rashi, Commentary on Genesis 1:1, Mikraot Gedolot.",
            status: "verified",
            archive: "Sefaria canonical",
          },
        ],
      },
      {
        id: "references",
        title: "References",
        body: "The Septuagint reading (aoratos kai akataskeuastos) shifts the sense toward invisibility, which the Vulgate does not preserve.",
        citations: [
          {
            id: "lxx",
            label: "LXX Gen 1:2",
            detail: "Rahlfs-Hanhart, Septuaginta, Gen 1:2.",
            status: "verified",
            archive: "Göttingen edition",
          },
          {
            id: "westermann",
            label: "Westermann 1984",
            detail: "Westermann, C. Genesis 1–11: A Commentary. Fortress, 1984.",
            status: "disputed",
            archive: "Translation contested",
          },
        ],
      },
    ],
    rebuttals: [
      {
        id: "g1",
        perspective: "Creation ex nihilo",
        claim: "The verse asserts an absolute beginning with no prior substrate.",
        status: "disputed",
        counter: {
          author: "C. Westermann",
          body: "The syntax is a dependent clause: \u201cwhen God began to create\u201d, presupposing the deep.",
          status: "verified",
        },
        citations: [
          {
            id: "westermann-b",
            label: "Westermann 1984, p. 94",
            detail: "Westermann, C. Genesis 1–11. Fortress, 1984, p. 94.",
            status: "verified",
            archive: "Fortress DOI resolved",
          },
        ],
      },
      {
        id: "g2",
        perspective: "Comparative Near Eastern",
        claim: "The deep (tehom) echoes Tiamat, placing the text in a shared cosmogonic idiom.",
        status: "unverified",
        citations: [
          {
            id: "enuma",
            label: "Enūma Eliš I.1–9",
            detail: "Lambert, W. G. Babylonian Creation Myths. Eisenbrauns, 2013.",
            status: "unverified",
            archive: "Awaiting tablet collation",
          },
        ],
      },
    ],
    map: {
      nodes: [
        { id: "beginning", label: "Beginning", x: 46, y: 16, status: "verified", root: true },
        { id: "exnihilo", label: "Ex nihilo", x: 20, y: 46, status: "disputed" },
        { id: "substrate", label: "Substrate", x: 74, y: 46, status: "verified" },
        { id: "tehom", label: "Tehom", x: 46, y: 78, status: "unverified" },
      ],
      edges: [
        ["beginning", "exnihilo"],
        ["beginning", "substrate"],
        ["substrate", "tehom"],
      ],
    },
  },
  {
    id: "euthyphro-dilemma",
    kind: "premise",
    collection: "philosophy",
    breadcrumb: "Premises / Philosophy / Ethics",
    title: "P1 — The Euthyphro Dilemma",
    subtitle: "Is the pious loved by the gods because it is pious, or pious because loved?",
    primary:
      "Is the pious loved by the gods because it is pious, or is it pious because it is loved by the gods?",
    secondary:
      "Either horn costs something: the first makes divine will superfluous, the second makes goodness arbitrary.",
    sections: [
      {
        id: "commentary",
        title: "Commentary",
        body: "Vlastos reads Socrates as collapsing both horns rather than choosing one, since each destroys a commitment Euthyphro has already conceded.",
        citations: [
          {
            id: "vlastos-1971",
            label: "Vlastos 1971",
            detail: "Vlastos, G. \u201cSocrates, Irony, and Democracy.\u201d JHS 91 (1971).",
            status: "verified",
            archive: "JSTOR 0.88",
          },
        ],
      },
      {
        id: "references",
        title: "References",
        body: "Modern divine-command literature usually enters through Adams; the natural-law reply through Finnis.",
        citations: [
          {
            id: "adams-1999",
            label: "Adams 1999",
            detail: "Adams, R. M. Finite and Infinite Goods. OUP, 1999.",
            status: "verified",
            archive: "OUP DOI resolved",
          },
          {
            id: "finnis-1980",
            label: "Finnis 1980",
            detail: "Finnis, J. Natural Law and Natural Rights. Clarendon, 1980.",
            status: "unverified",
            archive: "Edition ambiguity",
          },
        ],
      },
    ],
    rebuttals: [
      {
        id: "e1",
        perspective: "Divine command",
        claim: "Obligation is constituted by the command of a loving God.",
        status: "verified",
        counter: {
          author: "G. Vlastos",
          body: "This concedes arbitrariness unless love is itself constrained by the good.",
          status: "verified",
        },
        citations: [
          {
            id: "adams-b",
            label: "Adams 1999, ch. 11",
            detail: "Adams, R. M. Finite and Infinite Goods. OUP, 1999, ch. 11.",
            status: "verified",
            archive: "OUP DOI resolved",
          },
        ],
      },
      {
        id: "e2",
        perspective: "Natural law",
        claim:
          "Goodness is grounded in nature, which the divine will recognizes rather than creates.",
        status: "unverified",
        counter: {
          author: "R. M. Adams",
          body: "Then the normativity of nature still needs an account no less contested than command.",
          status: "unverified",
        },
        citations: [
          {
            id: "finnis-b",
            label: "Finnis 1980, §II",
            detail: "Finnis, J. Natural Law and Natural Rights. Clarendon, 1980, §II.",
            status: "unverified",
            archive: "Edition ambiguity",
          },
        ],
      },
      {
        id: "e3",
        perspective: "Kantian",
        claim:
          "Moral obligation rests on the categorical imperative, autonomous from any external authority.",
        status: "disputed",
        citations: [
          {
            id: "groundwork",
            label: "Groundwork 4:442",
            detail: "Kant, I. Groundwork, Ak. 4:442 (Gregor tr.).",
            status: "disputed",
            archive: "Anachronism contested",
          },
        ],
      },
    ],
    map: {
      nodes: [
        { id: "dilemma", label: "Dilemma", x: 46, y: 14, status: "verified", root: true },
        { id: "command", label: "Command", x: 20, y: 44, status: "verified" },
        { id: "nature", label: "Nature", x: 74, y: 44, status: "unverified" },
        { id: "autonomy", label: "Autonomy", x: 34, y: 78, status: "disputed" },
        { id: "arbitrary", label: "Arbitrariness", x: 72, y: 78, status: "verified" },
      ],
      edges: [
        ["dilemma", "command"],
        ["dilemma", "nature"],
        ["command", "arbitrary"],
        ["nature", "autonomy"],
      ],
    },
  },
  {
    id: "meditations-3-1",
    kind: "verse",
    collection: "ethics",
    breadcrumb: "Sources / Ethics / Stoicism",
    title: "Marcus Aurelius — Meditations III.1",
    subtitle: "On the diminishing remainder of a life",
    primary:
      "Not only is our life wasting away hourly, but a smaller portion of it is left; and even if we live longer, it is uncertain whether the understanding will remain.",
    secondary:
      "Therefore we must hasten, not because life ends, but because the capacity to use it well may end first.",
    sections: [
      {
        id: "commentary",
        title: "Commentary",
        body: "Hadot reads this as a spiritual exercise rather than a lament: the finitude of judgment, not of years, sets the urgency.",
        citations: [
          {
            id: "hadot-1998",
            label: "Hadot 1998",
            detail: "Hadot, P. The Inner Citadel. Harvard UP, 1998.",
            status: "verified",
            archive: "Harvard UP DOI",
          },
        ],
      },
      {
        id: "references",
        title: "References",
        body: "Farquharson's apparatus notes an uncertain reading in the final clause, followed by most translators without comment.",
        citations: [
          {
            id: "farquharson",
            label: "Farquharson 1944",
            detail: "Farquharson, A. S. L. The Meditations of Marcus Aurelius. Clarendon, 1944.",
            status: "disputed",
            archive: "Apparatus uncertain",
          },
        ],
      },
    ],
    rebuttals: [
      {
        id: "m1",
        perspective: "Stoic",
        claim: "Urgency follows from the fragility of the ruling faculty, not from death.",
        status: "verified",
        counter: {
          author: "A. S. L. Farquharson",
          body: "The clause may instead concern bodily decline, making the argument ordinary rather than novel.",
          status: "disputed",
        },
        citations: [
          {
            id: "hadot-b",
            label: "Hadot 1998, pt. II",
            detail: "Hadot, P. The Inner Citadel. Harvard UP, 1998, pt. II.",
            status: "verified",
            archive: "Harvard UP DOI",
          },
        ],
      },
      {
        id: "m2",
        perspective: "Epicurean",
        claim: "Urgency of this kind is superfluous: what ends cannot harm the one who ends.",
        status: "unverified",
        citations: [
          {
            id: "ep-menoeceus",
            label: "Letter to Menoeceus 125",
            detail: "Epicurus, Letter to Menoeceus 125 (Diogenes Laertius X).",
            status: "unverified",
            archive: "Awaiting collation",
          },
        ],
      },
    ],
    map: {
      nodes: [
        { id: "finitude", label: "Finitude", x: 46, y: 16, status: "verified", root: true },
        { id: "faculty", label: "Faculty", x: 22, y: 46, status: "verified" },
        { id: "body", label: "Bodily decline", x: 72, y: 46, status: "disputed" },
        { id: "harm", label: "No harm", x: 46, y: 78, status: "unverified" },
      ],
      edges: [
        ["finitude", "faculty"],
        ["finitude", "body"],
        ["faculty", "harm"],
      ],
    },
  },
];

export function citationCount(entry: Entry) {
  return (
    entry.sections.reduce((n, s) => n + s.citations.length, 0) +
    entry.rebuttals.reduce((n, r) => n + r.citations.length, 0)
  );
}

export function allCitations(entry: Entry): Citation[] {
  return [
    ...entry.sections.flatMap((s) => s.citations),
    ...entry.rebuttals.flatMap((r) => r.citations),
  ];
}
