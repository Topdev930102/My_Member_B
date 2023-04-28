const mongoose = require("mongoose");

const AutomationSchema = mongoose.Schema({

    type: {
        type: Number,
        default: 1
    },
    created_on: {
        type: Date,
        default: Date.now(),
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId
    },
    from: {
        type: String,
        default: ""
    },
    content: {
        type: String,
        default: ""
    },
    subject: {
        type: String,
        default: ""
    },
    date: {
        type: Date,
        default: Date.now(),
    },
    enabled: {
        type: Boolean,
        default: true
    },
    deleted: {
        type: Boolean,
        default: false
    },
    formId:{
        type: mongoose.Schema.Types.ObjectId
    },
    userId: {
        type: String
    },
    afterDay:{
        type: Number,
        default: null
    },
    time:{
        type: String
    }
})

const Automation = mongoose.model('Automation', AutomationSchema)

module.exports = Automation
