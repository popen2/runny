'use strict';

var express         = require('express');
var HttpStatus      = require('http-status-codes');
var Job             = require('../models/job').Job;
var userRequired    = require('../auth/roles').userRequired;
var failureResponse = require('../auth/util').failureResponse;

var router = express.Router();

router.get('/jobs', userRequired, function(req, res) {
    return Job.findAll().then(all_jobs => res.json({ objects: all_jobs })).catch(failureResponse);
});

router.post('/jobs', userRequired, function(req, res) {
    return Job.create(req.body).then(function(job) {
        res.status(HttpStatus.CREATED).json(job);
    }).catch(failureResponse);
});

router.put('/jobs/:jobId', userRequired, function(req, res) {
    return Job.update(req.params.jobId, req.body).then(function(job) {
        res.json(job);
    }).catch(failureResponse);
});

router.delete('/jobs/:jobId', userRequired, function(req, res) {
    return Job.destroy(req.params.jobId).then(function() {
        res.status(HttpStatus.NO_CONTENT).json(null);
    }).catch(failureResponse);
});

module.exports = router;
