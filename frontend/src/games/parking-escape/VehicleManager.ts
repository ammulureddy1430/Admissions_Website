import type { MoveResult,ParkingLayout } from "./Types";
export class VehicleManager { apply(layout:ParkingLayout,result:MoveResult){return{...layout,vehicles:layout.vehicles.map(v=>v.id===result.vehicleId?{...v,...result.to}:v)}} }
