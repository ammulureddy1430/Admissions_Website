import type { ParkingLayout, ParkingVehicle } from "./Types";
export class CollisionManager {
  occupied(layout:ParkingLayout, exceptId?:string){const cells=new Set<string>();for(const v of layout.vehicles){if(v.id===exceptId)continue;for(let i=0;i<v.length;i++)cells.add(`${v.x+(v.axis==="horizontal"?i:0)},${v.y+(v.axis==="vertical"?i:0)}`)}return cells}
  canPlace(layout:ParkingLayout, vehicle:ParkingVehicle, x:number, y:number){const occupied=this.occupied(layout,vehicle.id);for(let i=0;i<vehicle.length;i++){const cx=x+(vehicle.axis==="horizontal"?i:0),cy=y+(vehicle.axis==="vertical"?i:0);if(cx<0||cy<0||cx>=layout.cols||cy>=layout.rows||occupied.has(`${cx},${cy}`))return false}return true}
  clearToExit(layout:ParkingLayout, vehicle:ParkingVehicle){if(!vehicle.target||vehicle.axis!=="horizontal")return false;const occupied=this.occupied(layout,vehicle.id);for(let x=vehicle.x+vehicle.length;x<layout.cols;x++)if(occupied.has(`${x},${vehicle.y}`))return false;return true}
}
