export const wait=(ms:number)=>new Promise<void>(resolve=>window.setTimeout(resolve,ms));
