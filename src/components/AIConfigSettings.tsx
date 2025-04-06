import React, { useState, useEffect, useRef } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import type { AIConfig } from '../utils/ai';
import { Button } from "@/components/ui/button";
import { SparklesIcon, SearchIcon, XIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getAllPrompts, Prompt } from '@/utils/storage';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

interface AIConfigSettingsProps {
  config: AIConfig;
  onChange: (config: AIConfig) => void;
}

const AIConfigSettings: React.FC<AIConfigSettingsProps> = ({ config, onChange }) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // 加载提示词库
  useEffect(() => {
    if (isOpen) {
      loadPrompts();
    }
  }, [isOpen]);

  // 筛选提示词
  useEffect(() => {
    if (prompts.length > 0) {
      const filtered = prompts.filter(prompt => {
        // 搜索词过滤
        const matchesSearch = searchTerm === '' ||
          prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (prompt.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          prompt.content.toLowerCase().includes(searchTerm.toLowerCase());

        // 标签过滤
        const matchesTags = selectedTags.length === 0 ||
          selectedTags.every(tag => prompt.tags.includes(tag));

        return matchesSearch && matchesTags;
      });
      setFilteredPrompts(filtered);
    }
  }, [prompts, searchTerm, selectedTags]);

  const loadPrompts = async () => {
    try {
      setIsLoading(true);
      const allPrompts = await getAllPrompts();
      setPrompts(allPrompts);
      setFilteredPrompts(allPrompts);

      // 收集所有可用的标签
      const tagsSet = new Set<string>();
      allPrompts.forEach((prompt) => {
        prompt.tags.forEach((tag) => tagsSet.add(tag));
      });
      setAvailableTags(Array.from(tagsSet).sort());
    } catch (error) {
      console.error("加载提示词失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPrompt = (prompt: Prompt) => {
    onChange({
      ...config,
      systemPrompt: prompt.content,
      temperature: prompt.temperature
    });

    toast({
      title: "提示词已应用",
      description: `已应用"${prompt.name}"到系统提示词`,
      duration: 2000,
    });

    // 关闭弹窗
    setIsOpen(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedTags([]);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-3 flex justify-between items-center">
          <label className="text-sm font-medium text-muted-foreground">系统提示词</label>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                <SparklesIcon className="h-3.5 w-3.5" />
                应用提示词
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-2 border-b">
                <div className="relative">
                  <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索提示词..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-7 w-7 p-0"
                      onClick={() => setSearchTerm('')}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {availableTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {availableTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className="text-[10px] cursor-pointer py-0 h-5 px-2 font-normal"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {(searchTerm || selectedTags.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs w-full"
                    onClick={clearSearch}
                  >
                    清除筛选
                  </Button>
                )}
              </div>
              {isLoading ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">加载中...</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  {filteredPrompts.length > 0 ? (
                    <div className="p-2">
                      {filteredPrompts.map((prompt) => (
                        <div
                          key={prompt.id}
                          className="p-2 rounded-md hover:bg-muted cursor-pointer mb-2"
                          onClick={() => handleApplyPrompt(prompt)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{prompt.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">T: {prompt.temperature}</Badge>
                          </div>
                          {prompt.description && (
                            <p className="text-xs text-muted-foreground mb-1">{prompt.description}</p>
                          )}
                          <p className="text-xs line-clamp-2 text-muted-foreground">
                            {prompt.content}
                          </p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {prompt.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      {searchTerm || selectedTags.length > 0 ? (
                        <>
                          <p className="text-sm text-muted-foreground">没有找到匹配的提示词</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-xs"
                            onClick={clearSearch}
                          >
                            清除筛选
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">暂无提示词</p>
                          <p className="text-xs text-muted-foreground mt-1">请在提示词设置中添加</p>
                        </>
                      )}
                    </div>
                  )}
                </ScrollArea>
              )}
            </PopoverContent>
          </Popover>
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