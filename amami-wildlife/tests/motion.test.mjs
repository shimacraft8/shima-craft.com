import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('OS motion changes restore the saved user choice and never leave the pause control stuck disabled',()=>{
 const store=new Map(),listeners={},attrs={};let onChange;
 const classes=new Set();const classList={toggle(k,on){on?classes.add(k):classes.delete(k);},contains(k){return classes.has(k)}};
 const motion={hidden:true,disabled:false,textContent:'',setAttribute(k,v){attrs[k]=v;},addEventListener(k,fn){listeners[k]=fn;}};
 const reduce={matches:false,addEventListener(k,fn){onChange=fn;}};
 const document={querySelector:s=>s==='#motion-toggle'?motion:null,body:{classList},documentElement:{classList}};
 vm.runInNewContext(fs.readFileSync(new URL('../public/wildlife/assets/app.js',import.meta.url),'utf8'),{document,matchMedia:()=>reduce,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}});
 assert.equal(motion.hidden,false);assert.equal(motion.disabled,false);assert.equal(attrs['aria-pressed'],'false');
 reduce.matches=true;onChange({matches:true});assert.equal(motion.disabled,true);assert.match(motion.textContent,/OS/);assert.equal(classes.has('motion-paused'),true);
 reduce.matches=false;onChange({matches:false});assert.equal(motion.disabled,false);assert.equal(classes.has('motion-paused'),false);
 listeners.click();assert.equal(classes.has('motion-paused'),true);
 reduce.matches=true;onChange({matches:true});reduce.matches=false;onChange({matches:false});assert.equal(motion.disabled,false);assert.equal(classes.has('motion-paused'),true);assert.match(motion.textContent,/再開/);
});
