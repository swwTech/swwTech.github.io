/**
 * Generated by "@vuepress/internal-routes"
 */

import { injectComponentOption, ensureAsyncComponentsLoaded } from '@app/util'
import rootMixins from '@internal/root-mixins'
import GlobalLayout from "D:\\desk\\Vue\\0.web\\swwTech.github.io\\node_modules\\@vuepress\\core\\lib\\client\\components\\GlobalLayout.vue"

injectComponentOption(GlobalLayout, 'mixins', rootMixins)
export const routes = [
  {
    name: "v-5cff12a4",
    path: "/archives/",
    component: GlobalLayout,
    beforeEnter: (to, from, next) => {
      ensureAsyncComponentsLoaded("Layout", "v-5cff12a4").then(next)
    },
  },
  {
    path: "/archives/index.html",
    redirect: "/archives/"
  },
  {
    path: "/@pages/archivesPage.html",
    redirect: "/archives/"
  },
  {
    name: "v-0668b58e",
    path: "/categories/",
    component: GlobalLayout,
    beforeEnter: (to, from, next) => {
      ensureAsyncComponentsLoaded("Layout", "v-0668b58e").then(next)
    },
  },
  {
    path: "/categories/index.html",
    redirect: "/categories/"
  },
  {
    path: "/@pages/categoriesPage.html",
    redirect: "/categories/"
  },
  {
    name: "v-5cc77b4b",
    path: "/web/",
    component: GlobalLayout,
    beforeEnter: (to, from, next) => {
      ensureAsyncComponentsLoaded("Layout", "v-5cc77b4b").then(next)
    },
  },
  {
    path: "/web/index.html",
    redirect: "/web/"
  },
  {
    path: "/00.目录页/01.mulu.html",
    redirect: "/web/"
  },
  {
    name: "v-47a072a4",
    path: "/pages/55c787/",
    component: GlobalLayout,
    beforeEnter: (to, from, next) => {
      ensureAsyncComponentsLoaded("Layout", "v-47a072a4").then(next)
    },
  },
  {
    path: "/pages/55c787/index.html",
    redirect: "/pages/55c787/"
  },
  {
    path: "/temp/temp.html",
    redirect: "/pages/55c787/"
  },
  {
    name: "v-bd57d5a4",
    path: "/tags/",
    component: GlobalLayout,
    beforeEnter: (to, from, next) => {
      ensureAsyncComponentsLoaded("Layout", "v-bd57d5a4").then(next)
    },
  },
  {
    path: "/tags/index.html",
    redirect: "/tags/"
  },
  {
    path: "/@pages/tagsPage.html",
    redirect: "/tags/"
  },
  {
    name: "v-3ba80acc",
    path: "/",
    component: GlobalLayout,
    beforeEnter: (to, from, next) => {
      ensureAsyncComponentsLoaded("Layout", "v-3ba80acc").then(next)
    },
  },
  {
    path: "/index.html",
    redirect: "/"
  },
  {
    name: "v-1f9426c7",
    path: "/pages/4a1aa6/",
    component: GlobalLayout,
    beforeEnter: (to, from, next) => {
      ensureAsyncComponentsLoaded("Layout", "v-1f9426c7").then(next)
    },
  },
  {
    path: "/pages/4a1aa6/index.html",
    redirect: "/pages/4a1aa6/"
  },
  {
    path: "/技术文档/01.橙子/02.如何实现帖子加密？.html",
    redirect: "/pages/4a1aa6/"
  },
  {
    name: "v-f939fd9a",
    path: "/pages/379b1e/",
    component: GlobalLayout,
    beforeEnter: (to, from, next) => {
      ensureAsyncComponentsLoaded("Layout", "v-f939fd9a").then(next)
    },
  },
  {
    path: "/pages/379b1e/index.html",
    redirect: "/pages/379b1e/"
  },
  {
    path: "/技术文档/00.公共文档/01.合伙人招募.html",
    redirect: "/pages/379b1e/"
  },
  {
    name: "v-427bd382",
    path: "/pages/czh01/",
    component: GlobalLayout,
    beforeEnter: (to, from, next) => {
      ensureAsyncComponentsLoaded("Layout", "v-427bd382").then(next)
    },
  },
  {
    path: "/pages/czh01/index.html",
    redirect: "/pages/czh01/"
  },
  {
    path: "/技术文档/01.橙子/01.使用指北.html",
    redirect: "/pages/czh01/"
  },
  {
    path: '*',
    component: GlobalLayout
  }
]