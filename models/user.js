const mongoose = require("mongoose")


const userlist = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    discord_uuid: {
        type: String,
        required: true
    },
    machineid: {
        type: String,
        required: true
    },
    discordid:{
        type: String,
        required: true
    }
    
});
module.exports = mongoose.model("User", userlist)
