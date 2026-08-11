---
layout: mypost
title:  "Vue 基本使用"
date:   2021-03-24 14:07:24 +0800
categories: ['前端', '面试', 'Vue']
---

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
