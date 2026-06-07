export const analyzeNutrition=(crop)=>{

 const data={
  tomato:"Rich in Vitamin C",
  spinach:"High Iron",
  carrot:"Vitamin A"
 }

 return data[crop]||"Healthy food";

}