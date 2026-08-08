import type { ParkingLayout, ParkingVehicle } from "./Types";

const colors = ["#35b7e9", "#ffb84d", "#9a73e8", "#42c998", "#ef6b72", "#f28bc1", "#6d8fe8"];
const car = (id:string,x:number,y:number,axis:"horizontal"|"vertical",color:number,target=false,length:2|3=2):ParkingVehicle => ({ id,x,y,axis,length,color:colors[color%colors.length],target });

export class ParkingLayoutGenerator {
  generate(level:number):ParkingLayout {
    const l=Math.max(1,Math.min(4,level));
    const vehicles:ParkingVehicle[]=[
      car("target",0,2,"horizontal",4,true),
      car("upper",0,0,"horizontal",5),
    ];
    vehicles.push(l===4?car("lower",4,5,"horizontal",2):car("lower",0,5,"horizontal",2));

    if(l<=2){
      vehicles.push(car("gate",3,1,"vertical",0));
      if(l===2)vehicles.push(car("north",4,1,"vertical",1));
    }

    if(l===3){
      vehicles.push(
        car("gate",3,0,"vertical",0,false,3),
        car("north",4,1,"vertical",1),
        car("chain-a",2,3,"horizontal",6),
      );
    }

    if(l===4){
      vehicles.push(
        car("gate",3,0,"vertical",0,false,3),
        car("north",4,1,"vertical",1),
        car("key",0,3,"vertical",3),
        car("chain-a",2,3,"horizontal",6),
      );
    }

    return { level:l,cols:6,rows:6,vehicles,optimalMoves:l+1 };
  }
}
