import type { CreatePostInput } from "@/types/post";
import {
  AlarmClock,AtSign,BarChart3,Braces,Calendar,CalendarCheck, ChevronDown, Clock,FileText,Globe,Image,Link,Link2,List,ListOrdered,MapPin,
  Minus,Plus,Redo2,RefreshCw,Sigma,Sparkles,Undo2,Video,Wand2,X,
} from "lucide-react";
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
type MediaComposer = "poll" | "event" | null;
type EventType = "in-person" | "virtual" | "hybrid";
type RewriteAction = "polish" | "shorter" | "longer" | "tone";

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
    /^#\s+(.*?)$/gm,
    '<h1 class="text-2xl font-bold text-gray-900 mt-0 mb-3">$1</h1>',
  );
  html = html.replace(
    /^##\s+(.*?)$/gm,
    '<h2 class="text-xl font-bold text-gray-900 mt-0 mb-3">$1</h2>',
  );

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

function trimLeadingEditorHtml(html: string): string {
  return html.replace(
    /^(\s|&nbsp;|<br\s*\/?>|<div>\s*(?:<br\s*\/?>)?\s*<\/div>|<p>\s*(?:<br\s*\/?>)?\s*<\/p>)+/gi,
    "",
  );
}

function markdownToHtmlForEditor(text: string): string {
  return trimLeadingEditorHtml(parseMarkdown(text));
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

function normalizeTitleText(text: string) {
  return stripMarkdown(text)
    .replace(/<[^>]+>/g, "")
    .replace(/^[\s"'`*_#-]+|[\s"'`*_.!?,:;-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function similarityKey(text: string) {
  return normalizeTitleText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTopicTitle(prompt: string, body: string) {
  const source = `${prompt} ${body}`;
  const secondHomeMatch = source.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b[\s\S]{0,80}\bsecond home\b/i);
  if (secondHomeMatch) return `${secondHomeMatch[1]}, My Second Home`;

  const placeMatch = source.match(/\b(?:love|like|miss|visit|visited|exploring|explore)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  if (placeMatch) return `${placeMatch[1]} Moments`;

  const words = normalizeTitleText(prompt)
    .replace(/\b(i|we|you|they|love|like|hate|dislike|about|write|post|content|the|a|an|and|or|but|is|are|was|were|it|its|my|our|your)\b/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 4);

  const title = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return title || "A Fresh Thought";
}

function normalizeGeneratedPost(generated: string, prompt: string) {
  const lines = generated
    .trim()
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return "";

  let title = "";
  let bodyLines = lines;
  const firstLine = normalizeTitleText(lines[0]);
  const secondLineKey = similarityKey(lines[1] ?? "");
  const firstLineKey = similarityKey(firstLine);
  const firstLineLooksLikeTitle =
    /^#{1,6}\s+/.test(lines[0]) ||
    lines[0].startsWith("**") ||
    (firstLine.length <= 90 && secondLineKey.startsWith(firstLineKey));

  if (firstLineLooksLikeTitle) {
    title = firstLine;
    bodyLines = lines.slice(1);
  }

  const body = bodyLines.join("\n\n");
  const firstSentence = body.match(/^[^.!?]+[.!?]?/)?.[0] ?? "";

  if (!title || similarityKey(firstSentence).startsWith(similarityKey(title))) {
    title = extractTopicTitle(prompt, body);
  }

  const uniqueBodyLines = bodyLines.filter((line, index) => {
    if (index === 0) return true;
    const previous = similarityKey(bodyLines[index - 1]);
    const current = similarityKey(line);
    return !(current.startsWith(previous) || previous.startsWith(current));
  });

  return `# ${title}\n\n${uniqueBodyLines.join("\n\n")}`;
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
  const [content, setContent] = useState("");
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
  const [showRewriteMenu, setShowRewriteMenu] = useState(false);
  const [aiError, setAiError] = useState("");
  const [imageGenLoading, setImageGenLoading] = useState(false);
  const [contentError, setContentError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTextToolbar, setShowTextToolbar] = useState(false);
  const [activeMediaComposer, setActiveMediaComposer] = useState<MediaComposer>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState("1 week");
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState<EventType>("in-person");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventLink, setEventLink] = useState("");

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
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
    setShowRewriteMenu(false);
  };

  const getEditorText = () => editorRef.current?.innerText.trim() ?? "";

  const openNativeInputPicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    const input = e.currentTarget.parentElement?.querySelector("input");
    if (!(input instanceof HTMLInputElement)) return;

    input.focus();
    input.showPicker?.();
  };

  const getImageContentText = () => {
    const liveText = getEditorText();
    if (liveText && liveText !== "Share your thoughts.") return liveText;

    return content
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  };

  const hasEditorContent = (() => {
    const stripped = content.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    return stripped.length > 0;
  })();
  const editorWordCount = getWordCount(getImageContentText());

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

  const insertVideoAtCursor = (src: string) => {
    const video = document.createElement("video");
    video.src = src;
    video.controls = true;
    video.className = "max-w-full rounded-xl my-2 block bg-white";
    video.setAttribute("contenteditable", "false");
    insertNodeAtSelection(video);
    const br = document.createElement("br");
    insertNodeAtSelection(br);
  };

  const insertPdfAtCursor = (src: string, name: string) => {
    const link = document.createElement("a");
    link.href = src;
    link.textContent = name;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.className = "my-2 inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-orange-700 underline";
    link.setAttribute("contenteditable", "false");
    insertNodeAtSelection(link);
    const br = document.createElement("br");
    insertNodeAtSelection(br);
  };

  const handleInsertImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleInsertVideoClick = () => {
    videoInputRef.current?.click();
  };

  const handleInsertPdfClick = () => {
    pdfInputRef.current?.click();
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

  const handleVideoInsertFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setImageError(true);
      setImageErrorMsg("Please select a valid video file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        insertVideoAtCursor(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePdfInsertFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setImageError(true);
      setImageErrorMsg("Please select a valid PDF file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        insertPdfAtCursor(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const buildPollHtml = () => {
    const question = pollQuestion.trim();
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (!question && options.length < 2) return "";

    return `
      <div class="my-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
        <p class="font-semibold text-gray-900">${escapeHtml(question || "Poll")}</p>
        <div class="mt-3 space-y-2">
          ${options
            .map(
              (option) =>
                `<div class="rounded-lg border border-purple-200 bg-white px-3 py-2 text-gray-700">${escapeHtml(option)}</div>`,
            )
            .join("")}
        </div>
        <p class="mt-3 text-xs text-gray-500">Poll duration: ${escapeHtml(pollDuration)}</p>
      </div>
    `;
  };

  const buildEventHtml = () => {
    const name = eventName.trim();
    const location = eventLocation.trim();
    const link = eventLink.trim();
    if (!name && !eventDate && !eventTime && !location && !link) return "";

    return `
      <div class="my-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
        <p class="font-semibold text-purple-700">Event</p>
        <p class="mt-2 text-lg font-semibold text-gray-900">${escapeHtml(name || "Untitled event")}</p>
        <p class="mt-1 text-sm text-gray-700">${escapeHtml(eventType)}</p>
        <p class="mt-2 text-sm text-gray-700">${escapeHtml([eventDate, eventTime].filter(Boolean).join(" at "))}</p>
        ${location && eventType !== "virtual" ? `<p class="mt-1 text-sm text-gray-700">${escapeHtml(location)}</p>` : ""}
        ${link && eventType !== "in-person" ? `<p class="mt-1 text-sm text-gray-700">${escapeHtml(link)}</p>` : ""}
      </div>
    `;
  };

  const getPostContent = () => {
    const parts = [content.trim()];
    const pollHtml = buildPollHtml();
    const eventHtml = buildEventHtml();
    if (pollHtml) parts.push(pollHtml);
    if (eventHtml) parts.push(eventHtml);
    return parts.filter(Boolean).join("\n\n");
  };

  const getGeneratedTitle = (sourceContent = "") => {
    const h1Match = sourceContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const heading = normalizeTitleText(h1Match?.[1] ?? "");
    if (heading) return heading.slice(0, 80);

    const plainText = normalizeTitleText(
      sourceContent || getEditorText() || pollQuestion.trim() || eventName.trim(),
    );
    const firstSentence = plainText.match(/^[^.!?]+[.!?]?/)?.[0] ?? plainText;
    return normalizeTitleText(firstSentence).slice(0, 80) || "Post";
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

      const formattedGenerated = markdownToHtmlForEditor(
        normalizeGeneratedPost(generated, aiPrompt.trim()),
      );
      const newContent = content
        ? trimLeadingEditorHtml(`${content}<br /><br />${formattedGenerated}`)
        : trimLeadingEditorHtml(formattedGenerated);

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

  const handleRewriteAI = async (action: RewriteAction = "polish") => {
    const textToRewrite = getEditorText();
    if (!textToRewrite) return;

    setRewriteLoading(true);
    setRewriteError("");
    setShowRewriteMenu(false);
    try {
      const res = await fetch("/api/rewrite-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: textToRewrite, action }),
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
    const prompt = getImageContentText();
    if (!prompt.trim()) return;

    setImageGenLoading(true);
    setImageLoaded(false);
    setImageError(false);
    setImageErrorMsg("");
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { url: string };
      if (!data.url) throw new Error("No image URL returned.");

      setImageUrl(data.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Image search failed.";
      setImageError(true);
      setImageErrorMsg(msg);
    } finally {
      setImageGenLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || isLoading) return;

    const finalContent = getPostContent();
    const hasContent = finalContent.length > 0;
    setContentError(!hasContent);
    if (!hasContent) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: getGeneratedTitle(finalContent),
        content: finalContent,
        author: "Anonymous",
        imageUrl: imageUrl.trim() || undefined,
        tags: [],
      });

      handleReset();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    clearImageTimer();
    setContent("");
    setImageUrl("");
    setImageLoaded(false);
    setImageError(false);
    setImageErrorMsg("");
    setRetryKey(0);
    setAiPrompt("");
    setShowAiPanel(false);
    setContentError(false);
    setActiveTab("write");
    setShowTextToolbar(false);
    setShowRewriteMenu(false);
    setActiveMediaComposer(null);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollDuration("1 week");
    setEventName("");
    setEventType("in-person");
    setEventDate("");
    setEventTime("");
    setEventLocation("");
    setEventLink("");
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

  const editorToolBtn = (
    label: string,
    display: React.ReactNode,
    onClick: () => void,
    extra = "",
  ) => (
    <button
      type="button"
      title={label}
      onMouseDown={(e) => {
        e.preventDefault();
        saveSelection();
        onClick();
      }}
      className={`w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-800 transition-colors ${extra}`}
    >
      {display}
    </button>
  );

  const insertEditorHtml = (html: string) => {
    restoreSelection();
    replaceSelectionWithHtml(html);
  };

  const mediaToolBtn = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    color = "text-gray-800",
  ) => (
    <button
      type="button"
      title={label}
      onMouseDown={(e) => {
        e.preventDefault();
        saveSelection();
      }}
      onClick={onClick}
      className={`w-8 h-8 rounded-md border border-gray-200 hover:bg-gray-100 flex items-center justify-center bg-white shadow-sm transition-colors ${color}`}
    >
      {icon}
    </button>
  );

  const mediaButtons = (
    <>
      {mediaToolBtn("Insert Image", <Image className="w-4 h-4" />, handleInsertImageClick, "text-violet-600")}
      {mediaToolBtn("Insert Video", <Video className="w-4 h-4" />, handleInsertVideoClick, "text-green-600")}
      {mediaToolBtn("Insert PDF", <FileText className="w-4 h-4" />, handleInsertPdfClick, "text-orange-600")}
      {mediaToolBtn("Create Poll", <BarChart3 className="w-4 h-4" />, () =>
        setActiveMediaComposer((current) => (current === "poll" ? null : "poll")),
        "text-purple-600"
      )}
      {mediaToolBtn("Create Event", <Calendar className="w-4 h-4" />, () =>
        setActiveMediaComposer((current) => (current === "event" ? null : "event")),
        "text-violet-600"
      )}
    </>
  );

  const generateImageToolbarBtn = (
    <button
      type="button"
      title="Generate Image"
      onMouseDown={(e) => {
        e.preventDefault();
        saveSelection();
      }}
      onClick={handleGenerateImage}
      disabled={imageGenLoading || !getImageContentText()}
      className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-purple-300 bg-white text-purple-600 hover:bg-purple-50 shadow-sm transition-colors text-xs font-medium disabled:opacity-50"
    >
      {imageGenLoading ? (
        <Sparkles className="w-3.5 h-3.5" />
      ) : (
        <Image className="w-3.5 h-3.5" />
      )}
      {imageGenLoading ? "Generating..." : "Generate Image"}
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
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "40rem" }}>
        <div className="relative w-full max-h-[75vh] flex flex-col bg-white rounded-[18px] shadow-2xl border border-violet-100 overflow-hidden">
          <div className="flex items-center justify-between px-7 py-5 border-b border-violet-100 shrink-0">
            <h2 className="text-[22px] font-semibold text-gray-900">Create New Post</h2>
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-7 pb-6 pt-5">
            {activeTab === "write" ? (
              activeMediaComposer ? (
                <div className="min-h-[calc(75vh-10rem)]">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveMediaComposer(null)}
                      className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                      Back
                    </button>
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                      {activeMediaComposer === "poll" ? (
                        <>
                          <BarChart3 className="w-5 h-5 text-purple-600" />
                          Create Poll
                        </>
                      ) : (
                        <>
                          <Calendar className="w-5 h-5 text-purple-600" />
                          Create Event
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveMediaComposer(null)}
                      className="inline-flex h-9 items-center rounded-lg border border-purple-300 bg-white px-4 text-sm font-medium text-purple-600 shadow-sm hover:bg-purple-50"
                    >
                      Done
                    </button>
                  </div>

                  {activeMediaComposer === "poll" ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        placeholder="Ask a question..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px]"
                      />
                      {pollOptions.map((option, index) => (
                        <input
                          key={index}
                          type="text"
                          value={option}
                          onChange={(e) =>
                            setPollOptions((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? e.target.value : item,
                              ),
                            )
                          }
                          placeholder={`Option ${index + 1}`}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px]"
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => setPollOptions((current) => [...current, ""])}
                        className="w-full h-11 rounded-md border border-gray-200 bg-white hover:bg-gray-50 shadow-sm flex items-center justify-center gap-2 text-gray-800"
                      >
                        <Plus className="w-5 h-5" />
                        Add option
                      </button>
                      <select
                        value={pollDuration}
                        onChange={(e) => setPollDuration(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px]"
                      >
                        <option>1 day</option>
                        <option>3 days</option>
                        <option>1 week</option>
                        <option>2 weeks</option>
                        <option>1 month</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <input
                        type="text"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        placeholder="Event name *"
                        className="w-full px-4 py-3 border border-purple-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px]"
                      />
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "in-person" as const, label: "In-person", icon: <MapPin className="w-5 h-5" /> },
                          { value: "virtual" as const, label: "Virtual", icon: <Link className="w-5 h-5" /> },
                          { value: "hybrid" as const, label: "Hybrid", icon: <Globe className="w-5 h-5" /> },
                        ].map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setEventType(type.value)}
                            className={`inline-flex h-11 items-center gap-2 rounded-md border px-4 font-semibold shadow-sm transition-colors ${
                              eventType === type.value
                                ? "border-purple-600 bg-purple-600 text-white"
                                : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                            }`}
                          >
                            {type.icon}
                            {type.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">Date *</label>
                          <div className="relative">
                            <input
                              type="date"
                              value={eventDate}
                              onChange={(e) => setEventDate(e.target.value)}
                              className="w-full px-4 py-3 pr-12 border border-purple-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px] [&::-webkit-calendar-picker-indicator]:opacity-0"
                            />
                            <button
                              type="button"
                              onClick={openNativeInputPicker}
                              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-purple-600 hover:bg-purple-50"
                              aria-label="Open date picker"
                            >
                              <CalendarCheck className="w-5 h-5" strokeWidth={2.2} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">Time *</label>
                          <div className="relative">
                            <input
                              type="time"
                              value={eventTime}
                              onChange={(e) => setEventTime(e.target.value)}
                              className="w-full px-4 py-3 pr-12 border border-purple-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px] [&::-webkit-calendar-picker-indicator]:opacity-0"
                            />
                            <button
                              type="button"
                              onClick={openNativeInputPicker}
                              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-purple-600 hover:bg-purple-50"
                              aria-label="Open time picker"
                            >
                              <AlarmClock className="w-5 h-5" strokeWidth={2.2} />
                            </button>
                          </div>
                        </div>
                      </div>
                      {(eventType === "in-person" || eventType === "hybrid") && (
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-gray-500 shrink-0" />
                          <input
                            type="text"
                            value={eventLocation}
                            onChange={(e) => setEventLocation(e.target.value)}
                            placeholder="Add location *"
                            className="w-full px-4 py-3 border border-purple-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px]"
                          />
                        </div>
                      )}
                      {(eventType === "virtual" || eventType === "hybrid") && (
                        <div className="flex items-center gap-3">
                          <Link className="w-5 h-5 text-gray-500 shrink-0" />
                          <input
                            type="url"
                            value={eventLink}
                            onChange={(e) => setEventLink(e.target.value)}
                            placeholder="Add virtual meeting link *"
                            className="w-full px-4 py-3 border border-purple-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px]"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label htmlFor="post-content" className="block text-[15px] font-medium text-gray-800 shrink-0">
                      Content <span className="text-orange-500">*</span>
                    </label>

                    {showAiPanel ? (
                      <div className="flex items-center gap-2 flex-1 max-w-[75%]">
                        <input
                          type="text"
                          value={aiPrompt}
                          onChange={(e) => {
                            setAiPrompt(e.target.value);
                            setAiError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && aiPrompt.trim() && !aiLoading) {
                              e.preventDefault();
                              handleGenerateAI();
                            }
                          }}
                          autoFocus
                          placeholder="What do you want to write about?"
                          className="flex-1 min-w-0 px-3 py-2 border border-violet-200 rounded-lg text-sm focus:ring-2 focus:ring-fuchsia-200 focus:border-fuchsia-400 outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleGenerateAI}
                          disabled={aiLoading || !aiPrompt.trim()}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-300 bg-white text-purple-600 hover:bg-purple-50 shadow-sm transition-colors text-sm disabled:opacity-50 shrink-0"
                        >
                          <Sparkles className="w-4 h-4" />
                          {aiLoading ? "Generating..." : "Generate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAiPanel(false);
                            setAiPrompt("");
                            setAiError("");
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAiPanel(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-300 bg-white text-purple-600 hover:bg-purple-50 shadow-sm transition-colors text-sm"
                      >
                        <Sparkles className="w-4 h-4" />
                        Write with AI
                      </button>
                    )}
                  </div>

                  {aiError && (
                    <p className="text-xs text-red-600 mb-2">{aiError}</p>
                  )}

                  <div className="relative border border-violet-100 rounded-xl overflow-visible bg-white shadow-sm">
                    {rewriteError && (
                      <p className="px-4 pt-2 text-xs text-amber-600">{rewriteError}</p>
                    )}

                    <div className="hidden px-3 py-2 border-b border-gray-200 bg-white items-center gap-1.5 flex-wrap">
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

                    <div className="relative">
                      <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={syncContentFromEditor}
                        onBlur={saveSelection}
                        onMouseUp={saveSelection}
                        onKeyUp={saveSelection}
                        className={`min-h-[215px] px-4 pb-9 pt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-gray-800 outline-none [&>*:first-child]:mt-0 ${
                          contentError ? "ring-2 ring-rose-200" : ""
                        }`}
                      />
                      {hasEditorContent && (
                        <div className="absolute bottom-8 right-4 z-20">
                          {showRewriteMenu && (
                            <div className="absolute bottom-[calc(100%+0.5rem)] right-0 w-40 overflow-visible rounded-lg border border-gray-200 bg-white py-1 shadow-xl before:absolute before:-bottom-1.5 before:right-4 before:h-3 before:w-3 before:rotate-45 before:border-b before:border-r before:border-gray-200 before:bg-white">
                              {[
                                { action: "shorter" as const, label: "Rewrite shorter", icon: <Minus className="w-3.5 h-3.5" /> },
                                { action: "longer" as const, label: "Rewrite longer", icon: <Plus className="w-3.5 h-3.5" /> },
                                { action: "tone" as const, label: "Change tone", icon: <Wand2 className="w-3.5 h-3.5" /> },
                              ].map((item) => (
                                <button
                                  key={item.action}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    saveSelection();
                                  }}
                                  onClick={() => handleRewriteAI(item.action)}
                                  disabled={rewriteLoading}
                                  className="relative z-10 flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50"
                                >
                                  <span className="text-purple-500">{item.icon}</span>
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            title="Rewrite options"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              saveSelection();
                            }}
                            onClick={() => setShowRewriteMenu((current) => !current)}
                            disabled={rewriteLoading}
                            aria-expanded={showRewriteMenu}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg shadow-purple-200 transition-colors hover:bg-purple-700 disabled:opacity-60"
                          >
                            <Wand2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <span className="pointer-events-none absolute bottom-3 right-4 rounded-full bg-white/85 px-2 py-0.5 text-xs font-medium text-gray-400">
                        {editorWordCount} / 3000
                      </span>
                    </div>
                    <div className="min-h-[58px] px-3 py-2 border-t border-gray-200 bg-white flex items-center gap-1.5 flex-wrap">
                      {showTextToolbar ? (
                        <>
                          <button 
                            type="button"
                            title="Hide formatting"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              saveSelection();
                            }}
                            onClick={() => setShowTextToolbar(false)}
                            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition-colors"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          {editorToolBtn("Undo", <Undo2 className="w-4 h-4" />, () => {
                            document.execCommand("undo");
                            syncContentFromEditor();
                          })}
                          {editorToolBtn("Redo", <Redo2 className="w-4 h-4" />, () => {
                            document.execCommand("redo");
                            syncContentFromEditor();
                          }, "text-gray-400")}
                          <div className="w-px h-8 bg-gray-300 mx-1" />
                          {editorToolBtn("Heading 1", "H1", () =>
                            insertEditorHtml("<h1 class=\"text-2xl font-bold my-2\">Heading 1</h1>"),
                            "font-bold text-base"
                          )}
                          {toolbarBtn("bold", "Bold", "B", "font-bold text-lg")}
                          {toolbarBtn("italic", "Italic", "I", "italic text-lg")}
                          <div className="w-px h-8 bg-gray-300 mx-1" />
                          {toolbarBtn("ul", "Bullet List", <List className="w-4 h-4" />)}
                          {toolbarBtn("ol", "Numbered List", <ListOrdered className="w-4 h-4" />)}
                          <div className="w-px h-8 bg-gray-300 mx-1" />
                          {toolbarBtn("link", "Link", <Link2 className="w-4 h-4" />)}
                          {editorToolBtn("Divider", <Minus className="w-4 h-4" />, () =>
                            insertEditorHtml("<hr class=\"my-3 border-gray-300\" />")
                          )}
                          {editorToolBtn("Mention", <AtSign className="w-4 h-4" />, () =>
                            insertEditorHtml("<span>@mention</span>")
                          )}
                          {toolbarBtn("quote", "Quote", "99", "font-serif text-lg")}
                          {toolbarBtn("strikethrough", "Special", "[*]", "font-mono text-sm")}
                          {toolbarBtn("code", "Code", <Braces className="w-4 h-4" />)}
                          {editorToolBtn("Equation", <Sigma className="w-4 h-4" />, () =>
                            insertEditorHtml("<span class=\"font-serif\">Equation</span>")
                          )}
                          {mediaButtons}
                          {generateImageToolbarBtn}
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            title="Text formatting"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              saveSelection();
                            }}
                            onClick={() => setShowTextToolbar(true)}
                            className="w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-800 font-semibold transition-colors"
                          >
                            Aa
                          </button>
                          {mediaButtons}
                          {generateImageToolbarBtn}
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageInsertFromFile}
                      />
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleVideoInsertFromFile}
                      />
                      <input
                        ref={pdfInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handlePdfInsertFromFile}
                      />
                    </div>
                  </div>

                  {activeMediaComposer === "poll" && (
                    <div className="mt-3 space-y-3">
                      <input
                        type="text"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        placeholder="Ask a question..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px]"
                      />
                      {pollOptions.map((option, index) => (
                        <input
                          key={index}
                          type="text"
                          value={option}
                          onChange={(e) =>
                            setPollOptions((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? e.target.value : item,
                              ),
                            )
                          }
                          placeholder={`Option ${index + 1}`}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px]"
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => setPollOptions((current) => [...current, ""])}
                        className="w-full h-11 rounded-md border border-gray-200 bg-white hover:bg-gray-50 shadow-sm flex items-center justify-center gap-2 text-gray-800"
                      >
                        <Plus className="w-5 h-5" />
                        Add option
                      </button>
                      <select
                        value={pollDuration}
                        onChange={(e) => setPollDuration(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px]"
                      >
                        <option>1 day</option>
                        <option>3 days</option>
                        <option>1 week</option>
                        <option>2 weeks</option>
                        <option>1 month</option>
                      </select>
                    </div>
                  )}

                  {activeMediaComposer === "event" && (
                    <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50/60 p-4">
                      <div className="mb-5 flex items-center gap-2 text-purple-700 font-semibold text-lg">
                        <Calendar className="w-4 h-4" />
                        Create Event
                      </div>
                      <input
                        type="text"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        placeholder="Event name *"
                        className="w-full px-4 py-3 border border-purple-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px]"
                      />
                      <div className="mt-5 flex flex-wrap gap-2">
                        {[
                          { value: "in-person" as const, label: "In-person", icon: <MapPin className="w-5 h-5" /> },
                          { value: "virtual" as const, label: "Virtual", icon: <Link className="w-5 h-5" /> },
                          { value: "hybrid" as const, label: "Hybrid", icon: <Globe className="w-5 h-5" /> },
                        ].map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setEventType(type.value)}
                            className={`inline-flex h-11 items-center gap-2 rounded-md border px-4 font-semibold shadow-sm transition-colors ${
                              eventType === type.value
                                ? "border-purple-600 bg-purple-600 text-white"
                                : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                            }`}
                          >
                            {type.icon}
                            {type.label}
                          </button>
                        ))}
                      </div>
                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">Date *</label>
                          <div className="relative">
                            <input
                              type="date"
                              value={eventDate}
                              onChange={(e) => setEventDate(e.target.value)}
                              className="w-full px-4 py-3 pr-12 border border-purple-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px] [&::-webkit-calendar-picker-indicator]:opacity-0"
                            />
                            <button
                              type="button"
                              onClick={openNativeInputPicker}
                              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-purple-600 hover:bg-purple-50"
                              aria-label="Open date picker"
                            >
                              <CalendarCheck className="w-5 h-5" strokeWidth={2.2} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">Time *</label>
                          <div className="relative">
                            <input
                              type="time"
                              value={eventTime}
                              onChange={(e) => setEventTime(e.target.value)}
                              className="w-full px-4 py-3 pr-12 border border-purple-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px] [&::-webkit-calendar-picker-indicator]:opacity-0"
                            />
                            <button
                              type="button"
                              onClick={openNativeInputPicker}
                              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-purple-600 hover:bg-purple-50"
                              aria-label="Open time picker"
                            >
                              <AlarmClock className="w-5 h-5" strokeWidth={2.2} />
                            </button>
                          </div>
                        </div>
                      </div>
                      {(eventType === "in-person" || eventType === "hybrid") && (
                        <div className="mt-5 flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-gray-500 shrink-0" />
                          <input
                            type="text"
                            value={eventLocation}
                            onChange={(e) => setEventLocation(e.target.value)}
                            placeholder="Add location *"
                            className="w-full px-4 py-3 border border-purple-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px]"
                          />
                        </div>
                      )}
                      {(eventType === "virtual" || eventType === "hybrid") && (
                        <div className="mt-5 flex items-center gap-3">
                          <Link className="w-5 h-5 text-gray-500 shrink-0" />
                          <input
                            type="url"
                            value={eventLink}
                            onChange={(e) => setEventLink(e.target.value)}
                            placeholder="Add virtual meeting link *"
                            className="w-full px-4 py-3 border border-purple-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-400 text-[15px]"
                          />
                        </div>
                      )}
                      <p className="mt-5 text-sm text-gray-500">
                        Add event details in the post content above
                      </p>
                    </div>
                  )}

                  {contentError && (
                    <p className="text-xs text-red-500 mt-1">Content is required.</p>
                  )}
                </div>

                <div>
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 border border-red-200 rounded-lg text-red-600 hover:bg-red-100 transition-colors shadow-sm"
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
              )
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
                  <div
                    className="prose max-w-none text-gray-700 leading-relaxed text-sm"
                    dangerouslySetInnerHTML={{
                      __html: getPostContent()
                        ? getPostContent()
                        : '<span class="text-gray-400 italic">Your post content will appear here...</span>',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 px-7 py-5 border-t border-violet-100 bg-white shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors text-[15px] font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "write" ? "preview" : "write")}
              className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 transition-colors text-[15px] font-medium shadow-sm"
            >
              {activeTab === "write" ? "Preview" : "Edit"}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isLoading}
              className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors text-[15px] font-medium shadow-sm"
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
}
