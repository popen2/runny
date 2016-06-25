'use strict';

const request = require('request');
const HttpStatus = require('http-status-codes');

class Bamboo {
    constructor(baseUrl, username, password, authUrl) {
        this._auth_promise = null;
        this._jar = request.jar();
        this.baseUrl = baseUrl;
        this.authUrl = authUrl;
        this._auth = {
            user: username,
            pass: password,
            sendImmediately: true
        };
        this.req = request.defaults({
            baseUrl: baseUrl,
            jar: this._jar,
            headers: {
                'Accept': 'application/json',
                'X-Atlassian-Token': 'no-check'
            }
        });
    }

    plan(planKey) {
        return new Plan(this, planKey);
    }

    _makeRequest(reqParams) {
        return new Promise((resolve, reject) => {
            this.req(reqParams, function(err, res, body) {
                if (err) {
                    reject(err);
                    return;
                }
                if (res.statusCode != HttpStatus.OK) {
                    reject(res);
                    return;
                }
                resolve(JSON.parse(body));
            });
        });
    }

    authenticate() {
        if (!this._auth_promise) {
            this._auth_promise = this._makeRequest({ baseUrl: this.authUrl, uri: '/rest/auth/1/session', auth: this._auth });
        }
        return this._auth_promise;
    }

    makeRequest(uri, method) {
        method = method || 'GET';
        return this.authenticate().then(() => this._makeRequest({ uri, method }));
    }
}

class Plan {
    constructor(bamboo, planKey) {
        this.bamboo = bamboo;
        this.planKey = planKey;
    }

    getStatus() {
        return this.bamboo.makeRequest(`/rest/api/latest/plan/${this.planKey}`);
    }

    isBuilding() {
        return this.getStatus().then(plan => plan.isBuilding);
    }

    run() {
        return this.bamboo.makeRequest(`/rest/api/latest/queue/${this.planKey}`, 'POST');
    }
}

module.exports = Bamboo;
