import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';
import { UserAvatar } from './UserAvatar';
import { CountrySelector } from './CountrySelector';
import { CountryOption } from '../data/countries';
import { uploadMedia } from '../services/mediaUploadService';

export const EditProfileModal: React.FC = () => {
  const { isEditProfileOpen, closeEditProfile, currentUser, updateCurrentUser, showToast, authUser } = useOrbit();

  const [name, setName] = useState(currentUser?.name || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [banner, setBanner] = useState(currentUser?.banner || '');
  const [countryCode, setCountryCode] = useState(currentUser?.countryCode || '');
  const [countryName, setCountryName] = useState(currentUser?.countryName || currentUser?.location || '');
  const [website, setWebsite] = useState(currentUser?.website || '');

  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditProfileOpen && currentUser) {
      setName(currentUser.name || '');
      setUsername(currentUser.username || '');
      setBio(currentUser.bio || '');
      setAvatar(currentUser.avatar || '');
      setBanner(currentUser.banner || '');
      setCountryCode(currentUser.countryCode || '');
      setCountryName(currentUser.countryName || currentUser.location || '');
      setWebsite(currentUser.website || '');
      setSelectedAvatarFile(null);
      setSelectedBannerFile(null);
      setIsSaving(false);
    }
  }, [isEditProfileOpen, currentUser]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditProfileOpen && !isSaving) {
        closeEditProfile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditProfileOpen, closeEditProfile, isSaving]);

  if (!isEditProfileOpen || !currentUser) return null;

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedAvatarFile(file);
      const url = URL.createObjectURL(file);
      setAvatar(url);
    }
  };

  const handleRemoveAvatar = () => {
    setSelectedAvatarFile(null);
    setAvatar('');
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedBannerFile(file);
      const url = URL.createObjectURL(file);
      setBanner(url);
    }
  };

  const handleRemoveBanner = () => {
    setSelectedBannerFile(null);
    setBanner('');
    if (bannerInputRef.current) {
      bannerInputRef.current.value = '';
    }
  };

  const handleCountryChange = (country: CountryOption | null) => {
    if (country) {
      setCountryCode(country.code);
      setCountryName(country.name);
    } else {
      setCountryCode('');
      setCountryName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!name.trim() || !username.trim()) {
      showToast('Validation Error', 'Display name and handle are required.', 'alert');
      return;
    }

    setIsSaving(true);

    try {
      let finalAvatarUrl = avatar.trim();
      let finalBannerUrl = banner.trim();

      // Upload avatar file if changed
      if (selectedAvatarFile && authUser) {
        const avatarUpload = uploadMedia({
          file: selectedAvatarFile,
          folder: 'avatars',
          entityId: currentUser.id,
        });
        const res = await avatarUpload.promise;
        finalAvatarUrl = res.downloadURL;
      }

      // Upload banner file if changed
      if (selectedBannerFile && authUser) {
        const bannerUpload = uploadMedia({
          file: selectedBannerFile,
          folder: 'banners',
          entityId: currentUser.id,
        });
        const res = await bannerUpload.promise;
        finalBannerUrl = res.downloadURL;
      }

      const updates: Partial<typeof currentUser> = {
        name: name.trim(),
        username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
        bio: bio.trim(),
        avatar: finalAvatarUrl,
        banner: finalBannerUrl,
        countryCode: countryCode || undefined,
        countryName: countryName || undefined,
        location: countryName || undefined,
        website: website.trim(),
      };

      await updateCurrentUser(updates);
      closeEditProfile();
    } catch (err: any) {
      console.error('[Profile Update] Failed:', err);
      showToast('Profile Update Error', err?.message || 'Could not update profile.', 'alert');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="edit-profile-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeEditProfile();
      }}
    >
      <div
        id="edit-profile-modal"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-[#121212] border border-stone-800 rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-stone-200 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-800/80 mb-5">
          <h2 className="font-bold text-base text-stone-100">
            Edit Profile
          </h2>

          <button
            onClick={closeEditProfile}
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Header Banner Section */}
          <div className="flex flex-col gap-1.5">
            <label className="block text-xs font-medium text-stone-400">
              Header Banner
            </label>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerFileChange}
            />

            <div className="relative h-32 sm:h-36 w-full rounded-xl overflow-hidden border border-stone-800 bg-[#161616] group">
              {banner ? (
                <>
                  <img
                    src={banner}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="px-3 py-1.5 bg-stone-900/90 hover:bg-black border border-stone-700 text-xs font-semibold text-stone-200 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-white" />
                      <span>Change</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveBanner}
                      className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800/50 text-xs font-semibold text-red-300 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </>
              ) : (
                <div
                  onClick={() => bannerInputRef.current?.click()}
                  className="w-full h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-stone-800/80 hover:border-stone-600 hover:bg-[#191919] transition-all cursor-pointer p-4 text-center"
                >
                  <div className="p-2 rounded-full bg-stone-800/80 text-stone-300">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-stone-300 block">
                      Add Header Banner
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      PNG, JPG, or WebP (1500×500 recommended)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {banner && (
              <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
                <span>Header banner preview active</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="text-stone-400 hover:text-stone-200 cursor-pointer underline"
                  >
                    Change
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleRemoveBanner}
                    className="text-red-400 hover:text-red-300 cursor-pointer underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Avatar Area */}
          <div className="flex items-center gap-4 p-3.5 bg-[#181818] border border-stone-800 rounded-xl">
            <div className="relative group cursor-pointer shrink-0" onClick={() => avatarInputRef.current?.click()}>
              <UserAvatar
                src={avatar}
                name={name || 'User'}
                size="xl"
                className="border border-stone-700 group-hover:opacity-75 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-[#202020] hover:bg-stone-700 text-xs font-bold text-stone-200 rounded-full flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-stone-300" />
                  <span>{avatar ? 'Change Photo' : 'Upload Photo'}</span>
                </button>

                {avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-xs font-semibold text-red-300 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>
              <span className="text-[10px] text-stone-500 font-mono">
                PNG, JPG, or GIF (Square recommended)
              </span>
            </div>
          </div>

          {/* Name & Username Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your display name"
                className="w-full bg-[#161616] border border-stone-800 focus:border-white text-xs text-stone-100 px-3.5 py-2 rounded-xl focus:outline-none transition-colors"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-stone-400">
                  Username
                </label>
                <span className="text-[10px] text-stone-500 font-mono">Immutable</span>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-stone-500 text-xs font-mono">@</span>
                <input
                  type="text"
                  value={username}
                  readOnly
                  disabled
                  className="w-full bg-[#141414] border border-stone-800/60 text-xs text-stone-400 pl-7 pr-3.5 py-2 rounded-xl cursor-not-allowed font-mono opacity-80"
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              maxLength={160}
              placeholder="Tell the orbit about yourself..."
              className="w-full bg-[#161616] border border-stone-800 focus:border-white text-xs text-stone-100 p-3 rounded-xl focus:outline-none resize-none leading-relaxed transition-colors placeholder:text-stone-600"
            />
          </div>

          {/* Country Selection (ISO Standard) & Website */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Country
              </label>
              <CountrySelector
                countryCode={countryCode}
                countryName={countryName}
                onChange={handleCountryChange}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Website
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full bg-[#161616] border border-stone-800 focus:border-white text-xs text-stone-100 px-3.5 py-2.5 rounded-xl focus:outline-none placeholder:text-stone-600 transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800/80">
            <button
              type="button"
              disabled={isSaving}
              onClick={closeEditProfile}
              className="px-4 py-2 text-xs font-semibold text-stone-400 hover:text-stone-200 disabled:opacity-40 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-white hover:bg-stone-200 disabled:opacity-50 text-black font-bold text-xs rounded-full transition-all shadow-md cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
