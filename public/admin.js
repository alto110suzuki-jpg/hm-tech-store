/* Espace administrateur : connexion par e-mail + mot de passe (côté serveur) */
var tab="produits",pcat="",dirty=false;
function api(path,opt){
  opt=opt||{};opt.credentials="same-origin";opt.headers={"Content-Type":"application/json","X-Requested-With":"hm"};
  return fetch(path,opt).then(function(r){return r.json().catch(function(){return {};}).then(function(j){return {ok:r.ok,status:r.status,j:j};});});
}
function mark(){dirty=true;$("st").textContent="Modifications non enregistrées";}
function showLogin(){$("login").hidden=false;$("adminbar").className="";$("panel").className="";$("panel").replaceChildren();}
function showApp(){$("login").hidden=true;$("adminbar").className="on";panel();}
function panel(){
  var P=$("panel");P.replaceChildren();P.className="ed on";
  var w=h("div",{class:"wrap"}),t=h("div",{class:"ptabs",role:"tablist"});
  [["produits","1. Produits"],["prix","2. Prix et stock"],["param","3. Paramètres"]].forEach(function(x){
    t.appendChild(h("button",{role:"tab","aria-selected":tab===x[0]?"true":"false",text:x[1],onclick:function(){tab=x[0];panel();}}));});
  w.appendChild(t);
  if(tab==="produits")w.appendChild(pProduits());else if(tab==="prix")w.appendChild(pPrix());else{w.appendChild(pParam());w.appendChild(pSecu());}
  P.appendChild(w);
}
function field(lab,el){return h("label",{},document.createTextNode(lab),el);}
function pProduits(){
  if(!S.cats.some(function(c){return c.id===pcat;}))pcat=S.cats[0]?S.cats[0].id:"";
  var s=h("select",{"aria-label":"Rubrique",onchange:function(){pcat=this.value;panel();}});
  S.cats.forEach(function(c){var o=h("option",{value:c.id,text:c.emo+" "+c.nom});if(c.id===pcat)o.selected=true;s.appendChild(o);});
  var g=h("div",{class:"grid"});
  S.items.filter(function(p){return p.cat===pcat;}).forEach(function(p){g.appendChild(editCard(p));});
  g.appendChild(h("div",{class:"add"},h("button",{class:"cta",text:"+ Ajouter un produit",onclick:function(){
    S.items.push({id:"n"+Date.now().toString(36),cat:pcat,nom:"Nouveau produit",prix:0,dispo:true,desc:"",photo:"",k:""});mark();panel();}})));
  return h("div",{},h("label",{text:"Rubrique : "},s),h("p",{class:"sub",text:"Choisissez la rubrique, puis modifiez ou ajoutez des produits avec photo et description."}),g);
}
function resize(file,cb){var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var m=720,k=Math.min(1,m/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);cb(c.toDataURL("image/jpeg",.78));};im.src=r.result;};r.readAsDataURL(file);}
function editCard(p){
  var f=h("input",{type:"file",accept:"image/*","aria-label":"Choisir une photo",onchange:function(){if(this.files[0])resize(this.files[0],function(d){p.photo=d;mark();panel();});}});
  var rm=p.photo?h("button",{type:"button",text:"Retirer la photo",onclick:function(){p.photo="";mark();panel();}}):null;
  var nom=h("input",{type:"text",value:p.nom,oninput:function(){p.nom=this.value;mark();}});
  var prix=h("input",{type:"number",min:"0",step:"100",value:p.prix,oninput:function(){p.prix=Number(this.value)||0;mark();}});
  var desc=h("textarea",{oninput:function(){p.desc=this.value;mark();}});desc.value=p.desc||"";
  var k=h("input",{type:"text",value:p.k||"",placeholder:"ex : ps5, playstation 5",oninput:function(){p.k=this.value;mark();}});
  var d=h("input",{type:"checkbox",onchange:function(){p.dispo=this.checked;mark();}});d.checked=!!p.dispo;
  var del=h("button",{type:"button",class:"del",text:"Supprimer ce produit",onclick:function(){if(confirm("Supprimer « "+p.nom+" » ?")){S.items=S.items.filter(function(x){return x!==p;});mark();panel();}}});
  return h("article",{class:"card ed"},pic(p),h("div",{class:"body"},
    h("div",{class:"row"},f,rm),field("Nom",nom),field("Prix (DA)",prix),field("Description",desc),
    field("Mots pour l’assistant (séparés par des virgules)",k),h("label",{class:"row"},d,document.createTextNode(" En stock")),del));
}
function pPrix(){
  var d=h("div",{},h("p",{class:"sub",text:"Changez tous vos prix et le stock au même endroit."}));
  S.cats.forEach(function(c){
    d.appendChild(h("h3",{text:c.emo+" "+c.nom}));
    S.items.filter(function(p){return p.cat===c.id;}).forEach(function(p){
      var pr=h("input",{type:"number",min:"0",step:"100",value:p.prix,"aria-label":"Prix de "+p.nom,oninput:function(){p.prix=Number(this.value)||0;mark();}});
      var st=h("input",{type:"checkbox",onchange:function(){p.dispo=this.checked;mark();}});st.checked=!!p.dispo;
      d.appendChild(h("div",{class:"prow"},h("span",{text:p.nom}),pr,h("label",{class:"row"},st,document.createTextNode(" En stock"))));
    });
  });
  return d;
}
function pParam(){
  function tx(lab,key){return field(lab,h("input",{type:"text",value:S[key]||"",oninput:function(){S[key]=key==="wa"?this.value.replace(/\D/g,""):this.value;mark();}}));}
  var d=h("div",{class:"param"},tx("Nom de la boutique","shop"),tx("Texte sous le titre","slogan"),tx("Numéro WhatsApp (format 213…, sans + ni espaces)","wa"),tx("Message de bienvenue du chatbot","hello"),
    h("h3",{text:"Rubriques (les onglets de la page)"}));
  S.cats.forEach(function(c){
    var e=h("input",{type:"text",value:c.emo,"aria-label":"Emoji",style:"width:64px",oninput:function(){c.emo=this.value;mark();}});
    var n=h("input",{type:"text",value:c.nom,"aria-label":"Nom de la rubrique",style:"flex:1;width:auto",oninput:function(){c.nom=this.value;mark();}});
    var x=h("button",{type:"button",class:"del",text:"Supprimer",onclick:function(){if(confirm("Supprimer la rubrique « "+c.nom+" » et tous ses produits ?")){S.cats=S.cats.filter(function(y){return y!==c;});S.items=S.items.filter(function(p){return p.cat!==c.id;});mark();panel();}}});
    d.appendChild(h("div",{class:"row",style:"margin:6px 0"},e,n,x));
  });
  d.appendChild(h("button",{type:"button",class:"cta add",text:"+ Ajouter une rubrique",onclick:function(){S.cats.push({id:"r"+Date.now().toString(36),nom:"Nouvelle rubrique",emo:"📦"});mark();panel();}}));
  return d;
}

function pSecu(){
  var o=h("input",{type:"password",autocomplete:"current-password"}),n=h("input",{type:"password",autocomplete:"new-password"}),m=h("p",{role:"status"});
  return h("div",{class:"param"},h("h3",{text:"Mot de passe administrateur"}),field("Mot de passe actuel",o),field("Nouveau mot de passe (10 caractères minimum)",n),
    h("button",{class:"cta",type:"button",text:"Changer le mot de passe",onclick:function(){
      api("/api/admin/password",{method:"POST",body:JSON.stringify({old:o.value,new:n.value})}).then(function(r){m.textContent=r.ok?"Mot de passe changé.":(r.j.error||"Erreur");if(r.ok){o.value="";n.value="";}});}}),m);
}
function save(){
  var s=$("st");s.textContent="Enregistrement…";
  return api("/api/admin/state",{method:"PUT",body:JSON.stringify(S)}).then(function(r){
    if(r.status===401){showLogin();return;}
    if(!r.ok){s.textContent=r.j.error||"Échec de l’enregistrement.";return;}
    S=r.j;dirty=false;s.textContent="Enregistré. Vos clients voient déjà les changements.";panel();});
}
$("save").onclick=save;
$("logout").onclick=function(){api("/api/logout",{method:"POST",body:"{}"}).then(function(){S={shop:"",slogan:"",hello:"",wa:"",cats:[],items:[]};showLogin();});};
$("loginform").onsubmit=function(e){
  e.preventDefault();$("err").textContent="";
  api("/api/login",{method:"POST",body:JSON.stringify({email:$("em").value,password:$("pw").value})}).then(function(r){
    if(!r.ok){$("err").textContent=r.j.error||"Erreur de connexion.";return;}
    $("pw").value="";load();});
};
function load(){api("/api/admin/state").then(function(r){if(r.ok){S=r.j;showApp();}else showLogin();});}
window.addEventListener("beforeunload",function(e){if(dirty){e.preventDefault();e.returnValue="";}});
load();
