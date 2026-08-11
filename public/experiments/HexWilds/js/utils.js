// 工具函数
import { state } from './state.js';

export function hexToWorld(q, r) {
    const x = Math.sqrt(3) * q + Math.sqrt(3)/2 * r;
    const z = 3/2 * r;
    return { x, z };
}

export function getDist(a, b) { 
    return (Math.abs(a.q-b.q)+Math.abs(a.q+a.r-b.q-b.r)+Math.abs(a.r-b.r))/2; 
}

export function getNeighbors(q, r, tileMap) { 
    return [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]
        .map(d=>tileMap.get(`${q+d[0]},${r+d[1]}`))
        .filter(t=>t); 
}

export function findPath(start, end, tileMap) {
    if(end.isObstacle) return null;
    const q=[[tileMap.get(`${start.q},${start.r}`)]], 
          v=new Set([`${start.q},${start.r}`]);
    let i=0; 
    while(q.length>0 && i++<1000) {
        const p=q.shift(), c=p[p.length-1];
        if(c.q===end.q && c.r===end.r) return p;
        getNeighbors(c.q, c.r, tileMap).forEach(n=>{
            const k=`${n.q},${n.r}`, 
                  isE=(n.q===state.enemyPos.q && n.r===state.enemyPos.r);
            if(!n.isObstacle && !isE && !v.has(k)) { 
                v.add(k); 
                q.push([...p, n]); 
            }
        });
    } 
    return null;
}


