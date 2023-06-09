const express = require("express");
const router = express.Router();
const upload = require('../handler/multer');
const { requireSignin, isAuth, verifySchool } = require("../controllers/auth");
const { add_template, list_template, remove_template, update_template, status_update_template, single_tem_updte_status, multipal_temp_remove ,swapAndUpdate_template} = require("../controllers/library_template")

router.get("/email_library/list_template/:userId/:folderId", verifySchool, list_template)
router.post("/email_library/add_template/:userId/:folderId", verifySchool, upload.array('attachments'),add_template)
router.put("/email_compose/drag_drop_templete/:userId",requireSignin,swapAndUpdate_template)
router.put("/email_library/update_template/:userId/:templateId", verifySchool,upload.array('attachments'), update_template)
router.put("/email_library/single_template_status_change/:userId/:tempId", verifySchool, single_tem_updte_status)// single library template status change
router.put("/email_library/update_template_status/:userId/:folderId", verifySchool, status_update_template)//all library template status change
router.delete("/email_library/remove_template/:userId/:templateId", verifySchool, remove_template)
router.delete("/email_library/multipal_remove_template/:userId/:folderId", verifySchool, multipal_temp_remove)
module.exports = router;