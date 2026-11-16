'use client';
import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { cpp } from '@codemirror/lang-cpp';
import { basicSetup } from 'codemirror';
import { indentWithTab } from '@codemirror/commands';
import { autocompletion } from '@codemirror/autocomplete';
import { setDiagnostics } from '@codemirror/lint';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import {LIBRARIES} from '../service/libraries.mjs';
import type { CompileResult } from '../lib/sketches';
const words = [
  ['Servo','class','Servo arm;'], ['Wire','variable','Wire.begin()'], ['SPI','variable','SPI.begin()'], ['LiquidCrystal','class','LiquidCrystal display(...)'], ['Adafruit_NeoPixel','class','Adafruit_NeoPixel strip(...)'], ['DHT','class','DHT sensor(pin, DHT22)'], ['Stepper','class','Stepper motor(...)'], ['pinMode','function','pinMode(pin, OUTPUT)'], ['digitalWrite','function','digitalWrite(pin, HIGH)'], ['digitalRead','function','digitalRead(pin)'], ['analogRead','function','analogRead(pin)'], ['analogWrite','function','analogWrite(pin, value)'], ['delay','function','delay(milliseconds)'], ['millis','function','millis()'], ['micros','function','micros()'], ['Serial','variable','Serial'], ['LED_BUILTIN','constant','LED_BUILTIN'], ['HIGH','constant','HIGH'], ['LOW','constant','LOW'], ['INPUT','constant','INPUT'], ['OUTPUT','constant','OUTPUT'], ['INPUT_PULLUP','constant','INPUT_PULLUP'], ['setup','function','setup'], ['loop','function','loop'], ['int','keyword','int'], ['void','keyword','void'], ['const','keyword','const'], ['unsigned long','keyword','unsigned long'], ['boolean','keyword','boolean'], ['byte','keyword','byte'], ['map','function','map(value, fromLow, fromHigh, toLow, toHigh)'], ['constrain','function','constrain(value, low, high)'],
];
const theme = EditorView.theme({
  '&':{height:'100%',backgroundColor:'#1f1f1f',color:'#d4d4d4',fontSize:'14px'},
  '.cm-content':{fontFamily:'"IBM Plex Mono", monospace',padding:'15px 0',caretColor:'#fff'},
  '.cm-line':{padding:'0 18px 0 14px',lineHeight:'1.6'},
  '.cm-scroller':{fontFamily:'"IBM Plex Mono", monospace',overflow:'auto'},
  '.cm-gutters':{backgroundColor:'#1f1f1f',color:'#858585',border:'none',paddingRight:'10px',minWidth:'55px'},
  '.cm-activeLineGutter':{backgroundColor:'#292929',color:'#c5c9ce'},
  '.cm-activeLine':{backgroundColor:'#ffffff04'},
  '.cm-cursor':{borderLeftColor:'#fff'},
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground':{backgroundColor:'#434954 !important'},
  '.cm-foldPlaceholder':{backgroundColor:'#34373d',color:'#aaa',border:'none'},
  '.cm-tooltip':{backgroundColor:'#282c32',color:'#eee',border:'1px solid #4a4c50'},
  '.cm-tooltip-autocomplete > ul > li[aria-selected]':{backgroundColor:'#b92b2d',color:'#fff'},
  '.cm-panel.cm-search':{backgroundColor:'#282c32',color:'#eee'},
  '.cm-textfield':{backgroundColor:'#1f1f1f',color:'#fff'},
  '.cm-button':{background:'#33373e',color:'#fff'},
  '.cm-diagnostic-error':{borderLeftColor:'#ef6661'},
  '.cm-lintRange-error':{backgroundImage:'none',textDecoration:'underline wavy #ef6661'},
},{dark:true});
const highlight = HighlightStyle.define([
  {tag: tags.comment,color:'#7a9b65'}, {tag:[tags.keyword,tags.modifier],color:'#569cd6'},
  {tag:[tags.typeName,tags.standard(tags.typeName)],color:'#4ec9b0'},
  {tag:[tags.function(tags.variableName),tags.function(tags.propertyName)],color:'#dcdcaa'},
  {tag:tags.string,color:'#ce9178'}, {tag:[tags.number,tags.bool],color:'#b5cea8'},
  {tag:tags.meta,color:'#c586c0'}, {tag:tags.operator,color:'#b8bec9'},
]);
export default function CodeEditor({documentKey,code,onChange,onCursor,diagnostics,goLine,fontSize}:{documentKey:string;code:string;onChange:(s:string)=>void;onCursor:(l:number,c:number)=>void;diagnostics:CompileResult['diagnostics'];goLine?:{line:number;nonce:number};fontSize:number}){
 const host=useRef<HTMLDivElement>(null),view=useRef<EditorView|null>(null),onChangeRef=useRef(onChange),cursorRef=useRef(onCursor),font=useRef(new Compartment());
 const documents=useRef(new Map<string,EditorState>()),currentKey=useRef(documentKey),createState=useRef<((value:string)=>EditorState)|null>(null);
 onChangeRef.current=onChange;cursorRef.current=onCursor;
 useEffect(()=>{
  if(!host.current)return;
  const extensions=[basicSetup,cpp(),EditorView.contentAttributes.of({'aria-label':'Arduino C++ source code'}),theme,syntaxHighlighting(highlight),font.current.of(EditorView.theme({'&':{fontSize:`${fontSize}px`}})),keymap.of([indentWithTab]),EditorState.tabSize.of(2),autocompletion({override:[ctx=>{const include=ctx.matchBefore(/#\s*include\s*[<"][\w.]*$/);if(include)return {from:include.from,options:LIBRARIES.map(library=>({label:'#include <'+library.header+'>',type:'keyword',detail:library.name}))};const word=ctx.matchBefore(/[\w]+/);if(!word||(!ctx.explicit&&word.from===word.to))return null;return {from:word.from,options:words.map(([label,type,detail])=>({label,type,detail}))};}]}),EditorView.updateListener.of(update=>{if(update.docChanged)onChangeRef.current(update.state.doc.toString());if(update.selectionSet||update.docChanged){const position=update.state.selection.main.head,line=update.state.doc.lineAt(position);cursorRef.current(line.number,position-line.from+1);}})];
  createState.current=value=>EditorState.create({doc:value,extensions});
  const editor=new EditorView({parent:host.current,state:createState.current(code)});
  view.current=editor;currentKey.current=documentKey;
  return()=>{editor.destroy();view.current=null;documents.current.clear()};
 },[]);
 useEffect(()=>{
  const editor=view.current;
  if(!editor||currentKey.current===documentKey||!createState.current)return;
  documents.current.set(currentKey.current,editor.state);
  const next=documents.current.get(documentKey)||createState.current(code);
  editor.setState(next);currentKey.current=documentKey;
  const position=next.selection.main.head,line=next.doc.lineAt(position);
  cursorRef.current(line.number,position-line.from+1);
 },[documentKey]);
 useEffect(()=>{const editor=view.current;if(editor&&editor.state.doc.toString()!==code)editor.dispatch({changes:{from:0,to:editor.state.doc.length,insert:code}})},[code,documentKey]);
 useEffect(()=>{const editor=view.current;if(editor)editor.dispatch({effects:font.current.reconfigure(EditorView.theme({'&':{fontSize:`${fontSize}px`}}))})},[fontSize,documentKey]);
 useEffect(()=>{const editor=view.current;if(editor)editor.dispatch(setDiagnostics(editor.state,diagnostics.map(item=>{const line=editor.state.doc.line(Math.min(Math.max(1,item.line),editor.state.doc.lines)),from=Math.min(line.to,line.from+Math.max(0,item.column-1));return {from,to:Math.min(line.to,from+1),severity:item.severity,message:item.message}})))},[diagnostics,documentKey]);
 useEffect(()=>{const editor=view.current;if(editor&&goLine){const line=editor.state.doc.line(Math.min(goLine.line,editor.state.doc.lines));editor.dispatch({selection:{anchor:line.from},effects:EditorView.scrollIntoView(line.from,{y:'center'})});editor.focus()}},[goLine]);
 return <div className="code-host" ref={host} aria-label="Arduino C++ code editor"/>;
}
