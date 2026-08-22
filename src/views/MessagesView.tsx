import React, { useState } from 'react';
import {
  Search,
  Plus,
  Send,
  Trash2,
  CheckCheck,
  ArrowLeft,
  MessageSquare,
  Smile,
  CheckCircle2,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { UserAvatar } from '../components/UserAvatar';

export const MessagesView: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    deleteConversation,
    markConversationAsRead,
    openNewMessage,
    currentUser,
  } = useOrbit();

  const [search, setSearch] = useState('');
  const [inputText, setInputText] = useState('');

  if (!currentUser) return null;

  const validConversations = conversations.filter(
    (c): c is typeof c =>
      Boolean(c && c.id && c.participant && typeof c.participant.name === 'string')
  );

  const filteredConversations = validConversations.filter(
    (c) =>
      (c.participant.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.participant.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeConv =
    validConversations.find((c) => c.id === activeConversationId) ||
    (validConversations.length > 0 ? validConversations[0] : null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !activeConv.participant?.id || !inputText.trim()) return;

    sendMessage(activeConv.participant.id, inputText.trim());
    setInputText('');
  };

  return (
    <div id="messages-view" className="flex flex-col flex-1 h-[calc(100vh-65px)] md:h-screen bg-[#0a0a0a]">
      {validConversations.length === 0 ? (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none animate-in fade-in duration-200">
          <div className="w-14 h-14 border border-stone-800 bg-[#141414] rounded-2xl flex items-center justify-center text-stone-400 mb-5 shadow-inner">
            <MessageSquare className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>

          <h2 className="font-bold text-xl text-stone-100 mb-2">
            No Messages Yet
          </h2>

          <p className="text-xs text-stone-400 max-w-sm mb-6 leading-relaxed">
            Drop a direct message to creators, share design feedback, or collaborate in private channels.
          </p>

          <button
            onClick={openNewMessage}
            className="px-6 py-2.5 bg-white hover:bg-stone-200 text-black font-bold text-xs rounded-full transition-all shadow-md cursor-pointer active:scale-95"
          >
            + Start Conversation
          </button>
        </div>
      ) : (
        /* Split Messaging Workspace */
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Conversations List */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-stone-800/80 flex flex-col bg-[#0c0c0c] ${
              activeConv && activeConversationId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Header with Search and New Message */}
            <div className="p-3.5 border-b border-stone-800/80 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Direct Messages..."
                  className="w-full bg-[#161616] border border-stone-800 focus:border-stone-500 text-xs text-stone-200 pl-9 pr-3 py-2 rounded-full focus:outline-none placeholder:text-stone-500 transition-colors"
                />
              </div>

              <button
                onClick={openNewMessage}
                title="New message"
                className="p-2 bg-white hover:bg-stone-200 text-black rounded-full transition-colors cursor-pointer shrink-0 active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-stone-800/50">
              {filteredConversations.map((conv) => {
                const isSelected = activeConv?.id === conv.id;
                const lastMsgText = conv.lastMessage?.text || 'No messages yet';
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      markConversationAsRead(conv.id);
                    }}
                    className={`p-3.5 flex items-start gap-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900/70 border-l-2 border-white'
                        : 'hover:bg-stone-900/40'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <UserAvatar
                        src={conv.participant?.avatar}
                        name={conv.participant?.name || 'Member'}
                        size="md"
                        className="w-11 h-11 border border-stone-800"
                      />
                      {(conv.unreadCount || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-white ring-2 ring-[#0c0c0c]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-bold text-sm text-stone-100 truncate">
                            {conv.participant?.name || 'Member'}
                          </span>
                          {conv.participant?.verified && (
                            <CheckCircle2 className="w-3 h-3 text-white shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-stone-500 font-mono shrink-0">
                          {conv.updatedAt || 'Recent'}
                        </span>
                      </div>

                      <p
                        className={`text-xs truncate ${
                          (conv.unreadCount || 0) > 0
                            ? 'text-stone-100 font-semibold'
                            : 'text-stone-400'
                        }`}
                      >
                        {lastMsgText}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Active Chat Thread */}
          {activeConv && activeConv.participant ? (
            <div
              className={`flex-1 flex flex-col bg-[#0f0f0f] ${
                activeConv && activeConversationId ? 'flex' : 'hidden md:flex'
              }`}
            >
              {/* Chat Top Bar */}
              <div className="p-3.5 border-b border-stone-800/80 flex items-center justify-between bg-[#0c0c0c]/90 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConversationId(null)}
                    className="md:hidden p-1.5 text-stone-400 hover:text-stone-100 rounded-full cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <UserAvatar
                    src={activeConv.participant?.avatar}
                    name={activeConv.participant?.name || 'Member'}
                    size="md"
                    className="border border-stone-800"
                  />

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-stone-100">
                        {activeConv.participant?.name || 'Member'}
                      </span>
                      {activeConv.participant?.verified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 font-mono">
                      @{activeConv.participant?.username || 'member'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteConversation(activeConv.id)}
                    className="p-2 text-stone-500 hover:text-red-400 hover:bg-stone-800/80 rounded-full transition-colors cursor-pointer"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-3.5">
                {Array.isArray(activeConv.messages) && activeConv.messages.length > 0 ? (
                  activeConv.messages.map((msg) => {
                    if (!msg) return null;
                    const isMe = msg.senderId === currentUser.id;
                    return (
                      <div
                        key={msg.id || `msg_${Math.random()}`}
                        className={`flex flex-col max-w-[75%] ${
                          isMe ? 'self-end items-end' : 'self-start items-start'
                        }`}
                      >
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm ${
                            isMe
                              ? 'bg-white text-black font-medium rounded-br-xs'
                              : 'bg-[#181818] border border-stone-800 text-stone-100 rounded-bl-xs'
                          }`}
                        >
                          {msg.text || ''}
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-stone-500 font-mono mt-1 px-1">
                          <span>{msg.createdAt || 'Just now'}</span>
                          {isMe && <CheckCheck className="w-3 h-3 text-stone-400" />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center text-stone-500">
                    <p className="text-xs">Send the first message to begin this conversation.</p>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSend}
                className="p-3 border-t border-stone-800/80 bg-[#0c0c0c] flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setInputText((prev) => `${prev} ✨ `)}
                  className="p-2 text-stone-400 hover:text-white hover:bg-stone-800/80 rounded-full transition-colors cursor-pointer"
                  title="Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message @${activeConv.participant?.username || 'member'}...`}
                  className="flex-1 bg-[#161616] border border-stone-800 focus:border-stone-500 text-xs md:text-sm text-stone-100 px-4 py-2.5 rounded-full focus:outline-none placeholder:text-stone-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="px-4 py-2.5 bg-white hover:bg-stone-200 disabled:opacity-40 disabled:hover:bg-white text-black font-bold text-xs rounded-full flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-1 hidden md:flex items-center justify-center text-center p-8 text-stone-500">
              <p className="text-xs">Select a chat from the left panel to start messaging.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
