import { ApiClient } from './api-client';
import { generateTopics } from './topic-generation';

interface Entry {
  id: string;
  data: any;
  metadata: any;
  parent_id?: string;
}

interface TopicChain {
  topics: string[];
  originalTopic: string;
}

export class SynthesisWorkflow {
  private apiClient: ApiClient;
  private allTopics: Set<string> = new Set();

  constructor() {
    this.apiClient = new ApiClient();
  }

  async synthesizeEntry(entry: Entry): Promise<void> {
    try {
      console.log('Starting synthesis for entry:', entry.id);

      const initialTopics = await this.generateTopicsForEntry(entry);
      console.log('Initial topics:', initialTopics);

      const topicChains: TopicChain[] = [];

      for (const topic of initialTopics) {
        const chain = await this.buildTopicChain(topic, entry.data);
        topicChains.push(chain);
      }

      const synthesisResults = await this.processTopicChains(topicChains);

      await this.createSynthesisComment(entry.id, synthesisResults);

      console.log('Synthesis completed for entry:', entry.id);
    } catch (error) {
      console.error('Error in synthesis workflow:', error);
    }
  }

  async generateTopicsFromContent(content: string, existingTopics: string[]): Promise<string[]> {
    const skipTopics = existingTopics.map(t => t.toLowerCase());

    const topics = await generateTopics(content, skipTopics);

    // Add new topics to the cache
    topics.forEach(topic => this.allTopics.add(topic.toLowerCase()));

    return topics;
  }

  private async buildTopicChain(
    initialTopic: string,
    originalContent: any,
    maxDepth: number = 3
  ): Promise<TopicChain> {
    const chain: string[] = [initialTopic];
    let currentContent = originalContent;

    for (let depth = 0; depth < maxDepth; depth++) {
      const skipTopics = Array.from(this.allTopics);
      const newTopics = await generateTopics(
        typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent),
        skipTopics
      );

      if (newTopics.length === 0) break;

      const nextTopic = newTopics[0];
      chain.push(nextTopic);
      this.allTopics.add(nextTopic.toLowerCase());

      currentContent = `Further research on: ${nextTopic}`;
    }

    return {
      topics: chain,
      originalTopic: initialTopic,
    };
  }

  private async processTopicChains(chains: TopicChain[]): Promise<string[]> {
    const results: string[] = [];

    for (const chain of chains) {
      for (const topic of chain.topics) {
        try {
          const searchResponse = await this.apiClient.search(topic, 5);

          if (searchResponse.success && searchResponse.data) {
            const entries = searchResponse.data;

            if (entries.length >= 2) {
              const joinResult = await this.apiClient.joinEntries(
                entries[0].id,
                entries[1].id
              );

              if (joinResult.success) {
                results.push(`Joined entries for topic "${topic}": ${entries[0].id} + ${entries[1].id}`);
              }
            }
          }
        } catch (error) {
          console.error(`Error processing topic "${topic}":`, error);
        }
      }
    }

    return results;
  }

  private async createSynthesisComment(
    originalEntryId: string,
    synthesisResults: string[]
  ): Promise<void> {
    const commentData = {
      synthesis_results: synthesisResults,
      topic_chains: Array.from(this.allTopics),
      timestamp: new Date().toISOString(),
    };

    const commentMetadata = {
      type: 'synthesis_comment',
      generated_by: 'synthesis_workflow',
      original_entry_id: originalEntryId,
    };

    await this.apiClient.add(commentData, commentMetadata, originalEntryId);
  }

  async processTopicsManually(
    selectedTopics: string[],
    originalEntry: Entry
  ): Promise<string[]> {
    const results: string[] = [];

    for (const topic of selectedTopics) {
      try {
        results.push(`Processing topic: "${topic}"`);

        const searchResponse = await this.apiClient.search(topic, 5);
        console.log(`Search response for "${topic}":`, searchResponse);

        const entries = Array.isArray(searchResponse) ? searchResponse : searchResponse.data || searchResponse;

        if (entries && entries.length > 0) {
          results.push(`Found ${entries.length} entries for "${topic}"`);

          if (entries.length >= 2) {
            const joinResult = await this.apiClient.joinEntries(
              entries[0].id,
              entries[1].id
            );

            if (joinResult) {
              results.push(`✓ Joined entries for "${topic}": ${entries[0].id} + ${entries[1].id}`);
            } else {
              results.push(`✗ Failed to join entries for "${topic}"`);
            }
          } else {
            results.push(`⚠ Only ${entries.length} entry found for "${topic}", need 2 to join`);
          }
        } else {
          results.push(`⚠ No entries found for "${topic}"`);
        }
      } catch (error) {
        console.error(`Error processing topic "${topic}":`, error);
        results.push(`✗ Error processing "${topic}": ${error}`);
      }
    }

    // Add synthesis comment with results
    try {
      await this.createSynthesisComment(originalEntry.id, results);
      results.push('✓ Created synthesis comment on original entry');
    } catch (error) {
      results.push(`✗ Failed to create synthesis comment: ${error}`);
    }

    return results;
  }

  clearTopicsCache(): void {
    this.allTopics.clear();
  }
}