import React, { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateProvider,
  addProvider,
  removeProvider,
  getAllProviders,
} from "@/utils/storage";
import { aiService } from "@/utils/ai";
import type { AIError } from "@/utils/ai";
import type { ProviderType } from "@/utils/storage";
import { Plus, Trash2, RefreshCw, Check, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useDebounce } from "@/utils/debounce";

interface ProviderFormState {
  id: string;
  type: ProviderType;
  apiKey: string;
  baseUrl: string;
  name: string;
  models: string[];
  availableModels?: string[];
  modelFilter?: string;
  showEnabledOnly?: boolean;
}

// SDK 类型选项
const SDK_TYPES: { value: ProviderType; label: string; baseUrl?: string }[] = [
  {
    value: "openai",
    label: "OpenAI 兼容",
    baseUrl: "https://api.openai.com/v1",
  },
  { value: "gemini", label: "Google Gemini", baseUrl: "" },
];

export const GeneralSettings: React.FC = () => {
  const [providers, setProviders] = useState<ProviderFormState[]>([]);
  const [loadingModels, setLoadingModels] = useState<{
    [key: string]: boolean;
  }>({});
  const { toast } = useToast();

  // 自动保存的处理函数
  const saveProvider = useCallback(
    async (provider: ProviderFormState) => {
      try {
        await updateProvider(provider.id, {
          id: provider.id,
          type: provider.type,
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl,
          name: provider.name,
          models: provider.models,
        });
        toast({
          variant: "default",
          description: "设置已自动保存",
          duration: 1000,
        });
      } catch (error) {
        console.error("保存配置失败:", error);
        toast({
          variant: "destructive",
          title: "错误",
          description: "保存配置失败",
          duration: 3000,
        });
      }
    },
    [toast]
  );

  const handleAutoSave = useDebounce(saveProvider, 1500);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const providers = await getAllProviders();
      const providersWithModels = providers.map((p) => ({
        id: p.id,
        type: p.type,
        apiKey: p.apiKey,
        baseUrl: p.baseUrl,
        name: p.name,
        models: p.models,
        modelFilter: "",
        showEnabledOnly: false,
      }));
      setProviders(providersWithModels);

      // 只为已完整配置的 provider 自动加载模型列表
      providersWithModels.forEach((provider, index) => {
        if (provider?.id && provider.apiKey && provider.type) {
          console.debug("自动加载模型列表:", provider.name);
          handleRefreshModels(index);
        }
      });
    } catch (error) {
      console.error("加载配置失败:", error);
      toast({
        variant: "destructive",
        title: "错误",
        description: "加载配置失败",
        duration: 3000,
      });
    }
  };

  const loadModels = async (provider: ProviderFormState): Promise<string[]> => {
    try {
      return await aiService.listModels(provider);
    } catch (error) {
      const aiError = error as AIError;
      console.error("加载模型列表失败:", aiError);
      toast({
        variant: "destructive",
        title: "错误",
        description: aiError.message || "加载模型列表失败",
        duration: 3000,
      });
      return [];
    }
  };

  const handleProviderChange = (
    index: number,
    field: keyof ProviderFormState,
    value: string
  ) => {
    const newProviders = [...providers];
    const provider = newProviders[index];

    if (field === "type") {
      // 当切换 SDK 类型时，更新 baseUrl 和清空模型列表
      const sdkType = SDK_TYPES.find((type) => type.value === value);
      if (sdkType) {
        newProviders[index] = {
          ...provider,
          type: value as ProviderType,
          baseUrl: sdkType.baseUrl || "",
          models: [],
        };
      }
    } else {
      newProviders[index] = {
        ...provider,
        [field]: value,
      };
    }

    setProviders(newProviders);
    // 触发自动保存
    handleAutoSave(newProviders[index]);
  };

  const handleAddProvider = async () => {
    try {
      const newProvider = {
        type: "openai" as ProviderType,
        apiKey: "",
        baseUrl: "https://api.openai.com/v1",
        name: `Provider ${providers.length + 1}`,
        models: [],
      };

      await addProvider(newProvider);
      await loadConfig();
      toast({
        title: "成功",
        description: "已添加新的 Provider",
        duration: 2000,
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      console.error("添加 Provider 失败:", error);
      toast({
        variant: "destructive",
        title: "错误",
        description: "添加 Provider 失败",
        duration: 3000,
      });
    }
  };

  const handleRemoveProvider = async (id: string) => {
    try {
      await removeProvider(id);
      await loadConfig();
      toast({
        title: "成功",
        description: "已删除 Provider",
        duration: 2000,
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      console.error("删除 Provider 失败:", error);
      toast({
        variant: "destructive",
        title: "错误",
        description: "删除 Provider 失败",
        duration: 3000,
      });
    }
  };

  const handleRefreshModels = async (index: number) => {
    const provider = providers[index];
    if (!provider?.id) {
      return;
    }

    setLoadingModels((prev) => ({ ...prev, [provider.id]: true }));
    try {
      const modelList = await loadModels(provider);
      setProviders((prev) =>
        prev.map((p, i) =>
          i === index ? { ...p, availableModels: modelList } : p
        )
      );
    } finally {
      setLoadingModels((prev) => ({ ...prev, [provider.id]: false }));
    }
  };

  const handleToggleModel = async (index: number, model: string) => {
    try {
      const provider = providers[index];

      // 更新模型列表
      const newModels = provider.models.includes(model)
        ? provider.models.filter((m) => m !== model)
        : [...provider.models, model];

      // 更新本地状态
      const newProviders = [...providers];
      const updatedProvider = { ...provider, models: newModels };
      newProviders[index] = updatedProvider;
      setProviders(newProviders);

      // 触发自动保存
      handleAutoSave(updatedProvider);
    } catch (error) {
      console.error("保存模型设置失败:", error);
      toast({
        variant: "destructive",
        title: "错误",
        description: "保存模型设置失败",
        duration: 3000,
      });

      // 如果保存失败，回滚本地状态
      await loadConfig();
    }
  };

  const handleModelFilterChange = (index: number, value: string) => {
    const newProviders = [...providers];
    newProviders[index] = {
      ...newProviders[index],
      modelFilter: value,
    };
    setProviders(newProviders);
  };

  const handleShowEnabledOnlyChange = (index: number, checked: boolean) => {
    const newProviders = [...providers];
    newProviders[index] = {
      ...newProviders[index],
      showEnabledOnly: checked,
    };
    setProviders(newProviders);
  };

  const getFilteredModels = (provider: ProviderFormState) => {
    if (!provider.availableModels) return [];

    let filteredModels = provider.availableModels;

    // 先按搜索词过滤
    if (provider.modelFilter) {
      filteredModels = filteredModels.filter((model) =>
        model.toLowerCase().includes(provider.modelFilter?.toLowerCase() || "")
      );
    }

    // 再按启用状态过滤
    if (provider.showEnabledOnly) {
      filteredModels = filteredModels.filter((model) =>
        provider.models.includes(model)
      );
    }

    return filteredModels;
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">常规设置</h1>
      </div>

      <div className="space-y-8">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">LLM 服务商</h2>
            <Button onClick={handleAddProvider} variant="outline" size="default">
              <Plus className="h-4 w-4 mr-2" />
              添加 Provider
            </Button>
          </div>

          <div className="space-y-6">
            {providers.map((provider, index) => (
              <div key={provider.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Input
                      value={provider.name}
                      onChange={(e) =>
                        handleProviderChange(index, "name", e.target.value)
                      }
                      placeholder="Provider 名称"
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {providers.length > 1 && (
                      <Button
                        onClick={() => handleRemoveProvider(provider.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SDK 类型
                  </label>
                  <Select
                    value={provider.type}
                    onValueChange={(value) =>
                      handleProviderChange(index, "type", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择 SDK 类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {SDK_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <Input
                    type="password"
                    value={provider.apiKey}
                    onChange={(e) =>
                      handleProviderChange(index, "apiKey", e.target.value)
                    }
                    placeholder="sk-..."
                  />
                </div>

                {provider.type === "openai" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Base URL
                    </label>
                    <Input
                      type="text"
                      value={provider.baseUrl}
                      onChange={(e) =>
                        handleProviderChange(index, "baseUrl", e.target.value)
                      }
                      placeholder="https://api.openai.com/v1"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      如果使用代理服务，请在此设置代理地址
                    </p>
                  </div>
                )}

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="models">
                    <AccordionTrigger
                      className="py-3"
                      onClick={() => {
                        if (!provider.availableModels) {
                          handleRefreshModels(index);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <RefreshCw
                          className={`h-4 w-4 ${
                            loadingModels[provider.id] ? "animate-spin" : ""
                          }`}
                        />
                        <span>模型列表管理</span>
                        {provider.models.length > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({provider.models.length} 个已启用)
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4">
                        {provider.availableModels &&
                          provider.availableModels.length > 0 && (
                            <div className="space-y-4">
                              <div className="relative">
                                <Input
                                  value={provider.modelFilter || ""}
                                  onChange={(e) =>
                                    handleModelFilterChange(index, e.target.value)
                                  }
                                  placeholder="搜索模型..."
                                  className="pl-8"
                                />
                                <Search className="h-4 w-4 absolute left-2.5 top-3 text-gray-500" />
                              </div>
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`showEnabled-${provider.id}`}
                                  checked={provider.showEnabledOnly}
                                  onChange={(e) =>
                                    handleShowEnabledOnlyChange(
                                      index,
                                      e.target.checked
                                    )
                                  }
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label
                                  htmlFor={`showEnabled-${provider.id}`}
                                  className="ml-2 text-sm text-gray-600"
                                >
                                  只显示已启用的模型
                                </label>
                              </div>
                              <Table>
                                <TableCaption>选择要启用的模型</TableCaption>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[50px]">启用</TableHead>
                                    <TableHead>模型名称</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {getFilteredModels(provider).map((model) => (
                                    <TableRow key={model}>
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={`h-6 w-6 p-0 ${
                                            provider.models.includes(model)
                                              ? "text-green-600"
                                              : "text-gray-300"
                                          }`}
                                          onClick={() =>
                                            handleToggleModel(index, model)
                                          }
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                      <TableCell>{model}</TableCell>
                                    </TableRow>
                                  ))}
                                  {getFilteredModels(provider).length === 0 && (
                                    <TableRow>
                                      <TableCell
                                        colSpan={2}
                                        className="text-center text-gray-500 py-4"
                                      >
                                        没有找到匹配的模型
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};