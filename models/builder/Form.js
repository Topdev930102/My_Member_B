const mongoose = require("mongoose");
const schema = mongoose.Schema;

const FormSchema = schema({

    title: {
        type: String,
        default: "Form Title"
    },
    created_on: {
        type: Date,
        default: Date.now(),
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId
    },
    number_of_submissions: {
        type: Number,
        default: 0
    },
    formBody: {
        type: String,
        default: ""
    },
    formStyle: {
        type: String,
        default: ""
    },
    formScript: {
        type: String,
        default: ""
    },
    enabled: {
        type: Boolean,
        default: true
    },
    deleted: {
        type: Boolean,
        default: false
    },
    favourite: {
        type: Boolean,
        default: false
    },
    archived: {
        type: Boolean,
        default: false
    },
    action: {
        type: String
    },
    formData: {
        type: String,
        default: "{}"
    },
    includePayment: {
        type: Boolean,
        default: false
    },
    funnelId: {
        type: schema.Types.ObjectId
    },
    subUserId: {
        type: schema.Types.ObjectId
    },
    templateId:{
        type: schema.Types.ObjectId
    },
    nextFormId:{
        type:String
    },
    isApprove:{
        type:Boolean,
        default: false
    },
    isSubmit:{
        type:Boolean,
        default: false
    },
    userId:{
        type:String
    }

})

module.exports = mongoose.model('Form', FormSchema)