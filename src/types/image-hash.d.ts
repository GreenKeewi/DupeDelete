declare module 'image-hash' {
  interface ImageHashOptions {
    path: string;
    mode: 'blockhash';
    bits: number; // Added 'bits' property
    // Add other options if needed
  }
  function imageHash(options: ImageHashOptions, callback: (error: Error | null, data: string) => void): void;
  export default imageHash;
}