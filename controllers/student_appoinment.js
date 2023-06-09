const studentAppoinment = require("../models/student_appoinment");
const student = require("../models/addmember")
const user = require("../models/user")
const _ = require('lodash')
require("dotenv").config();
const Mailer = require("../helpers/Mailer");
// const sgMail = require('@sendgrid/mail');
// sgMail.setApiKey(process.env.email);
const client = require('twilio')(process.env.aid, process.env.authkey);
// const VoiceResponse = require('twilio').twiml
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const clientNum = require('twilio')(accountSid, authToken);
exports.availabeNumber = (req, res) => {

    let state = req.body.value
    clientNum.availablePhoneNumbers('US')
        .local
        .list({ inRegion: state, limit: 20 })
        .then(local => {
            res.json({ success: true, data:local })
        }
        //      local.forEach(item => {



        //     res.json({ success: true, data: item })
        // }
        
        ).catch(err => {

            res.json({ success: false, msg: "Something went Wrong" })
        })

    // clientNum.availablePhoneNumbers(region)
    // .fetch()
    // .then(available_phone_number_country =>{
    //     res.json({success :true, data:available_phone_number_country  })
    // }).catch(err =>{
    //     res.json({success :false, msg :"Something went Wrong" })
    // });

    //     clientNum.availablePhoneNumbers
    //   .list({limit: 20})
    //   .then(availablePhoneNumbers => availablePhoneNumbers.forEach(a => console.log('response twillo', a.countryCode)));
}

exports.voiceCall = (req, res) => {
    client.calls
        .create({
            twiml: '<Response><Say>hy kaushal and mohit how are you</Say></Response>',
            to: req.body.to,
            from: '+12192445425'
        })
        .then(call => res.send(call)).catch(error => res.send(error))
}

exports.create = (req, res) => {
    student.findById(req.params.studentId).exec((err, std_data) => {
        if (err) {
            res.send({ error: 'student data not found' })
        }
        else {
            var obj = {
                userId: req.params.userId,
                firstName: std_data.firstName,
                lastName: std_data.lastName
            }
            var std_app = new studentAppoinment(req.body)
            var appoinment = _.extend(std_app, obj)
            appoinment.save((err, appoinmentData) => {
                if (err) {
                    res.send({ error: 'student appoinment is not create' })
                }
                else {
                    user.findByIdAndUpdate(req.params.userId, { $push: { renewal_appoinment_history: appoinmentData._id } })
                        .exec((err, data) => {
                            if (err) {
                                res.send({ error: 'student appoinment is not add in school' })
                            }
                            else {
                                res.send({ msg: 'student appoinment create successfully', appoinment: appoinmentData })
                            }
                        })
                }
            })
        }
    })
}

exports.read = (req, res) => {
    studentAppoinment.find({ userId: req.params.userId })
        .exec((err, stdApp) => {
            if (err) {
                res.send({ error: 'student appoinment not found' })
            }
            else {
                res.send(stdApp)
            }
        })
}

exports.remove = (req, res) => {
    var appoinmentId = req.params.appoinmentId;
    studentAppoinment.findByIdAndRemove({ _id: appoinmentId }, (err, appoinmentRemove) => {
        if (err) {
            res.send({ error: 'renewal appoinment is not delete' })
        }
        else {
            user.update({ "renewal_appoinment_history": appoinmentRemove._id }, { $pull: { "renewal_appoinment_history": appoinmentRemove._id } })
                .exec((err, appUpdateUser) => {
                    if (err) {
                        res.send({ error: 'renewal student appoinment is not delete in student' })
                    }
                    else {
                        res.send({ msg: 'renewal student appoinment is remove successfully' })
                    }
                })
        }

    })
}

exports.send_email = (req, res) => {
    var To = req.body.To
    var From = req.body.From
    var Sub = req.body.Sub
    const emailData = new Mailer({
        to: To,
        from: From,
        subject: Sub,
        html: `<p>my mail</p>`
    })
    emailData.sendMail()
        .then(data => {
            res.send({ msg: "Email Sent Successfully", success: true })

        })
        .catch(err => {
            res.send({ msg: "Email notSent ", success: false })

        })


}

exports.send_sms = (req, res) => {
    var number = req.body.number
    client.messages.create({
        to: number,
        from: '+12679301602',
        body: 'This is the ship that made the Kessel Run in fourteen parsecs?',

    }, function (err, data) {
        if (err) {
            res.send({ error: 'msg not set' })
        }
        else {
            res.send(data)
        }
    })
}

