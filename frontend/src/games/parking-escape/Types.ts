export type VehicleAxis = "horizontal" | "vertical";
export type ParkingVehicle = { id:string; x:number; y:number; length:2|3; axis:VehicleAxis; color:string; target?:boolean };
export type ParkingLayout = { level:number; cols:6; rows:6; vehicles:ParkingVehicle[]; optimalMoves:number };
export type MoveResult = { vehicleId:string; from:{x:number;y:number}; to:{x:number;y:number}; distance:number; escaped:boolean; efficient:boolean };
export type ParkingEscapeMetrics = {
  student_id?:string; assessment_id?:string; game_id?:string; age_group:"5–7 Years";
  levels_started:number; levels_completed:number; target_cars_escaped:number; total_vehicle_moves:number;
  efficient_moves:number; unnecessary_moves:number; average_level_completion_time:number; highest_level:number;
  strategic_planning_score:number; spatial_reasoning_score:number; completion_percentage:number; overall_score:number;
  started_at:string; completed_at:string; completionStatus:"COMPLETED"|"PARTIAL";
};
export type ParkingRawMetrics = Omit<ParkingEscapeMetrics,"strategic_planning_score"|"spatial_reasoning_score"|"completion_percentage"|"overall_score"|"average_level_completion_time"|"completed_at"|"completionStatus"> & { level_times:number[]; optimal_moves:number; invalid_moves:number };
