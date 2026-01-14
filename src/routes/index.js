var express = require('express');

var router = express.Router();

router.get("/", async (req, res) => {
    try {
        res.json("hello eeeee")
    } catch (e) {
        console.log(e)
        return res.status(500).json(e)
    }
})

module.exports = router;
