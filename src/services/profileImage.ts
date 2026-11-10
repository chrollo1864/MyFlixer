const MAX_PROFILE_IMAGE_BYTES = 500 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function readProfileImage(file: File): Promise<string> {
  if (!ALLOWED_PROFILE_IMAGE_TYPES.has(file.type)) {
    return Promise.reject(new Error('Choose a JPG, PNG, WebP, or GIF image.'));
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    return Promise.reject(new Error('Profile images must be 500 KB or smaller.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read the selected image.'));
    };
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
}
