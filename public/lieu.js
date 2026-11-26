/* Section "Où nous trouver" (carte + itinéraire) */
fetch("/api/public",{cache:"no-store"}).then(function(r){return r.json();}).then(function(j){
  var box=$("lieu");if(!box||(!j.map&&!j.addr))return;
  box.hidden=false;
  if(j.addr)$("lieu-addr").textContent=j.addr;
  if(j.addr){
    var f=h("iframe",{src:"https://www.google.com/maps?q="+encodeURIComponent(j.addr)+"&output=embed",title:"Carte : emplacement du magasin",loading:"lazy",referrerpolicy:"no-referrer-when-downgrade"});
    $("lieu-map").appendChild(f);
  }
  var href=/^https:\/\//.test(j.map||"")?j.map:"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(j.addr);
  $("lieu-btn").href=href;
}).catch(function(){});
