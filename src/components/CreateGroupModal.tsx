import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Users,
  Check,
  Camera,
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { UserProfile } from '../types';
import { UserAvatar } from './UserAvatar';
import { uploadMedia } from '../services/mediaUploadService';

export const CreateGroupModal: React.FC = () => {
  const {
    isCreateGroupOpen,
    closeCreateGroup,
    createGroup,
    currentUser,
    allUsers,
    showToast,
    setActiveTab,
    setActiveConversationId,
  } = useOrbit();

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!isCreateGroupOpen) {
      setGroupName('');
      setDescription('');
      setPhotoURL('');
      setSelectedUserIds([]);
      setSearch('');
      setIsSubmitting(false);
      setIsUploadingPhoto(false);
    }
  }, [isCreateGroupOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreateGroupOpen) {
        closeCreateGroup();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateGroupOpen, closeCreateGroup]);

  if (!isCreateGroupOpen || !currentUser) return null;

  const candidateUsers = allUsers.filter((u) => u && u.id && u.id !== currentUser.id);
  const filteredUsers = candidateUsers.filter(
    (u) =>
      (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
      (u.username && u.username.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Invalid File', 'Please select an image file for the group avatar.', 'alert');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const upload = uploadMedia({
        file,
        folder: 'groups',
        entityId: `temp_grp_${Date.now()}`,
      });
      const result = await upload.promise;
      setPhotoURL(result.downloadURL);
      showToast('Avatar Uploaded', 'Group avatar uploaded successfully.', 'success');
    } catch (err) {
      console.error('[CreateGroupModal] Avatar upload error:', err);
      showToast('Upload Failed', 'Could not upload group avatar.', 'alert');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = groupName.trim();
    if (!trimmed) {
      showToast('Group Name Required', 'Please enter a name for the group.', 'alert');
      return;
    }

    if (selectedUserIds.length < 1) {
      showToast('Members Required', 'Please add at least 1 other member (minimum 2 total).', 'alert');
      return;
    }

    if (selectedUserIds.length > 99) {
      showToast('Member Limit', 'Maximum 100 members allowed per group.', 'alert');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createGroup(
        trimmed,
        selectedUserIds,
        photoURL || undefined,
        description.trim() || undefined
      );

      if (created) {
        closeCreateGroup();
        setActiveTab('messages');
        setActiveConversationId(created.id);
      }
    } catch (err) {
      console.error('[CreateGroupModal] Failed to create group:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalMembersCount = selectedUserIds.length + 1; // +1 for currentUser

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={closeCreateGroup}
    >
      <div
        className="w-full max-w-lg bg-[#111111] border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-[#141414]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-white">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-100">Create Group Chat</h2>
              <p className="text-[11px] text-stone-400">
                {totalMembersCount} {totalMembersCount === 1 ? 'member' : 'members'} (min 2, max 100)
              </p>
            </div>
          </div>
          <button
            onClick={closeCreateGroup}
            className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* Group Profile Header: Avatar + Name */}
            <div className="flex items-center gap-4">
              <div className="relative group/avatar cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt="Group"
                    className="w-16 h-16 rounded-full object-cover border-2 border-stone-700"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-stone-800 border-2 border-dashed border-stone-700 flex flex-col items-center justify-center text-stone-400 hover:border-stone-500 hover:text-white transition-colors">
                    {isUploadingPhoto ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        <span className="text-[9px] mt-0.5 font-medium">Avatar</span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-stone-300">
                  Group Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Design Systems, Tokyo Crew"
                  maxLength={60}
                  required
                  className="w-full bg-[#181818] border border-stone-800 focus:border-stone-500 text-sm text-stone-100 px-3 py-2 rounded-xl focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Description (Optional) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this group about?"
                rows={2}
                maxLength={200}
                className="w-full bg-[#181818] border border-stone-800 focus:border-stone-500 text-xs text-stone-100 px-3 py-2 rounded-xl focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Selected Members Chips */}
            {selectedUserIds.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-300">
                    Selected Members ({selectedUserIds.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="text-[11px] text-stone-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-[#161616] border border-stone-800 rounded-xl">
                  {selectedUserIds.map((uid) => {
                    const u = candidateUsers.find((user) => user.id === uid);
                    if (!u) return null;
                    return (
                      <span
                        key={uid}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-stone-800 text-stone-200 border border-stone-700"
                      >
                        <UserAvatar src={u.avatar} name={u.name} size="xs" />
                        <span className="truncate max-w-[120px] font-medium">{u.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleUserSelection(uid)}
                          className="hover:text-red-400 ml-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Member Search & Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-300">Add Members</label>
              <div className="relative">
                <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search people by name or @handle..."
                  className="w-full bg-[#181818] border border-stone-800 focus:border-stone-500 text-xs text-stone-100 pl-9 pr-3 py-2 rounded-xl focus:outline-none transition-colors placeholder:text-stone-500"
                />
              </div>

              <div className="border border-stone-800 rounded-xl divide-y divide-stone-800/60 max-h-48 overflow-y-auto bg-[#141414]">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`p-2.5 flex items-center justify-between hover:bg-stone-800/50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-stone-800/30' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar src={user.avatar} name={user.name} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-stone-200 truncate">{user.name}</p>
                            <p className="text-[11px] text-stone-500 truncate">@{user.username}</p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-white border-white text-black'
                              : 'border-stone-700 bg-stone-900/60'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-stone-500 text-xs">
                    No users found matching "{search}".
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-stone-800 bg-[#141414] flex items-center justify-between">
            <div className="text-xs text-stone-400">
              {selectedUserIds.length === 0 ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 inline" /> Select at least 1 member
                </span>
              ) : (
                <span>{selectedUserIds.length + 1} total members</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeCreateGroup}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!groupName.trim() || selectedUserIds.length < 1 || isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-stone-200 disabled:opacity-40 disabled:hover:bg-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    <span>Create Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
