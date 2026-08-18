import React, { useState } from 'react';
import { SYSTEM_PRD_DOCUMENT } from '../data/prdSpecs';
import {
  FileCode,
  Database,
  Server,
  Layers,
  X,
  Copy,
  Check,
  Code2,
  BookOpen,
} from 'lucide-react';

export const PRDAndSchemaModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'prd' | 'erd' | 'api' | 'wireframes'>('prd');
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SYSTEM_PRD_DOCUMENT.databaseSchemaSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white border border-[#E5E5E5] rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-white border-b border-[#E5E5E5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#1A1A1A] text-base">{SYSTEM_PRD_DOCUMENT.title}</h3>
              <p className="text-xs text-gray-500">Architectural Specifications & SQL Database Schema</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg bg-[#F5F5F5] text-gray-500 hover:text-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#E5E5E5] bg-[#F9F9F9] px-4 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('prd')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === 'prd' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>PRD & Tech Stack</span>
          </button>

          <button
            onClick={() => setActiveTab('erd')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === 'erd' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>SQL Database Schema (DDL)</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === 'api' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>API Endpoint Specs</span>
          </button>

          <button
            onClick={() => setActiveTab('wireframes')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === 'wireframes' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>UI/UX Wireframes Outline</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-6">
          {activeTab === 'prd' ? (
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <div className="p-4 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5]">
                <h4 className="font-bold text-[#1A1A1A] text-sm mb-1">Executive Summary</h4>
                <p>{SYSTEM_PRD_DOCUMENT.executiveSummary}</p>
              </div>

              <div>
                <h4 className="font-bold text-[#1A1A1A] text-sm mb-3">System Architecture & Tech Stack</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5]">
                    <span className="font-bold text-black block mb-1">Frontend Engineering</span>
                    <p>{SYSTEM_PRD_DOCUMENT.architectureOverview.frontend}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5]">
                    <span className="font-bold text-blue-700 block mb-1">Backend Runtime</span>
                    <p>{SYSTEM_PRD_DOCUMENT.architectureOverview.backend}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5]">
                    <span className="font-bold text-green-700 block mb-1">Database Layer</span>
                    <p>{SYSTEM_PRD_DOCUMENT.architectureOverview.database}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5]">
                    <span className="font-bold text-amber-700 block mb-1">Offline Sync Engine</span>
                    <p>{SYSTEM_PRD_DOCUMENT.architectureOverview.offlineSync}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'erd' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#1A1A1A] text-sm">PostgreSQL Production Schema Definition</h4>
                <button
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white font-bold hover:bg-neutral-800 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied DDL!' : 'Copy SQL Schema'}</span>
                </button>
              </div>

              <pre className="bg-[#F9F9F9] border border-[#E5E5E5] p-4 rounded-xl font-mono text-[11px] text-[#1A1A1A] overflow-x-auto leading-relaxed">
                {SYSTEM_PRD_DOCUMENT.databaseSchemaSql}
              </pre>
            </div>
          ) : activeTab === 'api' ? (
            <div className="space-y-4">
              <h4 className="font-bold text-[#1A1A1A] text-sm">REST API Endpoint Specifications</h4>
              <div className="space-y-3">
                {SYSTEM_PRD_DOCUMENT.apiEndpointSpecs.map((api, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-black font-bold text-white font-mono text-[10px]">
                        {api.method}
                      </span>
                      <span className="font-mono font-bold text-black text-xs">{api.path}</span>
                    </div>
                    <p className="text-gray-700">{api.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Request Body</span>
                        <pre className="bg-white p-2 rounded-lg border border-[#E5E5E5] font-mono text-[10px] text-[#1A1A1A]">
                          {JSON.stringify(api.requestBody, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Response JSON</span>
                        <pre className="bg-white p-2 rounded-lg border border-[#E5E5E5] font-mono text-[10px] text-green-700 font-bold">
                          {JSON.stringify(api.responseExample, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="font-bold text-[#1A1A1A] text-sm">UI/UX Wireframes & Component Map</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SYSTEM_PRD_DOCUMENT.wireframes.map((wf, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] space-y-1">
                    <h5 className="font-bold text-black text-xs">{wf.name}</h5>
                    <p className="text-gray-600">{wf.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
