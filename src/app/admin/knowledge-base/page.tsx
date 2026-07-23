"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getAllKnowledgeBase,
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
} from "@/lib/database";
import { AiKnowledgeBase, KnowledgeCategory } from "@/lib/types";
import { BrainCircuit, Plus, Trash2, Edit3, Save, X, ChevronDown } from "lucide-react";

const categories: KnowledgeCategory[] = ["policy", "faq", "hours", "payment", "general"];

const categoryColors: Record<string, string> = {
  policy: "text-blue-600 bg-blue-50",
  faq: "text-purple-600 bg-purple-50",
  hours: "text-amber-600 bg-amber-50",
  payment: "text-emerald-600 bg-emerald-50",
  general: "text-gray-600 bg-gray-100",
};

export default function AdminKnowledgeBasePage() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<AiKnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<KnowledgeCategory>("faq");
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const data = await getAllKnowledgeBase();
      if (!cancelled) {
        setEntries(data);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!profile || !formQuestion.trim() || !formAnswer.trim()) return;
    setSaving(true);

    if (editingId) {
      await updateKnowledgeEntry(editingId, {
        category: formCategory,
        question: formQuestion,
        answer: formAnswer,
      });
    } else {
      await createKnowledgeEntry(
        formCategory,
        formQuestion,
        formAnswer,
        profile.id
      );
    }

    resetForm();
    const data = await getAllKnowledgeBase();
    setEntries(data);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this knowledge base entry?")) return;
    await deleteKnowledgeEntry(id);
    const data = await getAllKnowledgeBase();
    setEntries(data);
  };

  const handleEdit = (entry: AiKnowledgeBase) => {
    setEditingId(entry.id);
    setFormCategory(entry.category);
    setFormQuestion(entry.question);
    setFormAnswer(entry.answer);
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormCategory("faq");
    setFormQuestion("");
    setFormAnswer("");
    setShowForm(false);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateKnowledgeEntry(id, { is_active: !isActive });
    const data = await getAllKnowledgeBase();
    setEntries(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Knowledge Base</h1>
          <p className="text-gray-500 mt-1">
            Manage responses for the AI assistant ({entries.length} entries)
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit Entry" : "New Entry"}
            </h3>
            <button onClick={resetForm} className="p-1 rounded hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <div className="relative">
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as KnowledgeCategory)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question (trigger phrase)
            </label>
            <input
              type="text"
              value={formQuestion}
              onChange={(e) => setFormQuestion(e.target.value)}
              placeholder="e.g. How do I make a payment?"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
            <textarea
              value={formAnswer}
              onChange={(e) => setFormAnswer(e.target.value)}
              placeholder="The AI will use this response..."
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formQuestion.trim() || !formAnswer.trim() || saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BrainCircuit className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No entries yet</h3>
          <p className="text-gray-500 mb-4">Add knowledge base entries to train your AI assistant</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Entry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`bg-white rounded-xl border p-5 transition-colors ${
                entry.is_active ? "border-gray-200" : "border-gray-100 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        categoryColors[entry.category] || "text-gray-600 bg-gray-100"
                      }`}
                    >
                      {entry.category}
                    </span>
                    {!entry.is_active && (
                      <span className="text-xs text-gray-400">Inactive</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{entry.question}</p>
                  <p className="text-sm text-gray-500">{entry.answer}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(entry.id, entry.is_active)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      entry.is_active
                        ? "text-gray-600 bg-gray-100 hover:bg-gray-200"
                        : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                    }`}
                  >
                    {entry.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => handleEdit(entry)}
                    className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  >
                    <Edit3 className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1.5 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
