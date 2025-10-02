import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const TOPICS_PROMPT = `Extract the most important and relevant topics from the given text or image description. Return simple, helpful words and short phrases that capture the key subjects, concepts, and themes. Be as specific as possible, use big concepts related to our topic.

Focus on:
- Main subjects and entities
- Key concepts and ideas
- Important categories or domains
- Relevant technical terms
- Notable actions or processes

examples:
   •    creepy cartoon with wide smile → cartoon; animation; facial expression; unsettling imagery
   •    deng xiaoping's reforms → deng xiaoping; china; economic reform; political leadership; development
   •    pete davidson dating advice → pete davidson; relationships; dating; psychology; attraction
   •    late-night thoughts about love → love; relationships; insecurity; self-reflection; emotions
   •    baby vs car safety meme → safety; parenting; meme; humor; social media

output format:
semicolon-separated words and short phrases only, no extra commentary. Skip topics: `;

export async function generateTopics(content: string, skipTopics: string[]): Promise<string[]> {
  try {
    console.log("Generating topics for content:", content);

    const skipTopicsText = skipTopics.length > 0 ? skipTopics.join(', ') : 'none';
    const promptWithSkips = TOPICS_PROMPT + skipTopicsText;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: promptWithSkips
        },
        {
          role: "user",
          content: content
        }
      ],
    });

    console.log("Generated topics:", completion);

    const topicsResponse = completion.choices[0].message.content;

    console.log("Raw topics response:", topicsResponse);

    if (!topicsResponse) {
      return [];
    }

    const topicsArray = topicsResponse
      .split(';')
      .map(topic => topic.trim())
      .filter(topic => topic.length > 0)
      .filter(topic => !skipTopics.includes(topic.toLowerCase()));

    console.log("Generated topics:", topicsArray);

    return topicsArray;
  } catch (error) {
    console.error("Error generating topics:", error);
    return [];
  }
}