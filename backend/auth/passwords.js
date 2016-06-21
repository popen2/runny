'use strict';

var logger = require('../logger');
var bcrypt = require('bcryptjs');

class PasswordHandler {
    constructor() {
        this.salt = null;
    }

    setSalt(new_salt) {
        this.salt = new_salt;
    }

    _dirtyPassword(password) {
        return this.salt + password;
    }

    hashPassword(password) {
        var self = this;
        return new Promise(function(resolve, reject) {
            bcrypt.genSalt(10, function(gensalt_err, salt) {
                if (gensalt_err) {
                    logger.error('Error in bcrypt.genSalt:', gensalt_err);
                    reject(gensalt_err);
                } else {
                    bcrypt.hash(self._dirtyPassword(password), salt, function(hash_err, hash) {
                        if (hash_err) {
                            logger.error('Error in bcrypt.hash:', hash_err);
                            reject(hash_err);
                        } else {
                            resolve(hash);
                        }
                    });
                }
            });
        });
    }

    checkPassword(password, saved_hash) {
        var self = this;
        return new Promise(function(resolve, reject) {
            bcrypt.compare(self._dirtyPassword(password), saved_hash, function(err, result) {
                if (err) {
                    logger.error('Error in bcrypt.compare:', err);
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
}

module.exports = {
    passwordHandler: new PasswordHandler()
};
