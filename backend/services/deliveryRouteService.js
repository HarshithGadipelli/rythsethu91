export const optimizeRoute=(orders)=>{

 return orders.sort((a,b)=>a.distance-b.distance);

}