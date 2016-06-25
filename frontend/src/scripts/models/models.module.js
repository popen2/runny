'use strict';

angular.module('runny.models', [])
    .run(function($rootScope, dbJobs, socketIoManager) {
        $rootScope.dbJobs = dbJobs;
    });
