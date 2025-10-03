interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

interface Entry {
  id: string;
  data: any;
  metadata: any;
  parent_id?: string;
}

export class ApiClient {
  private baseUrl = 'https://development.yourcommonbase.com/backend';
  private apiKey = process.env.YCB_API_KEY;

  private async makeCloudRequest(
    endpoint: string,
    options: RequestInit
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Response from ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`Error making request to ${endpoint}:`, error);
      throw error;
    }
  }

  async add(
    data: any,
    metadata: any,
    parent_id?: string
  ): Promise<ApiResponse> {
    const entryBody = {
      data,
      metadata,
      ...(parent_id && { parent_id }),
    };

    return await this.makeCloudRequest('/add', {
      method: 'POST',
      body: JSON.stringify(entryBody),
    });
  }

  async joinEntries(
    id1: string,
    id2: string
  ): Promise<any> {
    try {
      return await this.makeCloudRequest('/join', {
        method: 'POST',
        body: JSON.stringify({
          id1,
          id2,
        }),
      });
    } catch (error) {
      console.error('Error joining entries:', error);
      throw error;
    }
  }

  async search(
    query: string,
    matchCount: number = 5
  ): Promise<ApiResponse<Entry[]>> {
    return await this.makeCloudRequest('/search', {
      method: 'POST',
      body: JSON.stringify({
        text: query,
        matchLimit: Math.min(Math.max(matchCount, 1), 10),
        matchThreshold: 0.35,
      }),
    });
  }

  async random(count: number = 1): Promise<any> {
    const response = await this.makeCloudRequest('/random', {
      method: 'POST',
      body: JSON.stringify({
        count,
      }),
    });

    // Return the raw response since the API seems to return data directly
    return response;
  }

  async fetchImagesByIds(ids: string[]): Promise<any> {
    return await this.makeCloudRequest('/fetchImagesByIDs', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }
}