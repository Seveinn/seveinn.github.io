import { removeBackground } from "../SpriteSheetFlow/js/remove-bg.js";

const $ = (s, root = document) => root.querySelector(s);
const scene = $("#scene"), wires = $("#wires"), wireLayer = $("#wire-layer"), workspace = $("#workspace");
const state = { nodes: [], edges: [], selected: null, view: { x: 70, y: 80, zoom: 1 }, images: [], results: [], drag: null, connect: null };
const defs = {
  input:{title:"批量图片输入",sub:"SOURCE",icon:"＋",color:"dark",summary:"拖入或选择多张图片作为工作流输入"},
  removebg:{title:"智能抠图",sub:"REMOVE BACKGROUND",icon:"✦",color:"violet",summary:"采样图片边缘背景色，保留主体并输出透明通道"},
  resize:{title:"尺寸 / 裁剪",sub:"RESIZE & CROP",icon:"↔",color:"blue",summary:"按目标画布缩放、适应或居中裁剪"},
  format:{title:"格式转换",sub:"CONVERT",icon:"Aa",color:"amber",summary:"转换输出图片格式"},
  compress:{title:"图片压缩",sub:"COMPRESS",icon:"⇣",color:"green",summary:"按比例缩小尺寸并控制 JPEG / WebP 导出质量"},
  output:{title:"批量输出",sub:"EXPORT",icon:"↓",color:"dark",summary:"展开预览结果并下载 ZIP"}
};
const defaults = {
  input:{}, removebg:{tolerance:48,inset:0,fringe:30,soft:12}, resize:{width:512,height:512,mode:"contain"},
  format:{format:"png"}, compress:{scale:50,quality:90}, output:{prefix:"imageflow",expanded:true}
};
const uid = () => "n_" + Math.random().toString(36).slice(2,9);

function makeNode(type,x,y){ return {id:uid(),type,x,y,params:{...defaults[type]}}; }
function seed(){
  state.nodes=[makeNode("input",40,150),makeNode("removebg",365,150),makeNode("resize",690,150),makeNode("format",1015,150),makeNode("compress",1340,150),makeNode("output",1665,150)];
  state.edges=state.nodes.slice(0,-1).map((n,i)=>({from:n.id,to:state.nodes[i+1].id})); state.selected=null; state.results=[]; render(); fitView();
}
function nodeById(id){return state.nodes.find(n=>n.id===id)}
function summary(n){
  if(n.type==="input") return state.images.length ? `<b>${state.images.length} 张图片</b> 已就绪` : defs[n.type].summary;
  if(n.type==="removebg") return `容差 <b>${n.params.tolerance}</b> · 边缘 <b>${n.params.soft}px</b>`;
  if(n.type==="resize") return `<b>${n.params.width} × ${n.params.height}</b> · ${n.params.mode==="cover"?"居中裁剪":"完整适应"}`;
  if(n.type==="format") return `输出为 <b>${n.params.format.toUpperCase()}</b>`;
  if(n.type==="compress") return `缩放 <b>${n.params.scale}%</b> · 质量 <b>${n.params.quality}</b>`;
  if(n.type==="output") return state.results.length?`<b>${state.results.length} 个结果</b> 可供预览与下载`:defs[n.type].summary;
}
function render(){
  scene.innerHTML=state.nodes.map(n=>{const d=defs[n.type]; const thumbs=(n.type==="input"?state.images: n.type==="output"?state.results:[]).slice(0,4);
    return `<article class="node ${state.selected===n.id?"selected":""}" data-id="${n.id}" data-type="${n.type}" style="left:${n.x}px;top:${n.y}px"><div class="node-head"><span class="node-icon ${d.color}">${d.icon}</span><div><strong>${d.title}</strong><small>${d.sub}</small></div></div><span class="port in" data-port="in"></span><span class="port out" data-port="out"></span><div class="node-body"><div class="node-summary">${summary(n)}</div>${n.type==="input"&&!state.images.length?'<button class="drop-action">选择图片或拖入文件</button>':""}${thumbs.length?`<div class="thumbs">${thumbs.slice(0,3).map(i=>`<img src="${i.url}" alt="">`).join("")}${thumbs.length>3?`<span class="thumb-more">+${thumbs.length-3}</span>`:""}</div>`:""}<div class="node-meta"><span>${n.type==="input"?"本地读取":"批量处理"}</span><b>${n.type==="output"&&state.results.length?"完成":"● READY"}</b></div></div></article>`}).join("");
  applyTransform(); drawWires(); bindNodes(); if(state.selected) renderInspector(nodeById(state.selected));
}
function applyTransform(){const t=`translate(${state.view.x}px,${state.view.y}px) scale(${state.view.zoom})`;scene.style.transform=t;wires.style.transform=t;$("#grid").style.backgroundPosition=`${state.view.x}px ${state.view.y}px`;$("#grid").style.backgroundSize=`${24*state.view.zoom}px ${24*state.view.zoom}px`;$("#zoom-label").value=Math.round(state.view.zoom*100)+"%"}
function portPoint(id,out){const n=nodeById(id);return {x:n.x+(out?260:0),y:n.y+62}}
function curve(a,b){const bend=Math.max(70,Math.abs(b.x-a.x)*.45);return `M${a.x},${a.y} C${a.x+bend},${a.y} ${b.x-bend},${b.y} ${b.x},${b.y}`}
function pruneEdges(){const ids=new Set(state.nodes.map(n=>n.id));state.edges=state.edges.filter(e=>ids.has(e.from)&&ids.has(e.to)&&e.from!==e.to)}
function cancelConnection(){state.connect=null;const draft=$("#draft-wire");draft.hidden=true;draft.removeAttribute("d")}
function closeConnectionMenu(){$("#connection-menu").hidden=true}
function connectNodes(from,to){state.edges=state.edges.filter(x=>x.to!==to&&!(x.from===from&&x.to===to));state.edges.push({from,to})}
function showConnectionMenu(x,y,connection){
  const menu=$("#connection-menu"),types=Object.keys(defs).filter(type=>connection.port==="out"?type!=="input":type!=="output");
  menu.innerHTML=types.map(type=>{const d=defs[type];return `<button data-type="${type}"><span class="node-icon ${d.color}">${d.icon}</span><span><strong>${d.title}</strong><small>${d.sub}</small></span></button>`}).join("");
  menu.hidden=false;menu.style.left=Math.max(12,Math.min(x+8,window.innerWidth-menu.offsetWidth-12))+"px";menu.style.top=Math.max(12,Math.min(y+8,window.innerHeight-menu.offsetHeight-12))+"px";
  menu.querySelectorAll("[data-type]").forEach(button=>button.onclick=e=>{e.stopPropagation();const p=screenToWorld(x,y),n=makeNode(button.dataset.type,p.x-130,p.y-62);state.nodes.push(n);connectNodes(connection.port==="out"?connection.n.id:n.id,connection.port==="out"?n.id:connection.n.id);state.selected=n.id;closeConnectionMenu();render();$("#inspector").classList.add("open");toast("节点已创建并连接")});
  menu.querySelector("button")?.focus();
}
function drawWires(){pruneEdges();wireLayer.innerHTML=state.edges.map((e,i)=>{const d=curve(portPoint(e.from,true),portPoint(e.to,false));return `<path class="wire ${state.selected===e.from||state.selected===e.to?"active":""}" d="${d}"/><path class="wire-hit" data-edge="${i}" d="${d}"/>`}).join("");wireLayer.querySelectorAll(".wire-hit").forEach(p=>p.onclick=()=>{state.edges.splice(+p.dataset.edge,1);drawWires();toast("已断开连接")})}
function isFileDrag(e){return Array.from(e.dataTransfer?.types||[]).includes("Files")}
function bindNodes(){scene.querySelectorAll(".node").forEach(el=>{
  el.onpointerdown=e=>{const n=nodeById(el.dataset.id);if(e.target.dataset.port){startConnect(e,n,e.target.dataset.port);return}state.selected=n.id;renderInspector(n);$("#inspector").classList.add("open");render();if(e.target.closest("button"))return;state.drag={n,sx:e.clientX,sy:e.clientY,ox:n.x,oy:n.y};el.setPointerCapture(e.pointerId)};
  el.ondblclick=()=>{$("#inspector").classList.add("open");renderInspector(nodeById(el.dataset.id))};
  if(el.dataset.type==="input"){
    el.ondragenter=e=>{if(!isFileDrag(e))return;e.preventDefault();e.stopPropagation();el.classList.add("drag-over")};
    el.ondragover=e=>{if(!isFileDrag(e))return;e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect="copy";el.classList.add("drag-over")};
    el.ondragleave=e=>{if(!el.contains(e.relatedTarget))el.classList.remove("drag-over")};
    el.ondrop=e=>{if(!isFileDrag(e))return;e.preventDefault();e.stopPropagation();el.classList.remove("drag-over");if(e.dataTransfer.files.length)loadFiles(e.dataTransfer.files)};
  }
  const choose=$(".drop-action",el);if(choose)choose.onclick=e=>{e.stopPropagation();$("#file-input").click()};
})}
document.addEventListener("pointermove",e=>{if(state.drag){state.drag.n.x=state.drag.ox+(e.clientX-state.drag.sx)/state.view.zoom;state.drag.n.y=state.drag.oy+(e.clientY-state.drag.sy)/state.view.zoom;const el=scene.querySelector(`[data-id="${state.drag.n.id}"]`);el.style.left=state.drag.n.x+"px";el.style.top=state.drag.n.y+"px";drawWires()}if(state.connect){const p=screenToWorld(e.clientX,e.clientY);const a=portPoint(state.connect.n.id,state.connect.port==="out");$("#draft-wire").setAttribute("d",state.connect.port==="out"?curve(a,p):curve(p,a))}});
document.addEventListener("pointerup",e=>{state.drag=null;if(state.connect){const connection=state.connect,target=document.elementFromPoint(e.clientX,e.clientY)?.closest(".port");let connected=false;if(target){const el=target.closest(".node"), other=nodeById(el.dataset.id), port=target.dataset.port;if(other&&other.id!==connection.n.id&&port!==connection.port){const from=connection.port==="out"?connection.n.id:other.id,to=connection.port==="in"?connection.n.id:other.id;connectNodes(from,to);connected=true;toast("节点已连接")}}cancelConnection();drawWires();if(!connected&&!target)showConnectionMenu(e.clientX,e.clientY,connection)}});
function startConnect(e,n,port){e.stopPropagation();closeConnectionMenu();state.connect={n,port};$("#draft-wire").hidden=false}
function screenToWorld(x,y){const r=workspace.getBoundingClientRect();return{x:(x-r.left-state.view.x)/state.view.zoom,y:(y-r.top-state.view.y)/state.view.zoom}}

function renderInspector(n){if(!n)return;$("#inspector-title").textContent=defs[n.type].title;let html="";
  if(n.type==="input")html=`<div class="hint">支持 PNG、JPEG、WebP、GIF 等浏览器可读取格式。图片只在当前浏览器内处理，不会上传。</div><button class="download-btn" id="pick-files">＋ 选择批量图片</button><div class="field" style="margin-top:14px"><label>已导入 <span>${state.images.length} 张</span></label></div>${previewHtml(state.images)}`;
  if(n.type==="removebg")html=range("背景容差","tolerance",n.params.tolerance,0,160)+range("向内收缩","inset",n.params.inset,0,8)+range("残边阈值","fringe",n.params.fringe,0,100)+range("边缘柔化","soft",n.params.soft,0,40)+`<div class="hint">从四角与图片边缘自动采样背景色，适合纯色或近似纯色背景。</div>`;
  if(n.type==="resize")html=`<div class="field-row">${numberField("宽度","width",n.params.width)}${numberField("高度","height",n.params.height)}</div><div class="field"><label>缩放方式</label><select data-param="mode"><option value="contain" ${n.params.mode==="contain"?"selected":""}>完整适应（留透明边）</option><option value="cover" ${n.params.mode==="cover"?"selected":""}>填满画布（居中裁剪）</option></select></div>`;
  if(n.type==="format")html=`<div class="field"><label>目标格式</label><select data-param="format"><option value="png">PNG · 透明 / 无损</option><option value="webp">WebP · 高压缩率</option><option value="jpeg">JPEG · 通用照片</option></select></div><div class="hint">JPEG 不支持透明通道，透明区域会自动填充为白色。</div>`;
  if(n.type==="compress")html=range("缩放比例（%）","scale",n.params.scale,10,100,5)+range("JPEG / WebP 质量","quality",n.params.quality,50,100)+`<div class="hint">按当前节点收到的尺寸等比缩小。大图会分步缩放以减少锯齿；PNG 保持无损，质量参数仅应用于 JPEG 与 WebP。</div>`;
  if(n.type==="output")html=`<div class="field"><label>文件名前缀</label><input data-param="prefix" value="${n.params.prefix}"></div>${state.results.length?previewHtml(state.results)+`<button class="download-btn" id="download-zip">↓ 下载 ${state.results.length} 张图片（ZIP）</button>`:`<div class="hint">连接上游节点并点击“运行工作流”，结果将在这里展开预览。</div>`}`;
  if(n.type!=="input")html+=`<button class="danger-btn" id="delete-node">删除此节点</button>`;$("#inspector-body").innerHTML=html;
  $("#inspector-body").querySelectorAll("[data-param]").forEach(el=>{if(el.tagName==="SELECT"&&n.params[el.dataset.param])el.value=n.params[el.dataset.param];const commit=()=>{n.params[el.dataset.param]=el.type==="range"||el.type==="number"?+el.value:el.value;const out=el.parentElement.querySelector("output");if(out)out.value=el.value;render()};if(el.tagName==="SELECT")el.onchange=commit;else if(el.type==="range")el.oninput=commit;else el.onkeydown=e=>{if(e.key==="Enter"&&!e.isComposing){e.preventDefault();commit()}}});
  $("#pick-files")?.addEventListener("click",()=>$("#file-input").click());$("#download-zip")?.addEventListener("click",downloadZip);$("#delete-node")?.addEventListener("click",()=>deleteNode(n.id));
}
function range(label,key,val,min,max,step=1){return `<div class="field"><label>${label}<output>${val}</output></label><input type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-param="${key}"></div>`}
function numberField(label,key,val){return `<div class="field"><label>${label}</label><input type="number" min="1" max="8192" value="${val}" data-param="${key}"></div>`}
function previewHtml(items){return `<div class="preview-grid">${items.map(i=>`<div class="preview-card"><img src="${i.url}" alt="${i.name}"><span>${i.name}</span></div>`).join("")}</div>`}
function deleteNode(id){cancelConnection();state.drag=null;state.nodes=state.nodes.filter(n=>n.id!==id);state.edges=state.edges.filter(e=>e.from!==id&&e.to!==id);pruneEdges();state.selected=null;$("#inspector").classList.remove("open");render();toast("节点及关联连线已删除")}

async function loadFiles(list){const files=[...list].filter(f=>f.type.startsWith("image/"));if(!files.length)return toast("没有找到可读取的图片");state.images.forEach(i=>URL.revokeObjectURL(i.url));state.images=[];for(const f of files){const url=URL.createObjectURL(f),img=new Image();img.src=url;await img.decode();state.images.push({name:f.name,url,img,width:img.naturalWidth,height:img.naturalHeight})}state.results=[];render();toast(`已导入 ${files.length} 张图片`)}
function canvasFrom(source,w=source.width||source.naturalWidth,h=source.height||source.naturalHeight){const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(source,0,0,w,h);return c}
function orderedFlow(){const input=state.nodes.find(n=>n.type==="input");if(!input)return[];const out=[];let cur=input,seen=new Set;while(cur&&!seen.has(cur.id)){out.push(cur);seen.add(cur.id);const edge=state.edges.find(e=>e.from===cur.id);cur=edge?nodeById(edge.to):null}return out}
async function run(){if(!state.images.length){toast("请先在输入节点中添加图片");return}const flow=orderedFlow();if(flow.length<2){toast("请连接至少一个处理或输出节点");return}$("#run-flow").disabled=true;state.results.forEach(i=>URL.revokeObjectURL(i.url));state.results=[];let items=state.images.map(i=>({name:i.name,canvas:canvasFrom(i.img),format:"png",quality:.92}));try{for(const n of flow.slice(1)){const el=scene.querySelector(`[data-id="${n.id}"]`);el?.classList.add("running");await new Promise(r=>setTimeout(r,80));if(n.type==="removebg")items=items.map(i=>({...i,canvas:removeBackground(i.canvas,{tol:n.params.tolerance,inset:n.params.inset,fringe:n.params.fringe,soft:n.params.soft}).canvas}));if(n.type==="resize")items=items.map(i=>({...i,canvas:resizeCanvas(i.canvas,n.params)}));if(n.type==="format")items=items.map(i=>({...i,format:n.params.format}));if(n.type==="compress")items=items.map(i=>({...i,canvas:compressCanvas(i.canvas,n.params.scale),quality:n.params.quality/100}));el?.classList.remove("running")}for(const i of items){const type=i.format==="jpeg"?"image/jpeg":`image/${i.format}`;const blob=await canvasBlob(i.canvas,type,i.quality);const base=i.name.replace(/\.[^.]+$/,"");state.results.push({...i,name:`${base}.${i.format==="jpeg"?"jpg":i.format}`,blob,url:URL.createObjectURL(blob)})}render();const output=flow.findLast?.(n=>n.type==="output")||flow.filter(n=>n.type==="output").pop();if(output){state.selected=output.id;render();$("#inspector").classList.add("open");renderInspector(output)}toast(`处理完成 · ${state.results.length} 张图片`)}catch(err){console.error(err);toast("处理失败："+err.message)}finally{$("#run-flow").disabled=false;scene.querySelectorAll(".running").forEach(e=>e.classList.remove("running"))}}
function resizeCanvas(src,p){const c=document.createElement("canvas"),ctx=c.getContext("2d");c.width=Math.max(1,p.width);c.height=Math.max(1,p.height);const scale=p.mode==="cover"?Math.max(c.width/src.width,c.height/src.height):Math.min(c.width/src.width,c.height/src.height),w=src.width*scale,h=src.height*scale;ctx.drawImage(src,(c.width-w)/2,(c.height-h)/2,w,h);return c}
function compressCanvas(src,scalePercent){
  const scale=Math.max(10,Math.min(100,scalePercent))/100;
  const targetW=Math.max(1,Math.round(src.width*scale)),targetH=Math.max(1,Math.round(src.height*scale));
  let current=src,curW=src.width,curH=src.height;
  while(curW>targetW*2||curH>targetH*2){
    const nextW=Math.max(targetW,Math.floor(curW/2)),nextH=Math.max(targetH,Math.floor(curH/2));
    current=scaledCanvas(current,curW,curH,nextW,nextH);curW=nextW;curH=nextH;
  }
  return curW===targetW&&curH===targetH?current:scaledCanvas(current,curW,curH,targetW,targetH);
}
function scaledCanvas(src,srcW,srcH,width,height){const c=document.createElement("canvas"),ctx=c.getContext("2d");c.width=width;c.height=height;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(src,0,0,srcW,srcH,0,0,width,height);return c}
function canvasBlob(c,type,q){return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("无法编码图片")),type,q))}

function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function u16(n){return[n&255,n>>>8&255]}function u32(n){return[n&255,n>>>8&255,n>>>16&255,n>>>24&255]}
async function downloadZip(){if(!state.results.length)return;const enc=new TextEncoder(),chunks=[],central=[];let offset=0;for(const item of state.results){const name=enc.encode(item.name),data=new Uint8Array(await item.blob.arrayBuffer()),crc=crc32(data);const local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name]);chunks.push(local,data);central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]));offset+=local.length+data.length}const centralSize=central.reduce((s,c)=>s+c.length,0),end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(central.length),...u16(central.length),...u32(centralSize),...u32(offset),...u16(0)]),blob=new Blob([...chunks,...central,end],{type:"application/zip"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(nodeById(state.selected)?.params.prefix||"imageflow")+".zip";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("ZIP 已开始下载")}

let toastTimer;function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2200)}
function setZoom(z,cx=workspace.clientWidth/2,cy=workspace.clientHeight/2){const old=state.view.zoom,nz=Math.max(.35,Math.min(1.8,z));state.view.x=cx-(cx-state.view.x)*nz/old;state.view.y=cy-(cy-state.view.y)*nz/old;state.view.zoom=nz;applyTransform()}
function fitView(){if(!state.nodes.length)return;const minX=Math.min(...state.nodes.map(n=>n.x)),maxX=Math.max(...state.nodes.map(n=>n.x+260)),minY=Math.min(...state.nodes.map(n=>n.y)),maxY=Math.max(...state.nodes.map(n=>n.y+150)),pad=90,z=Math.min(1,(workspace.clientWidth-pad*2)/(maxX-minX),(workspace.clientHeight-pad*2)/(maxY-minY));state.view.zoom=Math.max(.35,z);state.view.x=(workspace.clientWidth-(maxX-minX)*state.view.zoom)/2-minX*state.view.zoom;state.view.y=(workspace.clientHeight-(maxY-minY)*state.view.zoom)/2-minY*state.view.zoom;applyTransform()}
workspace.onwheel=e=>{e.preventDefault();const r=workspace.getBoundingClientRect();setZoom(state.view.zoom*(e.deltaY>0?.9:1.1),e.clientX-r.left,e.clientY-r.top)};
workspace.onpointerdown=e=>{if(e.target===workspace||e.target.id==="grid"){state.pan={x:e.clientX,y:e.clientY,vx:state.view.x,vy:state.view.y};workspace.classList.add("panning")}};workspace.onpointermove=e=>{if(state.pan){state.view.x=state.pan.vx+e.clientX-state.pan.x;state.view.y=state.pan.vy+e.clientY-state.pan.y;applyTransform()}};workspace.onpointerup=()=>{state.pan=null;workspace.classList.remove("panning")};
$("#file-input").onchange=e=>{loadFiles(e.target.files);e.target.value=""};$("#add-node").onclick=()=>$("#palette").hidden=false;$("#close-palette").onclick=()=>$("#palette").hidden=true;$("#palette").querySelectorAll("[data-type]").forEach(b=>b.onclick=()=>{const type=b.dataset.type,p=screenToWorld(workspace.clientWidth/2,workspace.clientHeight/2),n=makeNode(type,p.x-130,p.y-70);state.nodes.push(n);if(state.selected&&!state.edges.some(e=>e.from===state.selected))state.edges.push({from:state.selected,to:n.id});state.selected=n.id;$("#palette").hidden=true;render();$("#inspector").classList.add("open");renderInspector(n)});$("#run-flow").onclick=run;$("#fit-view").onclick=fitView;$("#clear-flow").onclick=()=>{if(confirm("重置为示例工作流？已导入图片会保留。"))seed()};$("#close-inspector").onclick=()=>$("#inspector").classList.remove("open");$("#zoom-in").onclick=()=>setZoom(state.view.zoom*1.15);$("#zoom-out").onclick=()=>setZoom(state.view.zoom/1.15);window.onresize=applyTransform;
document.addEventListener("pointerdown",e=>{if(!e.target.closest("#connection-menu")&&!state.connect)closeConnectionMenu()});
window.addEventListener("dragover",e=>{if(isFileDrag(e))e.preventDefault()});
window.addEventListener("drop",e=>{if(!isFileDrag(e))return;e.preventDefault();scene.querySelectorAll('.node[data-type="input"].drag-over').forEach(el=>el.classList.remove("drag-over"))});
document.addEventListener("keydown",e=>{if(e.key==="Delete"&&state.selected&&!/INPUT|SELECT/.test(document.activeElement.tagName))deleteNode(state.selected);if(e.key==="Escape"){$("#palette").hidden=true;closeConnectionMenu();$("#inspector").classList.remove("open")}});
seed();
