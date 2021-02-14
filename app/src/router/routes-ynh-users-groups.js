/**
 * routes module.
 * @module router/routes
 */

// Simple views are normally imported and will be included into the main webpack entry.
// Others will be chunked by webpack so they can be lazy loaded.
// Webpack chunk syntax is:
// `() => import(/* webpackChunkName: "views/:nameOfWantedFile" */ '@/views/:ViewComponent')`

import ErrorPage from '@/views/ErrorPage'

const routes = [
  {
    name: 'home',
    path: '/',
    redirect: { name: 'user-list' },
    // Leave the empty breadcrumb as it is used by the animated transition to know which way to go
    meta: { breadcrumb: [] }
  },

  /* ────────╮
   │  ERROR  │
   ╰──────── */
  {
    name: 'error',
    path: '/error/:type',
    component: ErrorPage,
    props: true,
    // Leave the breadcrumb
    meta: { noAuth: true, breadcrumb: [] }
  },

  /* ───────╮
   │  USER  │
   ╰─────── */
  {
    name: 'user-list',
    path: '/users',
    component: () => import(/* webpackChunkName: "views/user/list" */ '@/views/user/UserList'),
    meta: {
      args: { trad: 'users' },
      breadcrumb: ['user-list']
    }
  },
  {
    name: 'user-create',
    path: '/users/create',
    component: () => import(/* webpackChunkName: "views/user/create" */ '@/views/user/UserCreate'),
    meta: {
      args: { trad: 'users_new' },
      breadcrumb: ['user-list', 'user-create']
    }
  },
  {
    name: 'user-info',
    path: '/users/:name',
    component: () => import(/* webpackChunkName: "views/user/info" */ '@/views/user/UserInfo'),
    props: true,
    meta: {
      args: { param: 'name' },
      breadcrumb: ['user-list', 'user-info']
    }
  },
  {
    name: 'user-edit',
    path: '/users/:name/edit',
    component: () => import(/* webpackChunkName: "views/user/edit" */ '@/views/user/UserEdit'),
    props: true,
    meta: {
      args: { param: 'name', trad: 'user_username_edit' },
      breadcrumb: ['user-list', 'user-info', 'user-edit']
    }
  },

  /* ────────╮
   │  GROUP  │
   ╰──────── */
  {
    name: 'group-list',
    path: '/groups',
    component: () => import(/* webpackChunkName: "views/group/list" */ '@/views/group/GroupList'),
    meta: {
      args: { trad: 'groups_and_permissions' },
      breadcrumb: ['user-list', 'group-list']
    }
  },
  {
    name: 'group-create',
    path: '/groups/create',
    component: () => import(/* webpackChunkName: "views/group/create" */ '@/views/group/GroupCreate'),
    meta: {
      args: { trad: 'group_new' },
      breadcrumb: ['user-list', 'group-list', 'group-create']
    }
  },

  /* ────────╮
   │  TOOLS  │
   ╰──────── */
  {
    name: 'tool-log',
    path: '/tools/logs/:name',
    component: () => import(/* webpackChunkName: "views/tools/log" */ '@/views/tool/ToolLog'),
    props: true,
    meta: {
      args: { param: 'name' },
      breadcrumb: ['tool-log']
    }
  }
]

export default routes
