import L from "leaflet";
import { validSkyPoint, viewportRay, cycloneTime } from "./usage.js";

/** View-only map. Point coordinates stay in memory; calculations run in the app. */
export function createSkyMap(element,{origin,events,onPick,onError,view}={}) {
  const map=L.map(element,{zoomControl:false,attributionControl:false,scrollWheelZoom:false,minZoom:9,maxZoom:19,maxBounds:[[27.7,128.8],[28.95,130.2]],maxBoundsViscosity:1,keyboard:true,inertia:false,fadeAnimation:false,zoomAnimation:false,markerZoomAnimation:false});
  element.setAttribute("role","region");
  element.setAttribute("aria-label","出入りの方位を調べる地図。矢印キーで移動し、中央を選ぶボタンで計算地点を指定できます。");
  map.setView(view?.center ?? [origin.lat,origin.lon],view?.zoom ?? 10,{animate:false});
  element.setAttribute("aria-busy","true");
  let tileFailed=false;
  const base=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,minZoom:9,className:"sky-street-tiles",keepBuffer:0,updateWhenIdle:true,updateWhenZooming:false}).addTo(map);
  base.on("loading",()=>{tileFailed=false;element.setAttribute("aria-busy","true");});
  base.on("load",()=>{element.setAttribute("aria-busy","false");if(!tileFailed)onError?.(null,"network");});
  base.on("tileerror",()=>{tileFailed=true;onError?.("地図の一部を取得できませんでした。時刻と方位は下に表示しています。","network");});
  const marker=L.marker([origin.lat,origin.lon],{keyboard:false,draggable:true,icon:L.divIcon({className:"sky-map-pin",html:'<span aria-hidden="true"></span>',iconSize:[18,18],iconAnchor:[9,9]})}).addTo(map);
  const lines=L.layerGroup().addTo(map);
  let state={origin,events},dead=false;
  function pick(latlng){if(validSkyPoint(latlng.lat,latlng.lng)) onPick({lat:latlng.lat,lon:latlng.lng});else onError?.("奄美大島周辺の地点を選んでください。","point");}
  map.on("click",event=>pick(event.latlng));
  marker.on("dragend",()=>{const point=marker.getLatLng();pick(point);marker.setLatLng([state.origin.lat,state.origin.lon]);});
  function draw(){
    if(dead) return;
    lines.clearLayers();
    const start=map.latLngToContainerPoint([state.origin.lat,state.origin.lon]),size=map.getSize();
    for(const kind of ["rise","set"]){
      const event=state.events[kind];if(event?.azimuth==null) continue;
      const end=viewportRay(start,size.x,size.y,event.azimuth);if(!end)continue;
      const endpoint=map.containerPointToLatLng(L.point(end.x,end.y));
      const color=kind==="rise" ? "#e1b96e" : "#fff5df";
      L.polyline([[state.origin.lat,state.origin.lon],endpoint],{color:"#222522",weight:7,opacity:.85,interactive:false}).addTo(lines);
      L.polyline([[state.origin.lat,state.origin.lon],endpoint],{color,weight:3,dashArray:kind==="set" ? "7 6" : undefined,interactive:false}).addTo(lines);
      L.circleMarker(endpoint,{radius:4,color:"#222522",weight:2,fillColor:color,fillOpacity:1,interactive:false}).addTo(lines);
    }
  }
  map.on("move zoom resize",draw);
  const onKey=event=>{
    const offset={ArrowLeft:[-80,0],ArrowRight:[80,0],ArrowUp:[0,-80],ArrowDown:[0,80]}[event.key];
    if(!offset || event.altKey || event.ctrlKey || event.metaKey)return;
    event.preventDefault();event.stopPropagation();const factor=event.shiftKey ? 3 : 1;map.panBy(offset.map(v=>v*factor),{animate:false});
  };
  element.addEventListener("keydown",onKey);
  const resize=new ResizeObserver(()=>{if(!dead){map.invalidateSize({animate:false,pan:false});draw();}});resize.observe(element);
  draw();
  return {
    setState(next){state=next;marker.setLatLng([next.origin.lat,next.origin.lon]);draw();},
    zoom(delta){map.setZoom(map.getZoom()+delta,{animate:false});},
    center(){pick(map.getCenter());},
    reset(point){map.setView([point.lat,point.lon],10,{animate:false});},
    setView(view){map.setView(view.center,view.zoom,{animate:false});},
    getView(){return {center:[map.getCenter().lat,map.getCenter().lng],zoom:map.getZoom()};},
    destroy(){dead=true;resize.disconnect();element.removeEventListener("keydown",onKey);map.remove();},
  };
}

/** Official forecast centers/circles. Text controls provide the same details. */
export function createCycloneMap(element,{data,stale=false,onSelect,onError}={}) {
 const map=L.map(element,{zoomControl:false,attributionControl:false,scrollWheelZoom:false,minZoom:2,maxZoom:8,maxBounds:[[-10,70],[65,205]],maxBoundsViscosity:1,inertia:false,fadeAnimation:false,zoomAnimation:false,markerZoomAnimation:false});
 element.setAttribute('role','region');element.setAttribute('aria-label','台風の予報進路と奄美大島の位置。矢印キーで移動できます。詳細は時刻ボタンでも選べます。');
 const base=L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',{minZoom:2,maxZoom:8,className:'sky-base-tiles',keepBuffer:1,updateWhenIdle:true,updateWhenZooming:false}).addTo(map);
 let failed=false,dead=false;const layers=[];
 base.on('loading',()=>{failed=false;element.setAttribute('aria-busy','true');});
 base.on('tileerror',()=>{failed=true;onError?.('地図の一部を取得できませんでした。予報値は時刻ボタンから確認できます。');});
 base.on('load',()=>{element.setAttribute('aria-busy','false');if(!failed)onError?.(null);});
 const amami=[28.31667,129.53333];map.setView(amami,4,{animate:false});
 L.circleMarker(amami,{radius:6,color:'#fff5df',weight:2,fillColor:'#e1b96e',fillOpacity:1,interactive:false}).addTo(map).bindTooltip('奄美大島',{permanent:true,direction:'right',className:'cyclone-place-label',offset:[10,0]});
 const bounds=L.latLngBounds([amami]);
 L.polyline(data.points.map(p=>[p.lat,p.lon]),{color:'#f7eddb',weight:2.5,dashArray:'6 7',interactive:false}).addTo(map);
 for(const p of data.points){
  const center=[p.lat,p.lon];bounds.extend(center);
  const circle=p.radiusM ? L.circle(center,{radius:p.radiusM,color:'#fff5df',weight:1.5,opacity:.85,fillColor:'#e1b96e',fillOpacity:.025,interactive:false}).addTo(map) : null;
  if(circle)bounds.extend(circle.getBounds());
  const marker=L.circleMarker(center,{radius:p.hours===0 ? 9 : 4.5,color:p.hours===0 ? '#e1b96e' : '#fff5df',weight:2,fillColor:p.hours===0 ? '#e1b96e' : '#242925',fillOpacity:1,interactive:true}).addTo(map);
  const label=p.hours===0 ? `${stale ? '保存' : '現在'} · ${cycloneTime(p.validAt,0,stale).time}` : new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',day:'numeric',hour:'2-digit',hourCycle:'h23'}).format(new Date(p.validAt));
  marker.bindTooltip(label,{permanent:p.hours===0 || p===data.points.at(-1) || (element.clientWidth>=500 && (p===data.points[2] || p===data.points[4])),direction:p.hours===0 ? 'left' : 'right',className:'cyclone-time-label',offset:[8,0]});
  marker.on('click',()=>onSelect(p.hours));layers.push({p,circle,marker});
 }
 function fit(){if(!dead)map.fitBounds(bounds,{padding:[45,45],animate:false,maxZoom:6});}
 const onKey=event=>{const offset={ArrowLeft:[-80,0],ArrowRight:[80,0],ArrowUp:[0,-80],ArrowDown:[0,80]}[event.key];if(!offset || event.altKey || event.ctrlKey || event.metaKey)return;event.preventDefault();event.stopPropagation();map.panBy(offset,{animate:false});};element.addEventListener('keydown',onKey);
 const resize=new ResizeObserver(()=>{if(!dead)map.invalidateSize({animate:false,pan:false});});resize.observe(element);fit();
 return {select(hours){for(const {p,circle,marker} of layers){const selected=p.hours===hours;circle?.setStyle({color:selected ? '#e1b96e' : '#fff5df',weight:selected ? 3 : 1.5,fillOpacity:selected ? .1 : .025});marker.setRadius(selected ? 9 : p.hours===0 ? 8 : 4.5);if(selected)marker.openTooltip();else if(p.hours!==0 && p!==data.points.at(-1) && (element.clientWidth<500 || (p!==data.points[2] && p!==data.points[4])))marker.closeTooltip();}},zoom(delta){map.setZoom(map.getZoom()+delta,{animate:false});},fit,destroy(){dead=true;resize.disconnect();element.removeEventListener('keydown',onKey);map.remove();}};
}
