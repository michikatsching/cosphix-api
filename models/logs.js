const mongoose = require("mongoose")


const logs = new mongoose.Schema({
    discordid: {
        type: String,
        required: true
    },
    log: {
        type: String,
        required: true
    },
    createdAt: { 
        type: String,
        required: true,
    }
});
module.exports = mongoose.model("Logs", logs)