const Automation = require("../../models/builder/Automation.js")
const mongoose = require("mongoose")

exports.createAutomation = async (req, res) => {
    try {
        let userId = req.params.userId
        let created_by = new mongoose.Types.ObjectId
        let automation = new Automation
        automation.type = req.body.type
        automation.from = req.body.from
        automation.created_by = created_by
        automation.content = req.body.content
        automation.subject = req.body.subject
        automation.date = req.body.date
        automation.userId = userId
        automation.formId = req.body.formId
        automation.afterDay = req.body.afterDay
        automation.time = req.body.time
        await automation.save()
        res.status(200).json({
            success: true,
            message: "Automation created successfully",
            automationId: automation._id,
            data: "data test"
        })
    }
    catch (error) {
        console.log("Error:", error)
        res.status(500).json({
            success: false,
            message: "Error creating automation"
        })
    }
}

exports.moveToTrashAuto = async (req, res) => {
    try {

        let automationId = req.params.id
        let automation = await Automation.findOne({ _id: automationId })
        automation.deleted = !automation.deleted
        await automation.save()

        res.status(200).json({
            success: true,
            message: "Automation deleted successfully"
        })
    }
    catch (error) {
        console.log("mtt:", error)
        res.status(500).json({
            success: false,
            message: "Error deleting automation"
        })
    }
}

exports.deleteAutomation = async (req, res) => {
    try {
        let automationId = req.params.id
        automationId = mongoose.Types.ObjectId(automationId)
        let automation = await Automation.findOne({ _id: automationId })
        await automation.delete()
        res.status(200).json({
            success: true,
            message: "Automation deleted successfully"
        })
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error deleting automation"
        })
    }
}

exports.updateAutomationData = async (req, res) => {
    try {
        let automationId = req.params.id
        let update = req.body.data

        let automation = await Automation.findOne({ _id: automationId })
        let created_by = new mongoose.Types.ObjectId
        automation.type = update.type
        automation.from = update.from
        automation.created_by = created_by
        automation.content = update.content
        automation.subject = update.subject
        automation.date = update.date
        automation.formId = update.formId
        automation.afterDay = update.afterDay
        automation.time = update.time
        await automation.save()

        res.status(200).json({
            success: true,
            message: "Automation updated successfully"
        })
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating automation"
        })
    }
}

exports.getAutomations = async (req, res) => {
    try {
        let formId = req.params.formId
        let uAutomations = await Automation.find({ formId: formId })

        if (uAutomations) {
            res.status(200).json({
                success: true,
                message: "Automations fetched successfully",
                uAutomations: uAutomations
            })
        }
    }
    catch (error) {
        console.log("error:", error)
        res.status(500).json({
            success: false,
            message: "Error fetching automations"
        })
    }
}