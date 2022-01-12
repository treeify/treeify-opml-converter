import{m as e}from"./vendor.14b3b047.js";function t(e){if(console.assert(null!==e),null===e)throw new Error}document.title="DynalistやWorkFlowyのOPMLをTreeify用に変換";const r={emStrong(e,t,r){const o=/^__(.+)__/.exec(e);return null!==o&&{type:"em",raw:o[0],text:o[1]}}},o={strong:e=>`<b>${e}</b>`,em:e=>`<i>${e}</i>`,del:e=>`<strike>${e}</strike>`};e.use({tokenizer:r,renderer:o});const n=document.querySelector("#input-area");function l(r,o){const n=o.getAttribute("text");t(n);const l=s(e.parseInline(n)),c=l.querySelectorAll("a");for(const e of c)e.text!==e.href?e.replaceWith(...e.childNodes,` ${e.href} `):e.replaceWith(...e.childNodes);const u=l.querySelectorAll("img");for(const e of u)""===e.alt?e.replaceWith(e.src):e.replaceWith(`${e.alt} ${e.src}`);const a=l.querySelectorAll("*");for(const e of a)new Set(["b","u","i","strike"]).has(e.tagName.toLowerCase())||e.replaceWith(...e.childNodes);o.setAttribute("html",i(l));"true"===o.getAttribute("complete")&&o.setAttribute("cssClass","completed");const m=o.getAttribute("_note");if(null!==m){const e=r.createElement("outline");e.setAttribute("text",m),o.prepend(e),o.removeAttribute("_note")}}function c(e,r){const o=r.getAttribute("text");t(o);const n=s(o),l=n.querySelectorAll("a");for(const t of l)t.text!==t.href?t.replaceWith(...t.childNodes,` ${t.href} `):t.replaceWith(...t.childNodes);const c=n.querySelectorAll("img");for(const t of c)""===t.alt?t.replaceWith(t.src):t.replaceWith(`${t.alt} ${t.src}`);const u=n.querySelectorAll("*");for(const t of u)new Set(["b","u","i","strike"]).has(t.tagName.toLowerCase())||t.replaceWith(...t.childNodes);r.setAttribute("html",i(n));"true"===r.getAttribute("_complete")&&r.setAttribute("cssClass","completed");const a=r.getAttribute("_note");if(null!==a){const t=e.createElement("outline");t.setAttribute("text",a),r.prepend(t),r.removeAttribute("_note")}}function s(e){const t=document.createElement("template");return t.innerHTML=e,t.content}function i(e){const t=document.createElement("dummy");return t.append(e),t.innerHTML}t(n),n.addEventListener("input",(()=>{const e=document.querySelector("#output-area");t(e);const r=document.querySelector("#form");t(r);const o=(new DOMParser).parseFromString(n.value,"text/xml");if(o.getElementsByTagName("parsererror").length>0)""!==n.value?e.value="エラー：OPMLとして認識できません。":e.value="";else{for(const e of[...o.getElementsByTagName("outline")])switch(r.outlinerName.value){case"Dynalist":l(o,e);break;case"WorkFlowy":c(o,e)}e.value=function(e){const t=(new XMLSerializer).serializeToString(e.documentElement);return t.startsWith("<?xml")?t:'<?xml version="1.0"?>\n'+t}(o)}}));
