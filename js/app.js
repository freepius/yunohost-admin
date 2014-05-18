app = Sammy('#main', function (sam) {

    /**
     * Sammy Configuration
     *
     */
    // Plugins
    sam.use('Handlebars', 'ms');

    Handlebars.registerHelper('ucwords', function(str) {
        return (str + '').replace(/^([a-z\u00E0-\u00FC])|\s+([a-z\u00E0-\u00FC])/g, function ($1) {
            return $1.toUpperCase();
        });
    });
    Handlebars.registerHelper('humanSize', function(bytes) {
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes == 0) return 'n/a';
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[[i]];
    });
    Handlebars.registerHelper('humanTime', function(time) {
        return Math.round(time) + 's';
    });
    Handlebars.registerHelper('bitRate', function(bytes, time) {
        var sizes = ['b', 'Kb', 'Mb', 'Gb', 'Tb'];
        if (time == 0) return 'n/a';
        var bps = bytes / time * 8;
        var i = parseInt(Math.floor(Math.log(bps) / Math.log(1024)));
        return Math.round(bps / Math.pow(1024, i), 2) + ' ' + sizes[[i]] + '/s';
    });

    Handlebars.registerHelper('t', function(y18n_key) {
      var result = y18n.t(y18n_key, Array.prototype.slice.call(arguments, 1));
      return new Handlebars.SafeString(result);
    });


    // Look for supported type of storage to use
    var storageType;
    if (Sammy.Store.isAvailable('session')) {
        storageType = 'session';
    } else if (Sammy.Store.isAvailable('cookie')) {
        storageType = 'cookie';
    } else {
        storageType = 'memory';
    }

    // Initialize storage
    var store = new Sammy.Store({name: 'storage', type: storageType});
    var loaded = false;

    /**
     * Helpers
     *
     */
    sam.helpers({

        // Serialize an object
        serialize : function(obj) {
          var str = [];
          for(var p in obj)
            if (obj.hasOwnProperty(p)) {
              str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            }
          return str.join("&");
        },

        // Flash helper to diplay instant notifications
        flash: function (level, message) {
            flashs = store.get('flash');
            if (!flashs) { flashs = {'info': [], 'fail': [], 'warning': [], 'success': [] } }
            flashs[level].push(message);
            store.set('flash', flashs);

            html = '';
            for(lvl in flashs) {
                flashs[lvl].forEach( function(msg) {
                    if (lvl == 'fail') { alertClass = 'alert-danger'; }
                    else               { alertClass = 'alert-'+ lvl; }
                    html += '<div class="alert '+ alertClass +'">'+ msg +'</div>';
                });
            }
            $('#flash').html(html).fadeIn();
            document.body.scrollTop = document.documentElement.scrollTop = 0;
        },

        // API connection helper
        api: function (uri, callback, method, data) {
            c = this;
            method = typeof method !== 'undefined' ? method : 'GET';
            data   = typeof data   !== 'undefined' ? data   : {};
            if (window.navigator && window.navigator.language && (typeof data.locale === 'undefined')) {
                data.locale = window.navigator.language;
            }

            var args = data;
            // auth   = "Basic "+ btoa('admin' +':'+ atob('yolo'));
            if (uri === '/postinstall') {
                var installing = false;

                setInterval(function () {
                    installing = true;
                }, 1500);

                $('#popup-title').text(y18n.t('installing'));
                $('#popup-body').html('<p>'+y18n.t('installation_complete_wait', [data.domain])+'</p>');
                $('#popup-body').append('<div class="loader loader-popup"></div>');
                $('#popup').modal('show');
            } else {
                loaded = false;
                if ($('div.loader').length == 0) {
                setInterval(function () {
                    if (!loaded && $('div.loader').length == 0) {
                        $('#main').append('<div class="loader loader-content"></div>');
                    }
                }, 500);
                }
            }
            jQuery.ajax({
                url: store.get('url') + uri,
                type: method,
                crossdomain: true,
                data: data,
                traditional: true,
                dataType: 'json',
                // beforeSend: function(req) {
                //     req.setRequestHeader('Authorization', auth);
                // }
            })
            /*
            .always(function(data) {
                if (data.status !== 'undefined' && uri === '/login') {
                    if (data.status === 401) {
                        $('#popup').modal('hide');
                        c.flash('fail', y18n.t('wrong_password'));
                    }
                    // 200 & empty response TODO: better comment
                    // /login
                    else if (data.status === 200) {
                        // data = typeof data !== 'undefined' ? data : {};
                        if (typeof data.win !== 'undefined') {
                            $.each(data.win, function(k, v) {
                                c.flash('success', v);
                            });
                        }
                        callback(data);                        
                    }
                }
                loaded = true;
                $('div.loader').remove();

            })
*/
            .always(function(xhr, ts, error) {
                // console.log("always");
                // console.log(xhr);
                // console.log(ts);
                // console.log(error);
            })
            .done(function(data) {
                // console.log('success');console.log(data);
                // data = typeof data !== 'undefined' ? data : {};
                data = data || {};
                if (typeof data.win !== 'undefined') {
                    $.each(data.win, function(k, v) {
                        c.flash('success', v);
                    });
                }
                callback(data);
            })
            .fail(function(xhr) {
                // console.log('fail');console.log(xhr);
                if (xhr.status == 401) {
                    $('#popup').modal('hide');
                    if (uri !== '/login') {
                        c.flash('fail', y18n.t('unauthorized'));
                        c.redirect('#/login');
                    }
                } else if (typeof xhr.responseJSON !== 'undefined') {
                    $('#popup').modal('hide');
                    c.flash('fail', xhr.responseJSON.error);
                } else if (typeof xhr.responseText !== 'undefined' && uri !== '/postinstall') {
                    $('#popup').modal('hide');
                    c.flash('fail', xhr.responseText);
                } else {
                    if (uri == '/postinstall') {
                        if (installing) {
                            if (args.domain.match(/\.nohost\.me$/) || args.domain.match(/\.noho\.st$/)) {
                                $('#popup-title').text(y18n.t('installed'));
                                $('#popup-body p').text(y18n.t('installation_complete_dns'));
                                interval = 180000;
                            } else {
                                interval = 5000;
                            }
                            setInterval(function () {
                                if (window.location.hostname === args.domain) {
                                    $('#popup-title').text(y18n.t('installation_complete'));
                                    $('#popup-body').html(
                                        '<p>'+ y18n.t('installation_complete_desc', ['https://'+ args.domain +'/yunohost/admin', args.domain +'/yunohost/admin']) +'</p>'
                                        + '<br>'
                                        + '<p><small>'+ y18n.t('installation_complete_help_dns') +'</small></p>');
                                } else {
                                    $('#popup').modal('hide');
                                    c.flash('success', y18n.t('installation_complete'));
                                    c.redirect('#/login');
                                }
                            }, interval);
                        } else {
                            $('#popup').modal('hide');
                            c.flash('fail', y18n.t('error_occured'));
                        }
                    } else {
                        c.flash('fail', y18n.t('error_server'));
                    }
                }
                store.clear('slide');
                c.redirect(store.get('path-1'));
            });
        },

        // Render view (cross-browser)
        view: function (view, data) {
            rendered = this.render('views/'+ view +'.ms', data);

            enableSlide = true; // Change to false to disable animation

            loaded = true;
            $('div.loader').remove();

            if (enableSlide) {
                function leSwap() {
                    rendered.swap(function() {
                        $('.slide').on('click', function() {
                            $(this).addClass('active');
                            if ($(this).hasClass('back')) {
                                store.set('slide', 'back');
                            } else {
                                store.set('slide', 'to');
                            }
                        });
                    });
                }

                blockSize = $('#slider').width();

                // Slide back effect
                if (store.get('slide') == 'back') {
                    store.clear('slide');
                    $('#slideBack').css('display', 'none');
                    $('#slider-container').removeClass('move').css('margin-left', '-'+ blockSize +'px');
                    $('#slideTo').show().html($('#main').html());
                    leSwap();
                    $('#slider-container').addClass('move').css('margin-left', '0px');

                // Slide to effect
                } else if (store.get('slide') == 'to') {
                    store.clear('slide');
                    $('#slideTo').css('display', 'none');
                    $('#slider-container').removeClass('move').css('margin-left', '-'+ blockSize +'px');
                    $('#slider-container').removeClass('move').css('margin-left', '0px');
                    $('#slideBack').show().html($('#main').html());
                    leSwap();
                    $('#slider-container').addClass('move').css('margin-left', '-'+ blockSize +'px');

                } else {
                    leSwap();
                }
            } else {
                rendered.swap();
            }
        }
    });


    /**
     * Filters
     *
     */
    sam.before(/apps\/install\//, function (req){
        // Preload domains list.
        req.params.domains = [];
        req.api('/domains', function(data) {
            req.params.domains = data.domains;
        });
    });
    sam.before(/apps\/install\//, function (req){
        // Preload users lists.
        req.params.users = [];
        req.api('/users', function(data) {
            req.params.users = data.users;
        });
    });

    sam.before({except: {path: ['#/login', '#/postinstall']}}, function (req) {
        // Store path for further redirections
        store.set('path-1', store.get('path'));
        store.set('path', req.path);

        // Redirect to login page if no credentials stored
        if (!store.get('connected')) {
            req.redirect('#/login');
            return false;
        }

        // Clear flash display
        if (!store.get('flash')) {
            $('#flash').fadeOut(function() { $('#flash').html(''); });
        }
    });

    sam.after(function () {

        // Clear flash notifications
        store.clear('flash');
    });


    /**
     * Routes
     *
     * Note: var "c" is Sammy's route context
     * @doc http://sammyjs.org/docs/api/#Sammy.EventContext
     *
     */
    sam.get('#/', function (c) {
        c.api('/users', function(data) {
            // Warn admin if no users are created.
            if (data.users.length == 0) {
                c.flash('warning', y18n.t('warning_first_user'));
            }

            c.view('home');
        });
    });

    sam.get('#/login', function (c) {
        $('.logout-button').hide();
        store.set('path-1', '#/login');

        // Check if te client is hosted on a yunohost node
        domain = window.location.hostname
        $.ajax({
            dataType: "json",
            url: 'https://'+ domain +'/yunohost/api/installed',
            timeout: 3000
        })
        .success(function(data) {
            if (!data.installed) {
                c.redirect('#/postinstall');
            } else {
                c.view('login', { 'domain': domain });
            }
        })
        .fail(function() {
            c.view('login');
        });
    });

    sam.post('#/login', function (c) {
        store.set('url', 'https://'+ c.params['domain'] +'/yunohost/api');
        // c.api('/api', function(data) {
            // if (data.apiVersion) {
                params = {
                    'password': c.params['password']
                }
                c.api('/login', function(data) {
                    store.set('connected', true);

                    $('.logout-button').fadeIn();
                    c.flash('success', y18n.t('logged_in'));
                    if (store.get('path')) {
                        c.redirect(store.get('path'));
                    } else {
                        c.redirect('#/');
                    }
                }, 'POST', params);
            // } else {
            //     c.flash('fail', y18n.t('non_compatible_api'));
            //     c.redirect('#/login');
            // }
        // });
    });

    sam.get('#/logout', function (c) {
        c.api('/logout', function (data) {
            store.clear('url');
            store.clear('connected');
            store.set('path', '#/');
            c.flash('success', y18n.t('logged_out'));
            c.redirect('#/login');
        });
    });

    sam.get('#/postinstall', function(c) {
        c.view('postinstall', {'ddomains': ['.nohost.me', '.noho.st']});
    });

    sam.post('#/postinstall', function (c) {
        if (c.params['password'] == '' || c.params['confirmation'] == '') {
            c.flash('fail', y18n.t('password_empty'))
        }
        else if (c.params['password'] == c.params['confirmation']) {
            if (c.params['domain'] == '') {
                if (c.params['ddomain'] == '') {
                    c.flash('fail', y18n.t('error_select_domain'));
                    store.clear('slide');
                    c.redirect('#/postinstall');
                } else {
                    params = { 'domain': c.params['ddomain'] + c.params['ddomain-ext'] }
                }
            } else {
                params = { 'domain': c.params['domain'] }
            }

            params['password'] = c.params['password']

            store.set('url', 'https://'+ window.location.hostname +'/yunohost/api');
            store.set('user', 'admin');
            store.set('password', btoa('yunohost'));
            c.api('/postinstall', function(data) { // http://api.yunohost.org/#!/tools/tools_postinstall_post_0
                c.redirect('#/');
            }, 'POST', params);
        } else {
            c.flash('fail', y18n.t('passwords_dont_match'));
        }
    });

    /**
     * Users
     *
     */

    sam.get('#/users', function (c) {
        c.api('/users', function(data) { // http://api.yunohost.org/#!/user/user_list_get_3
            c.view('user/user_list', data);
        });
    });

    sam.get('#/users/create', function (c) {
        c.api('/domains', function(data) { // http://api.yunohost.org/#!/domain/domain_list_get_2
            c.view('user/user_create', data);
        });
    });

    sam.post('#/users', function (c) {
        if (c.params['password'] == c.params['confirmation']) {
            if (c.params['password'].length < 4) {
                c.flash('fail', y18n.t('password_too_short'));
                store.clear('slide');
            }
            else {
                c.params['mail'] = c.params['email'] + c.params['domain'];
                c.api('/users', function(data) { // http://api.yunohost.org/#!/user/user_create_post_2
                    c.redirect('#/users');
                }, 'POST', c.params.toHash());
            }
        } else {
            c.flash('fail', y18n.t('passwords_dont_match'));
            store.clear('slide');
            //c.redirect('#/users/create');
        }
    });

    sam.get('#/users/:user', function (c) {
        c.api('/users/'+ c.params['user'], function(data) { // http://api.yunohost.org/#!/user/user_info_get_0
            c.view('user/user_info', data);
        });
    });

    sam.get('#/users/:user/edit', function (c) {
        c.api('/users/'+ c.params['user'], function(data) { // http://api.yunohost.org/#!/user/user_info_get_0
            c.view('user/user_edit', data);
        });
    });

    sam.put('#/users/:user', function (c) {
        params = {}
        $.each(c.params.toHash(), function(key, value) {
            if (value !== '' && key !== 'user') { params[key] = value; }
        });

        if ($.isEmptyObject(params)) {
            c.flash('fail', y18n.t('error_modify_something'));
            store.clear('slide');
            // c.redirect('#/users/'+ c.params['user'] + '/edit');
        } else {
            if (params['password']) {
                if (params['password'] == params['confirmation']) {
                    if (params['password'].length < 4) {
                        c.flash('fail', y18n.t('password_too_short'));
                        store.clear('slide');
                    }
                    else {
                        params['change_password'] = params['password'];
                        c.api('/users/'+ c.params['user'], function(data) { // http://api.yunohost.org/#!/user/user_update_put_1
                            c.redirect('#/users/'+ c.params['user']);
                        }, 'PUT', params);
                    }
                } else {
                    c.flash('fail', y18n.t('passwords_dont_match'));
                    store.clear('slide');
                }
            }
            else {
                c.api('/users/'+ c.params['user'], function(data) { // http://api.yunohost.org/#!/user/user_update_put_1
                    c.redirect('#/users/'+ c.params['user']);
                }, 'PUT', params);
            }
        }
    });

    sam.get('#/users/:user/delete', function (c) {
        if (confirm(y18n.t('confirm_delete', [c.params['user']]))) {
            c.api('/users/'+ c.params['user'], function(data) { // http://api.yunohost.org/#!/user/user_delete_delete_4
                c.redirect('#/users');
            }, 'DELETE');
        } else {
            store.clear('slide');
            c.redirect('#/users/'+ c.params['user']);
        }
    });

    /**
     * Domains
     *
     */

    sam.get('#/domains', function (c) {
        c.api('/domains', function(data) { // http://api.yunohost.org/#!/domain/domain_list_get_2
            c.api('/domains/main', function(data2) {
                domains = [];
                $.each(data.domains, function(k, domain) {
                    domains.push({
                        url: domain,
                        main: (domain == data2.current_main_domain) ? true : false
                    });
                })

                // Sort domains with main domain first
                domains.sort(function(a, b){ return -2*(a.main) + 1; });
                c.view('domain/domain_list', {domains: domains});
            }, 'PUT');
        });
    });

    sam.get('#/domains/add', function (c) {
        c.view('domain/domain_add', {'ddomains': ['.nohost.me', '.noho.st']});
    });

    sam.post('#/domains/add', function (c) {
        if (c.params['domain'] == '') {
            if (c.params['ddomain'] == '') {
                c.flash('fail', y18n.t('error_select_domain'));
                store.clear('slide');
                c.redirect('#/domains/add');
            }
            params = { 'domains': c.params['ddomain'] + c.params['ddomain-ext'] }
        } else {
            params = { 'domains': c.params['domain'] }
        }

        c.api('/domains', function(data) { // http://api.yunohost.org/#!/domain/domain_add_post_1
            c.redirect('#/domains');
        }, 'POST', params);
    });

    sam.get('#/domains/:domain/delete', function (c) {
        if (confirm(y18n.t('confirm_delete', [c.params['domain']]))) {
            c.api('/domains/'+ c.params['domain'], function(data) { // http://api.yunohost.org/#!/domain/domain_remove_delete_3
                store.clear('slide');
                c.redirect('#/domains');
            }, 'DELETE');
        } else {
            store.clear('slide');
            c.redirect('#/domains');
        }
    });

    // Set default domain
    sam.post('#/domains', function (c) {
        if (c.params['domain'] == '') {
            c.flash('fail', y18n.t('error_select_domain'));
            store.clear('slide');
            c.redirect('#/domains');
        } else if (confirm(y18n.t('confirm_change_maindomain'))) {

            params = {'new_domain': c.params['domain']}
            c.api('/domains/main', function(data) { // http://api.yunohost.org/#!/tools/tools_maindomain_put_1
                store.clear('slide');
                c.redirect('#/domains');
            }, 'PUT', params);

            // Wait 15s and refresh the page
            refreshDomain = window.setTimeout(function(){
                store.clear('slide');
                c.redirect('#/domains')
            }, 15000);

        } else {
            store.clear('slide');
            c.redirect('#/domains');
        }
    });


    /**
     * Apps
     *
     */

    sam.get('#/apps', function (c) {
        c.api('/apps', function(data) { // http://api.yunohost.org/#!/app/app_list_get_8
            // Keep only installed apps
            data2 = { 'apps': [], 'installed': true }
            $.each(data['apps'], function(k, v) {
                if (v['installed']) data2['apps'].push(v);
            });
            c.view('app/app_list', data2);
        });
    });

    sam.get('#/apps/install', function (c) {
        c.api('/apps', function(data) { // http://api.yunohost.org/#!/app/app_list_get_8
            c.api('/apps?raw', function(dataraw) { // http://api.yunohost.org/#!/app/app_list_get_8
                // Keep only uninstalled apps
                data2 = { 'apps': [] }
                $.each(data['apps'], function(k, v) {
                    if (dataraw[v['id']].manifest.multi_instance) v['installed'] = false;
                    if (!v['installed'] && !v['id'].match(/__[0-9]{1,5}$/)) data2['apps'].push(v);
                });
                c.view('app/app_list', data2);
            });
        });
    });

    sam.get('#/apps/refresh', function (c) {
        c.api('/appslists', function(data) { // http://api.yunohost.org/#!/app/app_fetchlist_put_5
            // c.redirect(store.get('path'));
            c.redirect('#/apps/install');
        }, 'PUT');
    });

    sam.get('#/apps/:app', function (c) {
        c.api('/apps/'+c.params['app']+'?raw', function(data) { // http://api.yunohost.org/#!/app/app_info_get_9
            // Presentation
            data.settings.allowed_users = (data.settings.allowed_users) ? data.settings.allowed_users.replace(',', ', ') : '';
            c.view('app/app_info', data);
        });
    });

    sam.get('#/apps/install/:app', function (c) {
        c.api('/apps?raw', function(data) { // http://api.yunohost.org/#!/app/app_list_get_8
            appData = data[c.params['app']];

            $.each(appData.manifest.arguments.install, function(k, v) {
                appData.manifest.arguments.install[k].allowedValues = [];

                // Radio button
                if (typeof appData.manifest.arguments.install[k].choices !== 'undefined') {
                    // Update choices values with  key and checked data
                    $.each(appData.manifest.arguments.install[k].choices, function(ck, cv){
                        appData.manifest.arguments.install[k].choices[ck] = {
                            value: cv,
                            key: ck,
                            checked: (cv == appData.manifest.arguments.install[k].default) ? true : false,
                        };
                    });
                }

                // Special case for domain input.
                // Display a list of available domains
                if (v.name == 'domain') {
                    $.each(c.params.domains, function(key, domain){
                        appData.manifest.arguments.install[k].allowedValues.push({
                            value: domain,
                            label: domain,
                        });
                    })
                    appData.manifest.arguments.install[k].help = "<a href='#/domains'>Manage domains</a>";
                }

                // Special case for admin input.
                // Display a list of available users
                if (v.name == 'admin') {
                    $.each(c.params.users, function(key, user){
                        appData.manifest.arguments.install[k].allowedValues.push({
                            value: user.username,
                            label: user.fullname+' ('+user.mail+')'
                        });
                    })
                    appData.manifest.arguments.install[k].help = "<a href='#/users'>Manage users</a>";
                }
            });

            c.view('app/app_install', appData);
        });
    });

    sam.post('#/apps', function(c) {
        params = { 'label': c.params['label'], 'app': c.params['app'] }
        delete c.params['label'];
        delete c.params['app'];
        params['args'] = c.serialize(c.params.toHash());
        c.api('/apps', function() { // http://api.yunohost.org/#!/app/app_install_post_2
            c.redirect('#/apps');
        }, 'POST', params);
    });

    sam.get('#/apps/:app/uninstall', function (c) {
        if (confirm(y18n.t('confirm_uninstall', [c.params['app']]))) {
            c.api('/apps/'+ c.params['app'], function() { // http://api.yunohost.org/#!/app/app_remove_delete_4
                c.redirect('#/apps');
            }, 'DELETE');
        } else {
            store.clear('slide');
            c.redirect('#/apps/'+ c.params['app']);
        }
    });

    // Manage app access
    sam.get('#/apps/:app/access', function (c) {
        c.api('/apps/'+c.params['app']+'?raw', function(data) { // http://api.yunohost.org/#!/app/app_info_get_9
            c.api('/users', function(dataUsers) {

                // allowed_users as array
                if (typeof data.settings.allowed_users !== 'undefined') {
                    if (data.settings.allowed_users.length === 0) {
                        // Force empty array, means no user has access
                        data.settings.allowed_users = [];
                    }
                    else {
                        data.settings.allowed_users = data.settings.allowed_users.split(',');
                    }
                } else {
                    data.settings.allowed_users = []; // Force array
                    // if 'allowed_users' is undefined, everyone has access
                    // that means that undefined is different from empty array
                    data.settings.allow_everyone = true;
                }

                // Available users
                data.users = [];
                $.each(dataUsers.users, function(key, user){
                    // Do not list allowed_users in select list
                    if ( data.settings.allowed_users.indexOf(user.username) === -1 ) {
                        data.users.push({
                            value: user.username,
                            label: user.fullname+' ('+user.mail+')'
                        });
                    } else {
                        // Complete allowed_users data
                        data.settings.allowed_users[data.settings.allowed_users.indexOf(user.username)] = {
                            username: user.username,
                            fullname: user.fullname,
                            mail: user.mail,
                        }
                    }
                })

                c.view('app/app_access', data);
            });
        });
    });

    // Remove all access
    sam.get('#/apps/:app/access/remove', function (c) {
        if (confirm(y18n.t('confirm_access_remove_all', [c.params['app']]))) {
            params = {'apps': c.params['app'], 'users':[]}
            c.api('/access?'+c.serialize(params), function(data) { // http://api.yunohost.org/#!/app/app_removeaccess_delete_12
                store.clear('slide');
                c.redirect('#/apps/'+ c.params['app']+ '/access');
            }, 'DELETE', params);
        } else {
            store.clear('slide');
            c.redirect('#/apps/'+ c.params['app']+ '/access');
        }
    });

    // Remove access to a specific user
    sam.get('#/apps/:app/access/remove/:user', function (c) {
        if (confirm(y18n.t('confirm_access_remove_user', [c.params['app'], c.params['user']]))) {
            params = {'apps': c.params['app'], 'users': c.params['user']}
            c.api('/access?'+c.serialize(params), function(data) { // http://api.yunohost.org/#!/app/app_removeaccess_delete_12
                store.clear('slide');
                c.redirect('#/apps/'+ c.params['app']+ '/access');
            }, 'DELETE', params); // passing 'params' here is useless because jQuery doesn't handle ajax datas for DELETE requests. Passing parameters through uri.
        } else {
            store.clear('slide');
            c.redirect('#/apps/'+ c.params['app']+ '/access');
        }
    });

    // Grant all access
    sam.get('#/apps/:app/access/add', function (c) {
        if (confirm(y18n.t('confirm_access_add', [c.params['app']]))) {
            params = {'apps': c.params['app'], 'users': null}
            c.api('/access', function() { // http://api.yunohost.org/#!/app/app_addaccess_put_13
                store.clear('slide');
                c.redirect('#/apps/'+ c.params['app'] +'/access');
            }, 'PUT', params);
        } else {
            store.clear('slide');
            c.redirect('#/apps/'+ c.params['app']+ '/access');
        }
    });

    // Grant access for a specific user
    sam.post('#/apps/:app/access/add', function (c) {
        params = {'users': c.params['user'], 'apps': c.params['app']}
        c.api('/access', function() { // http://api.yunohost.org/#!/app/app_addaccess_put_13
            store.clear('slide');
            c.redirect('#/apps/'+ c.params['app'] +'/access');
        }, 'PUT', params);
    });

    // Clear access (reset)
    sam.get('#/apps/:app/access/clear', function (c) {
        if (confirm(y18n.t('confirm_access_clear', [c.params['app']]))) {
            params = {'apps': c.params['app']}
            c.api('/access', function() { //
                store.clear('slide');
                c.redirect('#/apps/'+ c.params['app'] +'/access');
            }, 'POST', params);
        } else {
            store.clear('slide');
            c.redirect('#/apps/'+ c.params['app']+ '/access');
        }
    });

    // Make app default
    sam.get('#/apps/:app/default', function (c) {
        if (confirm(y18n.t('confirm_app_default'))) {
            c.api('/apps/'+ c.params['app']  +'/default', function() { //
                store.clear('slide');
                c.redirect('#/apps/'+ c.params['app']);
            }, 'PUT');
        } else {
            store.clear('slide');
            c.redirect('#/apps/'+ c.params['app']);
        }
    });

    /**
     * Services
     *
     */

    // All services status
    sam.get('#/services', function (c) {
        c.api('/services', function(data) { // ?
            data2 = { 'services': [] }
            $.each(data, function(k, v) {
                v.name = k;
                v.is_loaded = (v.loaded=='enabled') ? true : false;
                v.is_running = (v.status=='running') ? true : false;
                data2.services.push(v);
            });
            c.view('service/service_list', data2);
        });
    });

    // Status & actions for a service
    sam.get('#/services/:service', function (c) {
        c.api('/services/'+ c.params['service'], function(data) { // ?
            data2 = { 'service': data }
            data2.service.name = c.params['service'];
            data2.service.is_loaded = (data.loaded=='enabled') ? true : false;
            data2.service.is_running = (data.status=='running') ? true : false;

            store.clear('slide');
            c.view('service/service_info', data2);
        }, 'GET');
    });

    // Service log
    sam.get('#/services/:service/log', function (c) {
        params = { 'number': 50 }
        c.api('/services/'+ c.params['service'] +'/log', function(data) { // ?
            data2 = { 'logs': [], 'name': c.params['service'] }
            $.each(data, function(k, v) {
                data2.logs.push({filename: k, filecontent: v.join('\n')});
            });

            c.view('service/service_log', data2);
        }, 'GET', params);
    });

    // Enable/Disable & Start/Stop service
    sam.get('#/services/:service/:action', function (c) {
        if (confirm(y18n.t('confirm_service_action', [y18n.t(c.params['action']), c.params['service']]))) {
            var method = null, endurl = c.params['service'];

            switch (c.params['action']) {
                case 'start':
                    method = 'PUT';
                    break;
                case 'stop':
                    method = 'DELETE';
                    break;
                case 'enable':
                    method = 'PUT';
                    endurl += '/enable';
                    break;
                case 'disable':
                    method = 'DELETE';
                    endurl += '/enable';
                    break;
                default:
                    c.flash('fail', y18n.t('unknown_action', [c.params['action']]));
                    store.clear('slide');
                    c.redirect('#/services/'+ c.params['service']);
            }

            if (method && endurl) {
                c.api('/services/'+ endurl, function(data) {
                    store.clear('slide');
                    c.redirect('#/services/'+ c.params['service']);
                }, method);
            }
        } else {
            store.clear('slide');
            c.redirect('#/services/'+ c.params['service']);
        }
    });


    /**
     * Monitor
     *
     */

    // 
    sam.get('#/monitor', function (c) {
        monitorData = {}

        // Why this method ? 
        c.api('/services/glances', function(data) { // ?
            monitorData.status = true;

            if (data.status == 'running') {
                c.api('/monitor/system', function(data) {
                    monitorData.system = data;

                    c.api('/monitor/disk', function(data) {
                        monitorData.disk = data;

                        c.api('/monitor/network', function(data) {
                            monitorData.network = data;

                            // Remove useless interface
                            delete monitorData.network.usage.lo;

                            c.view('monitor/monitor', monitorData);
                        });

                    });
                });
            }
            else {
                monitorData.status = false;
                c.view('monitor/monitor', monitorData);
            }



        }, 'GET');
    });


    /**
     * Tools
     *
     */

    sam.get('#/tools', function (c) {
        c.view('tools/tools_list');
    });

    // Update administration password
    sam.get('#/tools/adminpw', function (c) {
        c.view('tools/tools_adminpw');
    });
    sam.put('#/tools/adminpw', function (c) {
        params = {}
        $.each(c.params.toHash(), function(key, value) {
            if (value !== '') { params[key] = value; }
        });
        if ($.isEmptyObject(params)) {
            c.flash('fail', y18n.t('error_modify_something'));
            store.clear('slide');
            c.redirect('#/tools/adminpw');
        } else if (params['new_password'] !== params['confirm_new_password']) {
            c.flash('fail', y18n.t('passwords_dont_match'));
            store.clear('slide');
            c.redirect('#/tools/adminpw');
        } else {
            // Remove useless variable
            delete params['confirm_new_password'];
            // Update password and redirect to the home
            c.api('/adminpw', function(data) { // http://api.yunohost.org/#!/tools/tools_adminpw_put_3
                store.set('password', btoa(params['new_password']));
                c.redirect('#/logout');
            }, 'PUT', params);
        }
    });

    // System update & upgrade
    sam.get('#/tools/update', function (c) {
        c.api('/update', function(data) {
            packagesLength = data.packages.length;
            for(var i = 0; i < packagesLength; i++) {
                data.packages[i].changelog = data.packages[i].changelog.replace(/\n/g, '<br />');
            }
            c.view('tools/tools_update', data);
        }, 'PUT');
    });

    sam.get('#/tools/upgrade/:type', function (c) {
        if (c.params['type'] !== 'apps' && c.params['type'] !== 'packages') {
            c.flash('fail', y18n.t('error_server'));
            store.clear('slide');
            c.redirect('#/tools/update');
        }
        if (confirm(y18n.t('confirm_update_type', [y18n.t('system_'+c.params['type']).toLowerCase()]))) {
            params = []
            if (c.params['type'] == 'packages') {params.push('ignore-apps');}
            if (c.params['type'] == 'apps') {params.push('ignore-packages');}
            c.api('/upgrade', function(data) {
                // 'log' is a reserved name, maybe in handlebars
                data.logs = data.log;
                c.view('tools/tools_upgrade', data);
            }, 'PUT', params);
        } else {
            store.clear('slide');
            c.redirect('#/tools/update');
        }
    });


    /**
     * Backup
     *
     */

    sam.get('#/backup', function (c) {
        c.view('backup/backup');
    });





});


/**
 * Run the app
 *
 */

$(document).ready(function () {

    /**
     * Translations
     */

    // Default language
    $.getJSON('locales/en.json', function(data){
        y18n.translations['en'] = data;
    });

    // User language
    if (window.navigator && window.navigator.language) {
        y18n.locale = window.navigator.language;
        $.getJSON('locales/'+ y18n.locale +'.json', function(data){
            y18n.translations[y18n.locale] = data;
        });
    }

    /**
     * Application
     */
    app.run('#/');

    // Fixes for sliding effect
    $('#slider-container').width(2*$('#slider').width() +'px');
    $(window).resize(function() {
        $('#slideBack').css('display', 'none');
        $('#slideTo').css('display', 'none');
        $('#slider-container').width(2*$('#slider').width() +'px').removeClass('move').css('margin-left', '0px');
    });
});
