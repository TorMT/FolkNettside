/* Ren logikk for svar, repetisjon og mestring. */
(function(root){
'use strict';
const DAY=86400000;
function numeric(text){
 let s=String(text).trim().replace(/−/g,'-').replace(/,/g,'.').replace(/\s/g,'');
 if(!s||s.length>120)return null;
 if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)){let x=Number(s);return Number.isFinite(x)?x:null;}
 const f=s.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\/([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
 if(f&&Number(f[2])!==0){const x=Number(f[1])/Number(f[2]);return Number.isFinite(x)?x:null;}
 return null;
}
function check(q,value){if(q.type==='mc')return Number.isInteger(value)&&value===q.answer;if(q.type==='number'){let x=numeric(value);return x!==null&&Math.abs(x-q.answer)<=(q.tolerance||1e-6);}return null;}
function record(state,q,correct,hinted=false,self=false,now=Date.now()){
 const old=state.records[q.id]||{attempts:0,wins:0,independentDays:[],streak:0};
 const date=new Date(now).toISOString().slice(0,10);const days=Array.isArray(old.independentDays)?old.independentDays:[];
 const fresh=!days.includes(date);
 if(correct&&!hinted&&!self&&fresh)days.push(date);
 let streak=correct?(hinted||self?0:Math.min((old.streak||0)+(fresh?1:0),8)):0;
 const delay=correct?(hinted||self?1:[1,3,7,14,30,60,90,120][Math.max(0,streak-1)]):0;
 const r={...old,attempts:old.attempts+1,wins:old.wins+(correct?1:0),last:now,lastCorrect:correct,hinted,self,independentDays:days.slice(-30),streak,due:now+delay*DAY};
 state.records[q.id]=r;state.history.push({q:q.id,time:now,correct,hinted,self});state.history=state.history.slice(-20000);return r;
}
function mastery(q,r){if(!r)return 0;if(r.self)return 0;let s=r.lastCorrect?(r.hinted?35:65):15;return Math.min(100,s+Math.min(35,Math.max(0,r.independentDays.length-1)*18));}
function stats(questions,records){const auto=questions.filter(q=>q.type!=='work');const tested=auto.filter(q=>records[q.id]);const value=auto.length?Math.round(auto.reduce((s,q)=>s+mastery(q,records[q.id]),0)/auto.length):0;return {value,tested:tested.length,total:auto.length,confirmed:auto.filter(q=>mastery(q,records[q.id])>=83).length};}
function priority(q,records,now=Date.now()){const r=records[q.id];if(!r)return 50+(q.level===1?10:0);if(!r.lastCorrect)return 100;if(r.due<=now)return 80+Math.min(10,(now-r.due)/DAY);return 10;}
function validateImport(x,ids){if(!x||x.format!=='nome-matte-progress'||x.schema!==1||!x.state||typeof x.state.records!=='object'||Array.isArray(x.state.records)||x.state.records===null)throw Error('Filen er ikke en gyldig fremdriftsfil fra Matteverkstedet.');const clean={records:{},history:[],bookmarks:[],notes:{},read:[],goal:10,course:1};for(const [id,r]of Object.entries(x.state.records)){if(!ids.has(id))continue;if(!r||!Number.isFinite(r.last)||!Number.isFinite(r.due)||!Number.isFinite(r.attempts)||typeof r.lastCorrect!=='boolean'||!Array.isArray(r.independentDays))throw Error('Filen inneholder ugyldige oppgaveresultater.');clean.records[id]={attempts:Math.max(0,Math.min(100000,r.attempts)),wins:Math.max(0,Number(r.wins)||0),errorType:['begrep','metode','regnefeil'].includes(r.errorType)?r.errorType:undefined,last:r.last,due:r.due,lastCorrect:r.lastCorrect,hinted:!!r.hinted,self:!!r.self,streak:Math.max(0,Math.min(8,Number(r.streak)||0)),independentDays:r.independentDays.filter(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-30)};}
 clean.history=Array.isArray(x.state.history)?x.state.history.filter(h=>h&&ids.has(h.q)&&Number.isFinite(h.time)&&typeof h.correct==='boolean').slice(-20000):[];
 clean.bookmarks=Array.isArray(x.state.bookmarks)?x.state.bookmarks.filter(v=>typeof v==='string').slice(0,1000):[];
 clean.read=Array.isArray(x.state.read)?x.state.read.filter(v=>typeof v==='string').slice(0,1000):[];
 clean.goal=[5,10,20].includes(x.state.goal)?x.state.goal:10;clean.course=[1,2,3,4].includes(x.state.course)?x.state.course:1;
 if(x.state.notes&&typeof x.state.notes==='object')for(const [k,v]of Object.entries(x.state.notes))if(typeof v==='string'&&k!=='__proto__')clean.notes[k]=v.slice(0,10000);
 return clean;
}
root.MatteCore={numeric,check,record,mastery,stats,priority,validateImport};if(typeof module!=='undefined')module.exports=root.MatteCore;
})(typeof window!=='undefined'?window:globalThis);
