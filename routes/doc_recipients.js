const express = require('express');
const router = express.Router();
const { requireSignin } = require("../controllers/auth");
const { addRecipientsWithSignatures } = require("../controllers/doc_recipients");

router.post("/document/add_recipients/:userId", requireSignin, addRecipientsWithSignatures);

module.exports = router;