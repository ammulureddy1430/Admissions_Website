import { TrackGenerator } from "./TrackGenerator";
import { TrackRotationEngine } from "./TrackRotationEngine";
import type { RawTrainMetrics, TrackPiece } from "./Types";
export const TRAIN_TRACK_DURATION_SECONDS=120;
export class TrainTrackEngine { private round=1; private generator=new TrackGenerator(); readonly rotations=new TrackRotationEngine(); current(){return this.generator.create(this.round)} next(){this.round+=1;return this.generator.create(this.round)} connected(pieces:TrackPiece[]){return pieces.every(piece=>this.rotations.isAligned(piece))} emptyMetrics():RawTrainMetrics{return{roundsPlayed:0,tracksCompleted:0,successfulRoutes:0,correctRotations:0,incorrectRotations:0,completionTimes:[],highestDifficulty:1,elapsedSeconds:0}} }
