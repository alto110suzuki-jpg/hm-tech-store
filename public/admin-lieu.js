/* Ajoute les champs "Localisation" dans l'onglet Paramètres */
(function(){
  var ancien=pParam;
  pParam=function(){
    var d=ancien();
    function tx(lab,key){return field(lab,h("input",{type:"text",value:S[key]||"",oninput:function(){S[key]=this.value;mark();}}));}
    var l=h("div",{class:"param"},h("h3",{text:"Localisation du magasin"}),
      tx("Adresse complète (affiche la carte sur le site)","addr"),
      tx("Lien Google Maps (bouton Itinéraire, commence par https://)","map"));
    return h("div",{},d,l);
  };
})();
