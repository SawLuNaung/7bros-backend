const express = require("express");
const {PutObjectCommand} = require("@aws-sdk/client-s3");
const {getSignedUrl} = require('@aws-sdk/s3-request-presigner');
const {v4: uuidv4} = require('uuid');
const {s3Client} = require("../utils/s3Client");


const router = express.Router();

router.post("/", async (req, res) => {
    try {
        let {content_type, folder} = req.body.input;
        if (!(content_type && folder)) {
            return res.status(400).json("missing required fields")
        } else if (content_type !== "image" && content_type !== "video") {
            return res.status(400).json("content_type must be image or video")
        } else if (folder !== "users" && folder !== "receipts" && folder !== "news") {
            return res.status(400).json("folder must be users, receipts, user_receipts")
        } else {
            const fileUploadInfo = await FileUploadInfoGenerator(content_type, folder);
            res.json({
                error: 0,
                message: "fileUploadURL Generation Successful",
                fileUploadUrl: fileUploadInfo.fileUploadUrl,
                fileName: fileUploadInfo.fileName,
                content_type
            });
        }
    } catch (e) {
        res.json({error: 1, message: e.message, fileUploadUrl: "", fileUploadInfo: ""});
    }


})


const FileUploadInfoGenerator = async (contentType, folder) => {
    try {
        let fileName = uuidv4();
        if (contentType.includes('video')) {
            fileName = fileName + '.mp4';
        } else if (contentType.includes('image')) {
            fileName = fileName + '.jpg';
        } else if (contentType.includes('pdf')) {
            fileName = fileName + '.pdf';
        }
        const bucketParams = {
            Bucket: "axra",
            Key: `EAXI/${folder}/${fileName}`,
            ContentType: contentType,
            ACL: "public-read",
        };

        const fileUploadUrl = await getSignedUrl(s3Client, new PutObjectCommand(bucketParams), {expiresIn: 150 * 60}); // Adjustable expiration.
        return {fileUploadUrl, fileName}
    } catch (e) {
        throw new Error(e.message);
    }

}

module.exports = router;
