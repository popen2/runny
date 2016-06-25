'use strict';

angular.module('runny.jobs', [
    'runny.ui_helpers',
    'runny.models'
]);

angular.module('runny.jobs').config(function(urlRegisterProvider, viewPath) {
    var jobs_url_routes = {
        name: 'jobs',
        url: '/jobs',
        views: {
            '': {
                templateUrl: viewPath('jobs/index.html'),
                controller: 'AllJobsController'
            }
        },
        resolve: {
            $title: function() {
                return 'Jobs';
            }
        }
    };
    urlRegisterProvider.$get()(jobs_url_routes);
});

angular.module('runny.jobs').controller('AllJobsController', function($scope, $log, $uibModal, viewPath, dbJobs) {
    var _edit_modal = function(job, callback) {
        return $uibModal.open({
            templateUrl: viewPath('jobs/edit-job.html'),
            controller: 'EditJobController',
            resolve: {
                job: function() {
                    return job;
                },
                callback: function() {
                    return callback;
                }
            }
        });
    };

    $scope.createJob = function() {
        return _edit_modal({}, function(job) {
            return dbJobs.create(job).then(function(res) {
                return res.data;
            });
        });
    };

    $scope.editJob = function(jobId) {
        return _edit_modal(angular.copy(dbJobs.byId[jobId]), function(job) {
            return dbJobs.update(jobId, job).then(function(res) {
                return res.data;
            });
        });
    };

    $scope.deleteJob = function(jobId) {
        return $uibModal.open({
            templateUrl: viewPath('jobs/delete-job.html'),
            controller: 'DeleteJobController',
            resolve: {
                job: function() {
                    return dbJobs.byId[jobId];
                }
            }
        });
    };
});

angular.module('runny.jobs').controller('EditJobController', function($scope, $controller, $uibModalInstance, job, callback) {
    $controller('ModalBase', {$scope: $scope, $uibModalInstance: $uibModalInstance});
    $scope.job = job;

    $scope.do_work = function() {
        return callback($scope.job);
    };
});

angular.module('runny.jobs').controller('DeleteJobController', function($scope, $controller, $uibModalInstance, dbJobs, job) {
    $controller('ModalBase', {$scope: $scope, $uibModalInstance: $uibModalInstance});
    $scope.job = job;
    $scope.do_work = function() {
        return dbJobs.delete(job.id).then(function() {
        }, function(res) {
            $scope.error = res.data.message || res.data;
        });
    };
});
