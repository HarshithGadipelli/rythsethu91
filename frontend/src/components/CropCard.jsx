function CropCard({crop}){

return(

<div style={{border:"1px solid #ddd",padding:"15px",margin:"10px"}}>

<h3>{crop.name}</h3>

<p>Price: ₹{crop.price}</p>

<p>Quantity: {crop.quantity} kg</p>

<button>Buy</button>

</div>

)

}

export default CropCard