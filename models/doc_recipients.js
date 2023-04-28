const mongoose = require("mongoose");
const schema = mongoose.Schema


const propertiesSchema = schema(
  {
    type: {
      type: String,
    },
    ipAddress: {
      type: String
    },
    belongsTo: {
      type: String,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide valid email']
    },
    isDone: {
      type: Boolean,
      default: false
    },
    x: {
      type: Number
    },
    y: {
      type: Number
    },
    signValue: {
      type: String
    }
  },
  { _id: false }
);

const recipientSchema = schema(
  {
    email: {
      type: String,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide valid email']
    },
    color: {
      type: String,
    },
    viewed: {
      type: Boolean,
      default: false, 
    }
  },
  { _id: false }
);

const documentRecipientSchema = new schema({
    documentId: {
      type: String,
      required: true,
    },
    documentUrl: {
      type: String,
      required: true,
    },
    sender: {
      type: String,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide valid email']
    },
    recipients: {
      type: Array,
      value: [ recipientSchema ]
    },
    properties: {
      type: Array,
      value: [ propertiesSchema ]
    },
    isDone:{
      type: Boolean,
      default: false,
    },
    userId: {
      type: String,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("documentrecipient", documentRecipientSchema);