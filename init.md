external endpoints:

https://development.yourcommonbase.com/backend/add

add(data, metadata, parent_id?): Promise<{ success: boolean; data?: any; message?: string }> { ...

 entryBody = {
          data, metadata, parent_id? (id of entry to comment on)
        }; 

const response = await this.makeCloudRequest('/add', {
          method: 'POST',
          body: JSON.stringify(entryBody),
        });


https://development.yourcommonbase.com/backend/join

async joinEntries(id1: string, id2: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      
      const response = await this.makeCloudRequest('/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id1,
          id2,
        }),
      });

https://development.yourcommonbase.com/backend/search

const response = await this.makeCloudRequest('/search', {
        method: 'POST',
        body: JSON.stringify({
          text: query,
          matchLimit: Math.min(Math.max(matchCount, 1), 10),
          matchThreshold: 0.35,
        }),
      });

https://development.yourcommonbase.com/backend/random

const response = await this.makeCloudRequest('/random', {
        method: 'POST',
        body: JSON.stringify({
          count: 1
        }),
      });

functions:

llm topic generation

```
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
   const completion = await openai.chat.completions.create({
     model: "gpt-5",
     max_completion_tokens: 2000,
     messages: [
       {
         role: "system",
         content: TOPICS_PROMPT
       },
       {
         role: "user",
         content: content
       }
     ],
     store: true,
   });


   console.log("Generated topics:", completion);


   const topicsResponse = completion.choices[0].message.content;


   console.log("Raw topics response:", topicsResponse);


   if (!topicsResponse) {
     return [];
   }


   // Parse the semicolon-separated topics into an array
   const topicsArray = topicsResponse
     .split(';')
     .map(topic => topic.trim())
     .filter(topic => topic.length > 0);


   console.log("Generated topics:", topicsArray);


   return topicsArray;
 } catch (error) {
   console.error("Error generating topics:", error);
   return [];
 }
}
```


event listener ‘r’ to get new /random entry


synthesis workflow:

generate topics 
for each topic:
	further research
		generate topics recursive not repeating any topics from growing set
			add to list topic -> topic ... -> topic
	add to list
	skip
list:
	for each item in list:
		semantic /search with item
		for entries result:
			join entries together [id1, id2]
			skip
use /add list as comment to original entry where parent_id = original entry id
