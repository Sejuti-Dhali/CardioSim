"use strict";

(() => {
  const svgNS = "http://www.w3.org/2000/svg";

  const svg = document.getElementById("netCanvas");
  const edgeLayer = document.getElementById("networkEdges");
  const nodeLayer = document.getElementById("networkNodes");

  if (!svg || !edgeLayer || !nodeLayer) {
    throw new Error("Interactive CardioSim network is missing.");
  }

  const defaults = {
    RA: {x:120,y:110,label:"RIGHT ATRIUM",type:"chamber"},
    RV: {x:345,y:100,label:"RIGHT VENTRICLE",type:"chamber"},
    PC: {x:680,y:160,label:"PULMONARY",type:"circuit"},
    LA: {x:680,y:350,label:"LEFT ATRIUM",type:"chamber"},
    LV: {x:350,y:405,label:"LEFT VENTRICLE",type:"chamber"},
    SC: {x:120,y:335,label:"SYSTEMIC",type:"circuit"}
  };

  const nodes = JSON.parse(JSON.stringify(defaults));

  const edges = [
    {a:"RA",b:"RV",name:"Tricuspid valve pathway",
     info:"Blood travels from the right atrium into the right ventricle through the tricuspid valve.",bend:-24},
    {a:"RV",b:"PC",name:"Pulmonary valve and artery",
     info:"The right ventricle ejects blood toward the pulmonary circulation.",bend:-35},
    {a:"PC",b:"LA",name:"Pulmonary venous return",
     info:"Oxygenated blood returns from the pulmonary circulation to the left atrium.",bend:-42},
    {a:"LA",b:"LV",name:"Mitral valve pathway",
     info:"Blood passes from the left atrium to the left ventricle during filling.",bend:-25},
    {a:"LV",b:"SC",name:"Aortic outflow",
     info:"The left ventricle ejects blood into the systemic circulation.",bend:-36},
    {a:"SC",b:"RA",name:"Systemic venous return",
     info:"Systemic venous blood returns toward the right atrium, completing the conceptual circuit.",bend:-44}
  ];

  const shapes = [];
  let active = null;
  let selected = -1;

  function elt(name,attributes={},parent=null){
    const e=document.createElementNS(svgNS,name);
    for(const [k,v] of Object.entries(attributes)){
      e.setAttribute(k,String(v));
    }
    if(parent)parent.appendChild(e);
    return e;
  }

  function point(event){
    const p=svg.createSVGPoint();
    p.x=event.clientX;
    p.y=event.clientY;
    const ctm=svg.getScreenCTM();
    return ctm ? p.matrixTransform(ctm.inverse()) : {x:0,y:0};
  }

  function center(id){
    return {x:nodes[id].x,y:nodes[id].y};
  }

  function bezier(e){
    const a=center(e.a),b=center(e.b);
    const dx=b.x-a.x,dy=b.y-a.y;
    const length=Math.max(1,Math.hypot(dx,dy));
    const nx=-dy/length,ny=dx/length;
    const midpoint={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    const control={x:midpoint.x+nx*e.bend,
                   y:midpoint.y+ny*e.bend};
    return {a,b,control,midpoint,nx,ny};
  }

  function drawEdges(){
    edges.forEach((edge,i)=>{
      const s=shapes[i],g=bezier(edge);
      const d=`M${g.a.x},${g.a.y} Q${g.control.x},${g.control.y} ${g.b.x},${g.b.y}`;

      s.visible.setAttribute("d",d);
      s.hit.setAttribute("d",d);
      s.handle.setAttribute("cx",g.control.x);
      s.handle.setAttribute("cy",g.control.y);
      s.visible.classList.toggle("selected-wire",i===selected);
    });
  }

  function drawNodes(){
    for(const [id,group] of Object.entries(nodeGroups)){
      const n=nodes[id];
      group.setAttribute("transform",`translate(${n.x},${n.y})`);
    }
  }

  function render(){
    drawEdges();
    drawNodes();
  }

  edges.forEach((edge,i)=>{
    const g=elt("g",{"class":"net-edge"},edgeLayer);
    const visible=elt("path",{
      "class":"wire","fill":"none",
      "marker-end":"url(#flowArrow)"
    },g);

    const hit=elt("path",{
      "class":"wire-hit","fill":"none","stroke":"transparent",
      "stroke-width":"24"
    },g);

    const handle=elt("circle",{
      "class":"wire-handle",r:10,"tabindex":"0",
      "role":"button",
      "aria-label":"Move bend of "+edge.name
    },g);

    shapes.push({visible,hit,handle});

    hit.addEventListener("pointerdown",event=>{
      if(event.button!==0)return;
      event.preventDefault();
      selectEdge(i);
    });

    handle.addEventListener("pointerdown",event=>{
      if(event.button!==0)return;
      event.preventDefault();
      event.stopPropagation();
      active={kind:"wire",index:i,start:point(event)};
      selectEdge(i);
      svg.setPointerCapture(event.pointerId);
    });

    handle.addEventListener("keydown",event=>{
      if(event.key==="ArrowUp"||event.key==="ArrowDown"){
        event.preventDefault();
        edge.bend += event.key==="ArrowUp" ? -8:8;
        selectEdge(i);
        render();
      }
    });
  });

  function selectEdge(i){
    selected=i;
    document.getElementById("connectionTitle").textContent=edges[i].name;
    document.getElementById("connectionText").textContent=edges[i].info;
    drawEdges();
  }

  const nodeGroups={};

  for(const [id,n] of Object.entries(nodes)){
    const g=elt("g",{
      "class":"net-node "+n.type,
      "data-node":id,
      "tabindex":"0",
      "role":"button",
      "aria-label":"Move "+n.label
    },nodeLayer);

    elt("rect",{
      x:-80,y:-34,width:160,height:68,rx:15
    },g);

    elt("circle",{
      cx:-58,cy:0,r:8,"class":"node-indicator"
    },g);

    const text=elt("text",{
      x:-41,y:5,"class":"node-label"
    },g);

    text.textContent=n.label;

    g.addEventListener("pointerdown",event=>{
      if(event.button!==0)return;
      event.preventDefault();
      event.stopPropagation();
      active={kind:"node",id};
      svg.setPointerCapture(event.pointerId);
    });

    g.addEventListener("keydown",event=>{
      const directions={
        ArrowLeft:[-10,0],ArrowRight:[10,0],
        ArrowUp:[0,-10],ArrowDown:[0,10]
      };
      const delta=directions[event.key];
      if(!delta)return;
      event.preventDefault();
      n.x=Math.max(85,Math.min(795,n.x+delta[0]));
      n.y=Math.max(50,Math.min(465,n.y+delta[1]));
      render();
    });

    nodeGroups[id]=g;
  }

  svg.addEventListener("pointermove",event=>{
    if(!active)return;

    const p=point(event);

    if(active.kind==="node"){
      const n=nodes[active.id];
      n.x=Math.max(85,Math.min(795,p.x));
      n.y=Math.max(50,Math.min(465,p.y));
    }
    else{
      const e=edges[active.index];
      const g=bezier(e);
      e.bend=(p.x-g.midpoint.x)*g.nx+
             (p.y-g.midpoint.y)*g.ny;
      e.bend=Math.max(-160,Math.min(160,e.bend));
    }

    render();
  });

  function release(){active=null;}
  svg.addEventListener("pointerup",release);
  svg.addEventListener("pointercancel",release);
  svg.addEventListener("lostpointercapture",release);

  document.getElementById("networkReset")
    .addEventListener("click",()=>{
      for(const id of Object.keys(defaults)){
        nodes[id].x=defaults[id].x;
        nodes[id].y=defaults[id].y;
      }
      const bends=[-24,-35,-42,-25,-36,-44];
      edges.forEach((e,i)=>e.bend=bends[i]);
      selected=-1;
      document.getElementById("connectionTitle").textContent="Explore the circulation";
      document.getElementById("connectionText").textContent="Select an animated connection or drag a pink handle to examine the pathway.";
      render();
    });

  render();

  // ---------------------------------------------------
  // DYNAMIC RESULTS — EDUCATIONAL WAVEFORM SYNTHESIS
  // ---------------------------------------------------

  const inputs={
    hr:document.getElementById("hr"),
    sv:document.getElementById("sv"),
    edv:document.getElementById("edv"),
    pressure:document.getElementById("pressure")
  };

  const $=id=>document.getElementById(id);

  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));

  // A smooth transition function over [0,1].
  const smooth=t=>{
    t=clamp(t,0,1);
    return t*t*(3-2*t);
  };

  function model(t,sv,edv,peak){
    // These are illustrative phase boundaries, not fitted
    // or calibrated parameters from the original Simulink model.
    const esv=Math.max(0,edv-sv);

    let volume;
    if(t<0.15)volume=edv;
    else if(t<0.48){
      const s=smooth((t-0.15)/0.33);
      volume=edv-sv*s;
    }
    else if(t<0.57)volume=esv;
    else{
      const s=smooth((t-0.57)/0.43);
      volume=esv+sv*s;
    }

    let pressure;
    if(t<0.15){
      pressure=8+(peak-8)*smooth(t/0.15);
    }
    else if(t<0.48){
      const s=(t-0.15)/0.33;
      pressure=peak*(1-0.25*s);
    }
    else if(t<0.57){
      pressure=8+(peak*0.75-8)*(1-smooth((t-0.48)/0.09));
    }
    else{
      pressure=8+4*smooth((t-0.57)/0.43);
    }

    let flow=0;
    if(t>=0.15 && t<=0.48){
      const s=(t-0.15)/0.33;
      flow=Math.max(0,Math.sin(Math.PI*s));
    }

    return {pressure,volume,flow};
  }

  function graph(id,values,maxY,color,yUnit){
    const chart=$(id);
    if(!chart)return;

    const W=640,H=240;
    const left=60,right=20,top=18,bottom=39;
    const pw=W-left-right,ph=H-top-bottom;

    let body="";

    for(let i=0;i<=4;i++){
      const y=top+(ph/4)*i;
      const label=(maxY*(1-i/4)).toFixed(
        maxY<=1?2:0
      );

      body+=`<line x1="${left}" y1="${y}" x2="${W-right}" y2="${y}" stroke="#355368" stroke-dasharray="3 6"/>`;
      body+=`<text x="${left-10}" y="${y+4}" fill="#9fb4c1" font-size="12" text-anchor="end">${label}</text>`;
    }

    let d="";
    values.forEach((v,i)=>{
      const x=left+(i/(values.length-1))*pw;
      const y=top+(1-clamp(v/maxY,0,1))*ph;
      d+=(i===0?"M":" L")+x.toFixed(2)+" "+y.toFixed(2);
    });

    body+=`<path d="${d}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    body+=`<text x="${W-right}" y="${H-11}" fill="#a5c0cd" font-size="12" text-anchor="end">Normalized cardiac cycle →</text>`;
    body+=`<text x="${left}" y="${H-11}" fill="#9db5c2" font-size="12">${yUnit}</text>`;

    chart.innerHTML=body;
  }

  function refresh(){
    const hr=Number(inputs.hr.value);
    const sv=Number(inputs.sv.value);
    const edv=Number(inputs.edv.value);
    const peak=Number(inputs.pressure.value);

    const co=hr*sv/1000;
    const ef=sv/edv*100;
    const cycle=60/hr;

    $("networkOutput").textContent=co.toFixed(2)+" L/min";
    $("resultsState").textContent=hr+" BPM";
    $("resultCO").textContent=co.toFixed(2)+" L/min";
    $("resultSV").textContent=sv+" mL";
    $("resultEF").textContent=ef.toFixed(1)+"%";
    $("resultCycle").textContent=cycle.toFixed(2)+" s";

    // Faster heart rate produces faster visual flow.
    document.documentElement.style.setProperty(
      "--flow-duration",
      (2.7*70/hr).toFixed(2)+"s"
    );

    const samples=180;
    const pressures=[],volumes=[],flows=[];

    for(let i=0;i<samples;i++){
      const m=model(i/(samples-1),sv,edv,peak);
      pressures.push(m.pressure);
      volumes.push(m.volume);
      flows.push(m.flow);
    }

    graph("pressureChart",pressures,200,"#f3a1ac","Pressure");
    graph("volumeChart",volumes,210,"#84d3cf","Volume");
    graph("flowChart",flows,1.1,"#e3c489","Relative flow");
  }

  Object.values(inputs).forEach(input=>{
    input.addEventListener("input",refresh);
  });

  // The original reset button remains functional.
  $("reset").addEventListener("click",()=>{
    // Original CardioSim listener restores default
    // values synchronously in this same click event.
    refresh();
  });

  refresh();
})();