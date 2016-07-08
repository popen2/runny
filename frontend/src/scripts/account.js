'use strict';

angular.module('runny.account', ['runny.ui_helpers']);

angular.module('runny.account').provider('accountView', function(viewPath) {
    return {
        $get: function() {
            return function(path) {
                return viewPath('account/' + path);
            };
        }
    };
});

angular.module('runny.account').provider('accountUrlPaths', function(accountViewProvider) {
    var accountView = accountViewProvider.$get();

    var url_paths = {
        name: 'account',
        url: '/account',
        views: {
            '': {
                templateUrl: accountView('index.html'),
                controller: 'AccountController'
            },
            'top-navigation': {
            }
        },
        resolve: {
            $title: function() {
                return 'Account';
            }
        },
        autoRedirectToChild: 'profile',
        children: [
            {
                name: 'profile',
                url: '/profile',
                template: '<user-profile user-id="curUser.id"/>',
                resolve: {
                    $title: function() {
                        return 'Profile';
                    }
                }
            },
            {
                name: 'api-tokens',
                url: '/api-tokens',
                template: '<user-api-tokens user-id="curUser.id" help-text="true"/>',
                resolve: {
                    $title: function() {
                        return 'API Tokens';
                    }
                }
            },
            {
                name: 'ssh-keys',
                url: '/ssh-keys',
                template: '<user-ssh-keys user-id="curUser.id" help-text="true"/>',
                resolve: {
                    $title: function() {
                        return 'SSH Keys';
                    }
                }
            }
        ]
    };

    return {
        $get: function() {
            return url_paths;
        }
    };
});

angular.module('runny.account').config(function(urlRegisterProvider, accountUrlPathsProvider) {
    urlRegisterProvider.$get()(accountUrlPathsProvider.$get());
});

angular.module('runny.account').controller('AccountController', function($scope) {
});

angular.module('runny.account').directive('userRoleSelection', function(accountView) {
    return {
        restrict: 'E',
        templateUrl: accountView('user-role-selection.html'),
        scope: {
            roleVar: '='
        }
    };
});

angular.module('runny.account').directive('userProfile', function($uibModal, users, curUser, accountView) {
    var link = function(scope, elem, attrs) {
        scope.users = users;
        scope.curUser = curUser;

        var show_update_modal = function(templateFile) {
            return $uibModal.open({
                templateUrl: accountView(templateFile),
                controller: 'UpdateUserController',
                resolve: {
                    userId: function() {
                        return scope.userId;
                    }
                }
            });
        };

        scope.change_username = function() {
            return show_update_modal('change-username.html');
        };

        scope.change_password = function() {
            return show_update_modal('change-password.html');
        };

        scope.edit_display_name = function() {
            return show_update_modal('change-display-name.html');
        };

        scope.edit_email = function() {
            return show_update_modal('change-email.html');
        };

        scope.change_role = function() {
            return show_update_modal('change-role.html');
        };
    };

    return {
        restrict: 'E',
        templateUrl: accountView('user-profile.html'),
        link: link,
        scope: {
            'userId': '='
        }
    };
});

angular.module('runny.account').controller('UpdateUserController', function($scope, $controller, $uibModalInstance, users, userId) {
    $controller('ModalBase', {$scope: $scope, $uibModalInstance: $uibModalInstance});

    $scope.userId = userId;
    $scope.updated_user = {};

    $scope.do_work = function() {
        return users.update_user(userId, $scope.updated_user);
    };
});

angular.module('runny.account').directive('userApiTokens', function($http, accountView) {
    return {
        restrict: 'E',
        templateUrl: accountView('api-tokens.html'),
        controller: 'UserApiTokensController',
        scope: {
            'userId': '=',
            'helpText': '='
        }
    };
});

angular.module('runny.account').controller('UserApiTokensController', function($scope, $http, users) {
    var tokens_url = function() {
        return '/api/auth/users/' + $scope.userId + '/api-tokens';
    };

    var reload_tokens = function() {
        $http.get(tokens_url()).then(function(res) {
            $scope.apiTokens = res.data.api_tokens;
        });
    };

    users.whenReady.then(reload_tokens);

    $scope.create_new_token = function() {
        return $http.post(tokens_url()).then(reload_tokens);
    };

    $scope.revoke_token = function(token) {
        var config = {
            headers: { 'Content-Type': 'application/json' },
            data: { api_token: token }
        };
        return $http.delete(tokens_url(), config).then(reload_tokens);
    };

    $scope.$on('runny.users.user_changed', function(event, user_id) {
        if (user_id === $scope.userId) {
            reload_tokens();
        }
    });

    $scope.$on('runny.users.user_deleted', function(event, user_id) {
        if (user_id === $scope.userId) {
            $scope.apiTokens = [];
        }
    });
});

angular.module('runny.account').directive('userSshKeys', function($http, accountView) {
    return {
        restrict: 'E',
        templateUrl: accountView('ssh-keys.html'),
        controller: 'UserSshKeysController',
        scope: {
            'userId': '=',
            'helpText': '='
        }
    };
});

angular.module('runny.account').controller('UserSshKeysController', function($scope, $http, $uibModal, accountView, users) {
    $scope.sshKeys = [];

    var reload_keys = function() {
        $scope.sshKeys = angular.copy(users.byUserId[$scope.userId].ssh_keys);
    };

    users.whenReady.then(reload_keys);

    $scope.add_key = function() {
        $uibModal.open({
            templateUrl: accountView('add-ssh-key.html'),
            controller: 'AddSshKeyController',
            resolve: {
                userId: function() {
                    return $scope.userId;
                }
            }
        });
    };

    $scope.delete_key = function(key) {
        var config = {
            headers: { 'Content-Type': 'application/json' },
            data: { ssh_key: { contents: key } }
        };
        return $http.delete('/api/auth/users/' + $scope.userId + '/ssh-keys', config);
    };

    $scope.$on('runny.users.user_changed', function(event, user_id) {
        if (user_id === $scope.userId) {
            reload_keys();
        }
    });

    $scope.$on('runny.users.user_deleted', function(event, user_id) {
        if (user_id === $scope.userId) {
            $scope.sshKeys = [];
        }
    });
});

angular.module('runny.account').controller('AddSshKeyController', function($scope, $controller, $uibModalInstance, $http, userId) {
    $controller('ModalBase', {$scope: $scope, $uibModalInstance: $uibModalInstance});

    $scope.userId = userId;
    $scope.ssh_key = {};

    $scope.do_work = function() {
        return $http.post('/api/auth/users/' + userId + '/ssh-keys', { ssh_key: $scope.ssh_key });
    };
});
