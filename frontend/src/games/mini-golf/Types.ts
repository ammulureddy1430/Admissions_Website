export type Rect={x:number;y:number;w:number;h:number}; export type Circle={x:number;y:number;r:number};
export type Course={name:string;start:{x:number;y:number};hole:Circle;walls:Rect[];bumpers:Circle[];sand?:Rect;water?:Rect;moving?:Rect;difficulty:number};
export type Ball={x:number;y:number;vx:number;vy:number;r:number;moving:boolean};
export type MiniGolfMetrics=Record<string,number|number[]|string>&{overallScore:number;handEyeCoordinationScore:number;motorPlanningScore:number;decisionTimes:number[];shotsPerCourse:number[];completionStatus:string};
