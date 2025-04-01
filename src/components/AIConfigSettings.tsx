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
      <div>
        <div className="mb-3">
          <label className="text-xs font-medium text-muted-foreground">系统提示词</label>
        </div>
        <Textarea
          value={config.systemPrompt}
          onChange={(e) => onChange({ ...config, systemPrompt: e.target.value })}
          className="min-h-[80px] text-sm"
          placeholder="设置系统提示词..."
        />
      </div>

      <div>
        <div className="mb-3">
          <label className="text-xs font-medium text-muted-foreground">Temperature ({config.temperature})</label>
        </div>
        <Slider
          value={[config.temperature || 0.7]}
          onValueChange={([value]) => onChange({ ...config, temperature: value })}
          min={0}
          max={2}
          step={0.1}
        />
      </div>

      <div>
        <div className="mb-3">
          <label className="text-xs font-medium text-muted-foreground">Presence Penalty ({config.presencePenalty})</label>
        </div>
        <Slider
          value={[config.presencePenalty || 0]}
          onValueChange={([value]) => onChange({ ...config, presencePenalty: value })}
          min={-2}
          max={2}
          step={0.1}
        />
      </div>

      <div>
        <div className="mb-3">
          <label className="text-xs font-medium text-muted-foreground">Frequency Penalty ({config.frequencyPenalty})</label>
        </div>
        <Slider
          value={[config.frequencyPenalty || 0]}
          onValueChange={([value]) => onChange({ ...config, frequencyPenalty: value })}
          min={-2}
          max={2}
          step={0.1}
        />
      </div>

      <div>
        <div className="mb-3">
          <label className="text-xs font-medium text-muted-foreground">最大 Token 数 ({config.maxTokens})</label>
        </div>
        <Slider
          value={[config.maxTokens || 2000]}
          onValueChange={([value]) => onChange({ ...config, maxTokens: value })}
          min={100}
          max={8000}
          step={100}
        />
      </div>
    </div>
  );
};

export default AIConfigSettings;