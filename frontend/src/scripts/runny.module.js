'use strict';

angular.module('runny', [
    'runny.ui_helpers',
    'runny.templates',
    'runny.state',
    'runny.socketio',
    'runny.models',
    'runny.users',
    'runny.auth',
    'runny.account',
    'runny.admin',
    'runny.jobs'
]);

angular.module('runny').config(function($stateProvider, $locationProvider, $urlRouterProvider) {
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/jobs');
});
