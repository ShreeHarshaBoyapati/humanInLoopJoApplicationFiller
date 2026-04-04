/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { ModelOption } from './ai/ai-interface.js';
import providerUrls from './ai/provider-urls.json' with { type: 'json' };

export class ApiKeyService {
  /**
   * Verifies the API key by making a call to the provider's models endpoint.
   * On success, returns the list of available models.
   * Throws an error if the key is invalid or the connection fails.
   */
  static async testConnection(
    providerName: string,
    credentials: Record<string, string>
  ): Promise<ModelOption[]> {
    try {
      const apiKey = credentials.apiKey || '';
      const customUrl = credentials.customUrl;
      if (providerName === 'gemini') {
        const { data } = await axios.get(`${providerUrls.gemini}/models?key=${apiKey}`);
        return (data.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => ({
            label: m.displayName || m.name,
            value: m.name.replace('models/', ''),
          }));
      }

      if (providerName === 'openai') {
        const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
        if (credentials.organizationId) headers['OpenAI-Organization'] = credentials.organizationId;
        if (credentials.projectId) headers['OpenAI-Project'] = credentials.projectId;
        const { data } = await axios.get(`${providerUrls.openai}/models`, {
          headers,
        });
        return (data.data || [])
          .filter((m: any) => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3'))
          .map((m: any) => ({ label: m.id, value: m.id }));
      }

      if (providerName === 'groq') {
        const { data } = await axios.get(`${providerUrls.groq}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return (data.data || []).map((m: any) => ({ label: m.id, value: m.id }));
      }

      if (providerName === 'ollama') {
        const baseUrl = customUrl ? customUrl : providerUrls.ollama;
        const { data } = await axios.get(`${baseUrl}/api/tags`);
        return (data.models || []).map((m: any) => ({ label: m.name, value: m.name }));
      }

      if (providerName === 'custom') {
        if (!customUrl) throw new Error('custom provider requires a baseURL');
        const { data } = await axios.get(`${customUrl.replace(/\/$/, '')}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return (data.data || []).map((m: any) => ({ label: m.id, value: m.id }));
      }

      if (providerName === 'mistral') {
        const { data } = await axios.get(`${providerUrls.mistral}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return (data.data || []).map((m: any) => ({ label: m.id, value: m.id }));
      }

      if (providerName === 'anthropic') {
        const { data } = await axios.get(`${providerUrls.anthropic}/models`, {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        });
        return (data.data || []).map((m: any) => ({
          label: m.display_name || m.name || m.id,
          value: m.id,
        }));
      }

      throw new Error(`Unsupported provider: ${providerName}`);
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error(`Failed to authenticate with ${providerName}: ${error.message}`);
    }
  }
}
