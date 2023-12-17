const mongoose = require("mongoose")


const sitelist = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    status: {
        type: Boolean,
        required: true
    }
});
module.exports = mongoose.model("Sites", sitelist)
