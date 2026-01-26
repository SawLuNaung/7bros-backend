var express = require('express');

var router = express.Router();

router.get("/", async (req, res) => {
    try {
        res.json("hello eeeee")
    } catch (e) {
        console.error("Error in index endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})

module.exports = router;
