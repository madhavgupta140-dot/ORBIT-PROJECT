import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
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
  Pin,
  Forward,
  MoreHorizontal,
  Copy,
  Check,
  X,
  AlertTriangle,
  Users,
  Paperclip,
  Info,
  LogOut,
  Shield,
  Reply,
  Edit3,
  UserPlus,
  UserMinus,
  Crown,
  Columns,
  Maximize,
  Maximize2,
  Minimize2,
  Camera,
  Loader2,
  ArrowLeftRight,
  CheckCheck as CheckDouble,
} from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { UserAvatar } from '../components/UserAvatar';
import { ChatMessage, Conversation, UserProfile } from '../types';
import { uploadMedia } from '../services/mediaUploadService';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏', '🚀', '💯', '✨', '👀'];

/**
 * Safely parses any Firestore Timestamp, millis number, ISO string, or time string into a valid Date.
 */
export function parseToValidDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val?.toDate === 'function') {
    try {
      const d = val.toDate();
      if (!isNaN(d.getTime())) return d;
    } catch {}
  }
  if (typeof val?.toMillis === 'function') {
    try {
      const ms = val.toMillis();
      if (!isNaN(ms)) return new Date(ms);
    } catch {}
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof val?.seconds === 'number') {
    return new Date(val.seconds * 1000);
  }
  if (typeof val === 'string') {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;
    const timeMatch = val.match(/(\d{1,2}):(\d{2})(?:\s*([AP]M))?/i);
    if (timeMatch) {
      const now = new Date();
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const meridian = timeMatch[3]?.toUpperCase();
      if (meridian === 'PM' && hours < 12) hours += 12;
      if (meridian === 'AM' && hours === 12) hours = 0;
      now.setHours(hours, minutes, 0, 0);
      return now;
    }
  }
  return null;
}

/**
 * Formats timestamps into the required human format:
 * e.g. "Today 4:43 PM", "Yesterday 2:15 PM", "Oct 12 3:30 PM"
 * Never exposes raw timestamps or "Invalid Date".
 */
export function formatStatusTime(val: any, fallbackLabel = 'Today'): string {
  const date = parseToValidDate(val);
  if (!date) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${fallbackLabel} ${timeStr}`;
  }
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday) {
    return `Today ${timeStr}`;
  }
  if (isYesterday) {
    return `Yesterday ${timeStr}`;
  }
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
}

interface ChatMessageBubbleProps {
  msg: ChatMessage;
  isMe: boolean;
  currentUser: UserProfile;
  activeConv: Conversation;
  allUsers: UserProfile[];
  isMenuOpen: boolean;
  isEmojiPickerOpen: boolean;
  copiedMessageId: string | null;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  onToggleMenu: (e: React.MouseEvent) => void;
  onToggleEmojiPicker: (e: React.MouseEvent) => void;
  onCloseMenu: () => void;
  onCloseEmojiPicker: () => void;
  onCopyText: (msg: ChatMessage) => void;
  onForward: (msg: ChatMessage) => void;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onOpenDeleteModal: (msg: ChatMessage) => void;
  onOpenMessageInfo: (msg: ChatMessage) => void;
  onReact: (convId: string, msgId: string, emoji: string) => void;
  onTouchStart: (msgId: string) => void;
  onTouchEnd: () => void;
  canDeleteMsg: boolean;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  msg,
  isMe,
  currentUser,
  activeConv,
  allUsers,
  isMenuOpen,
  isEmojiPickerOpen,
  copiedMessageId,
  chatContainerRef,
  onToggleMenu,
  onToggleEmojiPicker,
  onCloseMenu,
  onCloseEmojiPicker,
  onCopyText,
  onForward,
  onReply,
  onEdit,
  onOpenDeleteModal,
  onOpenMessageInfo,
  onReact,
  onTouchStart,
  onTouchEnd,
  canDeleteMsg,
}) => {
  const bubbleWrapperRef = useRef<HTMLDivElement>(null);
  const [menuPlacement, setMenuPlacement] = useState<'above' | 'below'>('above');
  const [emojiPlacement, setEmojiPlacement] = useState<'above' | 'below'>('above');

  useLayoutEffect(() => {
    if (!isMenuOpen && !isEmojiPickerOpen) return;

    const calculatePlacement = () => {
      const bubbleEl = bubbleWrapperRef.current;
      const containerEl = chatContainerRef.current;
      if (!bubbleEl || !containerEl) return;

      const cRect = containerEl.getBoundingClientRect();
      const bRect = bubbleEl.getBoundingClientRect();

      const spaceAbove = bRect.top - cRect.top;
      const spaceBelow = cRect.bottom - bRect.bottom;

      if (isMenuOpen) {
        if (spaceAbove >= 240) {
          setMenuPlacement('above');
        } else if (spaceBelow >= 150 || spaceBelow > spaceAbove) {
          setMenuPlacement('below');
        } else {
          setMenuPlacement('above');
        }
      }

      if (isEmojiPickerOpen) {
        if (spaceAbove >= 56) {
          setEmojiPlacement('above');
        } else if (spaceBelow >= 50 || spaceBelow > spaceAbove) {
          setEmojiPlacement('below');
        } else {
          setEmojiPlacement('above');
        }
      }
    };

    calculatePlacement();

    const containerEl = chatContainerRef.current;
    if (containerEl) {
      containerEl.addEventListener('scroll', calculatePlacement, { passive: true });
    }
    window.addEventListener('resize', calculatePlacement);

    return () => {
      if (containerEl) {
        containerEl.removeEventListener('scroll', calculatePlacement);
      }
      window.removeEventListener('resize', calculatePlacement);
    };
  }, [isMenuOpen, isEmojiPickerOpen, chatContainerRef]);

  // 1. Centered system message (pill design)
  if (msg.isSystem) {
    return (
      <div className="self-center my-2.5 px-3.5 py-1 bg-stone-900/90 border border-stone-800/80 rounded-full text-[11px] text-stone-400 font-mono flex items-center gap-1.5 shadow-xs select-none max-w-[85%] text-center">
        <span>{msg.text}</span>
        {msg.createdAt && (
          <span className="text-[9px] text-stone-600 font-sans">• {msg.createdAt}</span>
        )}
      </div>
    );
  }

  // 2. Soft-deleted message representation (WhatsApp / Instagram style)
  if (msg.isDeleted) {
    const deletedLabel = isMe
      ? 'You deleted this message'
      : `${msg.deletedByName || msg.senderName || 'Sender'} deleted this message`;

    return (
      <div
        className={`group relative flex flex-col max-w-[85%] md:max-w-[70%] my-1 ${
          isMe ? 'self-end items-end' : 'self-start items-start'
        }`}
      >
        <div
          className={`px-3.5 py-2 rounded-2xl text-xs italic flex items-center gap-2 select-none border ${
            isMe
              ? 'bg-[#141414]/80 border-stone-800/80 text-stone-500 rounded-br-xs'
              : 'bg-[#111111]/80 border-stone-850 text-stone-500 rounded-bl-xs'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5 text-stone-600 shrink-0" />
          <span>{deletedLabel}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-stone-600 font-mono mt-0.5 px-1">
          <span>{msg.createdAt || 'Just now'}</span>
        </div>
      </div>
    );
  }

  const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
  const isSenderAdmin = activeConv.group?.ownerUid === msg.senderId;
  const isSenderCoAdmin =
    activeConv.group?.coAdmins?.includes(msg.senderId) ||
    (!activeConv.group?.coAdmins && activeConv.group?.admins?.includes(msg.senderId) && !isSenderAdmin);

  // Delivery / Seen calculations
  const otherParticipantsCount = activeConv.isGroup
    ? Math.max(1, (activeConv.group?.members?.length || activeConv.participantIds?.length || 2) - 1)
    : 1;
  const readByEntries = Object.keys(msg.readBy || {}).filter((uid) => uid !== currentUser.id);
  const readByCount = readByEntries.length;
  const isSeenByAll = readByCount >= otherParticipantsCount;
  const isPartiallyRead = readByCount > 0 && !isSeenByAll;

  // Resolve reactor names
  const getReactorNames = (uids: string[]) => {
    return uids
      .map((uid) => {
        if (uid === currentUser.id) return 'You';
        const u = allUsers.find((user) => user.id === uid);
        return u?.name || 'Member';
      })
      .join(', ');
  };

  return (
    <div
      className={`group relative flex flex-col max-w-[85%] md:max-w-[70%] ${
        hasReactions ? 'mb-3' : 'mb-1'
      } ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
      onTouchStart={() => onTouchStart(msg.id)}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchEnd}
    >
      {/* Forwarded Header */}
      {msg.isForwarded && (
        <div className="flex items-center gap-1 text-[10px] text-stone-400 font-medium mb-1 px-1 select-none italic">
          <Forward className="w-3 h-3 text-stone-400" />
          <span>Forwarded</span>
        </div>
      )}

      {/* Sender Identity in Group Chats */}
      {activeConv.isGroup && !isMe && (
        <div className="flex items-center gap-1.5 mb-1 px-1">
          {msg.senderAvatar ? (
            <img
              src={msg.senderAvatar}
              alt={msg.senderName || 'Member'}
              className="w-4 h-4 rounded-full object-cover border border-stone-800"
            />
          ) : (
            <div className="w-4 h-4 rounded-full bg-stone-800 flex items-center justify-center text-[9px] text-stone-300">
              {(msg.senderName || 'M').charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-[11px] font-bold text-stone-200">
            {msg.senderName || 'Orbit Member'}
          </span>
          {msg.senderUsername && (
            <span className="text-[10px] text-stone-500 font-mono">
              @{msg.senderUsername}
            </span>
          )}
          {/* Role badge */}
          {isSenderAdmin && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80">
              <Crown className="w-2.5 h-2.5 text-amber-400" /> Admin
            </span>
          )}
          {isSenderCoAdmin && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-800/80">
              <Shield className="w-2.5 h-2.5 text-sky-400" /> Co-Admin
            </span>
          )}
        </div>
      )}

      <div ref={bubbleWrapperRef} className="relative flex items-center group/bubble">
        {/* Left Action Menu Trigger for outgoing messages */}
        {isMe && (
          <div className="opacity-0 group-hover/bubble:opacity-100 md:opacity-0 focus-within:opacity-100 mr-1.5 flex items-center gap-1 transition-opacity">
            <button
              onClick={onToggleEmojiPicker}
              className="p-1 text-stone-500 hover:text-stone-200 hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
              title="Add reaction"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onToggleMenu}
              className="p-1 text-stone-500 hover:text-stone-200 hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
              title="Message options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm transition-all relative select-text ${
            isMe
              ? 'bg-white text-black font-medium rounded-br-xs'
              : 'bg-[#181818] border border-stone-800 text-stone-100 rounded-bl-xs'
          }`}
        >
          {/* Quoted Reply if present */}
          {msg.replyToText && (
            <div
              className={`mb-2 px-2.5 py-1.5 rounded-lg border-l-2 text-[11px] leading-tight ${
                isMe
                  ? 'bg-stone-100 border-stone-400 text-stone-800'
                  : 'bg-stone-900 border-stone-600 text-stone-300'
              }`}
            >
              <div className="font-semibold text-[10px] text-stone-500 mb-0.5">
                Replying to {msg.replyToName ? `@${msg.replyToName}` : 'message'}
              </div>
              <p className="line-clamp-2 truncate">{msg.replyToText}</p>
            </div>
          )}

          {/* Media Attachment if present */}
          {msg.mediaUrl && (
            <div className="mb-2 rounded-xl overflow-hidden max-w-xs border border-stone-800/80">
              <img
                src={msg.mediaUrl}
                alt="Attachment"
                className="w-full max-h-60 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => window.open(msg.mediaUrl, '_blank')}
              />
            </div>
          )}

          {msg.text && <span>{msg.text}</span>}

          {msg.edited && (
            <span className={`text-[10px] ml-1.5 font-normal ${isMe ? 'text-stone-500' : 'text-stone-500'}`}>
              (edited)
            </span>
          )}
        </div>

        {/* Right Action Menu Trigger for incoming messages */}
        {!isMe && (
          <div className="opacity-0 group-hover/bubble:opacity-100 md:opacity-0 focus-within:opacity-100 ml-1.5 flex items-center gap-1 transition-opacity">
            <button
              onClick={onToggleEmojiPicker}
              className="p-1 text-stone-500 hover:text-stone-200 hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
              title="Add reaction"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onToggleMenu}
              className="p-1 text-stone-500 hover:text-stone-200 hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
              title="Message options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Floating Quick Reaction Bar (WhatsApp / Instagram popover with expanded emojis) */}
        {isEmojiPickerOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute z-30 ${
              emojiPlacement === 'above' ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top'
            } bg-[#1a1a1a]/95 backdrop-blur-md border border-stone-700 rounded-full px-2.5 py-1.5 shadow-2xl flex items-center gap-1.5 max-w-[85vw] sm:max-w-[360px] overflow-x-auto scrollbar-none animate-in fade-in zoom-in-95 duration-150 ${
              isMe ? 'right-0' : 'left-0'
            }`}
          >
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(activeConv.id, msg.id, emoji);
                  onCloseEmojiPicker();
                }}
                className="w-7 h-7 flex items-center justify-center hover:scale-125 transition-transform text-base cursor-pointer rounded-full hover:bg-stone-800 active:scale-95 shrink-0"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Dropdown Options Menu */}
        {isMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute z-30 ${
              menuPlacement === 'above' ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top'
            } w-44 bg-[#181818] border border-stone-700 rounded-xl py-1.5 shadow-2xl text-xs text-stone-200 animate-in fade-in zoom-in-95 duration-150 ${
              isMe ? 'right-0' : 'left-0'
            }`}
          >
            {/* Quick emojis inside menu */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-stone-800 mb-1">
              {EMOJI_OPTIONS.slice(0, 5).map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact(activeConv.id, msg.id, emoji);
                    onCloseMenu();
                  }}
                  className="hover:scale-125 transition-transform cursor-pointer p-0.5"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Reply action */}
            <button
              onClick={() => {
                onReply(msg);
                onCloseMenu();
              }}
              className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-stone-800 text-left transition-colors cursor-pointer"
            >
              <Reply className="w-3.5 h-3.5 text-stone-400" />
              <span>Reply</span>
            </button>

            {/* Forward action */}
            <button
              onClick={() => {
                onForward(msg);
                onCloseMenu();
              }}
              className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-stone-800 text-left transition-colors cursor-pointer"
            >
              <Forward className="w-3.5 h-3.5 text-stone-400" />
              <span>Forward</span>
            </button>

            {/* Copy text action */}
            {msg.text && (
              <button
                onClick={() => onCopyText(msg)}
                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-stone-800 text-left transition-colors cursor-pointer"
              >
                {copiedMessageId === msg.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-stone-400" />
                )}
                <span>{copiedMessageId === msg.id ? 'Copied' : 'Copy text'}</span>
              </button>
            )}

            {/* Edit message (Sender only) */}
            {isMe && !msg.isDeleted && msg.text && (
              <button
                onClick={() => {
                  onEdit(msg);
                  onCloseMenu();
                }}
                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-stone-800 text-left transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-stone-400" />
                <span>Edit message</span>
              </button>
            )}

            {/* Message info (Read Receipts) */}
            {isMe && (
              <button
                onClick={() => {
                  onOpenMessageInfo(msg);
                  onCloseMenu();
                }}
                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-stone-800 text-left transition-colors cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-stone-400" />
                <span>Message info</span>
              </button>
            )}

            {/* Delete message modal trigger */}
            <div className="h-px bg-stone-800 my-1" />
            <button
              onClick={() => {
                onOpenDeleteModal(msg);
                onCloseMenu();
              }}
              className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-red-950/40 text-red-400 text-left transition-colors cursor-pointer font-medium"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Delete message</span>
            </button>
          </div>
        )}
      </div>

      {/* Reactions: Rendered cleanly OUTSIDE the message bubble */}
      {hasReactions && (
        <div
          className={`flex items-center gap-1.5 mt-1.5 flex-wrap px-1 ${
            isMe ? 'justify-end' : 'justify-start'
          }`}
        >
          {Object.entries(msg.reactions || {}).map(([emoji, uids]) => {
            if (!Array.isArray(uids) || uids.length === 0) return null;
            const hasReacted = uids.includes(currentUser.id);
            const names = getReactorNames(uids);

            return (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  onReact(activeConv.id, msg.id, emoji);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  hasReacted
                    ? 'bg-stone-800 border-stone-600 text-white shadow-xs'
                    : 'bg-[#141414] border-stone-800 text-stone-300 hover:border-stone-700'
                }`}
                title={`${names} reacted with ${emoji} (click to toggle)`}
              >
                <span className="text-[12px]">{emoji}</span>
                {uids.length > 1 && (
                  <span className="text-[10px] font-mono font-semibold text-stone-300">
                    {uids.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Timestamp & Read Receipt: Always visible and unobstructed */}
      <div
        className={`flex items-center gap-1.5 text-[10px] text-stone-500 font-mono mt-1 px-1 select-none ${
          isMe ? 'justify-end' : 'justify-start'
        }`}
      >
        <span>{msg.createdAt || 'Just now'}</span>
        {isMe && (
          <button
            type="button"
            onClick={() => onOpenMessageInfo(msg)}
            title={
              isSeenByAll
                ? `Seen by everyone (${readByCount}) • Click for details`
                : isPartiallyRead
                ? `Seen by ${readByCount} of ${otherParticipantsCount} • Click for details`
                : 'Sent • Click for details'
            }
            className="cursor-pointer hover:opacity-80 transition-opacity flex items-center"
          >
            {isSeenByAll ? (
              <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
            ) : isPartiallyRead ? (
              <CheckCheck className="w-3.5 h-3.5 text-stone-400" />
            ) : (
              <Check className="w-3.5 h-3.5 text-stone-500" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export const MessagesView: React.FC = () => {
  const {
    conversations,
    groups,
    createGroup,
    sendGroupMessage,
    updateGroup,
    promoteToCoAdmin,
    demoteFromCoAdmin,
    transferAdmin,
    kickMember,
    addGroupMembers,
    leaveGroup,
    deleteGroup,
    deleteGroupForMe,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    deleteMessage,
    deleteMessageForMe,
    deleteMessageForEveryone,
    markMessagesAsSeen,
    typingUsers,
    setTypingStatus,
    chatWorkspaceMode,
    setChatWorkspaceMode,
    isRightSidebarOpen,
    toggleRightSidebar,
    editMessage,
    deleteConversation,
    togglePinConversation,
    reactToMessage,
    forwardMessage,
    markConversationAsRead,
    openNewMessage,
    openCreateGroup,
    currentUser,
    allUsers,
    showToast,
  } = useOrbit();

  const [search, setSearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [activeEmojiPickerMessageId, setActiveEmojiPickerMessageId] = useState<string | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [isConfirmingDeleteConv, setIsConfirmingDeleteConv] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [pendingMediaFile, setPendingMediaFile] = useState<File | null>(null);
  const [pendingMediaPreview, setPendingMediaPreview] = useState<string | null>(null);

  // New Sprint modals & features state
  const [deletingMessage, setDeletingMessage] = useState<ChatMessage | null>(null);
  const [messageInfoMessage, setMessageInfoMessage] = useState<ChatMessage | null>(null);
  const [transferringAdminTarget, setTransferringAdminTarget] = useState<{ uid: string; name: string } | null>(null);
  const [isComposerEmojiOpen, setIsComposerEmojiOpen] = useState(false);
  const [isDraggingOverChat, setIsDraggingOverChat] = useState(false);
  const [activeMemberMenuUid, setActiveMemberMenuUid] = useState<string | null>(null);

  // Sprint 22: Reply & Edit states
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

  // Group Management states
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [isEditingGroupMeta, setIsEditingGroupMeta] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [isUploadingGroupAvatar, setIsUploadingGroupAvatar] = useState(false);
  const [isConfirmingDeleteGroupEveryone, setIsConfirmingDeleteGroupEveryone] = useState(false);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close menus on clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuMessageId(null);
      setActiveEmojiPickerMessageId(null);
      setActiveMemberMenuUid(null);
      setIsComposerEmojiOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Textarea auto-height adjustment
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 40), 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [inputText]);

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

  // Sort pinned conversations to the top
  const sortedConversations = useMemo(() => {
    return [...filteredConversations].sort((a, b) => {
      const aPinned = Boolean(a.pinned || (currentUser?.id && a.pinnedBy?.[currentUser.id]));
      const bPinned = Boolean(b.pinned || (currentUser?.id && b.pinnedBy?.[currentUser.id]));
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [filteredConversations, currentUser?.id]);

  const activeConv: Conversation | null =
    validConversations.find((c) => c.id === activeConversationId) ||
    (validConversations.length > 0 ? sortedConversations[0] : null);

  const isCurrentConvPinned = Boolean(
    activeConv && (activeConv.pinned || (currentUser?.id && activeConv.pinnedBy?.[currentUser.id]))
  );

  // Auto-mark conversation messages as seen
  useEffect(() => {
    if (activeConv?.id) {
      markMessagesAsSeen(activeConv.id);
    }
  }, [activeConv?.id, activeConv?.messages?.length, markMessagesAsSeen]);

  // Clean up typing status on conversation change or unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (activeConv?.id) {
        setTypingStatus(activeConv.id, false);
      }
    };
  }, [activeConv?.id, setTypingStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

  const handleComposerInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (activeConv?.id) {
      setTypingStatus(activeConv.id, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (activeConv?.id) setTypingStatus(activeConv.id, false);
      }, 2500);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          setPendingMediaFile(file);
          setPendingMediaPreview(URL.createObjectURL(file));
          showToast('Image Attached', 'Pasted image ready to send.');
          break;
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleChatFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Unsupported file', 'Please select an image file to attach.', 'alert');
      return;
    }

    setPendingMediaFile(file);
    const url = URL.createObjectURL(file);
    setPendingMediaPreview(url);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || isSending) return;

    // Handle Edit Mode
    if (editingMessage) {
      const trimmed = inputText.trim();
      if (!trimmed) return;
      setIsSending(true);
      try {
        await editMessage(activeConv.id, editingMessage.id, trimmed);
        setEditingMessage(null);
        setInputText('');
      } catch (err) {
        console.error('[MessagesView] Message edit error:', err);
      } finally {
        setIsSending(false);
      }
      return;
    }

    if (!inputText.trim() && !pendingMediaFile) return;

    const messageText = inputText.trim();
    const mediaToUpload = pendingMediaFile;
    const replyMeta = replyingToMessage
      ? {
          replyTo: replyingToMessage.id,
          replyToText: replyingToMessage.text,
          replyToName: replyingToMessage.senderName || replyingToMessage.senderUsername,
        }
      : {};

    setIsSending(true);
    try {
      if (activeConv.isGroup) {
        let mediaUrl: string | undefined;
        let mediaType: string | undefined;
        let mediaName: string | undefined;

        if (mediaToUpload) {
          try {
            const upload = uploadMedia({
              file: mediaToUpload,
              folder: 'groups',
              entityId: activeConv.id,
            });
            const res = await upload.promise;
            mediaUrl = res.downloadURL;
            mediaType = res.mediaType;
            mediaName = res.fileName;
          } catch (uploadErr) {
            console.error('[MessagesView] Attachment upload error:', uploadErr);
            showToast('Upload Failed', 'Could not send attachment.', 'alert');
            setIsSending(false);
            return;
          }
        }

        await sendGroupMessage(
          activeConv.id,
          messageText,
          {
            mediaUrl,
            mediaType,
            mediaName,
            ...replyMeta,
          }
        );
      } else {
        if (!activeConv.participant?.id) return;
        await sendMessage(activeConv.participant.id, messageText, {
          replyTo: replyingToMessage?.id,
        });
      }
      setInputText('');
      setReplyingToMessage(null);
      setPendingMediaFile(null);
      setPendingMediaPreview(null);
    } catch (err) {
      console.error('[MessagesView] Message send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveGroupMeta = async () => {
    if (!activeConv || !activeConv.isGroup || !editGroupName.trim()) return;
    try {
      await updateGroup(activeConv.id, {
        name: editGroupName.trim(),
        description: editGroupDescription.trim() || undefined,
      });
      setIsEditingGroupMeta(false);
      showToast('Group Updated', 'Group name and description updated.', 'success');
    } catch (err) {
      console.error('[MessagesView] Failed to update group:', err);
    }
  };

  const handleGroupAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv || !activeConv.isGroup) return;

    if (!file.type.startsWith('image/')) {
      showToast('Invalid File', 'Please select an image file.', 'alert');
      return;
    }

    setIsUploadingGroupAvatar(true);
    try {
      const upload = uploadMedia({
        file,
        folder: 'groups',
        entityId: activeConv.id,
      });
      const res = await upload.promise;
      await updateGroup(activeConv.id, {
        photoURL: res.downloadURL,
      });
      showToast('Avatar Updated', 'Group photo updated successfully.', 'success');
    } catch (err) {
      console.error('[MessagesView] Failed to upload group avatar:', err);
      showToast('Upload Error', 'Could not update group avatar.', 'alert');
    } finally {
      setIsUploadingGroupAvatar(false);
      if (groupAvatarInputRef.current) {
        groupAvatarInputRef.current.value = '';
      }
    }
  };

  const handleCopyText = (msg: ChatMessage) => {
    if (!msg.text) return;
    navigator.clipboard?.writeText(msg.text);
    setCopiedMessageId(msg.id);
    showToast('Copied', 'Message copied to clipboard.');
    setTimeout(() => setCopiedMessageId(null), 2000);
    setActiveMenuMessageId(null);
  };

  const handleTouchStart = (msgId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveMenuMessageId(msgId);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleConfirmForward = async (targetUserId: string) => {
    if (!forwardingMessage || !targetUserId) return;
    const msgToForward = forwardingMessage;
    setForwardingMessage(null);
    setForwardSearch('');

    try {
      await forwardMessage(targetUserId, msgToForward);
      const convId = [currentUser.id, targetUserId].sort().join('_');
      setActiveConversationId(convId);
    } catch (err) {
      console.error('[MessagesView] Forward failed:', err);
    }
  };

  const handleConfirmDeleteForMe = async () => {
    if (!activeConv || !deletingMessage) return;
    const msgId = deletingMessage.id;
    setDeletingMessage(null);
    try {
      await deleteMessageForMe(activeConv.id, msgId);
      showToast('Deleted for Me', 'Message removed from your view.');
    } catch (err) {
      console.error('[MessagesView] Delete for me failed:', err);
    }
  };

  const handleConfirmDeleteForEveryone = async () => {
    if (!activeConv || !deletingMessage) return;
    const msgId = deletingMessage.id;
    setDeletingMessage(null);
    try {
      await deleteMessageForEveryone(activeConv.id, msgId);
      showToast('Deleted for Everyone', 'Message deleted for all participants.');
    } catch (err) {
      console.error('[MessagesView] Delete for everyone failed:', err);
    }
  };

  const handleConfirmTransferAdmin = async () => {
    if (!activeConv || !transferringAdminTarget) return;
    const targetUid = transferringAdminTarget.uid;
    const targetName = transferringAdminTarget.name;
    setTransferringAdminTarget(null);
    try {
      await transferAdmin(activeConv.id, targetUid);
      showToast('Admin Transferred', `Transferred ownership to ${targetName}.`, 'success');
    } catch (err) {
      console.error('[MessagesView] Transfer admin failed:', err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeConv || !activeConv.isGroup) return;
    setIsGroupInfoOpen(false);
    try {
      await leaveGroup(activeConv.id);
      showToast('Left Group', 'You have left this group.');
    } catch (err) {
      console.error('[MessagesView] Leave group failed:', err);
    }
  };

  const handleDeleteGroupForMe = async () => {
    if (!activeConv || !activeConv.isGroup) return;
    setIsGroupInfoOpen(false);
    setIsConfirmingDeleteConv(false);
    try {
      await deleteGroupForMe(activeConv.id);
      setActiveConversationId(null);
      showToast('Group Removed', 'Group removed from your conversations.');
    } catch (err) {
      console.error('[MessagesView] Delete group for me failed:', err);
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeConv || !activeConv.isGroup) return;
    setIsGroupInfoOpen(false);
    setIsConfirmingDeleteConv(false);
    try {
      await deleteGroup(activeConv.id);
      setActiveConversationId(null);
      showToast('Group Deleted', 'Group permanently deleted for all members.');
    } catch (err) {
      console.error('[MessagesView] Delete group failed:', err);
    }
  };

  const handlePermanentDeleteConversation = async () => {
    if (!activeConv) return;
    setIsConfirmingDeleteConv(false);
    if (activeConv.isGroup) {
      const isLeft = Boolean(activeConv.group?.leftMembers?.includes(currentUser.id));
      const isOwner = activeConv.group?.ownerUid === currentUser.id;
      if (isLeft) {
        await handleDeleteGroupForMe();
      } else if (isOwner) {
        await handleDeleteGroup();
      } else {
        await handleLeaveGroup();
      }
    } else {
      await deleteConversation(activeConv.id);
    }
  };

  // Potential forward recipients: all conversations + other users
  const forwardRecipients = useMemo(() => {
    const list: { id: string; name: string; username: string; avatar?: string }[] = [];
    const addedIds = new Set<string>();

    validConversations.forEach((c) => {
      if (c.participant && c.participant.id && !addedIds.has(c.participant.id)) {
        addedIds.add(c.participant.id);
        list.push({
          id: c.participant.id,
          name: c.participant.name,
          username: c.participant.username,
          avatar: c.participant.avatar,
        });
      }
    });

    allUsers.forEach((u) => {
      if (u && u.id && u.id !== currentUser.id && !addedIds.has(u.id)) {
        addedIds.add(u.id);
        list.push({
          id: u.id,
          name: u.name,
          username: u.username,
          avatar: u.avatar,
        });
      }
    });

    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(forwardSearch.toLowerCase()) ||
        r.username.toLowerCase().includes(forwardSearch.toLowerCase())
    );
  }, [validConversations, allUsers, currentUser.id, forwardSearch]);

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
                  placeholder="Search messages & groups..."
                  className="w-full bg-[#161616] border border-stone-800 focus:border-stone-500 text-xs text-stone-200 pl-9 pr-3 py-2 rounded-full focus:outline-none placeholder:text-stone-500 transition-colors"
                />
              </div>

              <button
                onClick={openCreateGroup}
                title="Create group chat"
                className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-full transition-colors cursor-pointer shrink-0 active:scale-95"
              >
                <Users className="w-4 h-4" />
              </button>

              <button
                onClick={openNewMessage}
                title="New direct message"
                className="p-2 bg-white hover:bg-stone-200 text-black rounded-full transition-colors cursor-pointer shrink-0 active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-stone-800/50">
              {sortedConversations.map((conv) => {
                const isSelected = activeConv?.id === conv.id;
                const isPinned = Boolean(
                  conv.pinned || (currentUser?.id && conv.pinnedBy?.[currentUser.id])
                );
                const hasLeft = Boolean(conv.isGroup && conv.group?.leftMembers?.includes(currentUser.id));
                const convTypers = typingUsers[conv.id] || [];

                let previewContent: React.ReactNode;
                if (convTypers.length > 0) {
                  previewContent = (
                    <span className="text-sky-400 font-medium flex items-center gap-1.5 text-xs">
                      <span>{convTypers[0].name} is typing</span>
                      <span className="flex gap-0.5 items-center">
                        <span className="w-1 h-1 rounded-full bg-sky-400 animate-pulse" />
                        <span className="w-1 h-1 rounded-full bg-sky-400 animate-pulse [animation-delay:200ms]" />
                      </span>
                    </span>
                  );
                } else if (!conv.lastMessage) {
                  previewContent = <span className="text-stone-500 italic text-xs">No transmissions yet</span>;
                } else if (conv.lastMessage.isDeleted) {
                  const isMe =
                    conv.lastMessage.deletedBy === currentUser.id ||
                    conv.lastMessage.senderId === currentUser.id;
                  previewContent = (
                    <span className="italic text-stone-500 text-xs">
                      {isMe ? 'You deleted this message' : 'This message was deleted'}
                    </span>
                  );
                } else if (conv.lastMessage.isSystem) {
                  let cleanText = conv.lastMessage.text || 'System update';
                  const myName = currentUser.name || '';
                  const myHandle = `@${currentUser.username || ''}`;

                  if (conv.lastMessage.senderId === currentUser.id) {
                    if (myName && cleanText.startsWith(myName)) {
                      cleanText = 'You' + cleanText.slice(myName.length);
                    } else if (myHandle && cleanText.startsWith(myHandle)) {
                      cleanText = 'You' + cleanText.slice(myHandle.length);
                    } else if (!cleanText.toLowerCase().startsWith('you')) {
                      cleanText = `You: ${cleanText}`;
                    }
                  }
                  previewContent = (
                    <span className="italic text-stone-400 text-xs truncate">
                      {cleanText}
                    </span>
                  );
                } else if (conv.lastMessage.mediaUrl) {
                  const isMe = conv.lastMessage.senderId === currentUser.id;
                  previewContent = (
                    <span className="text-stone-400 text-xs flex items-center gap-1">
                      <span>📷</span>
                      <span>{isMe ? 'You sent a photo' : 'Photo'}</span>
                    </span>
                  );
                } else if (conv.lastMessage.text) {
                  const isMe = conv.lastMessage.senderId === currentUser.id;
                  if (isMe) {
                    previewContent = (
                      <span className="text-stone-400 text-xs truncate">
                        <span className="text-stone-300 font-medium">You: </span>
                        <span>{conv.lastMessage.text}</span>
                      </span>
                    );
                  } else if (conv.isGroup) {
                    const senderFirst = (conv.lastMessage.senderName || 'Member').split(' ')[0];
                    previewContent = (
                      <span className="text-stone-400 text-xs truncate">
                        <span className="text-stone-300 font-medium">{senderFirst}: </span>
                        <span>{conv.lastMessage.text}</span>
                      </span>
                    );
                  } else {
                    previewContent = (
                      <span className="text-stone-400 text-xs truncate">
                        {conv.lastMessage.text}
                      </span>
                    );
                  }
                } else {
                  previewContent = <span className="text-stone-500 italic text-xs">No transmissions yet</span>;
                }

                return (
                  <div
                    key={conv.id}
                    className={`group relative flex items-start text-left transition-colors ${
                      isSelected
                        ? 'bg-stone-900/70 border-l-2 border-white'
                        : 'hover:bg-stone-900/40'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setActiveConversationId(conv.id);
                        markConversationAsRead(conv.id);
                      }}
                      className="flex-1 p-3.5 flex items-start gap-3 min-w-0 cursor-pointer text-left"
                    >
                      <div className="relative shrink-0">
                        {conv.isGroup ? (
                          conv.participant?.avatar ? (
                            <img
                              src={conv.participant.avatar}
                              alt={conv.participant.name}
                              className="w-11 h-11 rounded-full object-cover border border-stone-800"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300">
                              <Users className="w-5 h-5" />
                            </div>
                          )
                        ) : (
                          <UserAvatar
                            src={conv.participant?.avatar}
                            name={conv.participant?.name || 'Member'}
                            size="md"
                            className="w-11 h-11 border border-stone-800"
                          />
                        )}
                        {(conv.unreadCount || 0) > 0 && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-sky-500 ring-2 ring-[#0c0c0c]" />
                        )}
                        {isPinned && (
                          <span
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-200"
                            title="Pinned conversation"
                          >
                            <Pin className="w-2.5 h-2.5 fill-current" />
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-sm text-stone-100 truncate">
                              {conv.participant?.name || 'Member'}
                            </span>
                            {conv.isGroup && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-stone-800 text-stone-300 border border-stone-700 uppercase tracking-wider shrink-0">
                                Group
                              </span>
                            )}
                            {hasLeft && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-red-950/70 text-red-400 border border-red-800/60 uppercase tracking-wider shrink-0">
                                Left
                              </span>
                            )}
                            {conv.participant?.verified && (
                              <CheckCircle2 className="w-3 h-3 text-white shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-stone-500 font-mono shrink-0">
                            {conv.updatedAt || 'Recent'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs truncate flex-1 ${
                              (conv.unreadCount || 0) > 0
                                ? 'text-stone-100 font-semibold'
                                : 'text-stone-400'
                            }`}
                          >
                            {previewContent}
                          </p>
                          {(conv.unreadCount || 0) > 0 && (
                            <span className="px-1.5 py-0.2 min-w-4 text-center rounded-full bg-sky-500 text-black font-bold text-[10px] font-mono shrink-0 shadow-xs">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Quick pin toggle button on hover */}
                    <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinConversation(conv.id);
                        }}
                        className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                          isPinned
                            ? 'text-white bg-stone-800 hover:bg-stone-700'
                            : 'text-stone-500 hover:text-stone-200 hover:bg-stone-800'
                        }`}
                        title={isPinned ? 'Unpin chat' : 'Pin chat'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>
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

                  {activeConv.isGroup ? (
                    activeConv.participant?.avatar ? (
                      <img
                        src={activeConv.participant.avatar}
                        alt={activeConv.participant.name}
                        className="w-10 h-10 rounded-full object-cover border border-stone-800"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300">
                        <Users className="w-5 h-5" />
                      </div>
                    )
                  ) : (
                    <UserAvatar
                      src={activeConv.participant?.avatar}
                      name={activeConv.participant?.name || 'Member'}
                      size="md"
                      className="border border-stone-800"
                    />
                  )}

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-stone-100">
                        {activeConv.participant?.name || 'Member'}
                      </span>
                      {activeConv.isGroup && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-stone-800 text-stone-300 border border-stone-700 uppercase tracking-wider">
                          Group
                        </span>
                      )}
                      {activeConv.participant?.verified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      )}
                      {isCurrentConvPinned && (
                        <span
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-stone-800 text-stone-300 border border-stone-700 font-mono"
                          title="Pinned"
                        >
                          <Pin className="w-2.5 h-2.5 fill-current" /> Pinned
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 font-mono">
                      {activeConv.isGroup
                        ? `${activeConv.group?.members?.length || activeConv.participantIds?.length || 2} members`
                        : `@${activeConv.participant?.username || 'member'}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5">
                  {/* 1. ↔ Expand Workspace */}
                  <button
                    onClick={() => {
                      if (chatWorkspaceMode === 'expanded') {
                        setChatWorkspaceMode('normal');
                      } else {
                        setChatWorkspaceMode('expanded');
                      }
                    }}
                    className={`p-2 rounded-full transition-colors cursor-pointer ${
                      chatWorkspaceMode === 'expanded'
                        ? 'text-white bg-stone-800 ring-1 ring-stone-700'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800/80'
                    }`}
                    title={
                      chatWorkspaceMode === 'expanded'
                        ? 'Collapse Workspace (show sidebar)'
                        : 'Expand Workspace (hide sidebar)'
                    }
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>

                  {/* 2. ⛶ Fullscreen Chat */}
                  <button
                    onClick={() => {
                      if (chatWorkspaceMode === 'fullscreen') {
                        setChatWorkspaceMode('normal');
                      } else {
                        setChatWorkspaceMode('fullscreen');
                      }
                    }}
                    className={`p-2 rounded-full transition-colors cursor-pointer ${
                      chatWorkspaceMode === 'fullscreen'
                        ? 'text-white bg-stone-800 ring-1 ring-stone-700'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800/80'
                    }`}
                    title={
                      chatWorkspaceMode === 'fullscreen'
                        ? 'Exit Fullscreen (ESC)'
                        : 'Fullscreen Chat'
                    }
                  >
                    {chatWorkspaceMode === 'fullscreen' ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>

                  {/* 3. ℹ Group / Chat Info */}
                  <button
                    id="btn-chat-info"
                    onClick={() => setIsGroupInfoOpen(true)}
                    className={`p-2 rounded-full transition-colors cursor-pointer ${
                      isGroupInfoOpen
                        ? 'text-white bg-stone-800 ring-1 ring-stone-700'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800/80'
                    }`}
                    title={activeConv.isGroup ? 'Group Details & Members' : 'Contact & Chat Info'}
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  {/* 4. 📌 Pin */}
                  <button
                    onClick={() => togglePinConversation(activeConv.id)}
                    className={`p-2 rounded-full transition-colors cursor-pointer ${
                      isCurrentConvPinned
                        ? 'text-white bg-stone-800 ring-1 ring-stone-700'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800/80'
                    }`}
                    title={isCurrentConvPinned ? 'Unpin conversation' : 'Pin conversation to top'}
                  >
                    <Pin className={`w-4 h-4 ${isCurrentConvPinned ? 'fill-current' : ''}`} />
                  </button>

                  {/* 5. ✕ Close Chat */}
                  <button
                    onClick={() => setActiveConversationId(null)}
                    className="p-2 text-stone-400 hover:text-white hover:bg-stone-800/80 rounded-full transition-colors cursor-pointer"
                    title="Close chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div
                ref={chatContainerRef}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOverChat(true);
                }}
                onDragLeave={() => setIsDraggingOverChat(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOverChat(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    setPendingMediaFile(file);
                    setPendingMediaPreview(URL.createObjectURL(file));
                    showToast('Image Attached', 'Dropped image ready to send.');
                  }
                }}
                className={`flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-3.5 transition-colors relative ${
                  isDraggingOverChat ? 'bg-stone-900/60 ring-2 ring-dashed ring-stone-600 inset-0' : ''
                }`}
              >
                {Array.isArray(activeConv.messages) && activeConv.messages.length > 0 ? (
                  activeConv.messages.map((msg) => {
                    if (!msg) return null;
                    const isMe = msg.senderId === currentUser.id;
                    const isMenuOpen = activeMenuMessageId === msg.id;
                    const isEmojiPickerOpen = activeEmojiPickerMessageId === msg.id;

                    return (
                      <ChatMessageBubble
                        key={msg.id || `msg_${Math.random()}`}
                        msg={msg}
                        isMe={isMe}
                        currentUser={currentUser}
                        activeConv={activeConv}
                        allUsers={allUsers}
                        isMenuOpen={isMenuOpen}
                        isEmojiPickerOpen={isEmojiPickerOpen}
                        copiedMessageId={copiedMessageId}
                        chatContainerRef={chatContainerRef}
                        onToggleMenu={(e) => {
                          e.stopPropagation();
                          setActiveMenuMessageId(isMenuOpen ? null : msg.id);
                          setActiveEmojiPickerMessageId(null);
                        }}
                        onToggleEmojiPicker={(e) => {
                          e.stopPropagation();
                          setActiveEmojiPickerMessageId(isEmojiPickerOpen ? null : msg.id);
                          setActiveMenuMessageId(null);
                        }}
                        onCloseMenu={() => setActiveMenuMessageId(null)}
                        onCloseEmojiPicker={() => setActiveEmojiPickerMessageId(null)}
                        onCopyText={handleCopyText}
                        onForward={(m) => setForwardingMessage(m)}
                        onReply={(m) => {
                          setReplyingToMessage(m);
                          setEditingMessage(null);
                        }}
                        onEdit={(m) => {
                          setEditingMessage(m);
                          setReplyingToMessage(null);
                          setInputText(m.text || '');
                        }}
                        onOpenDeleteModal={(m) => setDeletingMessage(m)}
                        onOpenMessageInfo={(m) => setMessageInfoMessage(m)}
                        onReact={reactToMessage}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        canDeleteMsg={Boolean(
                          activeConv.isGroup &&
                            (activeConv.group?.ownerUid === currentUser.id ||
                              activeConv.group?.coAdmins?.includes(currentUser.id) ||
                              activeConv.group?.admins?.includes(currentUser.id))
                        )}
                      />
                    );
                  })
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-stone-500 py-12">
                    <p className="text-xs">Send a message to begin this transmission.</p>
                  </div>
                )}

                {/* Live Typing Indicator in Stream */}
                {(() => {
                  const currentConvTypers = (activeConv?.id && typingUsers[activeConv.id]) || [];
                  if (currentConvTypers.length === 0) return null;

                  return (
                    <div className="flex items-center gap-2 text-xs text-stone-400 font-mono py-1 px-1 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 bg-[#181818] border border-stone-800 px-3.5 py-1.5 rounded-full shadow-xs">
                        <span className="text-stone-300">
                          {currentConvTypers.length === 1
                            ? `${currentConvTypers[0].name} is typing`
                            : currentConvTypers.length === 2
                            ? `${currentConvTypers[0].name} and ${currentConvTypers[1].name} are typing`
                            : `${currentConvTypers.length} people are typing`}
                        </span>
                        <span className="flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" />
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div ref={messagesEndRef} />
              </div>

              {/* Replying banner */}
              {replyingToMessage && (
                <div className="px-4 py-2 bg-[#141414] border-t border-stone-800 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom-2 duration-150">
                  <div className="flex items-center gap-2 min-w-0">
                    <Reply className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-stone-300 truncate">
                        Replying to @{replyingToMessage.senderUsername || replyingToMessage.senderName || 'member'}
                      </span>
                      <span className="text-[11px] text-stone-500 truncate">{replyingToMessage.text}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingToMessage(null)}
                    className="p-1 text-stone-500 hover:text-white rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Editing banner */}
              {editingMessage && (
                <div className="px-4 py-2 bg-[#181818] border-t border-amber-900/60 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom-2 duration-150">
                  <div className="flex items-center gap-2 min-w-0 text-amber-300">
                    <Edit3 className="w-3.5 h-3.5 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-amber-200">Editing message</span>
                      <span className="text-[11px] text-stone-400 truncate">{editingMessage.text}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMessage(null);
                      setInputText('');
                    }}
                    className="p-1 text-stone-500 hover:text-white rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Media Preview before send */}
              {pendingMediaPreview && (
                <div className="p-2.5 px-4 bg-[#141414] border-t border-stone-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-stone-700">
                      <img
                        src={pendingMediaPreview}
                        alt="Attachment Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPendingMediaFile(null);
                          setPendingMediaPreview(null);
                        }}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/80 rounded-full text-white hover:text-red-400 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs text-stone-400 font-mono">Attachment ready</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingMediaFile(null);
                      setPendingMediaPreview(null);
                    }}
                    className="text-xs text-stone-500 hover:text-stone-300 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Chat Input Bar or Left Group Banner */}
              {activeConv.isGroup && activeConv.group?.leftMembers?.includes(currentUser.id) ? (
                <div className="p-4 border-t border-stone-800/80 bg-[#0e0e0e] text-center text-xs text-stone-400 select-none">
                  You cannot send messages to this group because you are no longer a participant.
                </div>
              ) : (
                <form
                  onSubmit={handleSend}
                  className="p-3 border-t border-stone-800/80 bg-[#0c0c0c] flex items-end gap-2 relative"
                >
                  {/* File input */}
                  <input
                    ref={chatFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleChatFileChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={isSending}
                    className="p-2 text-stone-400 hover:text-white hover:bg-stone-800/80 rounded-full transition-colors cursor-pointer disabled:opacity-50 shrink-0 mb-1"
                    title="Attach image (or drop / paste directly)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <div className="relative shrink-0 mb-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsComposerEmojiOpen((prev) => !prev);
                      }}
                      disabled={isSending}
                      className="p-2 text-stone-400 hover:text-white hover:bg-stone-800/80 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                      title="Insert emoji"
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    {/* Composer Emoji Popover */}
                    {isComposerEmojiOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-12 left-0 z-50 bg-[#161616] border border-stone-800 p-2.5 rounded-2xl shadow-2xl grid grid-cols-4 gap-1.5 w-44 animate-in zoom-in-95 duration-100"
                      >
                        {['👍', '❤️', '🔥', '👏', '😂', '🎉', '🚀', '💯', '✨', '🙌', '👀', '💡', '🙏', '😍', '🥳', '😎'].map(
                          (emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setInputText((prev) => `${prev}${emoji} `);
                                setIsComposerEmojiOpen(false);
                                textareaRef.current?.focus();
                              }}
                              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-stone-800 rounded-lg transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputText}
                    onChange={handleComposerInputChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={
                      activeConv.isGroup
                        ? `Message ${activeConv.group?.name || activeConv.participant?.name || 'group'}...`
                        : `Message @${activeConv.participant?.username || 'member'}...`
                    }
                    disabled={isSending}
                    className="flex-1 bg-[#161616] border border-stone-800 focus:border-stone-500 text-xs md:text-sm text-stone-100 px-4 py-2.5 rounded-2xl focus:outline-none placeholder:text-stone-500 transition-colors disabled:opacity-60 resize-none leading-relaxed"
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />

                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !pendingMediaFile) || isSending}
                    className="px-4 py-2.5 bg-white hover:bg-stone-200 disabled:opacity-40 disabled:hover:bg-white text-black font-bold text-xs rounded-full flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95 shrink-0 mb-1"
                  >
                    {editingMessage ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">
                      {isSending
                        ? editingMessage
                          ? 'Saving...'
                          : 'Sending...'
                        : editingMessage
                        ? 'Save'
                        : 'Send'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center p-8 select-none bg-[#0a0a0a]">
              {/* Orbit Emblem */}
              <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-stone-800 animate-[spin_20s_linear_infinite]" />
                <div className="absolute inset-2 rounded-full border border-dashed border-stone-700/60 animate-[spin_12s_linear_infinite_reverse]" />
                <div className="w-12 h-12 rounded-full bg-linear-to-b from-stone-850 to-stone-950 border border-stone-700 flex items-center justify-center shadow-lg shadow-black/60">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-stone-100 mb-1.5 tracking-tight">
                Select a conversation
              </h3>
              <p className="text-sm text-stone-400 max-w-xs leading-relaxed mb-4">
                Start messaging your friends.
              </p>
              <span className="text-[11px] font-mono text-stone-600 bg-stone-900/60 border border-stone-800 px-3 py-1 rounded-full">
                🔒 End-to-end transmissions & private groups
              </span>
            </div>
          )}
        </div>
      )}

      {/* Group Info Modal */}
      {isGroupInfoOpen && activeConv && activeConv.isGroup && (
        <div
          className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
          onClick={() => {
            setIsGroupInfoOpen(false);
            setIsEditingGroupMeta(false);
          }}
        >
          <div
            className="w-full max-w-md bg-[#121212] border border-stone-800 rounded-2xl p-5 shadow-2xl text-stone-200 relative animate-in zoom-in-95 duration-150 flex flex-col gap-4 max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white" />
                <h3 className="font-bold text-sm text-stone-100">Group Details</h3>
              </div>
              <button
                onClick={() => {
                  setIsGroupInfoOpen(false);
                  setIsEditingGroupMeta(false);
                }}
                className="p-1 text-stone-400 hover:text-white hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Group Banner / Avatar / Meta Edit */}
            {isEditingGroupMeta ? (
              <div className="flex flex-col gap-3 py-1 bg-[#181818] p-3 rounded-xl border border-stone-700">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-stone-400">Group Name</label>
                  <input
                    type="text"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    className="w-full bg-[#121212] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-stone-400"
                    placeholder="Group name"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-stone-400">Description</label>
                  <textarea
                    rows={2}
                    value={editGroupDescription}
                    onChange={(e) => setEditGroupDescription(e.target.value)}
                    className="w-full bg-[#121212] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-stone-400 resize-none"
                    placeholder="Group description..."
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingGroupMeta(false)}
                    className="px-3 py-1 text-xs text-stone-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveGroupMeta}
                    className="px-3 py-1 bg-white hover:bg-stone-200 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-1">
                {/* Group Avatar with Camera upload for Admin/Co-Admin */}
                <div className="relative group/avatar shrink-0">
                  {activeConv.participant?.avatar ? (
                    <img
                      src={activeConv.participant.avatar}
                      alt={activeConv.participant.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-stone-700 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-stone-800 border-2 border-stone-700 flex items-center justify-center text-stone-300 shrink-0">
                      <Users className="w-8 h-8" />
                    </div>
                  )}

                  {isUploadingGroupAvatar && (
                    <div className="absolute inset-0 rounded-full bg-black/70 backdrop-blur-xs flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}

                  {(activeConv.group?.ownerUid === currentUser.id ||
                    activeConv.group?.coAdmins?.includes(currentUser.id)) &&
                    !isUploadingGroupAvatar && (
                      <button
                        type="button"
                        onClick={() => groupAvatarInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-1.5 rounded-full bg-stone-900 border border-stone-600 text-white hover:bg-stone-700 transition-colors shadow-lg cursor-pointer"
                        title="Change group photo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    )}

                  <input
                    type="file"
                    ref={groupAvatarInputRef}
                    onChange={handleGroupAvatarChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-base text-stone-100 truncate">
                      {activeConv.participant?.name || 'Group Chat'}
                    </span>
                    {(activeConv.group?.ownerUid === currentUser.id ||
                      activeConv.group?.coAdmins?.includes(currentUser.id)) && (
                      <button
                        onClick={() => {
                          setEditGroupName(activeConv.group?.name || activeConv.participant?.name || '');
                          setEditGroupDescription(activeConv.group?.description || '');
                          setIsEditingGroupMeta(true);
                        }}
                        className="p-1 text-stone-400 hover:text-white rounded-md hover:bg-stone-800 transition-colors cursor-pointer"
                        title="Edit group info"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-stone-400 font-mono">
                    {activeConv.group?.members?.length || activeConv.participantIds?.length || 2} members
                  </span>
                  {activeConv.group?.description && (
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                      {activeConv.group.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Members Section */}
            <div className="flex flex-col gap-2 min-h-0">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-bold">
                  Members ({activeConv.group?.members?.length || activeConv.participantIds?.length || 0})
                </span>
                {(activeConv.group?.ownerUid === currentUser.id ||
                  activeConv.group?.coAdmins?.includes(currentUser.id) ||
                  activeConv.group?.admins?.includes(currentUser.id)) && (
                  <button
                    onClick={() => {
                      setIsAddMemberModalOpen(true);
                      setAddMemberSearch('');
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-white hover:text-stone-300 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Members</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto max-h-52 divide-y divide-stone-800/60 border border-stone-800/80 rounded-xl bg-[#0c0c0c] px-3">
                {(activeConv.group?.members || activeConv.participantIds || []).map((uid) => {
                  const memberUser =
                    uid === currentUser.id
                      ? currentUser
                      : allUsers.find((u) => u.id === uid);

                  const isOwner = activeConv.group?.ownerUid === uid;
                  const isCoAdmin = activeConv.group?.coAdmins?.includes(uid);
                  const isViewerOwner = activeConv.group?.ownerUid === currentUser.id;
                  const isViewerCoAdmin = activeConv.group?.coAdmins?.includes(currentUser.id);

                  return (
                    <div key={uid} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          src={memberUser?.avatar}
                          name={memberUser?.name || 'Member'}
                          size="sm"
                          className="w-8 h-8 border border-stone-800 shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-stone-100 truncate">
                              {memberUser?.name || (uid === currentUser.id ? currentUser.name : 'Orbit User')}
                            </span>
                            {uid === currentUser.id && (
                              <span className="text-[10px] text-stone-500 font-mono">(You)</span>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-500 font-mono truncate">
                            @{memberUser?.username || 'member'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 relative">
                        {/* Role Badge */}
                        {isOwner ? (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs">
                            <Crown className="w-3 h-3 text-amber-400" /> Admin
                          </span>
                        ) : isCoAdmin ? (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-xs">
                            <Shield className="w-3 h-3 text-sky-400" /> Co-Admin
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-stone-400 bg-stone-800/80 border border-stone-700/60 px-2.5 py-0.5 rounded-full">
                            Member
                          </span>
                        )}

                        {/* Moderation Actions Menu */}
                        {uid !== currentUser.id && (isViewerOwner || (isViewerCoAdmin && !isOwner && !isCoAdmin)) && (
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveMemberMenuUid(activeMemberMenuUid === uid ? null : uid)
                              }
                              className="p-1 text-stone-400 hover:text-white hover:bg-stone-800 rounded-md transition-colors cursor-pointer"
                              title="Member options"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMemberMenuUid === uid && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 z-50 bg-[#161616] border border-stone-800 rounded-xl p-1.5 shadow-2xl w-44 flex flex-col gap-0.5 animate-in zoom-in-95 duration-100 text-left"
                              >
                                {isViewerOwner && (
                                  <>
                                    {isCoAdmin ? (
                                      <button
                                        onClick={() => {
                                          demoteFromCoAdmin(activeConv.id, uid);
                                          setActiveMemberMenuUid(null);
                                        }}
                                        className="w-full text-left px-2.5 py-1.5 hover:bg-stone-800 rounded-lg text-xs text-stone-300 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <Shield className="w-3.5 h-3.5 text-stone-400" />
                                        <span>Demote from Co-Admin</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          promoteToCoAdmin(activeConv.id, uid);
                                          setActiveMemberMenuUid(null);
                                        }}
                                        className="w-full text-left px-2.5 py-1.5 hover:bg-stone-800 rounded-lg text-xs text-sky-300 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <Shield className="w-3.5 h-3.5 text-sky-400" />
                                        <span>Promote to Co-Admin</span>
                                      </button>
                                    )}

                                    <button
                                      onClick={() => {
                                        setTransferringAdminTarget({
                                          uid,
                                          name: memberUser?.name || 'User',
                                        });
                                        setActiveMemberMenuUid(null);
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 hover:bg-stone-800 rounded-lg text-xs text-amber-300 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Transfer Admin</span>
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() => {
                                    kickMember(activeConv.id, uid);
                                    setActiveMemberMenuUid(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-red-950/40 rounded-lg text-xs text-red-400 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                  <span>Remove from Group</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Danger Section */}
            <div className="mt-2 pt-3.5 border-t border-stone-800/80 flex flex-col gap-2.5">
              {activeConv.group?.leftMembers?.includes(currentUser.id) ? (
                <button
                  onClick={handleDeleteGroupForMe}
                  className="w-full py-2.5 px-4 bg-red-950/40 hover:bg-red-950/70 border border-red-800/60 text-red-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Group Chat (For Me)</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsConfirmingDeleteConv(true);
                    }}
                    className="w-full py-2.5 px-4 bg-white hover:bg-stone-200 text-black font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Group</span>
                  </button>

                  {activeConv.group?.ownerUid === currentUser.id && (
                    <button
                      onClick={() => {
                        setIsConfirmingDeleteGroupEveryone(true);
                      }}
                      className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Group For Everyone</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Direct Chat / Contact Info Modal */}
      {isGroupInfoOpen && activeConv && !activeConv.isGroup && (
        <div
          className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
          onClick={() => setIsGroupInfoOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#121212] border border-stone-800 rounded-2xl p-5 shadow-2xl text-stone-200 relative animate-in zoom-in-95 duration-150 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-white" />
                <h3 className="font-bold text-sm text-stone-100">Chat Info</h3>
              </div>
              <button
                onClick={() => setIsGroupInfoOpen(false)}
                className="p-1 text-stone-400 hover:text-white hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <UserAvatar
                src={activeConv.participant?.avatar}
                name={activeConv.participant?.name || 'Member'}
                size="lg"
                className="w-20 h-20 border-2 border-stone-700"
              />
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-stone-100">
                    {activeConv.participant?.name || 'Orbit Member'}
                  </span>
                  {activeConv.participant?.verified && (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className="text-xs text-stone-400 font-mono">
                  @{activeConv.participant?.username || 'member'}
                </span>
              </div>
              {activeConv.participant?.bio && (
                <p className="text-xs text-stone-300 max-w-xs leading-relaxed">
                  {activeConv.participant.bio}
                </p>
              )}
            </div>

            {/* Chat Stats */}
            <div className="bg-[#181818] border border-stone-800/80 rounded-xl p-3 flex items-center justify-around text-center">
              <div>
                <span className="block font-mono text-xs font-bold text-stone-200">
                  {activeConv.messages?.length || 0}
                </span>
                <span className="text-[10px] text-stone-500 uppercase font-mono">Messages</span>
              </div>
              <div className="w-px h-6 bg-stone-800" />
              <div>
                <span className="block font-mono text-xs font-bold text-stone-200">
                  {isCurrentConvPinned ? 'Pinned' : 'Active'}
                </span>
                <span className="text-[10px] text-stone-500 uppercase font-mono">Chat Status</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => {
                  togglePinConversation(activeConv.id);
                }}
                className="w-full py-2.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Pin className={`w-3.5 h-3.5 ${isCurrentConvPinned ? 'fill-current' : ''}`} />
                <span>{isCurrentConvPinned ? 'Unpin Conversation' : 'Pin Conversation to Top'}</span>
              </button>
              <button
                onClick={() => {
                  setIsGroupInfoOpen(false);
                  setIsConfirmingDeleteConv(true);
                }}
                className="w-full py-2.5 px-3 bg-red-950/40 hover:bg-red-950/70 border border-red-800/60 text-red-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Conversation (For Me)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group For Everyone Confirmation Modal */}
      {isConfirmingDeleteGroupEveryone && activeConv && activeConv.isGroup && (
        <div
          className="fixed inset-0 z-80 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
          onClick={() => setIsConfirmingDeleteGroupEveryone(false)}
        >
          <div
            className="w-full max-w-sm bg-[#121212] border border-stone-800 rounded-2xl p-5 shadow-2xl text-stone-200 relative animate-in zoom-in-95 duration-150 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full bg-red-950/60 border border-red-900 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-stone-100 mb-1.5">
                Delete Group For Everyone?
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                This will permanently delete <span className="text-stone-200 font-medium">"{activeConv.group?.name || activeConv.participant?.name}"</span> and all messages for all members. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsConfirmingDeleteGroupEveryone(false)}
                className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md"
              >
                Delete Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Sub-Modal */}
      {isAddMemberModalOpen && activeConv && activeConv.isGroup && (
        <div
          className="fixed inset-0 z-80 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
          onClick={() => setIsAddMemberModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#121212] border border-stone-800 rounded-2xl p-5 shadow-2xl text-stone-200 relative animate-in zoom-in-95 duration-150 flex flex-col gap-3 max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-white" />
                <h3 className="font-bold text-sm text-stone-100">Add Members</h3>
              </div>
              <button
                onClick={() => setIsAddMemberModalOpen(false)}
                className="p-1 text-stone-400 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={addMemberSearch}
                onChange={(e) => setAddMemberSearch(e.target.value)}
                placeholder="Search Orbit users..."
                className="w-full bg-[#181818] border border-stone-800 focus:border-stone-600 rounded-full pl-8 pr-3 py-1.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto max-h-60 divide-y divide-stone-800/60 border border-stone-800/80 rounded-xl bg-[#0c0c0c] px-3">
              {(() => {
                const existingMemberIds = new Set(activeConv.group?.members || activeConv.participantIds || []);
                const availableUsers = allUsers.filter(
                  (u) =>
                    u &&
                    u.id &&
                    !existingMemberIds.has(u.id) &&
                    u.id !== currentUser.id &&
                    ((u.name || '').toLowerCase().includes(addMemberSearch.toLowerCase()) ||
                      (u.username || '').toLowerCase().includes(addMemberSearch.toLowerCase()))
                );

                if (availableUsers.length === 0) {
                  return (
                    <div className="py-6 text-center text-stone-500 text-xs">
                      No additional users found to add.
                    </div>
                  );
                }

                return availableUsers.map((u) => (
                  <div key={u.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar src={u.avatar} name={u.name} size="sm" className="w-7 h-7" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-stone-100 truncate">{u.name}</span>
                        <span className="text-[10px] text-stone-500 font-mono truncate">@{u.username}</span>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await addGroupMembers(activeConv.id, [u.id]);
                          showToast('Member Added', `${u.name} was added to the group.`, 'success');
                          setIsAddMemberModalOpen(false);
                        } catch (err) {
                          console.error('[MessagesView] Add member failed:', err);
                        }
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-stone-200 text-black font-bold text-xs rounded-full transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                    >
                      Add
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <div
          className="fixed inset-0 z-80 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
          onClick={() => setForwardingMessage(null)}
        >
          <div
            className="w-full max-w-md bg-[#121212] border border-stone-800 rounded-2xl p-5 shadow-2xl text-stone-200 relative animate-in zoom-in-95 duration-150 flex flex-col gap-4 max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Forward className="w-4 h-4 text-white" />
                <h3 className="font-bold text-sm text-stone-100">Forward Message</h3>
              </div>
              <button
                onClick={() => setForwardingMessage(null)}
                className="p-1 text-stone-400 hover:text-white hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Preview Quote */}
            <div className="bg-[#181818] border-l-2 border-white rounded-r-lg p-3 text-xs text-stone-300 italic">
              <p className="line-clamp-3 leading-relaxed">"{forwardingMessage.text}"</p>
            </div>

            {/* Recipient Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={forwardSearch}
                onChange={(e) => setForwardSearch(e.target.value)}
                placeholder="Search recipient..."
                className="w-full bg-[#161616] border border-stone-800 focus:border-stone-500 text-xs text-stone-100 pl-9 pr-3 py-2 rounded-full focus:outline-none placeholder:text-stone-500"
                autoFocus
              />
            </div>

            {/* Recipients List */}
            <div className="flex-1 overflow-y-auto max-h-60 flex flex-col divide-y divide-stone-800/50">
              {forwardRecipients.length > 0 ? (
                forwardRecipients.map((rec) => (
                  <div
                    key={rec.id}
                    className="py-2 px-1 flex items-center justify-between hover:bg-stone-800/40 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        src={rec.avatar}
                        name={rec.name}
                        size="sm"
                        className="w-8 h-8 border border-stone-800"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-stone-100 truncate">{rec.name}</span>
                        <span className="text-[10px] text-stone-500 font-mono truncate">@{rec.username}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleConfirmForward(rec.id)}
                      className="px-3 py-1.5 bg-white hover:bg-stone-200 text-black font-bold text-xs rounded-full transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                    >
                      Send
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-stone-500 text-xs">
                  No matching members found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete / Leave Conversation Confirmation Modal */}
      {isConfirmingDeleteConv && activeConv && (
        <div
          className="fixed inset-0 z-80 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
          onClick={() => setIsConfirmingDeleteConv(false)}
        >
          <div
            className="w-full max-w-sm bg-[#121212] border border-stone-800 rounded-2xl p-5 shadow-2xl text-stone-200 relative animate-in zoom-in-95 duration-150 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-red-950/50 border border-red-900/60 flex items-center justify-center text-red-400 mx-auto">
              {activeConv.isGroup ? <LogOut className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-stone-100 mb-1">
                {activeConv.isGroup
                  ? activeConv.group?.ownerUid === currentUser.id
                    ? 'Delete Group Chat?'
                    : 'Leave Group Chat?'
                  : 'Delete Entire Conversation?'}
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                {activeConv.isGroup
                  ? activeConv.group?.ownerUid === currentUser.id
                    ? 'This will permanently delete this group, its messages, and remove all members for everyone. This action cannot be undone.'
                    : 'You will leave this group chat and will no longer receive its transmissions. Other members will remain in the group.'
                  : `This will permanently delete this conversation and all direct messages for both participants. Starting a new chat with @${activeConv.participant?.username} will create a fresh thread.`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsConfirmingDeleteConv(false)}
                className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-full transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePermanentDeleteConversation}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-full transition-colors cursor-pointer shadow-md"
              >
                {activeConv.isGroup
                  ? activeConv.group?.ownerUid === currentUser.id
                    ? 'Delete Group'
                    : 'Leave Group'
                  : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Message Confirmation Modal */}
      {deletingMessage && (
        <div
          className="fixed inset-0 z-80 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
          onClick={() => setDeletingMessage(null)}
        >
          <div
            className="w-full max-w-sm bg-[#121212] border border-stone-800 rounded-2xl p-5 shadow-2xl text-stone-200 relative animate-in zoom-in-95 duration-150 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-red-950/50 border border-red-900/60 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-stone-100 mb-1">Delete message?</h3>
              {deletingMessage.text && (
                <p className="text-xs text-stone-400 italic bg-[#181818] p-2.5 rounded-xl border border-stone-800 line-clamp-2 my-2">
                  "{deletingMessage.text}"
                </p>
              )}
              <p className="text-xs text-stone-400">
                {deletingMessage.senderId === currentUser.id
                  ? 'You can delete this message for everyone or only from your view.'
                  : activeConv?.isGroup &&
                    (activeConv.group?.ownerUid === currentUser.id ||
                      activeConv.group?.coAdmins?.includes(currentUser.id))
                  ? 'As a group admin, you can remove this message for everyone or only from your view.'
                  : 'You can delete this message from your view.'}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {(deletingMessage.senderId === currentUser.id ||
                (activeConv?.isGroup &&
                  (activeConv.group?.ownerUid === currentUser.id ||
                    activeConv.group?.coAdmins?.includes(currentUser.id)))) && (
                <button
                  onClick={handleConfirmDeleteForEveryone}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  Delete for Everyone
                </button>
              )}
              <button
                onClick={handleConfirmDeleteForMe}
                className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Delete for Me
              </button>
              <button
                onClick={() => setDeletingMessage(null)}
                className="w-full py-2 text-stone-400 hover:text-white text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Info Modal (Read Receipts) */}
      {messageInfoMessage && activeConv && (
        <div
          className="fixed inset-0 z-80 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
          onClick={() => setMessageInfoMessage(null)}
        >
          <div
            className="w-full max-w-md bg-[#121212] border border-stone-800 rounded-2xl p-5 shadow-2xl text-stone-200 relative animate-in zoom-in-95 duration-150 flex flex-col gap-4 max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-white" />
                <h3 className="font-bold text-sm text-stone-100">Message Info</h3>
              </div>
              <button
                onClick={() => setMessageInfoMessage(null)}
                className="p-1 text-stone-400 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Quote */}
            <div className="bg-[#181818] border border-stone-800 rounded-xl p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono">
                <span>Message Details</span>
                <span>
                  Sent • {formatStatusTime(messageInfoMessage.rawCreatedAt || messageInfoMessage.timestamp || messageInfoMessage.createdAt, 'Today')}
                </span>
              </div>
              {messageInfoMessage.text && (
                <p className="text-xs text-stone-200 leading-relaxed break-words">
                  {messageInfoMessage.text}
                </p>
              )}
            </div>

            {/* Transmission Status Timeline */}
            {(() => {
              const msgTimestamp =
                messageInfoMessage.rawCreatedAt ||
                messageInfoMessage.timestamp ||
                messageInfoMessage.createdAt;
              const sentDisplay = formatStatusTime(msgTimestamp, 'Today');
              const deliveredDisplay = formatStatusTime(msgTimestamp, 'Today');

              const readEntries = Object.entries(messageInfoMessage.readBy || {});
              let seenTimestamp: any = null;
              if (readEntries.length > 0) {
                seenTimestamp = readEntries[0][1];
              } else if (messageInfoMessage.isRead) {
                seenTimestamp = msgTimestamp;
              }
              const seenDisplay = seenTimestamp ? formatStatusTime(seenTimestamp, 'Today') : null;

              return (
                <div className="bg-[#181818] border border-stone-800 rounded-xl p-3.5 flex flex-col gap-2.5">
                  {/* Sent */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-stone-300 font-medium">
                      <Check className="w-3.5 h-3.5 text-stone-400" />
                      <span>Sent</span>
                    </div>
                    <span className="font-mono text-stone-300 text-[11px]">
                      Sent • {sentDisplay}
                    </span>
                  </div>

                  {/* Delivered */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-stone-300 font-medium">
                      <CheckCheck className="w-3.5 h-3.5 text-stone-400" />
                      <span>Delivered</span>
                    </div>
                    <span className="font-mono text-stone-300 text-[11px]">
                      Delivered • {deliveredDisplay}
                    </span>
                  </div>

                  {/* Seen */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-sky-400 font-medium">
                      <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                      <span>Seen</span>
                    </div>
                    <span className="font-mono text-sky-400 text-[11px]">
                      {seenDisplay ? `Seen • ${seenDisplay}` : 'Seen • Pending'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Read Receipts List */}
            <div className="flex flex-col gap-2 min-h-0 flex-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-bold flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                Read by ({Object.keys(messageInfoMessage.readBy || {}).length})
              </span>

              <div className="flex-1 overflow-y-auto overscroll-contain max-h-56 divide-y divide-stone-800/60 border border-stone-800 rounded-xl bg-[#0c0c0c] px-3">
                {Object.keys(messageInfoMessage.readBy || {}).length > 0 ? (
                  Object.entries(messageInfoMessage.readBy || {}).map(([readerId, seenAt]) => {
                    const readerUser =
                      readerId === currentUser.id
                        ? currentUser
                        : allUsers.find((u) => u.id === readerId);
                    const formattedSeen = formatStatusTime(seenAt, 'Today');

                    return (
                      <div key={readerId} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar
                            src={readerUser?.avatar}
                            name={readerUser?.name || 'User'}
                            size="sm"
                            className="w-7 h-7 border border-stone-800 shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs text-stone-100 truncate">
                              {readerUser?.name || 'Orbit User'}
                              {readerId === currentUser.id && ' (You)'}
                            </span>
                            <span className="text-[10px] text-stone-500 font-mono truncate">
                              @{readerUser?.username || 'member'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-sky-400/90 font-mono shrink-0">
                          Seen • {formattedSeen}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-xs text-stone-500">
                    Not read by anyone yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Admin Confirmation Modal */}
      {transferringAdminTarget && (
        <div
          className="fixed inset-0 z-80 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
          onClick={() => setTransferringAdminTarget(null)}
        >
          <div
            className="w-full max-w-sm bg-[#121212] border border-amber-900/40 rounded-2xl p-5 shadow-2xl text-stone-200 relative animate-in zoom-in-95 duration-150 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-amber-950/60 border border-amber-800/80 flex items-center justify-center text-amber-300 mx-auto">
              <Crown className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-stone-100 mb-1">Transfer Admin Rights?</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Are you sure you want to transfer primary group ownership to{' '}
                <strong className="text-stone-200">{transferringAdminTarget.name}</strong>? You will become a Co-Admin.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setTransferringAdminTarget(null)}
                className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-full transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransferAdmin}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-full transition-colors cursor-pointer shadow-md"
              >
                Transfer Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
