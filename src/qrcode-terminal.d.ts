declare module 'qrcode-terminal' {
  function generate(text: string, options?: { small?: boolean }, callback?: () => void): void;
  export default { generate };
}
