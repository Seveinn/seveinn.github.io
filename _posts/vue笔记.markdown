---
layout: mypost
title:  "前端面试整理"
date:   2021-03-23 14:07:24 +0800
categories: ['前端', '面试']
---

[toc]

# 面试题
#### v-show和v-if的区别
```
v-show 通过控制css的display属性来控制节点的显示
v-if 动态地插入和销毁节点
```

#### v-for中为何要用key
```
vue会根据数据生成虚拟DOM，key作为索引值，当数据更新时，如果key值没有变，会复用之前的DOM，可能导致视图无法及时更新

如果列表仅作渲染展示，可以用Index作为key值
如果列表需要进行排序、增删等操作，最好使用ID等唯一标识
```

#### Vue组件生命周期（有父子组件的情况）
#### 组件通讯
```
父子组件通信 传参，比如： props和$emit
无关组件通信 操作公用的数据池，比如vuex、缓存等
```
#### 组件的渲染和更新过程
#### 双向数据绑定 v-model的实现原理

# Vue3
#### Vue3 Options API -> React class component
#### Vue3 Composition API -> React Hooks

# Vue的使用
## vue-cli

## 基本使用
#### 插值、表达式指令、动态属性v-html（会有xss风险，会覆盖子组件）
```html
   <p>文本插值 {{message}}</p>
        <p>JS 表达式 {{ flag ? 'yes' : 'no' }} （只能是表达式，不能是 js 语句）</p>

        <p :id="dynamicId">动态属性 id</p>

        <hr/>
        <p v-html="rawHtml">
            <span>有 xss 风险</span>
            <span>【注意】使用 v-html 之后，将会覆盖子元素</span>
        </p>

```
#### computed和watch
computed有缓存，data不变则不会重新计算
watch如何深度监听，监听引用类型，拿不到oldVal
```js
<script>
export default {
    data() {
        return {
            //值类型
            name: '双越', 
            // 对象，引用类型
            info: {
                city: '北京'
            }
        }
    },
    watch: {
        name(oldVal, val) {
            // eslint-disable-next-line
            console.log('watch name', oldVal, val) // 值类型，可正常拿到 oldVal 和 val
        },
        info: {
            handler(oldVal, val) {
                // eslint-disable-next-line
                console.log('watch info', oldVal, val) // 引用类型，拿不到 oldVal 。因为指针相同，此时已经指向了新的 val
            },
            deep: true // 深度监听
        }
    }
}
</script>
```

#### class和style
class: 
- 对象的方式——条件为真时应用变量对应的类名
- 数组的方式——同时应用数组中元素变量对应的类名

style:
应用变量对应的样式对象


```html
<template>
    <div>
        <p :class="{ black: isBlack, yellow: isYellow }">使用 class</p>
        <p :class="[black, yellow]">使用 class （数组）</p>
        <p :style="styleData">使用 style</p>
    </div>
</template>
```

```js
<script>
export default {
    data() {
        return {
            isBlack: true,
            isYellow: true,

            black: 'black',
            yellow: 'yellow',

            styleData: {
                fontSize: '40px', // 转换为驼峰式
                color: 'red',
                backgroundColor: '#ccc' // 转换为驼峰式
            }
        }
    }
}
</script>
```
```css
<style scoped>
    .black {
        background-color: #999;
    }
    .yellow {
        color: yellow;
    }
</style>
```

#### 条件渲染
v-if和v-else的用法，可以使用变量和表达式
v-if和v-show的区别
v-if和v-show的使用场景

```
v-if 为真渲染节点，为假，不渲染节点
v-show 通过控制css的display属性来控制节点的显示
```

```html
<template>
    <div>
        <p v-if="type === 'a'">A</p>
        <p v-else-if="type === 'b'">B</p>
        <p v-else>other</p>

        <p v-show="type === 'a'">A by v-show</p>
        <p v-show="type === 'b'">B by v-show</p>
    </div>
</template>
```

#### 循环列表渲染
如何遍历对象
key的重要性
v-for和v-if的优先级：不能同时使用，v-for的优先级更高

```html
<p>遍历数组</p>
<ul>
    <li v-for="(item, index) in listArr" :key="item.id">
        {{index}} - {{item.id}} - {{item.title}}
    </li>
</ul>

<p>遍历对象</p>
<ul >
    <li v-for="(val, key, index) in listObj" :key="key">
        {{index}} - {{key}} -  {{val.title}}
    </li>
</ul>
```

```js
    listArr: [
        { id: 'a', title: '标题1' }, // 数据结构中，最好有 id ，方便使用 key
        { id: 'b', title: '标题2' },
        { id: 'c', title: '标题3' }
    ],
    listObj: {
        a: { title: '标题1' },
        b: { title: '标题2' },
        c: { title: '标题3' },
    }

```

#### 事件
event参数，自定义参数
```
// 1. event 是原生的
// 2. 事件被挂载到当前元素
// 和 DOM 事件一样
```
```html
<p>{{num}}</p>
<button @click="increment1">+1</button>
<button @click="increment2(2, $event)">+2</button> //传入参数和事件
```
```js
 methods: {
    increment1(event) {
        // eslint-disable-next-line
        console.log('event', event, event.__proto__.constructor) // 是原生的 event 对象
        // eslint-disable-next-line
        console.log(event.target)
        // eslint-disable-next-line
        console.log(event.currentTarget) // 注意，事件是被注册到当前元素的，和 React 不一样
        this.num++

        // 1. event 是原生的
        // 2. 事件被挂载到当前元素
        // 和 DOM 事件一样
    },
    increment2(val, event) {
        // eslint-disable-next-line
        console.log(event.target)
        this.num = this.num + val
    },
    loadHandler() {
        // do some thing
    }
},
```
事件修饰符，按键修饰符
【观察】事件被绑定到哪里

#### 表单
v-model
常见表单项 textarea, checkbox, radio, select
修饰符 lazy, number, trim

## 组件使用
父子组件通信
- 父组件 通过属性传递数据给子组件
- 子组件 通过$emit触发事件，同时携带参数给父组件，父组件监听子组件抛出的事件，同时接收参数进行处理

## 自定义事件
兄弟组件通信
绑定自定义事件，分别触发该自定义事件，同时携带参数，在事件执行的时候即可通过参数拿到其他组件中的数据

## 注意点
beforeDestory中：对自定义事件进行解绑，及时销毁，以免造成内存泄漏

## 组件生命周期
### 单个组件
挂载阶段
beforeCreated
created 实例初始化完成
beforeMount
mounted DOM渲染完成

更新阶段
beforeUpdate
updated
 
销毁阶段
beforeDestory 解除绑定，销毁子组件和事件监听器

### 父子组件
|-- Index
|-----  List
|-----  Input
 
#### 实例初始化       
- 父组件先实例化->子组件实例化

#### DOM渲染         
- 子组件渲染完成->父组件渲染完成

#### 组件更新
看事件和数据的处理逻辑，以$emit为例，
更新时，子组件抛出事件，父组件接收并更改自己的数据，
- 父组件先更新->子组件接收参数->子组件更新

数据更新后开始根据更新后的数据渲染更新，
- 子组件渲染更新->父组件渲染更新


## 高级特性
### 自定义v-model,如：颜色选择器
主要原理，在自定义的组件中，对 **input标签** 绑定动态属性，同时监听该属性，监听到的属性值通过$emit事件传参抛出，在父组件中进行接收

```html
<template>
    <!-- 例如：vue 颜色选择 -->
    <input type="text"
        :value="text1"
        @input="$emit('change1', $event.target.value)"
    >
    <!--
        1. 上面的 input 使用了 :value 而不是 v-model
        2. 上面的 change1 和 model.event1 要对应起来
        3. text1 属性对应起来
    -->
</template>

<script>
export default {
    model: {
        prop: 'text1', // 对应 props text1
        event: 'change1'
    },
    props: {
        text1: String,
        default() {
            return ''
        }
    }
}
</script>
```

### $nextTick（DOM渲染完成后被触发）
Vue是异步渲染的，即data改变后，DOM不会立即渲染，如果要获取到最新的节点信息，可在$nextTick中进行操作

```js
 addItem() {
        this.list.push(`${Date.now()}`)
        this.list.push(`${Date.now()}`)
        this.list.push(`${Date.now()}`)

        // 1. 异步渲染，$nextTick 待 DOM 渲染完再回调
        // 3. 页面渲染时会将 data 的修改做整合，多次 data 修改只会渲染一次
        this.$nextTick(() => {
          // 获取 DOM 元素
          const ulElem = this.$refs.ul1
          // eslint-disable-next-line
          console.log( ulElem.childNodes.length )
        })
    }
  }
```

### slot（父组件往子组件中插入内容）
#### 基本使用
父组件
```html
<SlotDemo :url="website.url">
    {{website.url}}
</SlotDemo>
```
子组件
```html
<template>
    <a :href="url">
        <slot>
            默认内容，即父组件没设置内容时，这里显示
        </slot>
    </a>
</template>
```

#### 作用域插槽
在父组件中插入内容到子组件，内容模板由子组件作用域中的数据来定
父组件
```html
 <ScopedSlotDemo :url="website.url">
    <template v-slot="slotProps">
        {{slotProps.slotData.title}}
    </template>
</ScopedSlotDemo>
```
子组件
```html
<template>
    <a :href="url">
        <slot :slotData="website">
            {{website.subTitle}} <!-- 默认值显示 subTitle ，即父组件不传内容时 -->
        </slot>
    </a>
</template>
```

#### 具名插槽
具体往子组件中插入什么内容根据名字来定


### 动态组件
:is="component-name"
需要根据数据来确定要渲染的组件的类型的情况,可遍历对象或数组循环生成动态组件
```html
<component :is="NextTickName"/>
```
```js
   return {
        NextTickName: "NextTick",
        }
    }
```

### 异步组件
import()函数
按需加载，异步加载大组件(在用到的时候才加载)
```html
<FormDemo v-if="showFormDemo"/>
```
```js
components: {
    FormDemo: () => import('../BaseUse/FormDemo'),
},
```

### keep-alive (Vue常见性能优化)
缓存组件
频繁切换，不需要重复渲染
如：TAB切换，在没有缓存的情况下，每次切换都会触发旧组件的销毁和新组建的挂载，有缓存就只会触发组件的第一次挂载

### mixin
多个组件有相同的逻辑，可以抽离出来
mixin不是完美的解决方案，会有一些问题，Vue3提出的CompositionAPI旨在解决这些问题
问题：
- 变量来源不明确
- 多个mixin可能造成命名冲突
- mixin和组件可能出现多对多关系，复杂度较高

### 总结


## Vuex
state
getters
action 可执行异步操作（读缓存，请求后端API）
mutation

dispatch
commit
mapState
mapGetters
mapActions
mapMutations

## Vue-router
路由相关参数 this.$route
### 路由模式 
hash 
H5 history 
- 需要后端server支持，无特殊需求，可选择hash模式
- 后端配置原理：无论访问什么路径，都默认返回index文件，问题：无法返回404页面，须单独配置

#### 路由配置 
动态路由 import函数
懒加载

## Vue使用-总结


# Vue原理

## 组件化
组件化基础
“很久以前”的组件化
asp jsp php
nodejs

数据驱动视图（框架本身实现了从数据到DOM的渲染，我们只需关注数据和业务逻辑）
- 传统组件，只是静态渲染，更新依赖于操作DOM（->催生了JQuery, 方便DOM操作）
- 数据驱动视图 —— React setState
- 数据驱动试图 —— Vue MVVM
```
view    ViewModel           Model
 |      DOMListener           |
DOM     Directives          Plain Javascript Objects
            |
           Vue

View 视图
Model 数据
ViewModel   视图和数据之间的连接，包括事件监听，指令执行等
```

## 响应式
data数据变化->立即触发视图的更新
核心API - Object.defineProperty
<!-- 基本原理 -->
```js
// 原理
const data = {};
const name = "zhangsan";
Object.defineProperty(data, "name", {
    get: function () {
        console.log('get');
        retuern name;
    },
    set: function (newVal) {
        console.log('set');
        name = newVal;
    }
})

```
```js
// 测试
console.log(data.name);
data.name = 'lisi';
```
<!-- 更进一步 -->
- 监听对象，数组
- 复杂对象的监听，深度监听
- 几个缺点
```
深度监听，需要递归到底，一次性计算量大
无法监听新增、删除属性（Vue.set Vue.delete)
```

```js

// 重新定义数组原型
const oldArrayProperty = Array.prototype;
// 创建新的对象，原型只想oldArrayProperty,再扩展的方法不会影响原型
const arrProto = Object.create(oldArrayProperty);
['push', 'pop','shift', 'unshift', 'slice'].forEach(methodName => {
    arrProto[methodName] = function () {
        updateView();
        oldArrayProperty[methodName].call(this, ...arguments);
    }
})


function observer(target) {
    if(typeof target !== 'object' || target == null) {
        return target;
    } 

    if(Array.isArray(target)) {
        target.__proto__ = arrProto;
    }

    for(let key in target) {
        defineReactive(target, key, target[key]);
    }
}

function defineReactive(target, key, value) {
    //深度监听(监听属性值)
    observer(value);

    Object.defineProperty(target, key, {
        get: function () {
            return value;
        },
        set: function (newVal) {
            if(value !== newVal) {
                // 深度监听
                observer(value);

                value = newVal;
                updateView();
            }
        }
    })
}

function updateView() {
    console.log('视图更新');
}

const data = {
    name: 'zhangsan',
    age: 21,
    info: {
        address: 'beijing',
    },
    nums: [1, 3, 4],
}

observer(data);
```
Proxy有兼容性问题，无法polyfill

## composition API
setup
```
beforeCreate之后调用
```
ref和reactive
```
ref 基础类型变量的响应式
reactive 引用类型变量的响应式
```

## vdom和diff
vdom 是实现vue和React的重要基石
diff算法是vdom中最核心、最关键的部分
热门

DOM 操作耗费性能
JQuery自行控制DOM操作


DOM操作 -> JS计算，用JS模拟DOM结构，计算出最小的变更 -> 操作DOM

### JS模拟DOM结构 -> vnode
```html
<div id="div1" class="container">
    <p>vdom</p>
    <ul style="font-size: 20px">
        <li>a</li>
    </ul>
</div>
```
```js
 {
    tag: 'div',
    props: {
        className: 'container',
        id: 'div1',
    },
    children: [
        {
            tag: 'p',
            children: 'vdom',
        },
        {
            tag: 'ul',
            props: {
                style: 'font-size: 20px',
            },
            children: [
                {
                    tag: 'li',
                    children: 'a',
                },
            ]
        },
    ]

}
```

### 通过snabbdom学习vdom
基本原理
- 定义渲染函数
- 生成vnode(调用渲染函数，传入标签、属性、子元素等参数)
- 利用patch初始化、更新、销毁DOM

```js
const container = document.getElementById('container')

const vnode = h('div#container.two.classes', { on: { click: someFn } }, [
  h('span', { style: { fontWeight: 'bold' } }, 'This is bold'),
  ' and this is just normal text',
  h('a', { props: { href: '/foo' } }, 'I\'ll take you places!')
])
// Patch into empty DOM element – this modifies the DOM as a side effect
patch(container, vnode)

const newVnode = h('div#container.two.classes', { on: { click: anotherEventHandler } }, [
  h('span', { style: { fontWeight: 'normal', fontStyle: 'italic' } }, 'This is now italic type'),
  ' and this is still just normal text',
  h('a', { props: { href: '/bar' } }, 'I\'ll take you places!')
])
// Second `patch` invocation
patch(vnode, newVnode) // Snabbdom efficiently updates the old view to the new state

```

总结
- JS模拟DOM结构（vnode)
- 对比新旧vnode，得出最小更新范围，最后更新DOM
- 数据驱动视图模式下，可有效控制DOM操作

### diff算法
1. 比较两个对象的diff —— jiff开源库
2. 树diff的时间复杂度 —— O(n^3) 不可用
3. 将事件复杂度优化到O(n)
- 只比较同一层级，不跨级比较
- tag不相同，直接删除重建，不再深度比较
- tag和key,两者都相同，则认为是相同节点，不再深度比较

patch方法核心
- 比较新旧节点
    a. 旧节点为空，直接增加新节点
    b. 新旧节点相同，执行patchVnode
    c. 新旧节点不同，删除旧节点，增加新节点
- patchVnode方法核心
oldVnode    ->  childNode or text
newVnode    ->  childNode or text
```js
    // 1. 新节点不是text节点
    if (isUndef(vnode.text)) {

      // a. 新旧节点都有子节点 
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue)

      // b. 新节点有子节点
      } else if (isDef(ch)) {
        if (isDef(oldVnode.text)) api.setTextContent(elm, '')
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)

      // c. 旧节点有子节点
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)

      // d. 旧节点为text节点
      } else if (isDef(oldVnode.text)) {
        api.setTextContent(elm, '')
        }

    // 2. 新节点是text节点
    } else if (oldVnode.text !== vnode.text) {
      if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      }
      api.setTextContent(elm, vnode.text!)
    }
```

- updateChildren方法核心
startOldNode ---- endOldNode
startNewNode ---- endNewNode
开始和开始对比
开始和结束对比
结束和开始对比
结束和结束对比
a. 如果是相同节点，调用patchVnode
b. 都不命中，对比旧节点中是否有与新节点key值相同的节点，有，进一步比较sel，是相同节点则调用patchVnode,不是则直接插入新节点
```js
    // 开始和开始
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]

        // 结束和结束
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]

        // 开始和结束
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue)
        api.insertBefore(parentElm, oldStartVnode.elm!, api.nextSibling(oldEndVnode.elm!))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]

        // 结束和开始
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue)
        api.insertBefore(parentElm, oldEndVnode.elm!, oldStartVnode.elm!)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]

      } else {
        // 都未命中
        if (oldKeyToIdx === undefined) {
          oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        }
        // 比较新节点的key和旧节点的key
        idxInOld = oldKeyToIdx[newStartVnode.key as string]

        // 没有key能对应的节点，插入新节点
        if (isUndef(idxInOld)) { // New element
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm!)
        } else {
          // key能对应上，判断sel是否相等->判断是否是同一个节点
          elmToMove = oldCh[idxInOld]
          // 不同，插入新节点
          if (elmToMove.sel !== newStartVnode.sel) {
            api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm!)
          } else {
            // 相同，调用patchVnode
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue)
            oldCh[idxInOld] = undefined as any
            api.insertBefore(parentElm, elmToMove.elm!, oldStartVnode.elm!)
          }
        }
        newStartVnode = newCh[++newStartIdx]
      }
```



## 模板编译
- vue template complier 将模板编译为render函数
- 执行render函数生成vnode

with语法
```js
const obj = {
    a: '1',
}
with(obj) {
    // 会找obj的属性a和c
    console.log(a);
    console.log(c); //报错
}
```
```
改变{}内自由变量的查找规则，当作obj属性来查找
如果找不到匹配的属性，报错
慎用，打破了作用域规则，易读性变差
```

## 渲染过程
## 前端路由