import React, { useState } from "react";
import { Settings, MessageSquare } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { GeneralSettings } from "./GeneralSettings";
import { PromptsSettings } from "./PromptsSettings";

type TabId = "general" | "prompts";

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("general");

  const renderSidebar = () => (
    <div className="w-[300px] border-r border-gray-200 p-6 space-y-2 bg-white sticky top-0 h-screen">
      <div className="flex items-center gap-4 mb-8 pl-1">
        <img
          src="/icon.svg"
          alt="Web Copilot Logo"
          className="w-14 h-14 drop-shadow-sm transition-transform hover:scale-105 duration-200"
        />
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">
            Web Copilot
          </h2>
          <p className="text-xs text-gray-500">AI 浏览器助手</p>
        </div>
      </div>
      <div className="space-y-2">
        <button
          onClick={() => setActiveTab("general")}
          className={cn(
            "w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2",
            activeTab === "general"
              ? "bg-blue-50 text-blue-700"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <Settings className="h-4 w-4" />
          常规
        </button>
        <button
          onClick={() => setActiveTab("prompts")}
          className={cn(
            "w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2",
            activeTab === "prompts"
              ? "bg-blue-50 text-blue-700"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <MessageSquare className="h-4 w-4" />
          提示词
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex">
        {renderSidebar()}
        <div className="px-6 w-[768px] min-h-max pt-[28px] pb-[106px] me-auto">
          {activeTab === "general" && <GeneralSettings />}
          {activeTab === "prompts" && <PromptsSettings />}
        </div>
      </div>
      <Toaster />
    </div>
  );
};
