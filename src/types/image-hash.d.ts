declare module 'image-hash' {
  interface ImageHashOptions {
    path: string;
    mode: 'blockhash';
    // Add other options if needed
  }
  function imageHash(options: ImageHashOptions, callback: (error: Error | null, data: string) => void): void;
  export default imageHash;
}