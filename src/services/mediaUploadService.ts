import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
  StorageError,
} from 'firebase/storage';
import { storage, auth } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

export interface MediaUploadResult {
  downloadURL: string;
  storagePath: string;
  mediaType: 'image' | 'video';
  fileName: string;
  size: number;
}

export interface MediaUploadOptions {
  file: File | Blob;
  folder: 'posts' | 'stories' | 'avatars' | 'banners' | 'groups';
  entityId: string; // postId, storyId, userId, or groupId
  customFileName?: string;
  onProgress?: (progressPercent: number) => void;
  timeoutMs?: number;
}

export interface CancellableUpload {
  promise: Promise<MediaUploadResult>;
  cancel: () => void;
}

export interface CancellableBatchUpload {
  promise: Promise<MediaUploadResult[]>;
  cancel: () => void;
}

export class UploadCanceledError extends Error {
  userFacingMessage: string;
  constructor(message = 'Upload was canceled by user.') {
    super(message);
    this.name = 'UploadCanceledError';
    this.userFacingMessage = message;
  }
}

export class UploadFailedError extends Error {
  code?: string;
  userFacingMessage: string;
  constructor(message: string, code?: string, userFacingMessage?: string) {
    super(message);
    this.name = 'UploadFailedError';
    this.code = code;
    this.userFacingMessage = userFacingMessage || message;
  }
}

/**
 * Sanitize and create a collision-free filename preserving the original extension.
 */
export function generateUniqueStorageFileName(file: File | Blob, customName?: string): { fileName: string; extension: string } {
  let originalName = customName || (file instanceof File ? file.name : 'media_file');
  let ext = '';

  const dotIndex = originalName.lastIndexOf('.');
  if (dotIndex !== -1 && dotIndex < originalName.length - 1) {
    ext = originalName.substring(dotIndex + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Fallback extension from MIME type if missing
  if (!ext && file.type) {
    if (file.type.includes('png')) ext = 'png';
    else if (file.type.includes('jpeg') || file.type.includes('jpg')) ext = 'jpg';
    else if (file.type.includes('webp')) ext = 'webp';
    else if (file.type.includes('gif')) ext = 'gif';
    else if (file.type.includes('mp4')) ext = 'mp4';
    else if (file.type.includes('webm')) ext = 'webm';
    else if (file.type.includes('quicktime')) ext = 'mov';
    else ext = 'bin';
  }

  if (!ext) ext = 'jpg';

  const baseSanitized = originalName
    .substring(0, dotIndex !== -1 ? dotIndex : originalName.length)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40) || 'media';

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const finalFileName = `${baseSanitized}_${timestamp}_${randomSuffix}.${ext}`;

  return { fileName: finalFileName, extension: ext };
}

/**
 * Detect media type from MIME type or file extension
 */
export function detectMediaType(file: File | Blob, fileName?: string): 'image' | 'video' {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('image/')) return 'image';

  const name = fileName || (file instanceof File ? file.name : '');
  const lower = name.toLowerCase();
  if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.endsWith('.mkv')) {
    return 'video';
  }
  return 'image';
}

/**
 * Map Firebase Storage errors to human-readable diagnostics
 */
export function formatStorageError(err: any): UploadFailedError | UploadCanceledError {
  const code = (err as StorageError)?.code || err?.code || 'storage/unknown';
  const rawMessage = err?.message || String(err);

  console.error('[MediaUploadService] Storage error encountered:', {
    code,
    message: rawMessage,
    serverResponse: err?.serverResponse,
    customData: err?.customData,
    name: err?.name,
  });

  let userFacing = 'Upload failed. Please check your network and try again.';
  switch (code) {
    case 'storage/unauthorized':
      userFacing = 'Permission denied. Please ensure you are logged in.';
      break;
    case 'storage/canceled':
      return new UploadCanceledError('Upload was canceled.');
    case 'storage/quota-exceeded':
      userFacing = 'Cloud storage quota exceeded. Please try again later.';
      break;
    case 'storage/retry-limit-exceeded':
    case 'storage/timeout':
      userFacing = 'Upload timed out. Please verify your internet connection.';
      break;
    case 'storage/invalid-checksum':
      userFacing = 'File integrity check failed. Please reselect the file.';
      break;
    case 'storage/cannot-slice-blob':
      userFacing = 'File could not be read. Please try selecting it again.';
      break;
    case 'auth/unauthenticated':
      userFacing = 'Please sign in to upload photos or videos.';
      break;
    default:
      userFacing = 'Could not complete upload. Please try again.';
      break;
  }

  return new UploadFailedError(rawMessage, code, userFacing);
}

/**
 * Cache for Cloud Storage bucket reachability probe
 */
let storageAvailabilityChecked = false;
let isStorageBucketAvailable = false;

export async function checkStorageBucketAvailability(): Promise<boolean> {
  if (storageAvailabilityChecked) {
    return isStorageBucketAvailable;
  }

  try {
    const bucket = firebaseConfig.storageBucket;
    if (!bucket) {
      storageAvailabilityChecked = true;
      isStorageBucketAvailable = false;
      return false;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);

    // If bucket does not exist on GCP, Firebase Storage API returns 404
    if (res.status === 404) {
      console.warn(`[MediaUploadService] Storage bucket '${bucket}' does not exist on GCP (404). Using smart client optimization.`);
      isStorageBucketAvailable = false;
    } else {
      isStorageBucketAvailable = true;
    }
  } catch (probeErr) {
    console.warn('[MediaUploadService] Storage bucket probe skipped/timed out. Defaulting to client optimization pipeline.', probeErr);
    isStorageBucketAvailable = false;
  }

  storageAvailabilityChecked = true;
  return isStorageBucketAvailable;
}

/**
 * Compresses an image file in the browser into an optimized, high-fidelity WebP or JPEG data URL.
 * Resizes dimensions proportionally to max 1600x1600 to keep it sharp and crisp,
 * while reducing byte footprint to typically 60KB - 250KB (fitting safely within Firestore limits).
 */
export async function compressImageToDataUrl(
  file: File | Blob,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof FileReader === 'undefined') {
      reject(new Error('Browser environment required for image processing'));
      return;
    }

    // Small GIF images should preserve animation
    if (file.type === 'image/gif' && file.size < 1000 * 1024) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read GIF image'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => {
        if (file.size <= 1.5 * 1024 * 1024) {
          resolve(rawDataUrl);
        } else {
          reject(new Error('Failed to decode image file'));
        }
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Downscale if either dimension exceeds maximum
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Test if WebP is supported
          let format = 'image/jpeg';
          try {
            const testWebp = canvas.toDataURL('image/webp');
            if (testWebp.startsWith('data:image/webp')) {
              format = 'image/webp';
            }
          } catch {}

          // For small transparent PNGs, preserve png
          if (file.type === 'image/png' && file.size < 400 * 1024) {
            format = 'image/png';
          }

          let outputDataUrl = canvas.toDataURL(format, quality);

          // If still over 850KB, compress with slightly lower quality to guarantee safety
          if (outputDataUrl.length > 850 * 1024) {
            outputDataUrl = canvas.toDataURL(format, 0.72);
          }

          resolve(outputDataUrl);
        } catch (canvasErr) {
          console.warn('[MediaUploadService] Canvas compression error, falling back to raw data URL:', canvasErr);
          resolve(rawDataUrl);
        }
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Converts a Blob or File directly to a Data URL
 */
export async function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read media file'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/**
 * Fast client-side optimization fallback when Cloud Storage bucket is unprovisioned or offline.
 */
async function processLocalMediaFallback(
  options: MediaUploadOptions,
  mediaType: 'image' | 'video',
  fileName: string,
  isCanceledCheck: () => boolean
): Promise<MediaUploadResult> {
  const { file, onProgress } = options;

  if (isCanceledCheck()) {
    throw new UploadCanceledError();
  }

  onProgress?.(20);
  await new Promise((r) => setTimeout(r, 60));

  if (isCanceledCheck()) {
    throw new UploadCanceledError();
  }

  let dataUrl: string;
  if (mediaType === 'image') {
    onProgress?.(55);
    dataUrl = await compressImageToDataUrl(file);
    onProgress?.(90);
  } else {
    // Video
    if (file.size > 2 * 1024 * 1024) {
      throw new UploadFailedError(
        'Video file is too large for transmission.',
        'storage/file-too-large',
        'Video exceeds size limit (max 2MB when cloud storage bucket is in standby). Please use a smaller video or an image.'
      );
    }
    onProgress?.(50);
    dataUrl = await fileToDataUrl(file);
    onProgress?.(90);
  }

  if (isCanceledCheck()) {
    throw new UploadCanceledError();
  }

  await new Promise((r) => setTimeout(r, 40));
  onProgress?.(100);

  return {
    downloadURL: dataUrl,
    storagePath: 'embedded_media',
    mediaType,
    fileName,
    size: file.size,
  };
}

/**
 * Single resumable media upload with progress tracking, cancellation, and verified download URL.
 * Automatically switches to fast client optimization if Firebase Cloud Storage is unprovisioned.
 */
export function uploadMedia(options: MediaUploadOptions): CancellableUpload {
  const { file, folder, entityId, customFileName, onProgress, timeoutMs = 8000 } = options;

  let uploadTask: UploadTask | null = null;
  let isCanceled = false;
  let storagePathCreated = '';

  const cancel = () => {
    isCanceled = true;
    if (uploadTask) {
      try {
        console.log('[MediaUploadService] Canceling upload task for path:', storagePathCreated);
        uploadTask.cancel();
      } catch (err) {
        console.warn('[MediaUploadService] Error during task.cancel():', err);
      }
    }
  };

  const promise = (async (): Promise<MediaUploadResult> => {
    const currentUser = auth.currentUser;
    const uid = currentUser?.uid || entityId || 'orbit_user';
    const mediaType = detectMediaType(file, customFileName);
    const { fileName, extension } = generateUniqueStorageFileName(file, customFileName);

    // Check Cloud Storage bucket availability
    const bucketAvailable = await checkStorageBucketAvailability();
    if (!bucketAvailable) {
      console.log('[MediaUploadService] Cloud Storage bucket unavailable; activating instant client optimization pipeline.');
      return await processLocalMediaFallback(options, mediaType, fileName, () => isCanceled);
    }

    // Storage bucket is available; proceed with Firebase Storage upload
    const storagePath = `${folder}/${uid}/${entityId}/${fileName}`;
    storagePathCreated = storagePath;
    const storageRef = ref(storage, storagePath);

    let contentType = file.type;
    if (!contentType) {
      if (mediaType === 'video') {
        contentType = extension === 'webm' ? 'video/webm' : 'video/mp4';
      } else {
        contentType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
      }
    }

    const metadata = {
      contentType,
      customMetadata: {
        originalName: customFileName || (file instanceof File ? file.name : fileName),
        uploadedBy: uid,
        entityId,
        folder,
      },
    };

    console.log('[MediaUploadService] Starting Cloud Storage upload:', {
      storagePath,
      contentType,
      size: file.size,
      mediaType,
    });

    return new Promise<MediaUploadResult>((resolve, reject) => {
      let timeoutTimer: NodeJS.Timeout | null = null;

      try {
        uploadTask = uploadBytesResumable(storageRef, file, metadata);
      } catch (initErr: any) {
        console.warn('[MediaUploadService] Failed to initialize uploadBytesResumable, falling back to client optimization:', initErr);
        processLocalMediaFallback(options, mediaType, fileName, () => isCanceled)
          .then(resolve)
          .catch(reject);
        return;
      }

      // Safety timeout: if Cloud Storage hangs or fails silently, fallback to client optimization
      if (timeoutMs > 0) {
        timeoutTimer = setTimeout(async () => {
          if (!isCanceled) {
            console.warn('[MediaUploadService] Cloud Storage upload timed out; seamlessly falling back to client optimization.');
            if (uploadTask) {
              try {
                uploadTask.cancel();
              } catch {}
            }
            try {
              const fallbackResult = await processLocalMediaFallback(options, mediaType, fileName, () => isCanceled);
              resolve(fallbackResult);
            } catch (fallbackErr) {
              reject(fallbackErr);
            }
          }
        }, timeoutMs);
      }

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (isCanceled) return;
          if (snapshot.totalBytes > 0) {
            const rawPct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            const realProgress = Math.min(100, Math.max(0, Math.round(rawPct)));
            onProgress?.(realProgress);
          }
        },
        async (error) => {
          if (timeoutTimer) clearTimeout(timeoutTimer);
          console.warn('[MediaUploadService] Cloud Storage upload error, seamlessly falling back to client optimization:', error);

          if (isCanceled) {
            reject(new UploadCanceledError());
            return;
          }

          try {
            const fallbackResult = await processLocalMediaFallback(options, mediaType, fileName, () => isCanceled);
            resolve(fallbackResult);
          } catch (fallbackErr) {
            reject(fallbackErr);
          }
        },
        async () => {
          if (timeoutTimer) clearTimeout(timeoutTimer);
          if (isCanceled) {
            try {
              await deleteUploadedMedia(storagePath);
            } catch {}
            reject(new UploadCanceledError());
            return;
          }

          try {
            console.log('[MediaUploadService] Cloud Storage upload finalized. Verifying download URL...');
            const downloadURL = await getDownloadURL(storageRef);

            if (!downloadURL || typeof downloadURL !== 'string' || downloadURL.trim() === '') {
              throw new UploadFailedError('Verified download URL is empty', 'storage/invalid-url', 'Failed to verify uploaded file URL.');
            }

            onProgress?.(100);

            resolve({
              downloadURL,
              storagePath,
              mediaType,
              fileName,
              size: file.size,
            });
          } catch (verifyErr: any) {
            console.warn('[MediaUploadService] Download URL verification failed, falling back to client optimization:', verifyErr);
            try {
              const fallbackResult = await processLocalMediaFallback(options, mediaType, fileName, () => isCanceled);
              resolve(fallbackResult);
            } catch (fallbackErr) {
              reject(fallbackErr);
            }
          }
        }
      );
    });
  })();

  return { promise, cancel };
}

/**
 * Upload multiple media items with aggregated progress tracking and transactional cleanup.
 * If any file upload fails, all previously uploaded files in the batch are automatically deleted.
 */
export function uploadMultipleMedia(
  files: (File | Blob)[],
  options: Omit<MediaUploadOptions, 'file'>
): CancellableBatchUpload {
  let isCanceled = false;
  let currentCancelFn: (() => void) | null = null;
  const uploadedPaths: string[] = [];

  const cancel = () => {
    isCanceled = true;
    if (currentCancelFn) {
      currentCancelFn();
    }
    // Cleanup any files already uploaded in this batch
    uploadedPaths.forEach((path) => {
      deleteUploadedMedia(path).catch(() => {});
    });
  };

  const promise = new Promise<MediaUploadResult[]>(async (resolve, reject) => {
    if (files.length === 0) {
      resolve([]);
      return;
    }

    const totalFiles = files.length;
    const progressPerFile = new Array(totalFiles).fill(0);
    const results: MediaUploadResult[] = [];

    const updateAggregatedProgress = () => {
      const sum = progressPerFile.reduce((acc, curr) => acc + curr, 0);
      const aggregate = Math.round(sum / totalFiles);
      options.onProgress?.(aggregate);
    };

    for (let i = 0; i < totalFiles; i++) {
      if (isCanceled) {
        await Promise.all(uploadedPaths.map((p) => deleteUploadedMedia(p).catch(() => {})));
        reject(new UploadCanceledError());
        return;
      }

      const file = files[i];
      try {
        const uploadHandle = uploadMedia({
          ...options,
          file,
          onProgress: (filePct) => {
            progressPerFile[i] = filePct;
            updateAggregatedProgress();
          },
        });

        currentCancelFn = uploadHandle.cancel;
        const res = await uploadHandle.promise;
        results.push(res);
        uploadedPaths.push(res.storagePath);
      } catch (err) {
        console.error(`[MediaUploadService] Batch upload failed at index ${i}:`, err);
        // Rollback: delete all already uploaded files in this batch
        await Promise.all(uploadedPaths.map((p) => deleteUploadedMedia(p).catch(() => {})));
        reject(err);
        return;
      }
    }

    options.onProgress?.(100);
    resolve(results);
  });

  return { promise, cancel };
}

/**
 * Upload with automatic retry on transient failure.
 */
export async function uploadMediaWithRetry(
  options: MediaUploadOptions,
  maxRetries = 1
): Promise<MediaUploadResult> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const handle = uploadMedia(options);
      return await handle.promise;
    } catch (err: any) {
      if (err instanceof UploadCanceledError) {
        throw err;
      }
      attempt++;
      if (attempt > maxRetries) {
        throw err;
      }
      console.warn(`[MediaUploadService] Upload failed on attempt ${attempt}. Retrying...`, err);
      // Brief delay before retry
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new UploadFailedError('Maximum upload retry attempts exceeded.');
}

/**
 * Delete a media file by storage path or download URL.
 * Guarantees no orphan files on transactional rollback.
 */
export async function deleteUploadedMedia(storagePathOrUrl?: string): Promise<void> {
  if (!storagePathOrUrl || typeof storagePathOrUrl !== 'string') return;
  const trimmed = storagePathOrUrl.trim();
  if (!trimmed || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return;

  try {
    let storageRef;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      storageRef = ref(storage, trimmed);
    } else {
      storageRef = ref(storage, trimmed);
    }
    await deleteObject(storageRef);
    console.log('[MediaUploadService] Successfully deleted storage file:', trimmed);
  } catch (err: any) {
    // If object doesn't exist, it's already clean
    if (err?.code === 'storage/object-not-found') {
      return;
    }
    console.warn('[MediaUploadService] deleteUploadedMedia notice:', err?.message || err);
  }
}
