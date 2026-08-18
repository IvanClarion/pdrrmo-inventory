import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { X, Plus, Edit, Trash2, FolderPlus, Check, AlertTriangle } from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteCategoryPrompt?: (categoryName: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  onDeleteCategoryPrompt,
}) => {
  const { categories, addCategory, editCategory, deleteCategory, items } = useInventory();
  const [newCatName, setNewCatName] = useState('');
  const [editingOld, setEditingOld] = useState<string | null>(null);
  const [editingNew, setEditingNew] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim()) {
      addCategory(newCatName.trim());
      setNewCatName('');
    }
  };

  const handleSaveEdit = (oldName: string) => {
    if (editingNew.trim() && editingNew.trim() !== oldName) {
      editCategory(oldName, editingNew.trim());
    }
    setEditingOld(null);
    setEditingNew('');
  };

  const handleConfirmDelete = () => {
    if (!categoryToDelete) return;
    deleteCategory(categoryToDelete);
    if (onDeleteCategoryPrompt) {
      onDeleteCategoryPrompt(categoryToDelete);
    }
    setCategoryToDelete(null);
  };

  const itemsInDeletingCat = categoryToDelete
    ? items.filter((i) => i.category === categoryToDelete).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E5E5] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <FolderPlus className="w-5 h-5 text-black" />
            <h3 className="text-sm font-bold text-[#1A1A1A]">Manage Inventory Categories</h3>
          </div>
          <button
            onClick={() => {
              setCategoryToDelete(null);
              setEditingOld(null);
              onClose();
            }}
            className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {categoryToDelete ? (
            /* Delete Confirmation View inside Modal */
            <div className="p-4 bg-red-50/80 border border-red-200 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-950">Delete Category</h4>
                  <p className="text-[11px] text-red-800 mt-0.5 font-medium">
                    Are you sure you want to remove <strong className="text-red-950 font-bold">"{categoryToDelete}"</strong>?
                  </p>
                </div>
              </div>

              {itemsInDeletingCat > 0 ? (
                <div className="p-2.5 bg-white/90 border border-red-200 rounded-xl text-[11px] text-gray-700 leading-snug">
                  <span className="font-bold text-red-700">Notice: </span>
                  <strong>{itemsInDeletingCat}</strong> active item{itemsInDeletingCat === 1 ? '' : 's'} assigned to this category will be safely reassigned to <strong>"General Inventory"</strong>.
                </div>
              ) : (
                <div className="p-2.5 bg-white/90 border border-red-200 rounded-xl text-[11px] text-gray-600 leading-snug">
                  No active inventory items are currently assigned to this category.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(null)}
                  className="px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-white rounded-xl transition cursor-pointer border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Add Category Input */}
              <form onSubmit={handleAdd} className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New category name..."
                  className="flex-1 px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button
                  type="submit"
                  disabled={!newCatName.trim()}
                  className="px-4 py-2 bg-black hover:bg-neutral-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>

              {/* Categories List */}
              <div className="space-y-2 pt-2">
                <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                  Existing Categories ({categories.length})
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const itemCount = items.filter((i) => i.category === cat).length;
                    const isEditing = editingOld === cat;

                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100/80 rounded-xl border border-gray-200 transition"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1 mr-2">
                            <input
                              type="text"
                              value={editingNew}
                              onChange={(e) => setEditingNew(e.target.value)}
                              className="flex-1 px-2.5 py-1 bg-white border border-black rounded-lg text-xs font-semibold"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(cat)}
                              className="p-1.5 bg-black text-white rounded-lg hover:bg-gray-800 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingOld(null)}
                              className="p-1.5 text-gray-500 hover:text-black cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div>
                              <span className="text-xs font-bold text-[#1A1A1A] block">{cat}</span>
                              <span className="text-[10px] text-gray-400 font-medium">
                                {itemCount} active {itemCount === 1 ? 'item' : 'items'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingOld(cat);
                                  setEditingNew(cat);
                                }}
                                className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-white transition cursor-pointer"
                                title="Rename Category"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setCategoryToDelete(cat)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white transition cursor-pointer"
                                title="Delete Category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
