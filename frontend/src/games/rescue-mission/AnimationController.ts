export const wait = (milliseconds: number) => new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));
export const now = () => performance.now();
