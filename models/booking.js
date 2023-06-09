const mongoose = require("mongoose");
const schema = mongoose.Schema;

const bookingSchema = new schema(
    {
        email: {
            type: String,
            required:true,
        },
        bookingDuration: {
            type: Number
        },
        userId:{
            type:String,
            index:true
        },
        text:{
            type:String,
        },
        isDeleted:{
            type:Boolean,
            default:false
        }

    },
    { timestamps: true }
);

module.exports = mongoose.model("booking", bookingSchema);