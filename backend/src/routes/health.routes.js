const express = require('express');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'student-attendance-tracker-api',
    version: 1,
  });
});

module.exports = router;
