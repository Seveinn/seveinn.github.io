---
layout: mypost
title:  "Vue 原理"
date:   2021-03-24 14:07:24 +0800
categories: ['前端', '面试', 'Vue']
---

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
- 基于vnode再执行patch和diff
- 使用webpack vue-loader,会在开发环境下编译模板
- vue组件可以用render代替template

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

_c createElement  --- h函数   ->   返回vnode

vue源码中编译用到的函数
```js
// // 从 vue 源码中找到缩写函数的含义
function installRenderHelpers (target) {
    target._o = markOnce;
    target._n = toNumber;
    target._s = toString;
    target._l = renderList;
    target._t = renderSlot;
    target._q = looseEqual;
    target._i = looseIndexOf;
    target._m = renderStatic;
    target._f = resolveFilter;
    target._k = checkKeyCodes;
    target._b = bindObjectProps;
    target._v = createTextVNode;
    target._e = createEmptyVNode;
    target._u = resolveScopedSlots;
    target._g = bindObjectListeners;
    target._d = bindDynamicKeys;
    target._p = prependModifier;
}
```

模板编译示例：
```js
const template = `<p>{{message}}</p>`

const res = compiler.compile(template)
console.log(res.render)

/***返回***/
with(this)
{return createElement('p',
              [createTextVNode(toString(message))]
              )
}

```

## 组件渲染/更新过程
- 响应式：
  1. 利用difineProperty监听，传入要监听的对象、属性、getter和setter函数
  2. getter函数取值，setter函数赋值
  3. 在监听属性的同时，对值进行监听，实现深度监听
  4. 重新定义数组原型并扩展其原型链上的方法，实现数组的响应式
  5. 关键函数 
    defineReactive(target, key, value) 
    observer(target)
    updateView()

- 模板编译：
  1. 引入vue-template-compiler，将模板编译成render函数
  2. 执行render函数，生成vnode
  3. 利用patch和diff实现vnode的更新，从而实现视图的更新和渲染

- vdom
  1. patch(elem, vnode)
  2. patch(vnode, newVnode)

### 初次渲染
1. 解析模板为render函数（一般在开发环境下打包完成，少数demo在浏览器运行时完成）
2. 触发响应式（监听data的属性 getter setter——初次渲染暂未触发）
3. 执行render函数，生成vnode, patch(elem, vnode)

### 更新
1. 修改data，触发setter(之前初次渲染阶段getter已被监听)
2. 重新执行render函数，生成newVnode
3. patch(vnode, newVnode)

![vue渲染更新全流程](vue-render-flow.jpg)

<img src="./posts/2021/03/26/vue-render-flow.jpg" alt="vue渲染更新全流程" title="vue渲染更新全流程">

### 异步渲染
- $nextTick 渲染完成后的回调函数，可以第一时间拿到最新的DOM
- data的修改会被汇总，一次性更新视图
- 减少DOM操作次数，提高性能

## 前端路由
利用关键函数，监控到路由变化（hash, path）时，根据监控到的路由实现相应组件的渲染

### 网页url组成
例：http://127.0.0.1:8881/01-hash.html?a=100&b=20#/aaa/bbb

| 组成      | 示例 |
| ----------- | ----------- |
| protocal      | http:       |
| hostname   | 127.0.0.1        |
| host   | 127.0.0.1:8881        |
| port   | 8881        |
| pathname   | 01-hash.html        |
| search   | ?a=100&b=20        |
| hash   | #/aaa/bbb        |

### hash的特点
- hash 变化会触发页面跳转
- hash 变化不会刷新页面，SPA必需的特点
- hash 永远不会提交到server端（前端自生自灭）

关键原理
```js
// hash 变化，包括：
// a. JS 修改 url
// b. 手动修改 url 的 hash
// c. 浏览器前进、后退
window.onhashchange = (event) => {
    console.log('old url', event.oldURL)
    console.log('new url', event.newURL)

    console.log('hash:', location.hash)
}
```

### H5 history
- 用url规范的路由，跳转时不刷新页面
- history.pushState
- window.onpopstate
- 需要后端支持，无论前端访问什么路径，都返回主文件index.html

### 总结
- to B 推荐hash，简单易用，对URL规范不敏感
- to C 可以考虑H5，SEO友好，需要服务端支持
- 考虑成本和收益