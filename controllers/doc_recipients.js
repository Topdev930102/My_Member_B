const documentRecipient = require("../models/doc_recipients")

exports.addRecipientsWithSignatures = async (req, res) => {
  let { userId } = req.params;
  let { sender, recipients, properties, documentId, documentUrl } = req.body;
  const payload = {
    documentId,
    documentUrl,
    sender,
    recipients,
    properties,
    userId
  }

  await documentRecipient.create(payload).then(data => {
    return res.status(200).send({ success: true });
  }).catch(err => {
    return res.status(400).send({ msg: err.message.replace(/\"/g, ""), success: false })
  });
}