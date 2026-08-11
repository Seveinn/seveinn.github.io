---
layout: mypost
title:  "前端面试——Vue3 真题"
date:   2021-03-27 15:07:24 +0800
categories: ['前端', '面试', 'Vue', '真题', ]
---

## Vue3 比 Vue2 有什么优势
- **性能更好**
- 体积更小
- 更好的TS支持
- 更好的代码组织
- 更好的逻辑抽离
- 更多的新功能

## Vue3 生命周期
### Options API 生命周期
- beforeDestroy -> beforeUnmount
- destroyed -> unmounted
- 其他沿用Vue2的生命周期

### Composition Api生命周期
- setup
- onBeforeMount
- onBeforeMounted
- onBeforeUpdate
- onUpdated
- onBeforeUnmount
- onUnmounted

## Composition API 和 Options API 对比
### Composition API 带来了什么
- 更好的代码组织
- 更好的逻辑复用
- 更好的类型推导
### 如何选择
- 不建议共用，会引起混乱
- 小型项目、业务逻辑简单，用Options API
- 中大型项目、逻辑复杂，用Composition API
### 不要误解Composition API
- 高阶技巧
- 为解决复杂逻辑而设计
- 类似于React Hooks在React中的地位

## ref toRef toRefs
### ref (生成一个响应式的变量)
- 生成值类型的响应式数据
- 可用于模板和reactive
- 通过.value修改值
```html
<template>
    <p>ref demo {{ageRef}} {{state.name}}</p>
</template>

<script>
import { ref, reactive } from 'vue'

export default {
    name: 'Ref',
    setup() {
        const ageRef = ref(20) // 值类型 响应式
        const nameRef = ref('双越')

        const state = reactive({
            name: nameRef
        })

        setTimeout(() => {
            console.log('ageRef', ageRef.value)

            ageRef.value = 25 // .value 修改值
            nameRef.value = '双越A'
        }, 1500);

        return {
            ageRef,
            state
        }
    }
}
</script>
```

```html
<template>
    <p ref="elemRef">我是一行文字</p>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
    name: 'RefTemplate',
    setup() {
        const elemRef = ref(null)

        onMounted(() => {
            console.log('ref template', elemRef.value.innerHTML, elemRef.value)
        })

        return {
            elemRef
        }
    }
}
</script>
```

### toRef (将响应式对象中的某个属性转换为响应式)
- 针对一个响应式对象(reactive封装)的prop
- 创建一个ref,具有响应式
- 两者保持引用关系
```html
<template>
    <p>toRef demo - {{ageRef}} - {{state.name}} {{state.age}}</p>
</template>

<script>
import { ref, toRef, reactive } from 'vue'

export default {
    name: 'ToRef',
    setup() {
        const state = reactive({
            age: 20,
            name: '双越'
        })

        const ageRef = toRef(state, 'age')

        setTimeout(() => {
            state.age = 25
        }, 1500)

        setTimeout(() => {
            ageRef.value = 30 // .value 修改值
        }, 3000)

        return {
            state,
            ageRef
        }
    }
}
</script>
```

### toRefs
- 将响应式对象(reactive封装)转换为普通对象
- 对象的每个prop都是对应的ref
- 两者保持引用关系
- 可以在不破坏对象属性的响应式的情况下解构出对应的属性值
```HTML
<template>
    <p>toRefs demo {{age}} {{name}}</p>
</template>

<script>
import { ref, toRef, toRefs, reactive } from 'vue'

export default {
    name: 'ToRefs',
    setup() {
        const state = reactive({
            age: 20,
            name: '双越'
        })

        const stateAsRefs = toRefs(state) // 将响应式对象，变成普通对象

        setTimeout(() => {
            state.age = 25
        }, 1500)

        return stateAsRefs
    }
}
</script>
```


### 最佳使用方式(将响应式对象中所有属性转换为响应式)
- 用reactive做对象的响应式，用ref做值类型响应式
- setup中返回toRefs(state),或者toRef(state, 'xxx')
- ref的变量命名用xxxRef
- 合成函数返回响应式对象时，使用toRefs

### 进阶，深入理解
#### 为何需要ref
- 返回值类型，会丢失响应式
- 如在setup,computed,合成函数，都有可能返回值类型
- Vue如果不定义ref,用户将自造ref,反而混乱 

#### 为何需要.value
- ref是一个对象（不丢失响应式），value存储值
- 通过.value属性的get和set实现响应式
- 用于模板、reactive时（会经过vue自身的编译，vue可自动识别转换成.value），不需要.value,其他情况都需要

#### 为何需要toRef toRefs
- 初衷：不丢失响应式的情况下，把对象数据分解/扩散
- 前提：针对响应式对象(reactive封装)，非普通对象
- 注意：不是创造响应式，而是延续响应式

## Vue3升级了哪些重要的功能
- createAPP——vue初始化方法
- emits属性——子组件抛出事件新增配置
- 生命周期——销毁更改为unmount
- 多事件——元素可以绑定多个事件
- Fragement——片元，模板中可以写多个元素
- 移除.Sync Vue2中父组件和子组件某个属性的双向绑定(语法糖) -> Vue3 v-model:age="age"
- 异步组件的写法——新增异步组件引入的方法
- 移除filter
- Teleport——传送，挂载全局组件到body
- Suspense——延迟，利用插槽实现了组件异步加载的loading状态
- Composition API
```
- reactive
- ref相关
- readonly
- watch和watchEffect
- setup
- 生命周期钩子函数
```

## Composition API 如何实现代码逻辑复用
- 抽离逻辑代码到一个函数
- 函数命名约定为useXXX格式
- 在setup中引用useXXX函数

## Vue3如何实现响应式
### Object.defineProperty的缺点
- 深度监听需要一次性递归
- 无法监听新增/删除属性（需要使用Vue.set Vue.delete）
- 无法监听原生数组，需要特殊处理（定义新的数组原型并扩展数组方法）

### Proxy实现响应式
```JS
// const data = {
//     age: 20,
//     name: 'xxx',
// }

const data = ['a', 'b', 'c'];

const proxyData = new Proxy(data, {
    get(target, key, receiver) {
        const result = Reflect.get(target, key, receiver);

        // 只打印本身的，非原型上的属性
        const ownKeys = Reflect.ownKeys(target);
        if(ownKeys.includes(key)) {
            console.log('get', key);
        }
        return result; //返回结果
    },
    set(target, key, val, receiver) {
        // 重复的数据不处理
        const oldVal = target[key];
        if(val === oldVal) {
            return true;
        }

        const result = Reflect.set(target, key, val, receiver);
        console.log('set', key, val);
        console.log('result', result);
        return result; //是否设置成功
    },
    deleteProperty(target, key) {
        const result = Reflect.deleteProperty(target, key);
        console.log('delete property', key);
        console.log('result', result);
        return result; //是否删除成功
    }
})

// proxyData.age = 23;

proxyData.push('d');
```

Reflect作用
- 和Proxy能力一一对应
- 规范化、标准化、函数式
- 代替Object上的工具函数

```JS
function reactive(target = {}) {
    if(typeof target !== "object" || target == null) {
        return target;
    }

    const proxyConf = {
        get(target, key, receiver) {
            const result = Reflect.get(target, key, receiver);
    
            // 只打印本身的，非原型上的属性
            const ownKeys = Reflect.ownKeys(target);
            if(ownKeys.includes(key)) {
                console.log('get', key);
            }

            // 深度监听
            return reactive(result); //返回结果
        },
        set(target, key, val, receiver) {
            // 重复的数据不处理
            const oldVal = target[key];
            if(val === oldVal) {
                return true;
            }

            const ownKeys = Reflect.ownKeys(target);
            if(ownKeys.includes(key)) {
                console.log('已有的key');
            } else {
                console.log('新增的key');
            }
    
            const result = Reflect.set(target, key, val, receiver);
            console.log('set', key, val);
            console.log('result', result);
            return result; //是否设置成功
        },
        deleteProperty(target, key) {
            const result = Reflect.deleteProperty(target, key);
            console.log('delete property', key);
            console.log('result', result);
            return result; //是否删除成功
        }
    }

    return new Proxy(data, proxyConf);
}

const proxyData = reactive(data);
```

- 深度监听设置在get中，只有用到的时候才会触发深度监听，性能更好
- 在set中利用Relect.ownkeys判断是不是已有的key，可实现监听新增和删除属性
- Reflect本身即可监听数组的变化
- 无法兼容所有浏览器，无法polyfill

## watch 和 watchEffect 的区别
- 两者都可监听data属性变化
- watch 需要明确监听哪个属性
- watchEffect会根据其中的属性，自动监听其变化

### watch监听响应式变量
```JS
    const numberRef = ref(100)
    const state = reactive({
        name: '双越',
        age: 20
    })
        
    watch(
        numberRef, 
        (newNumber, oldNumber) => {
            console.log('ref watch', newNumber, oldNumber)
        }
        // , {
        //     immediate: true // 初始化之前就监听，可选
        // }
    )
    watch(
        // 第一个参数，确定要监听哪个属性
        () => state.age,

        // 第二个参数，回调函数
        (newAge, oldAge) => {
            console.log('state watch', newAge, oldAge)
        },

        // 第三个参数，配置项
        {
            immediate: true, // 初始化之前就监听，可选
            // deep: true // 深度监听
        }
    )
```

### watchEffect
初始化时会执行一次，收集要监听的数据，数据更改会触发对应的监听（不用手动指定依赖）
```JS
 watchEffect(() => {
            // 初始化时，一定会执行一次（收集要监听的数据）
            console.log('hello watchEffect')
        })
        watchEffect(() => {
            console.log('state.name', state.name)
        })
        watchEffect(() => {
            console.log('state.age', state.age)
        })
        watchEffect(() => {
            console.log('state.age', state.age)
            console.log('state.name', state.name)
        })
```

## setup 中如何获取组件实例
- 在setup和其他Composition API中没有this
- 可通过getCurrentIntance获取实例
- 若使用Options API可照常使用this

## Vue3 为何比 Vue2 快
- Proxy响应式
- PatchFlag
- hoistStatic
- cacheHandler
- SSR优化
- tree-shaking

### PatchFlag
- 编译模板时，动态节点做标记
- 标记时区分不同的类型，如 TEXT, PROPS
- diff算法时，可以区分静态节点和其他不同类型的节点

### hoistStatic
- 将静态节点的定义，提升到父作用域缓存起来
- 多个相邻的静态节点会被合并起来
- 典型的拿空间换时间的优化策略

### cacheHandler
- 缓存事件

### SSR优化
- 静态节点直接输出，绕过了vdom
- 动态节点，还是需要动态渲染

### tree-shaking
- 编译时，根据不同的情况引入不同的API

## Vite 是什么
- 一个前端打包工具
- 优势：开发环境下使用ES6 Module, 无需打包，启动快
- 生产环境下使用rollup, 不会快很多

```HTML
<body>
    <p>动态引入</p>
    <button id="btn1">load1</button>
    <button id="btn2">load2</button>

    <script type="module">
        document.getElementById('btn1').addEventListener('click', async () => {
            const add = await import('./src/add.js')
            const res = add.default(1, 2)
            console.log('add res', res)
        })
        document.getElementById('btn2').addEventListener('click', async () => {
            const { add, multi } = await import('./src/math.js')
            console.log('add res', add(10, 20))
            console.log('multi res', multi(10, 20))
        })
    </script>
</body>
```

## Compositon API 和 React Hooks 的对比
| Compositon API      | React Hooks |
| ----------- | ----------- |
| setup只会被调用一次      | 函数会被多次调用      |
| 无需使用useMemo,useCallback   |         |
| 无需考虑调用顺序   |  须保证hooks顺序一致       |
| reactive+ref更难理解   |  useState更好理解       |