/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}
/**
 * 代理设置getset
 * @param {object} target 对象
 * @param {string} sourceKey 对象属性
 * @param {string} key 对象属性的属性
 */
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
/**
 * 初始化state
 * @param {*} vm
 */
export function initState (vm: Component) {
  // 初始化观察数组
  vm._watchers = []
  // 获取options
  const opts = vm.$options
  // 如果props存在，初始化props
  if (opts.props) initProps(vm, opts.props)
  // 如果methods存在，初始化methods
  if (opts.methods) initMethods(vm, opts.methods)
  // 如果data存在初始化data
  if (opts.data) {
    initData(vm)
  } else {
    // 不存在则设置为空对象并观察data对象
    observe(vm._data = {}, true /* asRootData */)
  }
  // 判断是否存在计算属性，初始化计算属性
  if (opts.computed) initComputed(vm, opts.computed)
  // 判断是否存在watch属性，初始化watch
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}
/**
 * 初始化props
 * @param {object} vm vue实例
 * @param {object} propsOptions 属性配置
 */
function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  // 存储propKey
  const keys = vm.$options._propKeys = []
  // 如果不存在$parent属性则代表其为根
  const isRoot = !vm.$parent
  // root instance props should be converted
  if (!isRoot) { // 如果非根实例
    // 关闭observe观察
    toggleObserving(false)
  }
  // 遍历props属性
  for (const key in propsOptions) {
    // 存储属性名
    keys.push(key)
    // 校验prop
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      // 将驼峰写法key转换成-分割key， 例如 propKey = prop-key
      const hyphenatedKey = hyphenate(key)
      // 如果为保留的属性名则警告错误
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      // 定义响应属性
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      // 定义响应属性
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    // 如果vm上不存在_props则挂载到_props属性上
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  //开启observe
  toggleObserving(true)
}
/**
 * 初始化data
 * @param {object} vm 实例
 */
function initData (vm: Component) {
  // 获取配置的data
  let data = vm.$options.data
  // 获取data，并且判断是否为方法，为方法则调用
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  // 如果data为非对象
  if (!isPlainObject(data)) {
    // 设置为对象
    data = {}
    // 非生产则报错
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  // 获取data的属性数组
  const keys = Object.keys(data)
  // 获取props属性
  const props = vm.$options.props
  // 获取方法
  const methods = vm.$options.methods
  // 获取data属性数量
  let i = keys.length
  // 遍历校验
  while (i--) {
    // 获取属性名
    const key = keys[i]
    // 如果非生产环境
    if (process.env.NODE_ENV !== 'production') {
      // 判断方法是否存在，并且判断data属性是否存在方法内，存在则报错
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    // 判断data的属性是否存在于props内，存在则报错
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
      // 如果属性值名开头不存在$或者_
    } else if (!isReserved(key)) {
      // 挂载到vm._data对象上
      proxy(vm, `_data`, key)
      console.log(vm._data.__ob__)
    }
  }
  // observe data
  // 观察对象
  observe(data, true /* asRootData */)
}
/**
 * data为对象时调用获取data
 * @param {Function} data data方法
 * @param {object} vm vue实例
 */
export function getData (data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  // 插入空的target用于停止依赖收集
  pushTarget()
  try {
    // 返回调用的data
    return data.call(vm, vm)
  } catch (e) {
    // 如果报错则报错
    handleError(e, vm, `data()`)
    return {}
  } finally {
    // 移除空的target
    popTarget()
  }
}
// 计算观察对象配置
const computedWatcherOptions = { lazy: true }
/**
 * 初始化计算属性
 * @param {object} vm vue实例
 * @param {object} computed 计算对象
 */
function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  // 初始化观察对象
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  // 判断是否为服务器渲染
  const isSSR = isServerRendering()
  // 遍历计算对象
  for (const key in computed) {
    // 获取对应计算属性的值
    const userDef = computed[key]
    // 判断值是否为方法，为方法的话则直接获取，否则获取.get
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    // 如果getter不存在，则报错
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }
    // 如果并非是服务器渲染
    if (!isSSR) {
      // create internal watcher for the computed property.
      // 为计算属性创建一个watcher，用于收集依赖
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    // 如果属性不在vm实例上
    if (!(key in vm)) {
      // 定义计算属性
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      // 非生产，如果key在data上
      if (key in vm.$data) {
        // 报错
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        // 如果在props上，报错
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}
/**
 * 定义计算属性
 * @param {object} target 对象
 * @param {string} key 属性
 * @param {*} userDef
 */
export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  // 判断是否需要缓存
  const shouldCache = !isServerRendering() // 判断是否非服务器渲染，非服务器渲染则需要缓存
  // 判断用户设置的值是否为方法
  if (typeof userDef === 'function') {
    /**
     * 如果为方法则设置将方法设置为get
     * 通过shouldCache判断是否需要缓存
     * 缓存用createComputedGetter(key)方法
     * 非缓存用createGetterInvoker(userDef)
     */
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    // 设置set方法为空
    sharedPropertyDefinition.set = noop
  } else {
    /**
     * 如果userDef并非是方法
     * 判断userDef是否设置get属性，没设置则设置为noop空，设置则继续
     * 判断是否需要缓存（shouldCache）并且用户是否设置（userDef.cache）需要缓存
     * 需要缓存则调用createComputedGetter(key)
     * 不需要缓存则调用createGetterInvoker(userDef.get)
     */
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    // 设置set方法，判断用户是否设置set方法，没设置则为空
    sharedPropertyDefinition.set = userDef.set || noop
  }
  // 判断当前环境是否非生产，并且如果set为空则当用户设置计算属性的值时则抛警告
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  // 设置对象属性
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
/**
 * 带缓存的计算属性get
 * @param {string} key 属性
 */
function createComputedGetter (key) {
  // 返回get方法
  return function computedGetter () {
    // 获取对应计算属性的watcher
    // 每个计算属性都会有一个watcher
    const watcher = this._computedWatchers && this._computedWatchers[key]
    // 判断是否有watcher
    if (watcher) {
      // 判断是否脏用于做缓存，在修改值的时候dirty为true
      if (watcher.dirty) {
        watcher.evaluate()
      }
      // 判断Dep.target是否有
      if (Dep.target) {
        // 将当前的watcher的依赖遍历再进行收集，用于在其他的watcher调用中使用
        watcher.depend()
      }
      // 返回watcher对应value
      return watcher.value
    }
  }
}
/**
 * 不带缓存的计算getter
 * createGetterInvoker(userDef.get)
 * @param {function} fn 方法
 */
function createGetterInvoker(fn) {
  // 返回对应方法
  return function computedGetter () {
    // 调用传入的get方法
    return fn.call(this, this)
  }
}
/**
 * 初始化methods
 * @param {object} vm vue实例
 * @param {object} methods 方法对象
 */
function initMethods (vm: Component, methods: Object) {
  // 获取配置options.props
  const props = vm.$options.props
  // 遍历方法属性
  for (const key in methods) {
    // 非生产环境
    if (process.env.NODE_ENV !== 'production') {
      // 如果对应属性类型非方法报警告
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      // 判断key是否存在props中，存在则报警告
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      // 判断key是否存在vm实例中，并且开头为_或者$则报警告
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    // 将方法挂载到vue实例上，并且重制方法上下文为vue
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}
/**
 * 初始化watch属性
 * @param {object} vm vue实例
 * @param {object} watch watch配置对象
 */
function initWatch (vm: Component, watch: Object) {
  // 遍历watch属性
  for (const key in watch) {
    // 获取watch属性值
    const handler = watch[key]
    // 判断值是否为数组
    if (Array.isArray(handler)) {
      // 遍历数组
      for (let i = 0; i < handler.length; i++) {
        // 创建watcher
        createWatcher(vm, key, handler[i])
      }
    } else {
      // 非数组则直接创建watcher
      createWatcher(vm, key, handler)
    }
  }
}
/**
 * 创建watcher
 * @param {object} vm vue实例
 * @param {string | Function} expOrFn 观察的属性或者方法
 * @param {any} handler 触发方法
 * @param {object} options watcher配置
 */
function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  // 判断触发方法是否为对象
  if (isPlainObject(handler)) {
    // 为对象则赋值给options
    options = handler
    // 将配置里的handler赋值给handler
    handler = handler.handler
  }
  // 如果handler为字符串则代表其为一个定义的方法
  if (typeof handler === 'string') {
    // 获取vm对应handler的方法
    handler = vm[handler]
  }
  // 调用watch方法
  return vm.$watch(expOrFn, handler, options)
}
/**
 * 状态mixin
 * @param {*} Vue
 */
export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  // 创建data的描述服
  const dataDef = {}
  // 创建data的getter 返回_data
  dataDef.get = function () { return this._data }
  // 创建prop的描述符
  const propsDef = {}
  // 创建props的getter，返回_props
  propsDef.get = function () { return this._props }
  // 在非生产环境
  if (process.env.NODE_ENV !== 'production') {
    // 创建data的setter，如果重写data则报错
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    // 重写prop报错
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  // 为Vue原型对象上定义$data和$props属性，描述符为以上
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)
  // 挂载set方法
  Vue.prototype.$set = set
  // 挂载delete方法
  Vue.prototype.$delete = del
  /**
   * 挂载watch方法
   * @param {string | Function} expOrFn 观察的属性或者方法
   * @param {any} cb 回调
   * @param {object} options watcher配置
   */
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    // 获取当前实例
    const vm: Component = this
    // 如果cb为一个对象
    if (isPlainObject(cb)) {
      // 则递归创建watcher,将cb设置为options
      return createWatcher(vm, expOrFn, cb, options)
    }
    // 获取options配置
    options = options || {}
    // user为true，代表为用户设置
    options.user = true
    // 创建watcher对象
    const watcher = new Watcher(vm, expOrFn, cb, options)
    // 如果immediate属性为true
    if (options.immediate) {
      try {
        // 先调用一次
        cb.call(vm, watcher.value)
      } catch (error) {
        // 拦截错误
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }
    // 返回一个移除watcher的方法
    return function unwatchFn () {
      // 删除自身绑定依赖关系
      watcher.teardown()
    }
  }
}
