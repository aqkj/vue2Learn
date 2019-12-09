import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

initGlobalAPI(Vue)
// 判断是否是服务器环境
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})
// ssr服务器渲染上下文
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  // 函数渲染上下文
  value: FunctionalRenderContext
})
// 版本
Vue.version = '__VERSION__'

export default Vue
