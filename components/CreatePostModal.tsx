import type { CreatePostInput } from "@/types/post";
import { Image, RefreshCw, Sparkles, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePostInput) => Promise<void>;
  isLoading?: boolean;
}

type FormatAction =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "ul"
  | "ol"
  | "quote"
  | "code"
  | "link";

type Tone = "professional" | "casual" | "creative" | "formal";
type Length = "short" | "medium" | "long";

const formatMap: Record<
  FormatAction,
  { before: string; after: string; placeholder: string }
> = {
  bold: { before: "**", after: "**", placeholder: "bold text" },
  italic: { before: "*", after: "*", placeholder: "italic text" },
  underline: { before: "<u>", after: "</u>", placeholder: "underlined text" },
  strikethrough: {
    before: "~~",
    after: "~~",
    placeholder: "strikethrough text",
  },
  ul: { before: "\n- ", after: "", placeholder: "list item" },
  ol: { before: "\n1. ", after: "", placeholder: "list item" },
  quote: { before: "\n> ", after: "", placeholder: "quoted text" },
  code: { before: "`", after: "`", placeholder: "code" },
  link: { before: "[", after: "](url)", placeholder: "link text" },
};

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseMarkdown(text: string): string {
  let html = escapeHtml(text);

  
  html = html.replace(
    /^> (.*?)$/gm,
    '<blockquote class="border-l-4 border-indigo-300 pl-4 italic text-gray-500 my-2">$1</blockquote>',
  );

  html = html.replace(/^- (.*?)$/gm, '<li class="list-disc ml-4">$1</li>');
  html = html.replace(
    /(<li class="list-disc[^>]*>.*?<\/li>)\n?(?=<li class="list-disc)/g,
    "$1",
  );
  html = html.replace(
    /(<li class="list-disc[^\"]*">[\s\S]*?<\/li>)(?!\n?<li class="list-disc)/g,
    '<ul class="my-2 space-y-1">$1</ul>',
  );

  html = html.replace(
    /^\d+\. (.*?)$/gm,
    '<li class="list-decimal ml-4">$1</li>',
  );
  html = html.replace(
    /(<li class="list-decimal[^>]*>.*?<\/li>)\n?(?=<li class="list-decimal)/g,
    "$1",
  );
  html = html.replace(
    /(<li class="list-decimal[^\"]*">[\s\S]*?<\/li>)(?!\n?<li class="list-decimal)/g,
    '<ol class="my-2 space-y-1">$1</ol>',
  );

  html = html.replace(
    /`(.*?)`/g,
    '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>',
  );
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*(?!\s)(.*?)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/<u>(.*?)<\/u>/g, "<u>$1</u>");
  html = html.replace(/~~(.*?)~~/g, "<s>$1</s>");
  html = html.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" class="text-indigo-600 hover:underline" target="_blank" rel="noreferrer">$1</a>',
  );
  html = html.replace(/\n/g, "<br />");
  return html;
}

function markdownToHtmlForEditor(text: string): string {
  return parseMarkdown(text);
}

function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/(?<!\*)\*(?!\s)(.*?)\*(?!\*)/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`(.*?)`/g, "$1");
}

function generateLocalContent(topic: string, tone: Tone, length: Length): string {
  const tLower = topic.toLowerCase();

  const hooks: Record<Tone, string[]> = {
    professional: [
      `In today's rapidly evolving landscape, **${topic}** has emerged as a critical factor driving meaningful change across industries.`,
      `Organizations worldwide are re-examining their approach to **${topic}**, recognizing its outsized impact on outcomes and competitive positioning.`,
      `Recent developments in **${topic}** signal a fundamental shift in how professionals and decision-makers must think about the future.`,
    ],
    casual: [
      `Let's talk about **${topic}** — it's something more people should know about, and honestly, it's more interesting than you might think.`,
      `So you want to learn about **${topic}**? Great choice. It's one of those topics that actually matters in everyday life.`,
      `**${topic}** is everywhere right now, and for good reason. Whether you're new to it or just want a refresher, here's what you need to know.`,
    ],
    creative: [
      `Imagine a world where **${topic}** shapes every experience you have — woven into the fabric of daily life like a thread you never noticed before.`,
      `There's a kind of quiet magic to **${topic}**: the way it transforms the ordinary into something remarkable, the familiar into something new.`,
      `**${topic}** is not just a subject — it's a lens. Through it, the world looks different, bolder, and far more interconnected than we imagined.`,
    ],
    formal: [
      `This analysis examines the multifaceted dimensions of **${topic}**, with particular attention to its structural implications and broader significance.`,
      `The subject of **${topic}** warrants careful examination, as its principles underpin many contemporary mechanisms through which outcomes are determined.`,
      `An in-depth inquiry into **${topic}** reveals a complex interplay of factors that demand rigorous analytical consideration.`,
    ],
  };

  const bodyParagraphs: Record<Tone, string[]> = {
    professional: [
      `Research consistently demonstrates that ${tLower} yields measurable improvements when applied with strategic intent. Stakeholders who invest early in understanding its nuances tend to outperform those who adopt a reactive stance. The compounding effect of early investment in this area cannot be overstated — organizations that build capability now are the ones best equipped to scale later.`,
      `From a strategic perspective, ${tLower} addresses core challenges that many organizations struggle to resolve through conventional means. By reframing the problem and leveraging best practices, teams can unlock efficiencies that translate directly to performance. Cross-functional alignment is often the missing ingredient, and ${tLower} provides the common language to achieve it.`,
      `Key metrics associated with ${tLower} include adoption rates, implementation timelines, and downstream impact on user outcomes. Tracking these indicators provides the visibility needed to make evidence-based adjustments. Leaders who prioritize measurement over assumption consistently extract more value from their investments in this space.`,
      `Industry leaders have consistently cited ${tLower} as a differentiating factor. Companies that treat it as a strategic priority demonstrate greater resilience and adaptability over time. When disruption hits — and it always does — those with a mature understanding of ${tLower} recover faster and emerge stronger than their peers.`,
      `Building internal capability around ${tLower} is not a one-time initiative — it is an ongoing commitment. The most successful teams treat it as a core competency rather than a project, embedding it into workflows, culture, and decision-making at every level of the organization.`,
      `Collaboration is a force multiplier when it comes to ${tLower}. When diverse perspectives are brought to bear on its application, the outcomes are richer, more robust, and more sustainable. High-performing teams actively seek input from voices outside their immediate domain, recognizing that blind spots are the enemy of progress.`,
    ],
    casual: [
      `Here's the thing about ${tLower}: it's not as complicated as it seems once you break it down. The core idea is pretty straightforward, and once it clicks, you'll start seeing it everywhere. Give it a week of focused attention and you'll wonder how you ever got along without it.`,
      `Most people get stuck because they overthink ${tLower}. The best approach is to start small, experiment a bit, and let your understanding grow naturally. Perfectionism is the enemy here — progress beats polish every single time.`,
      `A lot of folks don't realize how much ${tLower} impacts their daily routine. Once you tune into it, you'll notice opportunities you were walking past every single day. That awareness alone is worth more than any tool or trick you'll find online.`,
      `The community around ${tLower} is surprisingly welcoming. Whether you're just getting started or looking to deepen your knowledge, there are great resources out there — and real people who genuinely want to help you succeed.`,
      `One of the best things you can do with ${tLower} is just talk about it. Share what you're learning, ask questions, and stay curious. Some of the best insights come from casual conversations, not formal study. Don't underestimate the power of a good discussion.`,
      `Consistency matters way more than intensity when it comes to ${tLower}. Showing up regularly — even for short stretches — compounds faster than you'd expect. Small wins stack up, and before long, you'll have built something you're genuinely proud of.`,
    ],
    creative: [
      `At its heart, ${tLower} is a story — one told in patterns, in choices, in the small moments that accumulate into something larger and more profound than any individual act. To engage with it is to participate in an ongoing narrative that predates you and will outlast you.`,
      `Consider the paradox embedded within ${tLower}: the more you examine it, the more dimensions reveal themselves. It invites curiosity not as a destination, but as a practice — one that rewards patience and punishes certainty.`,
      `The beauty of ${tLower} lies in its contradictions. It is simultaneously ancient and new, simple and layered, personal and universal. This tension is not a flaw; it is the very source of its richness and its power to move people.`,
      `What ${tLower} teaches, ultimately, is that complexity and clarity are not opposites. They are partners in a creative dialogue that produces outcomes of rare and enduring value. The most compelling work emerges at exactly that intersection.`,
      `To truly understand ${tLower}, you must be willing to sit with ambiguity for a while. The answers worth having rarely announce themselves immediately. They surface slowly, through reflection, through conversation, through the quiet accumulation of experience over time.`,
      `There is a generosity at the heart of ${tLower} — a willingness to offer something without knowing exactly how it will be received. That openness, that vulnerability, is precisely what makes the encounter between creator and subject so unexpectedly powerful.`,
    ],
    formal: [
      `A thorough examination of ${tLower} necessitates engagement with both its theoretical underpinnings and its practical manifestations. Neither dimension alone is sufficient to yield the depth of understanding required for meaningful application or sound policy-making.`,
      `It is worth noting that ${tLower} does not exist in isolation. Its significance is derived from the broader systemic context shaped by historical precedent, institutional frameworks, and the evolving expectations of the communities it serves.`,
      `The empirical evidence pertaining to ${tLower} reveals patterns that are both instructive and counterintuitive. Analysts who approach the subject without prior assumptions extract the most accurate conclusions and are best positioned to advise on its implications.`,
      `Any comprehensive treatment of ${tLower} must account for the tension between generalization and particularity. While broad principles can be identified, their application is always mediated by local conditions, available resources, and the specific objectives of the stakeholders involved.`,
      `Scholarly discourse on ${tLower} has evolved considerably over the past decade, reflecting both methodological advances and a growing recognition of its interdisciplinary nature. Engagement with this literature is essential for anyone seeking to contribute meaningfully to the field.`,
      `Policymakers and practitioners alike would benefit from a more systematic approach to ${tLower} — one that integrates quantitative evidence with qualitative insight, and that remains attentive to unintended consequences as well as intended outcomes.`,
    ],
  };

  const midSectionHeaders: Record<Tone, string[]> = {
    professional: ["## Why It Matters Now", "## The Strategic Case", "## Key Considerations"],
    casual: ["## The Part Most People Miss", "## Here's What Actually Helps", "## Worth Knowing"],
    creative: ["## A Closer Look", "## The Deeper Current", "## What Lies Beneath"],
    formal: ["## Analytical Dimensions", "## Further Considerations", "## Implications for Practice"],
  };

  const conclusions: Record<Tone, string[]> = {
    professional: [
      `## Takeaway\n\nThe evidence is clear: ${tLower} is not a peripheral concern — it is central to sustained success. Organizations and individuals who engage with it deliberately will be best positioned to navigate the opportunities ahead. The window for early advantage is open now; those who act with intention will define the next chapter.`,
      `## Moving Forward\n\nBuilding a thoughtful strategy around ${tLower} starts with understanding its foundations and committing to continuous improvement. It requires investment, patience, and a willingness to learn from both successes and setbacks. The organizations that do this well don't just survive change — they shape it.`,
    ],
    casual: [
      `## Bottom Line\n\n${topic} is worth your time. Every bit of knowledge you build here compounds. Start where you are, use what you have, and go from there — you'll be surprised how quickly things start to click when you stay consistent and stay curious.`,
      `## Final Thoughts\n\nHopefully this gives you a solid starting point with ${tLower}. The more you engage with it, the more it gives back. Keep showing up, keep asking questions, and don't be afraid to get things wrong along the way — that's how the real learning happens.`,
    ],
    creative: [
      `## The Invitation\n\nIn the end, ${tLower} asks nothing more — and nothing less — than your full attention. Bring curiosity, bring patience, and it will repay you in ways you didn't expect. The most meaningful discoveries are rarely the ones you planned for.`,
      `## A Closing Thought\n\nEvery exploration of ${tLower} is, in some small way, a transformation. You arrive with a question; you leave with a deeper relationship to the world around you. And that, perhaps, is the most honest measure of its value.`,
    ],
    formal: [
      `## Conclusion\n\nIn summation, ${tLower} represents a domain of considerable intellectual and practical significance. Its study demands rigor, nuance, and a willingness to engage with complexity — qualities that, when brought to bear consistently, yield insights of lasting value to scholars, practitioners, and policymakers alike.`,
      `## Summary Observations\n\nThe foregoing analysis underscores the importance of a systematic approach to ${tLower}. Practitioners and scholars alike would benefit from sustained engagement with both its theoretical dimensions and empirical realities. Progress in this area will depend on the quality of collaboration between disciplines and the willingness to revise assumptions in light of new evidence.`,
    ],
  };

  const seed = topic.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pick = <T,>(arr: T[]): T => arr[seed % arr.length];
  const pickAlt = <T,>(arr: T[]): T => arr[(seed + 1) % arr.length];
  const pickThird = <T,>(arr: T[]): T => arr[(seed + 2) % arr.length];

  const hook = pick(hooks[tone]);
  const body = bodyParagraphs[tone];
  const conclusion = pick(conclusions[tone]);
  const midHeader = pick(midSectionHeaders[tone]);

  const b0 = body[seed % body.length];
  const b1 = body[(seed + 1) % body.length];
  const b2 = body[(seed + 2) % body.length];
  const b3 = body[(seed + 3) % body.length];
  const b4 = body[(seed + 4) % body.length];
  const b5 = body[(seed + 5) % body.length];
  const b6 = body[(seed + 6) % body.length];

  if (length === "short") {
  return `${hook}

${b0}`;
}

if (length === "medium") {
  return `${hook}

${b0}

${b1}

${b2}`;
}

// long
return `${hook}

${b0}

${b1}

${b2}

${b3}

${b4}

${b0}

${b1}`;

}

function getTopicKeywords(topic: string): string[] {
  const stopWords = new Set([
    "about",
    "and",
    "for",
    "the",
    "this",
    "that",
    "with",
    "from",
    "have",
    "hate",
    "like",
    "love",
    "dislike",
  ]);

  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function looksLikeGenericGeneratedContent(text: string): boolean {
  const lower = text.toLowerCase();
  const genericPhrases = [
    "community around",
    "great resources out there",
    "want to help you succeed",
    "not as complicated as it seems",
    "start seeing it everywhere",
    "small wins stack up",
    "progress beats polish",
  ];

  return genericPhrases.some((phrase) => lower.includes(phrase));
}

function isGeneratedRelevant(text: string, topic: string): boolean {
  const keywords = getTopicKeywords(topic);
  if (!keywords.length) return !looksLikeGenericGeneratedContent(text);

  const lower = text.toLowerCase();
  return keywords.some((word) => lower.includes(word)) && !looksLikeGenericGeneratedContent(text);
}

function generateGroundedLocalContent(topic: string, tone: Tone, length: Length): string {
  const cleanTopic = topic.trim();
  const lowerTopic = cleanTopic.toLowerCase();
  const isPersonalOpinion = /\b(i|we)\s+(hate|dislike|love|like|prefer|avoid|miss)\b/.test(lowerTopic);
  const isNegativeOpinion = /\b(hate|dislike|avoid|can't stand|cannot stand)\b/.test(lowerTopic);

  const opinionHooks: Record<Tone, string> = {
    professional: `A fair discussion of "${cleanTopic}" should treat it as a specific point of view, not as a broad trend or a topic people need to study.`,
    casual: `Let's be honest about "${cleanTopic}": some opinions are personal, specific, and a little unpopular, but that does not make them meaningless.`,
    creative: `"${cleanTopic}" is the kind of statement that immediately has a voice behind it: direct, opinionated, and probably built from a few very real experiences.`,
    formal: `The statement "${cleanTopic}" is best understood as a personal preference that invites explanation rather than exaggeration.`,
  };

  const neutralHooks: Record<Tone, string> = {
    professional: `A useful post about "${cleanTopic}" should stay close to the topic, define the angle clearly, and avoid broad claims that are not supported by the prompt.`,
    casual: `Let's talk about "${cleanTopic}" in a way that actually sticks to the point instead of turning it into generic advice.`,
    creative: `"${cleanTopic}" deserves a treatment that feels specific: grounded in details, examples, and a clear point of view.`,
    formal: `A focused discussion of "${cleanTopic}" requires clarity, context, and restraint in the claims being made.`,
  };

  const opinionParagraphs = [
    isNegativeOpinion
      ? `The most convincing way to explain this kind of dislike is to name what does not work: the taste, the smell, the texture, the heaviness, the memories attached to it, or even the way everyone expects you to enjoy it. Food opinions are rarely just about food. They are also about comfort, habit, mood, and the pressure of sitting at a table where everyone else seems to love what you cannot get into.`
      : `The strongest version of this opinion comes from being honest about the details. Maybe it is tied to taste, nostalgia, convenience, comfort, or the people connected to it. Personal preferences become more interesting when they explain the experience behind the sentence instead of simply repeating the sentence itself.`,
    `That does not mean everyone else is wrong. A good post can leave room for people who feel differently while still making the opinion clear. The point is not to win a debate over "${cleanTopic}". The point is to explain why this feeling makes sense from one person's side of the table.`,
    `Specific examples help a lot here. If the issue is biryani, the post can talk about strong spices, layered rice, the aroma, the expectation that it should be exciting, or the awkwardness of admitting that a beloved dish just does not land for you. Those details make the writing feel human instead of random.`,
    `There is also a social angle. Popular things can be weirdly hard to dislike out loud because people treat the dislike as a personality flaw. Saying "${cleanTopic}" can become less about the item itself and more about being allowed to have a different taste without turning every meal, movie, song, or trend into a group vote.`,
    `A balanced ending works better than a dramatic one. The post can say that preferences change, that one version might be better than another, or that respect for other people's favorites still matters. A strong opinion does not need to become rude to feel confident.`,
    `The post can also be playful without being careless. A sentence like this can invite humor, but the humor works best when it stays connected to the actual experience: avoiding the dish at gatherings, explaining yourself to friends, or trying one more bite because someone insists this version will change your mind. That kind of scene gives the opinion texture.`,
    `For a longer version, the writing should explore both the personal side and the cultural side. It can admit that biryani is meaningful to many people while still saying the speaker does not enjoy it. That balance keeps the post from sounding like an attack and makes the dislike easier to understand, even for readers who strongly disagree.`,
    `The result should feel like a real post from a real person: clear about the feeling, specific about the reasons, and relaxed enough to admit that taste is subjective. That is far more useful than pretending the topic has a learning curve, a professional community, or a set of resources to master.`,
  ];

  const neutralParagraphs = [
    `Start by making the angle explicit. If the post is explaining a concept, define it. If it is sharing an opinion, say what shaped that opinion. If it is asking a question, describe why the question matters. That first layer of context keeps the content from drifting into empty motivational language.`,
    `The next step is to add concrete detail. Good writing about "${cleanTopic}" should include examples, tradeoffs, reactions, or situations where the topic actually shows up. Readers trust specificity because it sounds like the writer has thought about the subject instead of filling space.`,
    `It also helps to acknowledge limits. Not every topic needs claims about communities, resources, productivity, or long-term success. Some topics are personal. Some are funny. Some are complaints. Some are simple observations. Matching the shape of the response to the shape of the prompt is what makes the generated post feel relevant.`,
    `A better post should keep returning to the original idea while developing it from different angles. That might mean explaining the background, adding a counterpoint, describing an example, and closing with a clear takeaway. Each paragraph should move the thought forward instead of repeating the same sentence in new words.`,
    `For longer content, the post should expand through real angles instead of repetition. It can compare different viewpoints, describe a common misconception, show a practical example, and explain why the subject matters to the intended reader. Each added paragraph needs a job.`,
    `Tone matters too. A casual prompt should sound conversational. A formal prompt should sound measured. A creative prompt can use imagery, but it should still stay anchored to the subject. The style should serve "${cleanTopic}" instead of hiding weak relevance behind polished language.`,
    `The final version should sound intentional: focused on "${cleanTopic}", natural in tone, and free of filler that could be pasted onto any subject. When the writing has those qualities, the word count supports the message instead of covering for weak content.`,
  ];

  const paragraphs = isPersonalOpinion
    ? [opinionHooks[tone], ...opinionParagraphs]
    : [neutralHooks[tone], ...neutralParagraphs];

  const targetWordsByLength: Record<Length, number> = {
    short: 100,
    medium: 250,
    long: 500,
  };
  const selectedParagraphs =
    length === "short"
      ? paragraphs.slice(0, 2)
      : length === "medium"
        ? paragraphs.slice(0, 4)
        : paragraphs;
  const expansionParagraphs = [
    `Another useful angle is to keep the wording close to the prompt itself. When someone says "${cleanTopic}", the response should not wander into abstract encouragement or pretend the topic is a skill to master. It should explain the statement, explore the feeling behind it, and give readers enough detail to understand the point of view.`,
    `The stronger version also avoids repeating the same claim. It can move from first impressions to examples, from examples to social reactions, and from social reactions to a fair conclusion. That structure gives the post enough length while still feeling like every paragraph belongs.`,
    `In the end, relevance matters more than sounding impressive. A post can be polished, funny, formal, or creative, but it still has to answer the prompt in front of it. Staying grounded in "${cleanTopic}" is what makes the content useful.`,
  ];

  let result = selectedParagraphs.join("\n\n");
  for (const paragraph of expansionParagraphs) {
    if (getWordCount(result) >= targetWordsByLength[length]) break;
    result = `${result}\n\n${paragraph}`;
  }

  return result;
}

export default function CreatePostModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: CreatePostModalProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageErrorMsg, setImageErrorMsg] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
const [aiTone, setAiTone] = useState<Tone>("casual");
  const [aiLength, setAiLength] = useState<Length>("medium");
  const [aiLoading, setAiLoading] = useState(false);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteError, setRewriteError] = useState("");
  const [aiError, setAiError] = useState("");
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageStyle, setImageStyle] = useState<"realistic" | "artistic" | "minimal" | "vibrant">("realistic");
  const [imageSize, setImageSize] = useState<"small" | "medium" | "large">("medium");
  const [imageGenLoading, setImageGenLoading] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [contentError, setContentError] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedSelection = useRef<Range | null>(null);
  const imageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearImageTimer = () => {
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  useEffect(() => {
    clearImageTimer();
    if (!imageUrl.trim()) return;
    setImageLoaded(false);
    setImageError(false);
    setImageErrorMsg("");
    imageTimerRef.current = setTimeout(() => {
      setImageLoaded((loaded) => {
        if (!loaded) {
          setImageError(true);
          setImageErrorMsg("Image could not be loaded. Check the URL and try again.");
        }
        return loaded;
      });
    }, 10000);
    return () => clearImageTimer();
  }, [imageUrl, retryKey]);

  const syncContentFromEditor = () => {
    const el = editorRef.current;
    if (!el) return;
    setContent(el.innerHTML);
    setContentError(false);
    setRewriteError("");
  };

  const getEditorText = () => editorRef.current?.innerText.trim() ?? "";

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedSelection.current = sel.getRangeAt(0);
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (!sel || !savedSelection.current) return;
    sel.removeAllRanges();
    sel.addRange(savedSelection.current);
  };
 const insertNodeAtSelection = (node: Node) => {
const el = editorRef.current;
if (!el) return;

el.focus();
restoreSelection();

const sel = window.getSelection();
if (!sel || sel.rangeCount === 0) return;

const range = sel.getRangeAt(0);
range.deleteContents();

let lastNode: Node | null = null;

if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
const frag = node as DocumentFragment;
const nodes = Array.from(frag.childNodes);
nodes.forEach((child) => {
lastNode = child;
range.insertNode(child);
range.setStartAfter(child);
range.collapse(true);
});
} else {
range.insertNode(node);
lastNode = node;
range.setStartAfter(node);
range.collapse(true);
}

sel.removeAllRanges();
sel.addRange(range);
syncContentFromEditor();
}; 

  const replaceSelectionWithHtml = (html: string) => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const frag = document.createDocumentFragment();
    let node: ChildNode | null;
    while ((node = temp.firstChild)) frag.appendChild(node);
    insertNodeAtSelection(frag);
  };

  const applyFormat = (action: FormatAction) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const selectedText = sel.toString();
    if (action === "bold") return replaceSelectionWithHtml(`<strong>${selectedText || formatMap.bold.placeholder}</strong>`);
    if (action === "italic") return replaceSelectionWithHtml(`<em>${selectedText || formatMap.italic.placeholder}</em>`);
    if (action === "underline") return replaceSelectionWithHtml(`<u>${selectedText || formatMap.underline.placeholder}</u>`);
    if (action === "strikethrough") return replaceSelectionWithHtml(`<s>${selectedText || formatMap.strikethrough.placeholder}</s>`);
    if (action === "code") return replaceSelectionWithHtml(`<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">${selectedText || formatMap.code.placeholder}</code>`);
    if (action === "link") return replaceSelectionWithHtml(`<a href="https://example.com" class="text-indigo-600 underline" target="_blank" rel="noreferrer">${selectedText || formatMap.link.placeholder}</a>`);
    if (action === "quote") return replaceSelectionWithHtml(`<blockquote class="border-l-4 border-indigo-300 pl-4 italic text-gray-500 my-2">${selectedText || formatMap.quote.placeholder}</blockquote>`);
    if (action === "ul") return replaceSelectionWithHtml(`<ul class="list-disc ml-6 my-2"><li>${selectedText || formatMap.ul.placeholder}</li></ul>`);
    if (action === "ol") return replaceSelectionWithHtml(`<ol class="list-decimal ml-6 my-2"><li>${selectedText || formatMap.ol.placeholder}</li></ol>`);
    const { before, after, placeholder } = formatMap[action];
    const textNode = document.createTextNode(`${before}${selectedText || placeholder}${after}`);
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    syncContentFromEditor();
  };

  const insertImageAtCursor = (src: string, alt = "Inserted image") => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    img.className = "max-w-full rounded-xl my-2 block";
    img.setAttribute("contenteditable", "false");
    insertNodeAtSelection(img);
    const br = document.createElement("br");
    insertNodeAtSelection(br);
  };

  const handleInsertImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageInsertFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError(true);
      setImageErrorMsg("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        insertImageAtCursor(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError(true);
      setImageErrorMsg("Please select a valid image file.");
      return;
    }
    clearImageTimer();
    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);
    setImageLoaded(false);
    setImageError(false);
    setImageErrorMsg("");
    setRetryKey((k) => k + 1);
    e.target.value = "";
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          tone: aiTone,
          length: aiLength,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        setAiError(error.error || "Failed to generate post. Please try again.");
        return;
      }

      const data = await res.json();
      const generated = data.content?.trim();

      if (!generated) {
        setAiError("No content generated. Please try again.");
        return;
      }

      const newContent = content
        ? `${content}\n\n${generated}`
        : generated;

      setContent(newContent);

      if (editorRef.current) {
        editorRef.current.innerHTML = newContent;
      }

      setShowAiPanel(false);
      setAiPrompt("");
    } catch (err) {
      console.error("Generate AI error:", err);
      setAiError("An error occurred. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleRewriteAI = async () => {
    const textToRewrite = getEditorText();
    if (!textToRewrite) return;

    setRewriteLoading(true);
    setRewriteError("");
    try {
      const res = await fetch("/api/rewrite-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: textToRewrite }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        setRewriteError(error.error || "Failed to rewrite post. Please try again.");
        return;
      }

      const data = await res.json();
      const rewritten = data.content?.trim();

      if (!rewritten) {
        setRewriteError("No content generated. Please try again.");
        return;
      }

      setContent(rewritten);
      setContentError(false);

      if (editorRef.current) {
        editorRef.current.innerText = rewritten;
      }
    } catch (err) {
      console.error("Rewrite AI error:", err);
      setRewriteError("An error occurred. Please try again.");
    } finally {
      setRewriteLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setImageGenLoading(true);
    setImageLoaded(false);
    setImageError(false);
    setImageErrorMsg("");
    try {
      const styleMap = {
        realistic: "photorealistic, highly detailed, professional photography",
        artistic: "digital art, painterly, artistic, vibrant brushstrokes",
        minimal: "minimalist, clean, simple, flat design",
        vibrant: "vibrant colors, high contrast, colorful, vivid",
      };
      const enrichedPrompt = `${imagePrompt.trim()}, ${styleMap[imageStyle]}`;

      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: enrichedPrompt }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { url: string };
      if (!data.url) throw new Error("No image URL returned.");

      setImageUrl(data.url);
      setShowImagePanel(false);
      setImagePrompt("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Image generation failed.";
      setImageError(true);
      setImageErrorMsg(msg);
    } finally {
      setImageGenLoading(false);
    }
  };

  const handleSubmit = async () => {
    const hasTitle = title.trim().length > 0;
    const hasContent = content.trim().length > 0;
    setTitleError(!hasTitle);
    setContentError(!hasContent);
    if (!hasTitle || !hasContent) return;

    await onSubmit({
      title: title.trim(),
      content: content.trim(),
      author: author.trim() || "Anonymous",
      imageUrl: imageUrl.trim() || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });

    handleReset();
    onClose();
  };

  const handleReset = () => {
    clearImageTimer();
    setTitle("");
    setAuthor("");
    setContent("");
    setTags("");
    setImageUrl("");
    setImageLoaded(false);
    setImageError(false);
    setImageErrorMsg("");
    setRetryKey(0);
    setAiPrompt("");
    setShowAiPanel(false);
    setShowImagePanel(false);
    setTitleError(false);
    setContentError(false);
    setActiveTab("write");
    savedSelection.current = null;
    if (editorRef.current) editorRef.current.innerHTML = "";
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const toolbarBtn = (
    action: FormatAction,
    label: string,
    display: React.ReactNode,
    extra = "",
  ) => (
    <button
      type="button"
      title={label}
      onMouseDown={(e) => {
        e.preventDefault();
        saveSelection();
        applyFormat(action);
      }}
      className={`w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-800 transition-colors ${extra}`}
    >
      {display}
    </button>
  );

  useEffect(() => {
  if (activeTab !== "write" || !editorRef.current) return;

  if (!editorRef.current.innerHTML.trim()) {
    editorRef.current.innerHTML =
      content || '<span class="text-gray-400">Share your thoughts.</span>';
  }
}, [activeTab]);
  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="Close modal"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        onClick={handleClose}
        onKeyDown={(e) => e.key === "Escape" && handleClose()}
      />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "56rem" }}>
        <div className="w-full max-h-[84vh] flex flex-col bg-white rounded-[18px] shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-200 shrink-0">
            <h2 className="text-[22px] font-semibold text-gray-900">Create Post</h2>
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 px-7 pt-5 shrink-0">
            {(["write", "preview"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-xl text-[15px] font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? "bg-indigo-700 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-7 pb-6 pt-4">
            {activeTab === "write" ? (
              <div className="space-y-5">
                <div>
                  <label htmlFor="post-title" className="block text-[15px] font-medium text-gray-800 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="post-title"
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setTitleError(false);
                    }}
                    placeholder="Enter a compelling title..."
                    className={`w-full px-4 py-3 border rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-[15px] ${
                      titleError ? "border-red-400 ring-2 ring-red-200" : "border-gray-200"
                    }`}
                  />
                  {titleError && <p className="text-xs text-red-500 mt-1">Title is required.</p>}
                </div>

                <div>
                  <label htmlFor="post-author" className="block text-[15px] font-medium text-gray-800 mb-2">
                    Author Name
                  </label>
                  <input
                    id="post-author"
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Your name (optional)"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-[15px]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="post-content" className="block text-[15px] font-medium text-gray-800">
                      Content <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRewriteAI}
                        disabled={rewriteLoading || !content.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-colors text-sm disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        {rewriteLoading ? "Rewriting..." : "Rewrite with AI"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAiPanel(!showAiPanel)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-colors text-sm"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        Write with AI
                      </button>
                    </div>
                  </div>
                  {rewriteError && (
                    <p className="text-xs text-amber-600 mb-2">{rewriteError}</p>
                  )}

                  {showAiPanel && (
                    <div className="mb-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        <span className="text-xs text-green-700 font-medium">Groq AI active</span>
                      </div>
                      <div className="space-y-3">
                        <textarea
                          value={aiPrompt}
                          onChange={(e) => {
                            setAiPrompt(e.target.value);
                            setAiError("");
                          }}
                          placeholder="What do you want to write about?"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                          rows={2}
                        />
                        {aiError && (
                          <p className="text-xs text-red-600">{aiError}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={aiTone}
                            onChange={(e) => setAiTone(e.target.value as Tone)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="professional">Professional</option>
                            <option value="casual">Casual</option>
                            <option value="creative">Creative</option>
                            <option value="formal">Formal</option>
                          </select>
                          <select
                            value={aiLength}
                            onChange={(e) => setAiLength(e.target.value as Length)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="short">Short</option>
                            <option value="medium">Medium</option>
                            <option value="long">Long</option>
                          </select>
                          <button
                            type="button"
                            onClick={handleGenerateAI}
                            disabled={aiLoading || !aiPrompt.trim()}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            {aiLoading ? "Generating..." : "Generate"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border border-gray-300 rounded-xl overflow-hidden bg-white">
                    <div className="px-3 py-2 border-b border-gray-200 bg-white flex items-center gap-1.5 flex-wrap">
                      <select className="text-sm bg-transparent border-none outline-none px-1 py-1 text-gray-700 cursor-pointer">
                        <option>Normal</option>
                        <option>Heading 1</option>
                        <option>Heading 2</option>
                      </select>
                      <div className="w-px h-5 bg-gray-300 mx-1" />
                      {toolbarBtn("bold", "Bold", "B", "font-bold text-sm")}
                      {toolbarBtn("italic", "Italic", "I", "italic text-sm")}
                      {toolbarBtn("underline", "Underline", "U", "underline text-sm")}
                      {toolbarBtn("strikethrough", "Strikethrough", "S", "line-through text-sm")}
                      <div className="w-px h-5 bg-gray-300 mx-1" />
                      {toolbarBtn("ul", "Bullet List", "•", "text-lg")}
                      {toolbarBtn("ol", "Numbered List", "1.", "text-sm")}
                      {toolbarBtn("quote", "Quote", "\"", "text-lg")}
                      {toolbarBtn("code", "Code", <span className="font-mono text-xs">&lt;/&gt;</span>)}
                      {toolbarBtn("link", "Link", "🔗")}
                      <button
                        type="button"
                        title="Insert Image"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          saveSelection();
                        }}
                        onClick={handleInsertImageClick}
                        className="w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-800 transition-colors"
                      >
                        <Image className="w-4 h-4" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageInsertFromFile}
                      />
                    </div>

                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={syncContentFromEditor}
                      onBlur={saveSelection}
                      onMouseUp={saveSelection}
                      onKeyUp={saveSelection}
                      className={`min-h-[150px] px-4 py-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-gray-800 outline-none ${
                        contentError ? "ring-2 ring-red-200" : ""
                      }`}
                      
                    />
                  </div>

                  {contentError && (
                    <p className="text-xs text-red-500 mt-1">Content is required.</p>
                  )}
                </div>

                <div>
                  <label htmlFor="post-tags" className="block text-[15px] font-medium text-gray-800 mb-2">
                    Tags
                  </label>
                  <input
                    id="post-tags"
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="technology, design, web3 (comma-separated)"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-[15px]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="post-image-url" className="block text-[15px] font-medium text-gray-800">
                      Cover Image
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="cover-image-input"
                        onChange={handleFileUpload}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById("cover-image-input")?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-colors text-sm"
                      >
                        <Upload className="w-4 h-4 text-green-500" />
                        Upload from computer
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowImagePanel(!showImagePanel)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-colors text-sm"
                      >
                        <Image className="w-4 h-4 text-purple-500" />
                        Generate Image
                      </button>
                    </div>
                  </div>

                  {showImagePanel && (
                    <div className="mb-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        <span className="text-xs text-green-700 font-medium">
                          AI image generation active (server-side, free)
                        </span>
                      </div>
                      <div className="space-y-3">
                        <textarea
                          value={imagePrompt}
                          onChange={(e) => setImagePrompt(e.target.value)}
                          placeholder="Describe the image you want..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                          rows={2}
                        />
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={imageStyle}
                            onChange={(e) =>
                              setImageStyle(e.target.value as typeof imageStyle)
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                          >
                            <option value="realistic">Realistic</option>
                            <option value="artistic">Artistic</option>
                            <option value="minimal">Minimal</option>
                            <option value="vibrant">Vibrant</option>
                          </select>
                          <select
                            value={imageSize}
                            onChange={(e) =>
                              setImageSize(e.target.value as typeof imageSize)
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                          <button
                            type="button"
                            onClick={handleGenerateImage}
                            disabled={imageGenLoading || !imagePrompt.trim()}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
                          >
                            {imageGenLoading ? "Generating..." : "Generate"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <input
                    id="post-image-url"
                    type="text"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setRetryKey((k) => k + 1);
                    }}
                    placeholder="https://example.com/image.jpg  (or use buttons above)"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-[15px]"
                  />

                  {(imageUrl || imageError) && (
                    <div
                      className="mt-2 rounded-xl border border-gray-200 overflow-hidden bg-gray-50"
                      style={{ minHeight: "256px" }}
                    >
                      {!imageLoaded && !imageError && (
                        <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-400">
                          <div className="w-6 h-6 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
                          <span className="text-sm">Loading image preview...</span>
                        </div>
                      )}
                      {imageError && (
                        <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-400 px-4 text-center">
                          <Image className="h-8 w-8 text-gray-300" />
                          <span className="text-sm">Could not load image</span>
                          {imageErrorMsg && (
                            <span className="text-xs text-red-500">{imageErrorMsg}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setImageError(false);
                              setImageErrorMsg("");
                              setImageLoaded(false);
                              setRetryKey((k) => k + 1);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Try again
                          </button>
                        </div>
                      )}
                      {imageUrl && (
                        <img
                          key={retryKey}
                          src={imageUrl}
                          alt="Cover preview"
                          className="w-full h-64 object-contain bg-gray-50"
                          style={{ display: imageLoaded ? "block" : "none" }}
                          onLoad={() => {
                            setImageLoaded(true);
                            clearImageTimer();
                          }}
                          onError={() => {
                            setImageError(true);
                            setImageLoaded(false);
                            clearImageTimer();
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6">
                  {imageUrl && imageLoaded && (
                    <img
                      src={imageUrl}
                      alt="Post cover"
                      className="w-full h-64 object-contain rounded-xl mb-4 bg-gray-50"
                    />
                  )}
                  {imageUrl && !imageLoaded && !imageError && (
                    <div className="flex items-center justify-center w-full h-64 rounded-xl mb-4 bg-gray-100">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
                    </div>
                  )}
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {title || "Untitled Post"}
                  </h1>
                  {author && <p className="text-sm text-gray-500 mb-4">By {author}</p>}
                  <div
                    className="prose max-w-none text-gray-700 leading-relaxed text-sm"
                    dangerouslySetInnerHTML={{
                      __html: content
                        ? content
                        : '<span class="text-gray-400 italic">Your post content will appear here...</span>',
                    }}
                  />
                  {tags && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {tags.split(",").map((tag) =>
                        tag.trim() ? (
                          <span
                            key={tag.trim()}
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                          >
                            #{tag.trim()}
                          </span>
                        ) : null,
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 px-7 py-5 border-t border-gray-200 bg-white shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors text-[15px] font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-2.5 bg-indigo-700 text-white rounded-xl hover:bg-indigo-800 disabled:opacity-50 transition-colors text-[15px] font-medium shadow-sm"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Publishing...
                </span>
              ) : (
                "Publish Post"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
