  var map;
  var datos = {
              xMin : "",
              xMax  : "",
              yMin : "",
              yMax  : "",
      };

  $(function() {
      $("#info_div").hide();
      $("#btnKML").hide();
      //$("#descKML").hide();
           });
  
//LAYERS
//Bing Api Key
var BingKey = "";
//Capas mapa
var topo = new OpenLayers.Layer.XYZ( "Mapa Topográfico (ESRI)",
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}",
            {'sphericalMercator': true, numZoomLevels: 16, visibility: true} );
var esri = new OpenLayers.Layer.XYZ( "Imágenes Satélite (ESRI)",
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}",
            {sphericalMercator: true, numZoomLevels: 18, visibility: false});
var img = new OpenLayers.Layer.Bing({
        name: "Imágenes Satélite (Bing Maps)",
        key: BingKey,
        type: "AerialWithLabels",
        'sphericalMercator': true,
        transparent: true,
        isBaseLayer: true,
        visibility: false,
        opacity: 1
    }),

geographic = new OpenLayers.Projection("EPSG:4326"); // WGS84 Projection

//Map properties
map = new OpenLayers.Map({
  div: "map",
  layers: [esri,topo],
  projection: new OpenLayers.Projection("EPSG:900913"),
  controls: [
  new OpenLayers.Control.Navigation({
      dragPanOptions: {
          enableKinetic: true
      }
  }),
  //new OpenLayers.Control.PanZoom(),
  //new OpenLayers.Control.PanZoomBar(),
  new OpenLayers.Control.Attribution(),
  new OpenLayers.Control.ScaleLine(),
  new OpenLayers.Control.MousePosition(),
  //new OpenLayers.Control.LayerSwitcher
  new OpenLayers.Control.KeyboardDefaults(),
  new OpenLayers.Control.Zoom(
                 {
                     zoomInId: "zoom_in",
                     zoomOutId: "zoom_out"
                 }
             ),

  ],

  center: new OpenLayers.LonLat(-102.3, 23.8).transform(new OpenLayers.Projection("EPSG:4326"),
  new OpenLayers.Projection("EPSG:900913")),
  zoom: 4.6,
  displayProjection: geographic,
});

  var ls = new OpenLayers.Control.LayerSwitcher()
  map.addControl(ls);
  ls.maximizeControl();

//Fill listbox with available NA for each state
function listaNA(){
  clearlistbox(listNA);
  var estado = $('#listEstado').val();
  var sql_col = "SELECT nom_na FROM na_fnd WHERE nom_edo = " + "'" + estado + "'" + "ORDER BY nom_na ASC"
    $.ajax({
        url : "https://geoinnovare.carto.com/api/v2/sql/?q="+sql_col,
        dataType : "jsonp",
            success : function(data) {
          $.each(data.rows, function(i,val){
          $('#listNA').append('<option value="'+val.nom_na+'">'+val.nom_na+'</option');
          });
        }});
     }

function clearlistbox(lb){
 for (var i=lb.options.length-1; i>=0; i--){
   lb.options[i] = null;
    }
     lb.selectedIndex = -1;
   }

//Get bounding box coordinates of a selected NA
function BBox(){
  var nucleo = $('#listNA').val();
  var http_request = new XMLHttpRequest();
          var requestBase = "https://geoinnovare.carto.com/api/v2/sql/?q=";
          var sqlQuery = "SELECT ST_xMin(the_geom) as west, ST_xMax(the_geom) as east, ST_yMax(the_geom) as north, ST_yMin(the_geom) as south FROM na_fnd WHERE nom_na = " + "'" + nucleo + "'";
          var url = requestBase + sqlQuery;  // Esta URL deber?a devolver datos JSON
          // Descarga los datos JSON del servidor.
          http_request.onreadystatechange = handle_json;
          http_request.open("GET", url, true);
          http_request.send(null);

    function handle_json() {
            if (http_request.readyState == 4) { // La respuesta esta lista
              if (http_request.status == 200) { // La respuesta es correcta
                var json_data = http_request.responseText;
                var datos_na= JSON.parse(json_data);//eval("(" + json_data + ")");
                if (datos_na.total_rows == 1) {

                  datos.xMin    = datos_na.rows[0].west;
                  datos.xMax   = datos_na.rows[0].east;
                  datos.yMax    = datos_na.rows[0].north;
                  datos.yMin    = datos_na.rows[0].south;
                  verInfo();

                } else {
                 alert("Hubo un problema en el calculo de coordenadas, intentelo más tarde...");

                }
              } else {
                alert("Información no disponible");
              }
              http_request = null;
            }
          }
       }

function verInfo(){
  var contenido = "<p style='text-align: center;'><b>Coordenadas NA:</p>" +
      "<table ><tr><td>Oeste:</td><td>" + datos.xMin + "</td></tr>"+
      "<tr><td>Este:</td><td>" + datos.xMax + "</td></tr>" +
      "<tr><td>Norte:</td><td>" + datos.yMax + "</td></tr>" +
      "<tr><td>Sur:</td><td>" + datos.yMin+ "</td></tr>" +
      "</table>";
      info_div.innerHTML = contenido;
       $("#info_div").show();
       descargarKML();
    }

// load NA in the map
function cargarRes() {
 BBox();
 var nucleo = $('#listNA').val();
 var sql_col = "SELECT * FROM na_fnd WHERE nom_na = " + "'" + nucleo + "'"

  layerNA = new OpenLayers.Layer.Vector("NA " + nucleo , {
          visibility: true,
          projection: geographic,
          strategies: [new OpenLayers.Strategy.Fixed()],
          protocol: new OpenLayers.Protocol.Script({
            url: "https://geoinnovare.carto.com/api/v2/sql",
            params: {
              q: sql_col,
              format: "geojson"
            },
            format: new OpenLayers.Format.GeoJSON({
              ignoreExtraDims: true
            }),
            callbackKey: "callback"
          }),
          styleMap: new OpenLayers.StyleMap({
            'default': new OpenLayers.Style(null, {
              rules: [
                new OpenLayers.Rule({
                  symbolizer: {strokeColor: '#ffffff', strokeWidth: 1.5, fill: true, fillColor: '#ffff03', fillOpacity: 0.15,
                  label: " ${nom_na}",
                                      labelAlign: "cc",
                                      fontColor: "#000000",
                                      fontOpacity: 1,
                                      fontFamily: "Arial",
                                      fontSize: 9,
                                      fontWeight: "100"},

                })
              ]
            })
          }),
          eventListeners: {
                      loadend: function (evt) {
                        var lbNA_extent = layerNA.getDataExtent();
                        map.zoomToExtent(lbNA_extent);

                         }
                       },

        })

          map.addLayer(layerNA);
      }

//Show link to download a KML file from a selected NA
function  descargarKML() {
     var nucleo = $('#listNA').val();
     var requestBase = "https://geoinnovare.carto.com/api/v2/sql/?format=KML&q=";
     var sqlQuery = "SELECT * FROM na_fnd WHERE nom_na = " + "'" + nucleo + "'";
     var url = requestBase + sqlQuery;  // Esta URL devuelve los datos JSON

      var descKML = document.createElement("a");
      descKML.href = url;
      descKML.innerHTML = "<tr><td></td><td><a id='descKML'>Descargar KML</a></td></tr>";
      document.getElementById("info_div").appendChild(descKML);

    } 