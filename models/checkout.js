const mongoose = require("mongoose")


const checkouts = new mongoose.Schema({
    discordid: {
        type: String,
        required: true
    },
    product: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    store: {
        type: String,
        required: true
    },
    createdAt: { 
        type: String,
        required: true
    }
});
module.exports = mongoose.model("Checkout", checkouts)