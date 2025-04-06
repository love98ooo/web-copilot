import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, Edit, X, Search, Tag } from "lucide-react";
import { useDebounceValue } from "@/utils/debounce";
import {
  Prompt,
  getAllPrompts,
  addPrompt,
  updatePrompt,
  removePrompt,
} from "@/utils/storage";

interface PromptFormState extends Omit<Prompt, "id" | "createdAt" | "updatedAt"> {
  id?: string;
}

export const PromptsSettings: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [formState, setFormState] = useState<PromptFormState>({
    name: "",
    content: "",
    description: "",
    tags: [],
    temperature: 0.7,
  });
  const { toast } = useToast();
  const dialogCloseRef = useRef<HTMLButtonElement>(null);

  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);

  const loadPrompts = useCallback(async () => {
    try {
      const allPrompts = await getAllPrompts();
      setPrompts(allPrompts);

      // 收集所有可用的标签
      const tagsSet = new Set<string>();
      allPrompts.forEach((prompt) => {
        prompt.tags.forEach((tag) => tagsSet.add(tag));
      });
      setAvailableTags(Array.from(tagsSet).sort());
    } catch (error) {
      console.error("加载提示词失败:", error);
      toast({
        variant: "destructive",
        title: "错误",
        description: "加载提示词失败",
        duration: 3000,
      });
    }
  }, [toast]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const handleSavePrompt = async (closeDialog?: () => void) => {
    try {
      if (!formState.name.trim() || !formState.content.trim()) {
        toast({
          variant: "destructive",
          title: "错误",
          description: "名称和内容不能为空",
          duration: 3000,
        });
        return;
      }

      if (formState.id) {
        // 更新现有提示词
        await updatePrompt(formState.id, {
          name: formState.name,
          content: formState.content,
          description: formState.description,
          tags: formState.tags,
          temperature: formState.temperature,
        });
        toast({
          variant: "success",
          title: "成功",
          description: "提示词已更新",
          duration: 2000,
        });
      } else {
        // 添加新提示词
        await addPrompt({
          name: formState.name,
          content: formState.content,
          description: formState.description,
          tags: formState.tags,
          temperature: formState.temperature,
        });
        toast({
          variant: "success",
          title: "成功",
          description: "提示词已添加",
          duration: 2000,
        });
      }

      // 重置表单
      setFormState({
        name: "",
        content: "",
        description: "",
        tags: [],
        temperature: 0.7,
      });
      setIsEditing(false);

      // 刷新提示词列表
      await loadPrompts();

      // 关闭对话框
      if (closeDialog) closeDialog();
    } catch (error) {
      console.error("保存提示词失败:", error);
      toast({
        variant: "destructive",
        title: "错误",
        description: "保存提示词失败",
        duration: 3000,
      });
    }
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setFormState({
      id: prompt.id,
      name: prompt.name,
      content: prompt.content,
      description: prompt.description || "",
      tags: [...prompt.tags],
      temperature: prompt.temperature,
    });
    setIsEditing(true);
  };

  const handleDeletePrompt = async (id: string) => {
    try {
      await removePrompt(id);
      toast({
        variant: "success",
        title: "成功",
        description: "提示词已删除",
        duration: 2000,
      });
      await loadPrompts();
    } catch (error) {
      console.error("删除提示词失败:", error);
      toast({
        variant: "destructive",
        title: "错误",
        description: "删除提示词失败",
        duration: 3000,
      });
    }
  };

  const handleAddTag = (tag: string) => {
    if (tag && !formState.tags.includes(tag)) {
      setFormState(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormState(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value) {
      e.preventDefault();
      handleAddTag(e.currentTarget.value);
      e.currentTarget.value = '';
    }
  };

  const handleToggleTagFilter = (tag: string) => {
    setTagFilter(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const getFilteredPrompts = () => {
    return prompts.filter(prompt => {
      // 搜索过滤
      const searchQueryLower = debouncedSearchQuery.toLowerCase();
      const matchesSearch =
        debouncedSearchQuery === "" ||
        prompt.name.toLowerCase().includes(searchQueryLower) ||
        (prompt.description?.toLowerCase() || "").includes(searchQueryLower) ||
        prompt.content.toLowerCase().includes(searchQueryLower);

      // 标签过滤
      const matchesTags = tagFilter.length === 0 ||
        tagFilter.every(tag => prompt.tags.includes(tag));

      return matchesSearch && matchesTags;
    });
  };

  const handleCancelEdit = () => {
    setFormState({
      name: "",
      content: "",
      description: "",
      tags: [],
      temperature: 0.7,
    });
    setIsEditing(false);
  };

  const renderPromptForm = (closeDialogFn?: () => void) => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">名称</label>
        <Input
          value={formState.name}
          onChange={e => setFormState({ ...formState, name: e.target.value })}
          placeholder="提示词名称"
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">内容</label>
        <Textarea
          value={formState.content}
          onChange={e => setFormState({ ...formState, content: e.target.value })}
          placeholder="编写提示词内容..."
          className="mt-1 min-h-[150px]"
        />
      </div>

      <div>
        <label className="text-sm font-medium">描述 (可选)</label>
        <Textarea
          value={formState.description}
          onChange={e => setFormState({ ...formState, description: e.target.value })}
          placeholder="这个提示词的用途是..."
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">标签</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {formState.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 text-xs hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex mt-2">
          <Input
            placeholder="添加标签 (按回车确认)"
            className="flex-1"
            onKeyDown={handleTagInput}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <label className="text-sm font-medium">Temperature</label>
          <span className="text-sm text-muted-foreground">{formState.temperature}</span>
        </div>
        <Slider
          value={[formState.temperature]}
          onValueChange={([value]) => setFormState({ ...formState, temperature: value })}
          min={0}
          max={2}
          step={0.1}
          className="mt-1"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>精确</span>
          <span>平衡</span>
          <span>创造性</span>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {closeDialogFn ? (
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button onClick={() => handleSavePrompt(closeDialogFn)}>
              保存
            </Button>
          </DialogFooter>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancelEdit}>
              取消
            </Button>
            <Button onClick={() => handleSavePrompt()}>
              保存
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const filteredPrompts = getFilteredPrompts();

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">提示词管理</h1>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索提示词..."
              className="pl-8"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <Plus className="h-4 w-4" />
                <span>新建提示词</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>创建新提示词</DialogTitle>
              </DialogHeader>
              <DialogClose ref={dialogCloseRef} className="hidden" />
              {renderPromptForm(() => {
                dialogCloseRef.current?.click();
              })}
            </DialogContent>
          </Dialog>
        </div>

        {availableTags.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">标签过滤</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <Badge
                  key={tag}
                  variant={tagFilter.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleToggleTagFilter(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>编辑提示词</CardTitle>
            </CardHeader>
            <CardContent>
              {renderPromptForm()}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPrompts.length > 0 ? (
              filteredPrompts.map(prompt => (
                <Card key={prompt.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{prompt.name}</CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPrompt(prompt)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePrompt(prompt.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {prompt.description && (
                      <p className="text-sm text-muted-foreground">
                        {prompt.description}
                      </p>
                    )}
                    <div className="relative">
                      <div className="bg-muted rounded-md p-3 text-sm">
                        <div className="line-clamp-4 whitespace-pre-line">
                          {prompt.content}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex flex-wrap gap-1 mt-2">
                        {prompt.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Temperature: {prompt.temperature}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {debouncedSearchQuery || tagFilter.length > 0 ?
                  "没有找到匹配的提示词" :
                  "还没有创建任何提示词"
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
