/**
 * AI Settings Panel
 *
 * Configure AI provider, API key, and model selection.
 * Settings are saved to localStorage.
 */

import { Settings, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import { PROVIDERS, AIService, saveAIConfig, loadAIConfig } from '../../lib/aiService';

export function AISettings({ onConfigChange }) {
  const [config, setConfig] = useState(
    () =>
      loadAIConfig() || {
        provider: 'anthropic',
        apiKey: '',
        model: 'claude-sonnet-4-20250514',
        customBaseUrl: '',
      }
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'success' | 'error'
  const [testMessage, setTestMessage] = useState('');

  // Save config when it changes
  useEffect(() => {
    saveAIConfig(config);
    onConfigChange?.(config);
  }, [config, onConfigChange]);

  const updateConfig = updates => {
    setConfig(prev => ({ ...prev, ...updates }));
    setTestStatus(null); // Reset test status when config changes
  };

  const handleTestConnection = async () => {
    if (!config.apiKey) {
      setTestStatus('error');
      setTestMessage('Please enter an API key');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testing connection...');

    const service = new AIService(config);
    const result = await service.testConnection();

    if (result.success) {
      setTestStatus('success');
      setTestMessage('Connected successfully!');
    } else {
      setTestStatus('error');
      setTestMessage(result.message);
    }
  };

  const currentProvider = PROVIDERS[config.provider];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-4 h-4 text-purple-400" />
        <span className="text-slate-200 font-medium">AI Configuration</span>
      </div>

      <div className="space-y-4">
        {/* Provider Selection */}
        <div>
          <label className="block text-slate-400 text-xs mb-1">Provider</label>
          <select
            value={config.provider}
            onChange={e => {
              const newProvider = e.target.value;
              const defaultModel = PROVIDERS[newProvider]?.models[0] || '';
              updateConfig({ provider: newProvider, model: defaultModel });
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
          >
            {Object.entries(PROVIDERS).map(([key, provider]) => (
              <option key={key} value={key}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-slate-400 text-xs mb-1">API Key</label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={e => updateConfig({ apiKey: e.target.value })}
              placeholder={`Enter your ${currentProvider?.name || 'API'} key`}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 pr-10 text-sm focus:border-purple-500 focus:outline-none"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-slate-500 text-[10px] mt-1">
            Your API key is stored locally and never sent to our servers.
          </div>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-slate-400 text-xs mb-1">Model</label>
          {config.provider === 'custom' ? (
            <input
              type="text"
              value={config.model}
              onChange={e => updateConfig({ model: e.target.value })}
              placeholder="Model name"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          ) : (
            <select
              value={config.model}
              onChange={e => updateConfig({ model: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            >
              {currentProvider?.models.map(model => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Custom Base URL (for custom provider) */}
        {config.provider === 'custom' && (
          <div>
            <label className="block text-slate-400 text-xs mb-1">Base URL</label>
            <input
              type="text"
              value={config.customBaseUrl}
              onChange={e => updateConfig({ customBaseUrl: e.target.value })}
              placeholder="https://localhost:1234/v1/chat/completions"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
        )}

        {/* Test Connection Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestConnection}
            disabled={testStatus === 'testing'}
            className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-500 disabled:opacity-50 flex items-center gap-2"
          >
            {testStatus === 'testing' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </button>

          {testStatus === 'success' && (
            <div className="flex items-center gap-1 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              {testMessage}
            </div>
          )}
          {testStatus === 'error' && (
            <div className="flex items-center gap-1 text-rose-400 text-sm">
              <XCircle className="w-4 h-4" />
              {testMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AISettings;
