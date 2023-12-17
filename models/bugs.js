const mongoose = require("mongoose")


const bugs = new mongoose.Schema({
    store: {
        type: String,
        required: true
    },
    bug: {
        type: String,
        required: true
    },
    fix: { 
        type: String,
        required: false
    }
});
module.exports = mongoose.model("Bugs", bugs)
