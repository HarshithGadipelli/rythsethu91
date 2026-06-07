import Delivery from "../models/Delivery.js";

export const assignDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.create(req.body);
    
    const io = req.app.get("io");
    if (io) io.emit("delivery_assigned", delivery);

    res.json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDeliveriesByAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const deliveries = await Delivery.find({ agent: agentId }).populate("order");
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const delivery = await Delivery.findByIdAndUpdate(id, { status }, { new: true });
    
    const io = req.app.get("io");
    if (io) io.emit("delivery_updated", delivery);

    res.json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};