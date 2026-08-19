import React, { useState } from 'react';
import { useProcurement } from '../ProcurementContext';
import { CustomFieldType, ProcurementCustomField } from '../types';
import {
  X,
  Layers,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Check,
  Info,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export const CustomFieldsModal: React.FC = () => {
  const {
    isCustomFieldsModalOpen,
    setIsCustomFieldsModalOpen,
    customFields,
    addCustomField,
    updateCustomField,
    deleteCustomField,
    reorderCustomFields,
    canManageFields,
  } = useProcurement();

  // Create Form State
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');
  const [description, setDescription] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [optionsStr, setOptionsStr] = useState('');
  const [required, setRequired] = useState(false);
  const [isDisplayedInTable, setIsDisplayedInTable] = useState(true);

  // Edit State
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editRequired, setEditRequired] = useState(false);
  const [editInTable, setEditInTable] = useState(true);

  const [formError, setFormError] = useState('');

  if (!isCustomFieldsModalOpen) return null;

  // Auto-format key from name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingFieldId) {
      const generatedKey = val
        .toLowerCase()
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
          index === 0 ? word.toLowerCase() : word.toUpperCase()
        )
        .replace(/\s+/g, '');
      setKey(generatedKey);
    }
  };

  const handleCreateField = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Field Name is required.');
      return;
    }
    if (!key.trim()) {
      setFormError('Field Key identifier is required.');
      return;
    }

    // Check key collision
    if (customFields.some((cf) => cf.key === key.trim())) {
      setFormError(`A field with key "${key}" already exists.`);
      return;
    }

    const options =
      type === 'select'
        ? optionsStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    addCustomField({
      name: name.trim(),
      key: key.trim(),
      type,
      description: description.trim() || undefined,
      placeholder: placeholder.trim() || undefined,
      options,
      required,
      isDisplayedInTable,
      order: customFields.length + 1,
    });

    // Reset
    setName('');
    setKey('');
    setType('text');
    setDescription('');
    setPlaceholder('');
    setOptionsStr('');
    setRequired(false);
    setIsDisplayedInTable(true);
    setIsAddingNew(false);
  };

  const handleStartEdit = (field: ProcurementCustomField) => {
    setEditingFieldId(field.id);
    setEditName(field.name);
    setEditDesc(field.description || '');
    setEditRequired(Boolean(field.required));
    setEditInTable(Boolean(field.isDisplayedInTable));
  };

  const handleSaveEdit = (fieldId: string) => {
    if (!editName.trim()) return;
    updateCustomField(fieldId, {
      name: editName.trim(),
      description: editDesc.trim() || undefined,
      required: editRequired,
      isDisplayedInTable: editInTable,
    });
    setEditingFieldId(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const reordered = [...customFields];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;
    reorderCustomFields(reordered);
  };

  const handleMoveDown = (index: number) => {
    if (index === customFields.length - 1) return;
    const reordered = [...customFields];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;
    reorderCustomFields(reordered);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E5E5E5] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E5E5E5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1A1A1A]">
                Manage Custom Dynamic Fields
              </h3>
              <p className="text-xs text-gray-500">
                Admin tool: Define and customize document tracking properties
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCustomFieldsModalOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-black transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Top Actions & Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-purple-900">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                Add any custom metadata fields. Fields will appear on document creation forms and the tracking data table.
              </span>
            </div>
            {canManageFields && !isAddingNew && (
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-green-400" />
                <span>Add New Field</span>
              </button>
            )}
          </div>

          {/* Add New Field Drawer / Box */}
          {isAddingNew && (
            <form
              onSubmit={handleCreateField}
              className="p-5 rounded-2xl bg-neutral-50 border border-neutral-300 space-y-4 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-purple-600" />
                  Define New Custom Field
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-gray-400 hover:text-black"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Field Label / Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. BAC Resolution No."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Internal Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="e.g. bacResolutionNo"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Field Data Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as CustomFieldType)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white font-medium"
                  >
                    <option value="text">Single-line Text</option>
                    <option value="number">Number</option>
                    <option value="currency">Currency (PHP ₱)</option>
                    <option value="date">Date</option>
                    <option value="select">Dropdown Select</option>
                    <option value="textarea">Multi-line Textarea</option>
                    <option value="boolean">Yes / No Checkbox</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Placeholder Hint</label>
                  <input
                    type="text"
                    value={placeholder}
                    onChange={(e) => setPlaceholder(e.target.value)}
                    placeholder="e.g. Enter reference number..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white"
                  />
                </div>

                {type === 'select' && (
                  <div className="md:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">
                      Dropdown Options (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={optionsStr}
                      onChange={(e) => setOptionsStr(e.target.value)}
                      placeholder="e.g. Option 1, Option 2, Option 3"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white"
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Description / Tooltip</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Helper text displayed underneath input..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={required}
                    onChange={(e) => setRequired(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
                  />
                  <span className="font-bold text-gray-700">Mandatory / Required Field</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDisplayedInTable}
                    onChange={(e) => setIsDisplayedInTable(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
                  />
                  <span className="font-bold text-gray-700">Display as Table Column</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3.5 py-1.5 rounded-xl border hover:bg-gray-100 text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span>Save Custom Field</span>
                </button>
              </div>
            </form>
          )}

          {/* Existing Fields List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-gray-500 font-bold uppercase tracking-wider text-[10px] px-1">
              <span>Active Fields ({customFields.length})</span>
              <span>Reorder / Controls</span>
            </div>

            {customFields.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-gray-400">
                No custom fields defined yet. Click "Add New Field" above to create one.
              </div>
            ) : (
              customFields.map((field, idx) => {
                const isEditing = editingFieldId === field.id;

                if (isEditing) {
                  return (
                    <div
                      key={field.id}
                      className="p-3.5 rounded-2xl bg-white border border-black shadow-xs space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500">Field Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500">Description</label>
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editRequired}
                              onChange={(e) => setEditRequired(e.target.checked)}
                              className="accent-black"
                            />
                            <span className="font-bold">Required</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editInTable}
                              onChange={(e) => setEditInTable(e.target.checked)}
                              className="accent-black"
                            />
                            <span className="font-bold">Show in Table</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingFieldId(null)}
                            className="px-2.5 py-1 rounded-lg border text-gray-600 font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(field.id)}
                            className="px-3 py-1 rounded-lg bg-black text-white font-bold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3 text-green-400" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#E5E5E5] hover:border-gray-400 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-xs truncate">{field.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono text-[9px]">
                            {field.type}
                          </span>
                          {field.required && (
                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[9px]">
                              Required
                            </span>
                          )}
                          {field.isDisplayedInTable && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[9px]">
                              Table Column
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono block truncate">
                          Key: {field.key} {field.description && `• ${field.description}`}
                        </span>
                      </div>
                    </div>

                    {canManageFields && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className={`p-1.5 rounded-lg border hover:bg-gray-100 ${
                            idx === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          title="Move up"
                        >
                          <ArrowUp className="w-3 h-3 text-gray-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === customFields.length - 1}
                          className={`p-1.5 rounded-lg border hover:bg-gray-100 ${
                            idx === customFields.length - 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          title="Move down"
                        >
                          <ArrowDown className="w-3 h-3 text-gray-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(field)}
                          className="p-1.5 rounded-lg border hover:bg-gray-100 text-gray-600 cursor-pointer ml-1"
                          title="Edit field settings"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCustomField(field.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer"
                          title="Delete custom field"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F5F5F5] border-t border-[#E5E5E5] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={() => setIsCustomFieldsModalOpen(false)}
            className="px-5 py-2 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl transition cursor-pointer text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
