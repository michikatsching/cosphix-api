const mongoose = require("mongoose")


const version = new mongoose.Schema({
    version: {
        type: String,
        required: true
    },
    bot: {
        type: String,
        required: true
    }
});
module.exports = mongoose.model("Version", version)