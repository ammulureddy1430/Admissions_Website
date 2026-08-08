import type{Direction,PipeKind}from"./Types";
const BASE:Record<PipeKind,Direction[]>={straight:["N","S"],corner:["N","E"],tee:["N","E","S"],cross:["N","E","S","W"]};
const ORDER:Direction[]=["N","E","S","W"];
export class PipeManager{openings(kind:PipeKind,rotation:number){return BASE[kind].map(d=>ORDER[(ORDER.indexOf(d)+rotation)%4])} connects(kind:PipeKind,rotation:number,direction:Direction){return this.openings(kind,rotation).includes(direction)}}
