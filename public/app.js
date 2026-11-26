/* Page client : charge les produits depuis le serveur */
var view="";
function route(){var c=location.hash.slice(1);view=S.cats.some(function(x){return x.id===c;})?c:(S.cats[0]?S.cats[0].id:"");renderPublic();}
window.addEventListener("hashchange",route);
function renderPublic(){
  document.title=S.shop;$("shop").textContent=S.shop;$("shop").href="#"+(S.cats[0]?S.cats[0].id:"");$("slogan").textContent=S.slogan;
  var nav=$("nav");nav.replaceChildren();
  S.cats.forEach(function(c){var a=h("a",{href:"#"+c.id,text:c.nom});if(c.id===view)a.setAttribute("aria-current","page");nav.appendChild(a);});
  $("titre").textContent=catInfo(view).nom;$("wa-main").href=wa();
  var g=$("grid");g.replaceChildren();
  var l=S.items.filter(function(p){return p.cat===view;});
  if(!l.length)g.appendChild(h("p",{class:"vide",text:"Aucun produit pour le moment."}));
  l.forEach(function(p){g.appendChild(card(p));});
}
function card(p){
  return h("article",{class:"card"},pic(p),h("div",{class:"body"},h("h3",{text:p.nom}),p.desc?h("p",{class:"desc",text:p.desc}):null,h("div",{class:"prix",text:da(p.prix)}),
    h("div",{class:"stock "+(p.dispo?"ok":"ko"),text:p.dispo?"En stock":"Indisponible pour le moment"}),
    h("a",{class:"cta",target:"_blank",rel:"noopener",href:wa("Bonjour "+S.shop+", je veux commander : "+p.nom+" ("+da(p.prix)+")."),text:"Commander sur WhatsApp"})));
}

function initChat(){
/* Chatbot */
var msgs=$("msgs"),inp=$("inp"),box=$("chat"),btn=$("chat-btn");
function say(txt,who,lab,link){var m=h("div",{class:"m "+who,text:txt});if(lab){m.appendChild(document.createTextNode(" "));m.appendChild(h("a",{href:link,target:"_blank",rel:"noopener",text:lab}));}msgs.appendChild(m);msgs.scrollTop=msgs.scrollHeight;}
function toks(s){return norm(s).split(/[^a-z0-9]+/).filter(function(t){return t.length>1;});}
function trouve(q){return S.items.filter(function(p){
  var ks=String(p.k||"").split(",").map(function(x){return norm(x).trim();}).filter(Boolean);
  if(ks.some(function(k){return q.indexOf(k)>-1;}))return true;
  var t=toks(p.nom),n=t.filter(function(x){return q.indexOf(x)>-1;}).length;return n>0&&n>=Math.min(2,t.length);});}
function liste(c){return S.items.filter(function(p){return p.cat===c;}).map(function(p){return "• "+p.nom+" : "+da(p.prix)+(p.dispo?"":" (indisponible)");}).join("\n")||"Aucun produit pour le moment.";}
function repond(t){
  var q=norm(t);
  var p=trouve(q);
  if(p.length){say(p.slice(0,3).map(function(x){return x.nom+" : "+da(x.prix)+" – "+(x.dispo?"en stock":"indisponible pour le moment");}).join("\n")+"\n\nPour commander :","bot","écrire sur WhatsApp",wa("Bonjour HM TECH, je veux commander : "+p[0].nom));return;}
  var cm=S.cats.filter(function(c){var n=norm(c.nom).split(" ")[0].replace(/s$/,"");return n.length>2&&q.indexOf(n)>-1;})[0];
  if(cm){say(cm.nom+" :\n"+liste(cm.id),"bot");return;}
  if(/telephone|smartphone|mobile|portable/.test(q)&&!/\bpc\b/.test(q)){say("Nos téléphones :\n"+liste("telephones"),"bot");return;}
  if(/\bpc\b|ordinateur|laptop|logiciel|programme|licence/.test(q)){say("PC et logiciels :\n"+liste("pc"),"bot");return;}
  if(/playstation|console|manette|jeu|gaming|\bps\d?\b/.test(q)){say("Gaming :\n"+liste("gaming"),"bot");return;}
  if(/^(bonjour|salut|salam|bonsoir|hello|slm|coucou)/.test(q)){say("Bonjour ! Je donne les prix et la disponibilité des téléphones, PC, logiciels et du gaming.","bot");return;}
  if(/merci/.test(q)){say("Avec plaisir !","bot");return;}
  if(/command|achet|reserv|livr|pay/.test(q)){say("Pour commander, envoyez-nous le nom du produit sur WhatsApp :","bot","commander maintenant",wa("Bonjour HM TECH, je veux passer une commande."));return;}
  if(/prix|combien|tarif|dispo|stock|avez/.test(q)){say("Dites-moi le nom du produit (par exemple « PS5 » ou « iPhone »), ou choisissez une catégorie.","bot");return;}
  say("Je n’ai pas cette information. Contactez-nous sur WhatsApp :","bot","écrire à HM TECH",wa());
}
function envoie(t){t=t.trim();if(!t)return;say(t,"me");setTimeout(function(){repond(t);},300);}
$("form").onsubmit=function(e){e.preventDefault();envoie(inp.value);inp.value="";};
S.cats.map(function(c){return c.nom;}).concat(["Commander"]).forEach(function(x){$("quick").appendChild(h("button",{type:"button",text:x,onclick:function(){envoie(x==="Commander"?"Je veux commander":x);}}));});
function ouvre(o){box.classList.toggle("open",o);btn.setAttribute("aria-expanded",o?"true":"false");if(o){if(!msgs.children.length)say(S.hello||"Bonjour !","bot");inp.focus();}}
btn.onclick=function(){ouvre(!box.classList.contains("open"));};
$("chat-x").onclick=function(){ouvre(false);};

}
fetch("/api/public",{cache:"no-store"}).then(function(r){return r.json();}).then(function(j){S=j;route();initChat();})
  .catch(function(){$("grid").textContent="Impossible de charger les produits. Réessayez plus tard.";});
