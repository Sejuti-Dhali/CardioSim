"use strict";

/*
 CardioSim: independently implemented, simplified 0D
 closed-loop cardiovascular model.

 State: 8 compartment blood volumes in mL.
 Flow: Q = max(0, pressure gradient / resistance) for valves;
 vascular paths support signed pressure-driven flow.
 Integration: conservative explicit Euler with small substeps.
 This is not a reconstruction of an unavailable .slx model.
*/
(() => {
const $ = id => document.getElementById(id);
const S = "http://www.w3.org/2000/svg";
const ids = ["RA","RV","PA","PV","LA","LV","SA","SV"];
const descriptions = {
 RA:"Right atrium: receives systemic venous return and fills the right ventricle.",
 RV:"Right ventricle: propels blood into the pulmonary artery during systole.",
 PA:"Pulmonary artery: receives right ventricular output.",
 PV:"Pulmonary veins: return blood toward the left atrium.",
 LA:"Left atrium: receives pulmonary venous blood and fills the left ventricle.",
 LV:"Left ventricle: generates systemic arterial outflow during systole.",
 SA:"Systemic arteries: represent high-pressure systemic blood distribution.",
 SV:"Systemic veins: return systemic blood to the right heart."
};

const initial = {
 RA:65,RV:130,PA:150,PV:430,
 LA:65,LV:140,SA:720,SV:3300
};

const links = [
 {a:"RA",b:"RV",name:"Tricuspid valve",r:0.12,valve:true,bend:0},
 {a:"RV",b:"PA",name:"Pulmonary valve",r:0.065,valve:true,bend:0},
 {a:"PA",b:"PV",name:"Pulmonary vascular circulation",r:0.28,valve:false,bend:0},
 {a:"PV",b:"LA",name:"Pulmonary venous return",r:0.06,valve:false,bend:0},
 {a:"LA",b:"LV",name:"Mitral valve",r:0.13,valve:true,bend:0},
 {a:"LV",b:"SA",name:"Aortic valve",r:0.09,valve:true,bend:0},
 {a:"SA",b:"SV",name:"Systemic vascular circulation",r:1.45,valve:false,bend:0},
 {a:"SV",b:"RA",name:"Systemic venous return",r:0.09,valve:false,bend:0}
];

const positions = {
 RA:[170,175],RV:[415,120],PA:[760,120],PV:[940,315],
 LA:[765,505],LV:[415,510],SA:[165,495],SV:[80,330]
};

const params = {
 hr:72,contract:100,resist:100,blood:100,speed:100
};

let result=null,selected={kind:"node",index:"LV"};
let playing=true,phase=0,previousFrame=0;
const nodeElements={},wireElements=[];
const totalInitial=Object.values(initial).reduce((a,b)=>a+b,0);

function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function smooth(x){x=clamp(x,0,1);return x*x*(3-2*x);}
function activation(t,hr,offset=0){
 const cycle=60/hr;
 let s=((t/cycle+offset)%1+1)%1;
 // A simplified systolic activation curve.
 if(s<0.06||s>0.47)return 0;
 const z=(s-0.06)/0.41;
 return Math.pow(Math.sin(Math.PI*z),2);
}
function atrialActivation(t,hr){
 const c=60/hr;
 const s=((t/c)%1+1)%1;
 if(s<0.77||s>0.96)return 0;
 return Math.sin(Math.PI*(s-0.77)/0.19)**2;
}
function pressures(V,t,p){
 const ventricular=activation(t,p.hr);
 const atrial=atrialActivation(t,p.hr);
 const out={};
 out.RA=(V.RA-18)*(0.11+0.12*atrial);
 out.LA=(V.LA-18)*(0.13+0.12*atrial);
 out.RV=(V.RV-30)*(0.055+0.79*ventricular);
 out.LV=(V.LV-35)*(0.065+2.0*(p.contract/100)*ventricular);
 out.PA=(V.PA-105)/3.0;
 out.PV=(V.PV-320)/45;
 out.SA=(V.SA-560)/1.9;
 out.SV=(V.SV-2750)/100;
 for(const id of ids)out[id]=Math.max(0,out[id]);
 return out;
}
function flows(P,p){
 return links.map((edge,i)=>{
   const r=edge.r*(i===6?p.resist/100:1);
   const delta=P[edge.a]-P[edge.b];
   return edge.valve?
     Math.max(0,delta/r):
     delta/r;
 });
}
function derivative(V,t,p){
 const P=pressures(V,t,p);
 const Q=flows(P,p);
 const d=Object.fromEntries(ids.map(id=>[id,0]));
 links.forEach((e,i)=>{
   d[e.a]-=Q[i];
   d[e.b]+=Q[i];
 });
 return {P,Q,d};
}

function simulate(){
 const p={...params};
 const V={...initial};
 V.SV+=totalInitial*(p.blood/100-1);

 // Start at an assumed state, not a patient-specific condition.
 const dt=0.0015;
 const duration=12;
 const steps=Math.round(duration/dt);
 const data=[];
 const sampleEvery=12;
 const minimum=Object.fromEntries(ids.map(id=>[id,0.01]));
 let maxDrift=0;

 for(let step=0;step<=steps;step++){
   const t=step*dt;
   const current=derivative(V,t,p);
   if(step%sampleEvery===0){
     data.push({
       t,P:{...current.P},Q:[...current.Q],V:{...V}
     });
   }
   if(step===steps)break;

   // Ensure transfers conserve volume and cannot remove
   // more blood from a source compartment than is present.
   const transfers=current.Q.map((q,i)=>{
      const e=links[i];
      if(q>=0)return Math.min(q*dt,Math.max(0,V[e.a]-minimum[e.a]));
      return -Math.min(-q*dt,Math.max(0,V[e.b]-minimum[e.b]));
   });

   const changes=Object.fromEntries(ids.map(id=>[id,0]));
   links.forEach((edge,i)=>{
     changes[edge.a]-=transfers[i];
     changes[edge.b]+=transfers[i];
   });

   for(const id of ids)V[id]+=changes[id];

   const sum=ids.reduce((s,id)=>s+V[id],0);
   maxDrift=Math.max(maxDrift,
      Math.abs(sum-totalInitial*p.blood/100));
 }

 const finalStart=Math.max(0,data.length-Math.round((60/p.hr*3)/(dt*sampleEvery)));
 const tail=data.slice(finalStart);
 const mean=(fn)=>tail.reduce((s,x)=>s+fn(x),0)/Math.max(1,tail.length);

 // SV = integral of positive aortic valve flow
 // over the latest full cycle, approximated by samples.
 const period=60/p.hr;
 const last=data[data.length-1].t;
 const oneCycle=data.filter(x=>x.t>=last-period);
 let ejected=0;
 for(let i=1;i<oneCycle.length;i++){
   const dtime=oneCycle[i].t-oneCycle[i-1].t;
   ejected+=Math.max(0,oneCycle[i-1].Q[5])*dtime;
 }
 const avgCO=mean(x=>Math.max(0,x.Q[5]))*60/1000;
 return {
   data,tail,p,maxDrift,
   metrics:{
      CO:avgCO,
      MAP:mean(x=>x.P.SA),
      SV:ejected,
      HR:p.hr
   },
   means:links.map((e,i)=>mean(x=>x.Q[i]))
 };
}

function svgEl(name,attrs={},parent){
 const e=document.createElementNS(S,name);
 for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);
 if(parent)parent.appendChild(e);
 return e;
}

const net=$("network"),wireLayer=$("wires"),nodeLayer=$("nodes");
let dragging=null;
function pointerPosition(event){
 const m=net.getScreenCTM();
 if(!m)return{x:0,y:0};
 const pt=net.createSVGPoint();
 pt.x=event.clientX;pt.y=event.clientY;
 return pt.matrixTransform(m.inverse());
}
function point(id){return{x:positions[id][0],y:positions[id][1]};}
function geometry(e){
 const a=point(e.a),b=point(e.b);
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy));
 const nx=-dy/len,ny=dx/len;
 const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
 const c={x:mid.x+nx*e.bend,y:mid.y+ny*e.bend};
 return{a,b,c,mid,nx,ny};
}
function inspect(kind,index){
 selected={kind,index};
 if(kind==="node"){
   $("inspectName").textContent=index+" · "+({
     RA:"Right atrium",RV:"Right ventricle",PA:"Pulmonary artery",
     PV:"Pulmonary veins",LA:"Left atrium",LV:"Left ventricle",
     SA:"Systemic arteries",SV:"Systemic veins"
   }[index]);
   $("inspectDescription").textContent=descriptions[index];
 }else{
   $("inspectName").textContent=links[index].name;
   $("inspectDescription").textContent=
     links[index].a+" → "+links[index].b+
     ". Pressure-driven flow; "+(links[index].valve?
       "the valve prevents reverse flow.":"this vascular connection permits signed flow.");
 }
 renderNetwork();
}

links.forEach((e,i)=>{
 const group=svgEl("g",{},wireLayer);
 const visible=svgEl("path",{class:"wire","marker-end":"url(#arrow)"},group);
 const hit=svgEl("path",{class:"wire-hit"},group);
 const handle=svgEl("circle",{class:"handle",r:9,tabindex:0},group);
 hit.addEventListener("pointerdown",event=>{
   event.preventDefault();event.stopPropagation();inspect("edge",i);
 });
 handle.addEventListener("pointerdown",event=>{
   event.preventDefault();event.stopPropagation();
   inspect("edge",i);
   dragging={type:"edge",index:i};
   net.setPointerCapture(event.pointerId);
 });
 wireElements.push({visible,hit,handle});
});

ids.forEach(id=>{
 const group=svgEl("g",{
   class:"node "+(["PA","PV","SA","SV"].includes(id)?"vessel":""),
   tabindex:0,role:"button"
 },nodeLayer);
 svgEl("rect",{x:-89,y:-31,width:178,height:62,rx:13},group);
 const label=svgEl("text",{x:-73,y:-3},group);
 label.textContent=id+"  "+({
   RA:"RIGHT ATRIUM",RV:"RIGHT VENTRICLE",
   PA:"PULMONARY ART.",PV:"PULMONARY VEINS",
   LA:"LEFT ATRIUM",LV:"LEFT VENTRICLE",
   SA:"SYSTEMIC ART.",SV:"SYSTEMIC VEINS"
 }[id]);
 const detail=svgEl("text",{x:-73,y:16,class:"sub"},group);
 detail.textContent="Pressure-driven compartment";
 group.addEventListener("pointerdown",event=>{
   event.preventDefault();event.stopPropagation();
   inspect("node",id);
   dragging={type:"node",id};
   net.setPointerCapture(event.pointerId);
 });
 group.addEventListener("keydown",event=>{
   const shifts={
    ArrowLeft:[-12,0],ArrowRight:[12,0],
    ArrowUp:[0,-12],ArrowDown:[0,12]
   };
   if(!shifts[event.key])return;
   event.preventDefault();
   positions[id][0]=clamp(positions[id][0]+shifts[event.key][0],92,1008);
   positions[id][1]=clamp(positions[id][1]+shifts[event.key][1],39,600);
   renderNetwork();
 });
 nodeElements[id]=group;
});
function renderNetwork(){
 links.forEach((e,i)=>{
   const g=geometry(e),d=`M${g.a.x} ${g.a.y} Q${g.c.x} ${g.c.y} ${g.b.x} ${g.b.y}`;
   wireElements[i].visible.setAttribute("d",d);
   wireElements[i].hit.setAttribute("d",d);
   wireElements[i].handle.setAttribute("cx",g.c.x);
   wireElements[i].handle.setAttribute("cy",g.c.y);
   wireElements[i].visible.classList.toggle(
     "selected",selected.kind==="edge"&&selected.index===i);
 });
 ids.forEach(id=>{
   nodeElements[id].setAttribute(
     "transform",`translate(${positions[id][0]},${positions[id][1]})`);
 });
}
net.addEventListener("pointermove",event=>{
 if(!dragging)return;
 const pos=pointerPosition(event);
 if(dragging.type==="node"){
   positions[dragging.id]=[
     clamp(pos.x,92,1008),clamp(pos.y,39,600)
   ];
 }else{
   const e=links[dragging.index],g=geometry(e);
   e.bend=clamp(
     (pos.x-g.mid.x)*g.nx+(pos.y-g.mid.y)*g.ny,-180,180);
 }
 renderNetwork();
});
function endDrag(){dragging=null;}
net.addEventListener("pointerup",endDrag);
net.addEventListener("pointercancel",endDrag);
net.addEventListener("lostpointercapture",endDrag);
$("layoutReset").addEventListener("click",()=>{
 const values={
  RA:[170,175],RV:[415,120],PA:[760,120],PV:[940,315],
  LA:[765,505],LV:[415,510],SA:[165,495],SV:[80,330]
 };
 ids.forEach(id=>positions[id]=[...values[id]]);
 links.forEach(e=>e.bend=0);
 renderNetwork();
});
renderNetwork();

// Chart engine: all traces derive from actual ODE states.
const charts=[
 {id:"chartPressure",names:["LV","RV"],from:"P",colors:["#f4a4b1","#85cbd8"]},
 {id:"chartArtery",names:["SA","PA"],from:"P",colors:["#f4a4b1","#85cbd8"]},
 {id:"chartVolume",names:["LV","RV"],from:"V",colors:["#f4a4b1","#85cbd8"]},
 {id:"chartFlow",names:[5,1],from:"Q",colors:["#f4a4b1","#85cbd8"]}
];
function renderChart(config){
 const el=$(config.id);
 const data=result.tail;
 const values=config.names.map(name=>data.map(v=>v[config.from][name]));
 const minVal=Math.min(0,...values.flat());
 const maxVal=Math.max(1,...values.flat());
 const bottom=260,top=18,left=56,right=675;
 const t0=data[0].t,t1=data[data.length-1].t;
 el.innerHTML="";
 for(let i=0;i<=4;i++){
   const y=top+(bottom-top)*i/4;
   svgEl("line",{x1:left,y1:y,x2:right,y2:y,
       stroke:"#395b6e","stroke-dasharray":"3 8"},el);
   const label=svgEl("text",{x:left-9,y:y+4,
       fill:"#9db9c5","font-size":12,"text-anchor":"end"},el);
   label.textContent=(maxVal-(maxVal-minVal)*i/4).toFixed(0);
 }
 values.forEach((series,j)=>{
   let d="";
   series.forEach((v,i)=>{
     const x=left+(data[i].t-t0)/Math.max(.0001,t1-t0)*(right-left);
     const y=bottom-(v-minVal)/(maxVal-minVal)*(bottom-top);
     d+=(i===0?"M":"L")+x.toFixed(2)+","+y.toFixed(2)+" ";
   });
   svgEl("path",{d,fill:"none",stroke:config.colors[j],
     "stroke-width":2.6,"stroke-linejoin":"round"},el);
 });
 const label=svgEl("text",{x:675,y:282,fill:"#a9c5d0",
   "font-size":12,"text-anchor":"end"},el);
 label.textContent="Simulated time →";
 chartHover(el,data,config,left,right);
}
function chartHover(el,data,config,left,right){
 const hover=svgEl("line",{x1:0,y1:18,x2:0,y2:260,
   stroke:"#fff4d9","stroke-width":1,visibility:"hidden"},el);
 const text=svgEl("text",{x:70,y:17,fill:"#f4eadc","font-size":12},el);
 el.addEventListener("pointermove",event=>{
   const pt=el.createSVGPoint();
   pt.x=event.clientX;pt.y=event.clientY;
   const p=pt.matrixTransform(el.getScreenCTM().inverse());
   const ratio=clamp((p.x-left)/(right-left),0,1);
   const i=Math.round(ratio*(data.length-1));
   const frame=data[i];
   const vals=config.names.map(k=>frame[config.from][k].toFixed(1));
   hover.setAttribute("x1",p.x);hover.setAttribute("x2",p.x);
   hover.setAttribute("visibility","visible");
   text.textContent="t="+frame.t.toFixed(2)+"s · "+vals.join(" / ");
 });
 el.addEventListener("pointerleave",()=>{
    hover.setAttribute("visibility","hidden");
    text.textContent="";
 });
}
function renderPV(){
 const el=$("chartPV"),data=result.tail;
 const period=60/params.hr,end=data[data.length-1].t;
 const section=data.filter(v=>v.t>=end-period);
 const vols=section.map(x=>x.V.LV),prs=section.map(x=>x.P.LV);
 const minV=Math.min(...vols)-8,maxV=Math.max(...vols)+8;
 const maxP=Math.max(120,...prs)*1.06;
 const xmin=60,xmax=665,ymin=18,ymax=255;
 el.innerHTML="";
 for(let i=0;i<=4;i++){
  const y=ymin+(ymax-ymin)*i/4;
  svgEl("line",{x1:xmin,y1:y,x2:xmax,y2:y,stroke:"#395b6e","stroke-dasharray":"3 8"},el);
 }
 let d="";
 section.forEach((v,i)=>{
  const x=xmin+(v.V.LV-minV)/(maxV-minV)*(xmax-xmin);
  const y=ymax-v.P.LV/maxP*(ymax-ymin);
  d+=(i?"L":"M")+x.toFixed(2)+","+y.toFixed(2)+" ";
 });
 svgEl("path",{d,fill:"none",stroke:"#f5a0b0","stroke-width":3},el);
 const xTitle=svgEl("text",{x:665,y:282,fill:"#acbfce","font-size":12,
   "text-anchor":"end"},el);
 xTitle.textContent="LV volume (mL) →";
}
function renderFlowReadouts(){
 $("flowReadouts").innerHTML="";
 links.forEach((l,i)=>{
  const row=document.createElement("div");
  const name=document.createElement("span");
  const value=document.createElement("strong");
  name.textContent=l.name;
  value.textContent=result.means[i].toFixed(1)+" mL/s";
  row.append(name,value);
  $("flowReadouts").appendChild(row);
 });
}
function updateInspector(){
 const d=result.data[Math.min(result.data.length-1,
   Math.floor(phase*(result.data.length-1)))];
 if(selected.kind==="node"){
   const id=selected.index;
   $("inspectValue").textContent=d.P[id].toFixed(1)+" mmHg";
   $("inspectUnit").textContent=d.V[id].toFixed(1)+" mL compartment volume";
 }else{
   $("inspectValue").textContent=d.Q[selected.index].toFixed(1)+" mL/s";
   $("inspectUnit").textContent="Calculated connection flow";
 }
}

function updateAll(){
 for(const k of Object.keys(params)){
   const input=$(k);
   params[k]=Number(input.value);
 }
 $("hrOut").textContent=params.hr+" bpm";
 $("contractOut").textContent=params.contract+"%";
 $("resistOut").textContent=params.resist+"%";
 $("bloodOut").textContent=params.blood+"%";
 $("speedOut").textContent=(params.speed/100).toFixed(2)+"×";

 result=simulate();
 $("metricHR").innerHTML=params.hr+" <em>bpm</em>";
 $("metricCO").innerHTML=result.metrics.CO.toFixed(2)+" <em>L/min</em>";
 $("metricMAP").innerHTML=result.metrics.MAP.toFixed(1)+" <em>mmHg</em>";
 $("metricSV").innerHTML=result.metrics.SV.toFixed(1)+" <em>mL</em>";
 $("massError").textContent=result.maxDrift.toExponential(2)+" mL";
 $("modelStatus").textContent="Integration complete";
 $("sampleCount").textContent=result.data.length+" computed samples";
 document.documentElement.style.setProperty("--duration",
   (2.8*72/params.hr*100/params.speed).toFixed(2)+"s");
 charts.forEach(renderChart);
 renderPV();
 renderFlowReadouts();
 updateInspector();
}

["hr","contract","resist","blood","speed"].forEach(id=>{
 $(id).addEventListener("input",()=>{
   if(id==="speed"){
     params.speed=Number($("speed").value);
     $("speedOut").textContent=(params.speed/100).toFixed(2)+"×";
     return;
   }
   updateAll();
 });
});
$("reset").addEventListener("click",()=>{
 Object.assign(params,{hr:72,contract:100,resist:100,blood:100,speed:100});
 for(const [k,v] of Object.entries(params))$(k).value=v;
 updateAll();
});
const presets={
 rest:{hr:72,contract:100,resist:100,blood:100},
 exercise:{hr:115,contract:130,resist:65,blood:100},
 resistance:{hr:78,contract:100,resist:165,blood:100}
};
document.querySelectorAll("[data-preset]").forEach(button=>{
 button.addEventListener("click",()=>{
  const p=presets[button.dataset.preset];
  for(const [k,v] of Object.entries(p))$(k).value=v;
  updateAll();
 });
});
$("run").addEventListener("click",()=>{
 playing=!playing;
 $("run").textContent=playing?"Ⅱ Pause":"▶ Play";
});

const ecg=$("liveECG");
ecg.innerHTML="";
for(let y=20;y<180;y+=30){
 svgEl("line",{x1:0,y1:y,x2:820,y2:y,
   stroke:"#29485b","stroke-dasharray":"2 7"},ecg);
}
const beat=svgEl("path",{fill:"none",stroke:"#f3a1ad","stroke-width":3},ecg);
const cursor=svgEl("line",{x1:0,x2:0,y1:12,y2:168,
 stroke:"#fff2d6","stroke-width":2},ecg);
const beatShape=x=>{
 const t=x%1;
 const g=(at,width,amp)=>amp*Math.exp(-Math.pow((t-at)/width,2));
 return 90-g(.18,.035,11)+g(.39,.015,17)-g(.425,.009,46)+
   g(.452,.012,76)-g(.48,.018,22)-g(.72,.075,22);
};
let curve="";
for(let i=0;i<=820;i+=2){
 const x=i/820*4;
 curve+=(i===0?"M":"L")+i+","+beatShape(x).toFixed(2)+" ";
}
beat.setAttribute("d",curve);
function animate(now){
 const delta=previousFrame?Math.min(.05,(now-previousFrame)/1000):0;
 previousFrame=now;
 if(playing){
  phase=(phase+delta*params.hr/60*params.speed/100)%1;
 }
 const x=phase*820;
 cursor.setAttribute("x1",x);
 cursor.setAttribute("x2",x);
 $("phaseText").textContent=Math.round(phase*100)+"%";
 if(result)updateInspector();
 requestAnimationFrame(animate);
}
updateAll();
requestAnimationFrame(animate);
})();