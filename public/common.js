var S={shop:"",slogan:"",hello:"",wa:"",cats:[],items:[]};
var $=function(i){return document.getElementById(i);};
function h(t,p){var e=document.createElement(t);p=p||{};for(var k in p){if(k==="text")e.textContent=p[k];else if(k.slice(0,2)==="on")e[k]=p[k];else e.setAttribute(k,p[k]);}
  for(var i=2;i<arguments.length;i++)if(arguments[i])e.appendChild(arguments[i]);return e;}
function norm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
function da(n){n=Number(n)||0;return n>0?n.toLocaleString("fr-FR")+" DA":"Prix : nous contacter";}
function wa(t){return "https://wa.me/"+String(S.wa).replace(/\D/g,"")+"?text="+encodeURIComponent(t||"Bonjour "+S.shop+", j’ai une question.");}
function catInfo(id){return S.cats.filter(function(c){return c.id===id;})[0]||{id:"",nom:"",emo:"📦"};}
function pic(p){return p.photo?h("img",{src:p.photo,alt:p.nom,loading:"lazy"}):h("div",{class:"ph","aria-hidden":"true",text:catInfo(p.cat).emo});}
