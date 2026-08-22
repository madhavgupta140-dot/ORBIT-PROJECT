import React, { useState, useEffect } from 'react';
import { X, Search, Send, CheckCircle2, User, AlertCircle, Loader2 } from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { UserProfile } from '../types';
import { UserAvatar } from './UserAvatar';
import { getUserByUsername } from '../lib/firebase';

export const NewMessageModal: React.FC = () => {
  const {
    isNewMessageOpen,
    closeNewMessage,
    sendMessage,
    setActiveTab,
    currentUser,
    allUsers,
    showToast,
  } = useOrbit();

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [remoteUserNotFound, setRemoteUserNotFound] = useState(false);
  const [remoteFoundUser, setRemoteFoundUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!isNewMessageOpen) {
      setSelectedUser(null);
      setMessageText('');
      setSearch('');
      setRemoteFoundUser(null);
      setRemoteUserNotFound(false);
      setIsSearchingRemote(false);
    }
  }, [isNewMessageOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isNewMessageOpen) {
        closeNewMessage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewMessageOpen, closeNewMessage]);

  if (!isNewMessageOpen || !currentUser) return null;

  const otherUsers = allUsers.filter((u) => u && u.id && u.id !== currentUser.id);
  const filteredUsers = otherUsers.filter(
    (u) =>
      (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
      (u.username && u.username.toLowerCase().includes(search.toLowerCase()))
  );

  const handleRemoteSearch = async () => {
    const cleanHandle = search.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanHandle) return;

    if (currentUser.username && cleanHandle === currentUser.username.toLowerCase()) {
      showToast('Notice', 'You cannot start a direct message thread with yourself.', 'alert');
      return;
    }

    // Check if in local list first
    const localMatch = otherUsers.find((u) => u.username.toLowerCase() === cleanHandle);
    if (localMatch) {
      setSelectedUser(localMatch);
      setRemoteFoundUser(null);
      setRemoteUserNotFound(false);
      return;
    }

    setIsSearchingRemote(true);
    setRemoteUserNotFound(false);
    setRemoteFoundUser(null);

    try {
      const user = await getUserByUsername(cleanHandle);
      if (user && user.id !== currentUser.id) {
        setRemoteFoundUser(user);
        setRemoteUserNotFound(false);
      } else {
        setRemoteUserNotFound(true);
        setRemoteFoundUser(null);
      }
    } catch {
      setRemoteUserNotFound(true);
      setRemoteFoundUser(null);
    } finally {
      setIsSearchingRemote(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !messageText.trim()) return;

    try {
      await sendMessage(selectedUser.id, messageText.trim());
      setActiveTab('messages');
      closeNewMessage();
    } catch (err) {
      console.error('[ORBIT] Failed to send message:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeNewMessage();
      }}
    >
      <div className="w-full max-w-md bg-[#121212] border border-stone-800 rounded-2xl p-6 shadow-2xl relative text-stone-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800/80 mb-4">
          <h2 className="font-bold text-base text-stone-100">
            New Message
          </h2>
          <button
            onClick={closeNewMessage}
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="flex flex-col gap-4">
          {!selectedUser ? (
            <>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setRemoteUserNotFound(false);
                      setRemoteFoundUser(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRemoteSearch();
                      }
                    }}
                    placeholder="Search creators or type @username..."
                    className="w-full bg-[#161616] border border-stone-800 focus:border-white text-xs text-stone-100 pl-10 pr-3.5 py-2.5 rounded-full focus:outline-none placeholder:text-stone-500 transition-colors font-mono"
                  />
                </div>

                {search.trim() && (
                  <button
                    type="button"
                    onClick={handleRemoteSearch}
                    disabled={isSearchingRemote}
                    className="px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 text-xs font-bold rounded-full transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {isSearchingRemote ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Find</span>
                    )}
                  </button>
                )}
              </div>

              {/* Remote lookup results or status */}
              {isSearchingRemote && (
                <div className="p-3 bg-[#161616] border border-stone-800 rounded-xl flex items-center justify-center gap-2 text-stone-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Looking up user registry...</span>
                </div>
              )}

              {remoteUserNotFound && (
                <div className="p-3.5 bg-red-950/30 border border-red-900/50 rounded-xl flex items-center gap-3 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-bold">User not found</span>
                    <span className="text-[11px] text-red-400/80">
                      No registered Orbit account exists with username @{search.trim().replace(/^@+/, '')}.
                    </span>
                  </div>
                </div>
              )}

              {remoteFoundUser && (
                <div className="p-3 bg-[#161616] border border-stone-700 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={remoteFoundUser.avatar}
                      name={remoteFoundUser.name}
                      size="sm"
                      className="border border-stone-800"
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-stone-100">
                          {remoteFoundUser.name}
                        </span>
                        {remoteFoundUser.verified && (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-[11px] text-stone-500 font-mono">
                        @{remoteFoundUser.username}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(remoteFoundUser)}
                    className="px-3 py-1.5 bg-white text-black font-bold text-xs rounded-full hover:bg-stone-200 cursor-pointer"
                  >
                    Select
                  </button>
                </div>
              )}

              {/* Local List */}
              <div className="max-h-60 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      className="flex items-center justify-between p-2.5 bg-[#161616] hover:bg-stone-800/80 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={user.avatar}
                          name={user.name}
                          size="sm"
                          className="border border-stone-800"
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-xs text-stone-100">
                              {user.name}
                            </span>
                            {user.verified && (
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="text-[11px] text-stone-500 font-mono">
                            @{user.username}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-white font-bold">
                        Message
                      </span>
                    </button>
                  ))
                ) : !search.trim() ? (
                  <div className="py-8 text-center text-stone-500">
                    <p className="text-xs">Search for a registered user to start messaging.</p>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-[#181818] border border-stone-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={selectedUser.avatar}
                    name={selectedUser.name}
                    size="sm"
                    className="border border-stone-800"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-stone-100">
                        {selectedUser.name}
                      </span>
                      {selectedUser.verified && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 font-mono">
                      @{selectedUser.username}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-xs text-stone-400 hover:text-white hover:underline cursor-pointer font-medium"
                >
                  Change
                </button>
              </div>

              <div>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Send a message to @${selectedUser.username}...`}
                  rows={3}
                  className="w-full bg-[#161616] border border-stone-800 focus:border-white text-xs text-stone-100 p-3 rounded-xl focus:outline-none resize-none placeholder:text-stone-500 leading-relaxed transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800/80">
                <button
                  type="button"
                  onClick={closeNewMessage}
                  className="px-4 py-2 text-xs font-semibold text-stone-400 hover:text-stone-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="px-5 py-2 bg-white hover:bg-stone-200 disabled:opacity-40 text-black font-bold text-xs rounded-full flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
