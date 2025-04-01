import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import type { AIConfig } from '../utils/ai';

interface AIConfigSettingsProps {
  config: AIConfig;
  onChange: (config: AIConfig) => void;
}

const AIConfigSettings: React.FC<AIConfigSettingsProps> = ({ config, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">系统提示词</label>
        <Textarea
          value={config.systemPrompt}
          onChange={(e) => onChange({ ...config, systemPrompt: e.target.value })}
          className="min-h-[80px] text-sm"
          placeholder="设置系统提示词..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Temperature ({config.temperature})</label>
        <Slider
          value={[config.temperature || 0.7]}
          onValueChange={([value]) => onChange({ ...config, temperature: value })}
          min={0}
          max={2}
          step={0.1}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Presence Penalty ({config.presencePenalty})</label>
        <Slider
          value={[config.presencePenalty || 0]}
          onValueChange={([value]) => onChange({ ...config, presencePenalty: value })}
          min={-2}
          max={2}
          step={0.1}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Frequency Penalty ({config.frequencyPenalty})</label>
        <Slider
          value={[config.frequencyPenalty || 0]}
          onValueChange={([value]) => onChange({ ...config, frequencyPenalty: value })}
          min={-2}
          max={2}
          step={0.1}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">最大 Token 数 ({config.maxTokens})</label>
        <Slider
          value={[config.maxTokens || 2000]}
          onValueChange={([value]) => onChange({ ...config, maxTokens: value })}
          min={100}
          max={4000}
          step={100}
        />
      </div>
    </div>
  );
};

export default AIConfigSettings;