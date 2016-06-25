'use strict';

angular.module('runny.models').factory('dbJobs', function($rootScope, $http, $log, $q, getObjectNotifications) {
    var ready_promise = $q.defer();

    var self = {
        isReady: false,
        whenReady: ready_promise.promise
    };

    var reset_self = function() {
        self.byId = {};
    };

    var insert_one = function(obj) {
        $log.debug('Added', obj);
        self.byId[obj.id] = obj;
    };

    var load_all_jobs = function() {
        return $http.get('/api/v1/jobs').then(function(res) {
            reset_self();
            angular.forEach(res.data.objects, insert_one);
            self.isReady = true;
            $rootScope.$broadcast('runny.models.jobs_reloaded');
            ready_promise.resolve();
        });
    };

    var job_changed = function(notification) {
        insert_one(notification.object);
        $rootScope.$broadcast('runny.models.job_changed', notification.object.id);
    };

    var job_deleted = function(notification) {
        var obj = self.byId[notification.id];
        if (angular.isUndefined(obj)) {
            return;
        }
        var deleted_obj = self.byId[notification.id];
        delete self.byId[notification.id];
        $rootScope.$broadcast('runny.models.job_deleted', notification.id, deleted_obj);
    };

    reset_self();

    getObjectNotifications('job', {
        on_new_socket: load_all_jobs,
        on_changed: job_changed,
        on_deleted: job_deleted
    });

    self.create = function(job) {
        return $http.post('/api/v1/jobs', job);
    };

    self.update = function(jobId, job) {
        return $http.put('/api/v1/jobs/' + jobId, job);
    };

    self.delete = function(jobId) {
        return $http.delete('/api/v1/jobs/' + jobId);
    };

    return self;
});
