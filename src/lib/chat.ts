import "server-only";
import { generateText } from "./gemini";
import { search } from "./search";
import { formatDate } from "./utils";
import type { ClientItem } from "./types";
import { toClientItem } from "./view";

export type ChatLang = "en" | "hi";

export interface ChatReply {
  /** Spoken/displayed answer, already in the requested language. */
  answer: string;
  /** Records behind the answer, so the UI can offer the originals. */
  sources: ClientItem[];
}

const SYSTEM: Record<ChatLang, string> = {
  en: `You are Chronicle's assistant. You answer questions about the user's own academic and professional records — certificates, projects, internships, achievements, transcripts.

Rules:
- Answer in one or two short sentences. This is read aloud, so keep it speakable: no markdown, no bullet points, no URLs.
- Only state what the records support. If nothing matched, say so plainly and suggest what they could ask instead.
- Refer to records by name. Mention the year when it helps.
- Never invent a record.`,

  hi: `आप Chronicle के सहायक हैं। आप उपयोगकर्ता के अपने शैक्षणिक और व्यावसायिक रिकॉर्ड — प्रमाणपत्र, प्रोजेक्ट, इंटर्नशिप, उपलब्धियाँ, अंकपत्र — के बारे में सवालों के जवाब देते हैं।

नियम:
- एक या दो छोटे वाक्यों में उत्तर दें। यह ज़ोर से पढ़ा जाएगा, इसलिए बोलने योग्य रखें: कोई markdown नहीं, कोई bullet नहीं, कोई URL नहीं।
- केवल वही कहें जो रिकॉर्ड में है। अगर कुछ नहीं मिला, तो सीधे बताएं और सुझाव दें कि वे क्या पूछ सकते हैं।
- रिकॉर्ड का नाम लेकर बताएं। ज़रूरत हो तो साल बताएं।
- कभी भी कोई रिकॉर्ड न बनाएं।
- पूरा उत्तर हिंदी (देवनागरी लिपि) में दें।`,
};

const EMPTY: Record<ChatLang, string> = {
  en: "Your Chronicle is empty. Upload a certificate or project report and I can find it for you.",
  hi: "आपका Chronicle अभी खाली है। कोई प्रमाणपत्र या प्रोजेक्ट रिपोर्ट अपलोड करें, फिर मैं उसे ढूँढ सकता हूँ।",
};

const NOTHING: Record<ChatLang, string> = {
  en: "I could not find anything matching that.",
  hi: "मुझे उससे मेल खाता कुछ नहीं मिला।",
};

/**
 * Answers a chat message by running the same retrieval the web UI uses, then
 * phrasing the result for speech in the requested language.
 *
 * Retrieval itself stays language-agnostic: gemini-embedding-001 is
 * multilingual, so a Hindi question already matches English documents. Only
 * the phrasing of the reply is localised.
 */
export async function chatAnswer(
  userId: string,
  message: string,
  lang: ChatLang = "en",
): Promise<ChatReply> {
  const result = await search(userId, message, 5);

  if (result.hits.length === 0) {
    const bare = result.answer?.includes("Nothing has been added")
      ? EMPTY[lang]
      : NOTHING[lang];
    return { answer: bare, sources: [] };
  }

  const context = result.hits
    .map((h, i) => {
      const bits = [h.item.category, h.item.organization, formatDate(h.item.date)]
        .filter(Boolean)
        .join(" · ");
      return `${i + 1}. ${h.item.title} — ${bits}. ${h.item.summary}`;
    })
    .join("\n");

  let answer: string;
  try {
    answer = (
      await generateText(
        `Question: ${message}\n\nMatching records:\n${context}`,
        SYSTEM[lang],
      )
    ).trim();
  } catch {
    // Gemini unavailable — still useful, just less fluent.
    answer =
      lang === "hi"
        ? `${result.hits.length} रिकॉर्ड मिले: ${result.hits.map((h) => h.item.title).join(", ")}`
        : `Found ${result.hits.length}: ${result.hits.map((h) => h.item.title).join(", ")}`;
  }

  return {
    answer: answer || NOTHING[lang],
    sources: result.hits.map((h) => toClientItem(h.item)),
  };
}
