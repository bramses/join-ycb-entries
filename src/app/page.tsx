'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useKeyboardListener } from '@/hooks/useKeyboardListener';
import { ApiClient } from '@/lib/api-client';
import { SynthesisWorkflow } from '@/lib/synthesis-workflow';

interface Entry {
  id: string;
  data: any;
  metadata: any;
  parent_id?: string;
}

export default function Home() {
  const [currentEntry, setCurrentEntry] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [synthesisResults, setSynthesisResults] = useState<string[]>([]);
  const [generatedTopics, setGeneratedTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<{[topic: string]: Entry[]}>({});
  const [joinedEntries, setJoinedEntries] = useState<{originalId: string, joinedId: string, topic: string}[]>([]);
  const [markdownOutput, setMarkdownOutput] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<{[id: string]: string}>({});

  const apiClient = new ApiClient();
  const synthesisWorkflow = new SynthesisWorkflow();

  const fetchRandomEntry = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.random(1);
      console.log('API response:', response);

      // Handle both direct array response and wrapped response
      const entries = Array.isArray(response) ? response : response.data || response;

      if (entries && entries.length > 0) {
        const entry = entries[0];
        console.log('Setting entry:', entry);
        setCurrentEntry(entry);
        setSynthesisResults([]);
        setGeneratedTopics([]);
        setSelectedTopics(new Set());
        setSearchResults({});
        setJoinedEntries([]);
        setMarkdownOutput('');
        setImageUrls({});
      } else {
        console.log('No entries found in response');
      }
    } catch (error) {
      console.error('Error fetching random entry:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateTopics = useCallback(async () => {
    if (!currentEntry) return;

    setIsLoading(true);
    setSynthesisResults(['Generating topics...']);

    try {
      const topics = await synthesisWorkflow.generateTopicsFromContent(
        typeof currentEntry.data === 'string' ? currentEntry.data : JSON.stringify(currentEntry.data),
        generatedTopics
      );
      setGeneratedTopics(topics);
      setSynthesisResults([`Generated ${topics.length} topics. Review and select topics to process.`]);
    } catch (error) {
      console.error('Error generating topics:', error);
      setSynthesisResults([`Error generating topics: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  }, [currentEntry, generatedTopics]);

  const expandTopic = useCallback(async (selectedTopic: string) => {
    setIsLoading(true);
    setSynthesisResults(prev => [...prev, `Expanding topic: "${selectedTopic}"`]);

    try {
      const newTopics = await synthesisWorkflow.generateTopicsFromContent(
        selectedTopic,
        generatedTopics
      );

      const uniqueNewTopics = newTopics.filter(topic =>
        !generatedTopics.some(existing => existing.toLowerCase() === topic.toLowerCase())
      );

      if (uniqueNewTopics.length > 0) {
        setGeneratedTopics(prev => [...prev, ...uniqueNewTopics]);
        setSynthesisResults(prev => [...prev, `Added ${uniqueNewTopics.length} new subtopics for "${selectedTopic}"`]);
      } else {
        setSynthesisResults(prev => [...prev, `No new subtopics found for "${selectedTopic}"`]);
      }
    } catch (error) {
      console.error('Error expanding topic:', error);
      setSynthesisResults(prev => [...prev, `Error expanding "${selectedTopic}": ${error}`]);
    } finally {
      setIsLoading(false);
    }
  }, [generatedTopics]);

  const toggleTopicSelection = (topic: string) => {
    setSelectedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topic)) {
        newSet.delete(topic);
      } else {
        newSet.add(topic);
      }
      return newSet;
    });
  };

  const searchSelectedTopics = useCallback(async () => {
    if (!currentEntry || selectedTopics.size === 0) return;

    setIsLoading(true);
    setSynthesisResults([`Searching for ${selectedTopics.size} selected topics...`]);
    setSearchResults({});

    const newResults: {[topic: string]: Entry[]} = {};

    try {
      for (const topic of Array.from(selectedTopics)) {
        setSynthesisResults(prev => [...prev, `Searching for: "${topic}"`]);

        const response = await apiClient.search(topic, 10);
        const entries = Array.isArray(response) ? response : response.data || response;

        if (entries && entries.length > 0) {
          newResults[topic] = entries;
          setSynthesisResults(prev => [...prev, `Found ${entries.length} entries for "${topic}"`]);

          // Fetch images for any image type entries
          const imageIds = entries
            .filter(entry => entry.metadata?.type === 'image')
            .map(entry => entry.id);

          if (imageIds.length > 0) {
            try {
              const imageResponse = await apiClient.fetchImagesByIds(imageIds);
              if (imageResponse?.body?.urls) {
                setImageUrls(prev => ({ ...prev, ...imageResponse.body.urls }));
              }
            } catch (error) {
              console.error('Error fetching images:', error);
            }
          }
        } else {
          newResults[topic] = [];
          setSynthesisResults(prev => [...prev, `No entries found for "${topic}"`]);
        }
      }

      setSearchResults(newResults);
      setSynthesisResults(prev => [...prev, 'Search completed! Review results below.']);
    } catch (error) {
      console.error('Error searching topics:', error);
      setSynthesisResults(prev => [...prev, `Error: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  }, [currentEntry, selectedTopics]);

  const generateCompleteMarkdown = useCallback(async () => {
    if (!currentEntry || joinedEntries.length === 0) return '';

    try {
      let markdown = '';

      // Add original entry only once at the top
      if (currentEntry.metadata?.type === 'image') {
        const imageUrl = imageUrls[currentEntry.id];
        if (imageUrl) {
          markdown += `![${currentEntry.metadata?.title || 'Image'}](${imageUrl})\n`;
        }
      }

      markdown += `${currentEntry.data} [from ${currentEntry.metadata?.title || 'Unknown'}](${currentEntry.metadata?.author || '#'})\n\n`;

      // Add all joined entries
      for (const joinedInfo of joinedEntries) {
        // Find the joined entry from search results
        let joinedEntry: Entry | null = null;
        for (const entries of Object.values(searchResults)) {
          const found = entries.find(e => e.id === joinedInfo.joinedId);
          if (found) {
            joinedEntry = found;
            break;
          }
        }

        if (joinedEntry) {
          // Handle joined entry
          if (joinedEntry.metadata?.type === 'image') {
            const imageUrl = imageUrls[joinedEntry.id];
            if (imageUrl) {
              markdown += `![${joinedEntry.metadata?.title || 'Image'}](${imageUrl})\n`;
            }
          }

          markdown += `${joinedEntry.data} [from ${joinedEntry.metadata?.title || 'Unknown'}](${joinedEntry.metadata?.author || '#'})\n\n`;
        }
      }

      return markdown;
    } catch (error) {
      console.error('Error generating complete markdown:', error);
      return '';
    }
  }, [currentEntry, joinedEntries, searchResults, imageUrls]);

  const joinWithOriginal = useCallback(async (resultEntryId: string, topic: string) => {
    if (!currentEntry) return;

    setIsLoading(true);
    setSynthesisResults(prev => [...prev, `Joining entry ${resultEntryId} with original entry...`]);

    try {
      const joinResult = await apiClient.joinEntries(currentEntry.id, resultEntryId);

      if (joinResult) {
        // Add to joined entries list
        setJoinedEntries(prev => {
          const newJoinedEntries = [...prev, {
            originalId: currentEntry.id,
            joinedId: resultEntryId,
            topic
          }];
          return newJoinedEntries;
        });

        setSynthesisResults(prev => [
          ...prev,
          `✓ Successfully joined ${currentEntry.id} + ${resultEntryId} for topic "${topic}"`
        ]);
      } else {
        setSynthesisResults(prev => [
          ...prev,
          `✗ Failed to join entries for topic "${topic}"`
        ]);
      }
    } catch (error) {
      console.error('Error joining entries:', error);
      setSynthesisResults(prev => [...prev, `✗ Error joining entries: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  }, [currentEntry]);

  // Update markdown whenever joined entries change
  useEffect(() => {
    const updateMarkdown = async () => {
      if (joinedEntries.length > 0) {
        const markdown = await generateCompleteMarkdown();
        setMarkdownOutput(markdown);
      }
    };
    updateMarkdown();
  }, [joinedEntries, generateCompleteMarkdown]);

  const copyMarkdownToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdownOutput);
      setSynthesisResults(prev => [...prev, '✓ Markdown copied to clipboard']);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setSynthesisResults(prev => [...prev, '✗ Failed to copy to clipboard']);
    }
  }, [markdownOutput]);

  useKeyboardListener({
    onRandomEntry: fetchRandomEntry,
  });

  return (
    <div className="font-sans min-h-screen p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Synthesis Topic Test</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">R</kbd> for random entry
        </p>
      </header>

      <main className="space-y-8">
        <div className="flex gap-4">
          <button
            onClick={fetchRandomEntry}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Get Random Entry'}
          </button>

          <button
            onClick={generateTopics}
            disabled={isLoading || !currentEntry}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Generate Topics
          </button>

          <button
            onClick={searchSelectedTopics}
            disabled={isLoading || selectedTopics.size === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Search Selected ({selectedTopics.size})
          </button>
        </div>

        {currentEntry && (
          <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">Current Entry</h2>
            <div className="space-y-2">
              <p><strong>ID:</strong> {currentEntry.id}</p>
              <div>
                <strong>Data:</strong>
                <pre className="mt-2 p-3 bg-white dark:bg-gray-900 rounded text-sm overflow-auto">
                  {JSON.stringify(currentEntry.data, null, 2)}
                </pre>
              </div>
              <div>
                <strong>Metadata:</strong>
                <pre className="mt-2 p-3 bg-white dark:bg-gray-900 rounded text-sm overflow-auto">
                  {JSON.stringify(currentEntry.metadata, null, 2)}
                </pre>
              </div>
              {currentEntry.parent_id && (
                <p><strong>Parent ID:</strong> {currentEntry.parent_id}</p>
              )}
            </div>
          </div>
        )}

        {generatedTopics.length > 0 && (
          <div className="border rounded-lg p-6 bg-blue-50 dark:bg-blue-900/20">
            <h2 className="text-xl font-semibold mb-4">Generated Topics</h2>
            <div className="grid grid-cols-1 gap-2">
              {generatedTopics.map((topic, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded border">
                  <label className="flex items-center space-x-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={selectedTopics.has(topic)}
                      onChange={() => toggleTopicSelection(topic)}
                      className="rounded"
                    />
                    <span className="text-sm flex-1">{topic}</span>
                  </label>
                  <button
                    onClick={() => expandTopic(topic)}
                    disabled={isLoading}
                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 ml-2"
                    title="Expand this topic to generate subtopics"
                  >
                    Expand
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSelectedTopics(new Set(generatedTopics))}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedTopics(new Set())}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {Object.keys(searchResults).length > 0 && (
          <div className="space-y-4">
            {Object.entries(searchResults).map(([topic, entries]) => (
              <div key={topic} className="border rounded-lg p-6 bg-green-50 dark:bg-green-900/20">
                <h3 className="text-lg font-semibold mb-4">
                  Search Results for "{topic}" ({entries.length} found)
                </h3>
                {entries.length > 0 ? (
                  <div className="space-y-3">
                    {entries.map((entry, index) => (
                      <div key={entry.id} className="border rounded p-3 bg-white dark:bg-gray-800">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-mono text-gray-500">
                            {entry.id}
                          </span>
                          <button
                            onClick={() => joinWithOriginal(entry.id, topic)}
                            disabled={isLoading}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            Join with Original
                          </button>
                        </div>
                        {entry.metadata?.type === 'image' && imageUrls[entry.id] && (
                          <div className="mb-3">
                            <Image
                              src={imageUrls[entry.id]}
                              alt={entry.metadata?.title || 'Entry image'}
                              width={200}
                              height={128}
                              className="max-w-xs max-h-32 object-contain rounded border"
                            />
                          </div>
                        )}
                        <div className="text-sm">
                          <strong>Data:</strong>
                          <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto max-h-20">
                            {typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data, null, 2)}
                          </pre>
                        </div>
                        {entry.metadata && (
                          <div className="text-sm mt-2">
                            <strong>Metadata:</strong>
                            <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto max-h-16">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No results found for this topic</p>
                )}
              </div>
            ))}
          </div>
        )}

        {synthesisResults.length > 0 && (
          <div className="border rounded-lg p-6 bg-yellow-50 dark:bg-yellow-900/20">
            <h2 className="text-xl font-semibold mb-4">Synthesis Results</h2>
            <div className="space-y-2">
              {synthesisResults.map((result, index) => (
                <p key={index} className="text-sm font-mono">
                  {result}
                </p>
              ))}
            </div>
          </div>
        )}

        {markdownOutput && (
          <div className="border rounded-lg p-6 bg-purple-50 dark:bg-purple-900/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Markdown Output</h2>
              <button
                onClick={copyMarkdownToClipboard}
                className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Copy to Clipboard
              </button>
            </div>
            <pre className="p-4 bg-white dark:bg-gray-800 rounded text-sm overflow-auto max-h-96 border">
              {markdownOutput}
            </pre>
          </div>
        )}

        {!currentEntry && !isLoading && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>No entry loaded. Press R or click "Get Random Entry" to start.</p>
          </div>
        )}
      </main>
    </div>
  );
}
