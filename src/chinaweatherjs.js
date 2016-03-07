var scopes = require('unity-js-scopes')
var http = require('http');

var query_host = "api.map.baidu.com"
var weather_path = "/telematics/v3/weather?output=json&ak=DdzwVcsGMoYpeg5xQlAFrXQt&location="
var URI = "http://www.weather.com.cn/html/weather/101010100.shtml";

var WEATHER_TEMPLATE =
        {
    "schema-version" : 1,
    "template" : {
        "category-layout" : "grid",
        "card-size": "medium"
    },
    "components" : {
        "title" : "title",
        "art" : {
            "field": "art",
            "aspect-ratio": 1.6,
            "fill-mode": "fit"
        }
    }
}

function encode_utf8(s) {
  return unescape(encodeURIComponent(s));
}

function decode_utf8(s) {
  return decodeURIComponent(escape(s));
}

scopes.self.initialize(
            {}
            ,
            {
                run: function() {
                    console.log('Running...')
                },
                start: function(scope_id) {                    
                    console.log('Starting scope id: '
                                + scope_id
                                + ', '
                                + scopes.self.scope_directory)
                },
                search: function(canned_query, metadata) {
                    return new scopes.lib.SearchQuery(
                                canned_query,
                                metadata,
                                // run
                                function(search_reply) {
                                    var qs = canned_query.query_string();
                                    if (!qs) {
                                        qs = "北京"
                                    }

                                    console.log("query string: " + qs);

                                    var weather_cb = function(response) {
                                        var res = '';

                                        // Another chunk of data has been recieved, so append it to res
                                        response.on('data', function(chunk) {
                                            res += chunk;
                                        });

                                        // The whole response has been recieved
                                        response.on('end', function() {
                                            // console.log("res: " + res);

                                            r = JSON.parse(res);

                                            // Let's get the detailed info
                                            var request_date = r.date
                                            console.log("date: " + date);

                                            var city = r.results[0].currentCity;
                                            console.log("city: " + city);

                                            var pm25 = r.results[0].pm25
                                            console.log("pm25: " + pm25)

                                            var category_renderer = new scopes.lib.CategoryRenderer(JSON.stringify(WEATHER_TEMPLATE));
                                            var category = search_reply.register_category("Chineweather", city, "", category_renderer);

                                            try {
                                                r = JSON.parse(res);
                                                var length = r.results[0].weather_data.length
                                                console.log("length: " + length)

                                                for (var i = 0; i < length; i++) {
                                                    var categorised_result = new scopes.lib.CategorisedResult(category);

                                                    var date = r.results[0].weather_data[i].date
                                                    console.log("date: "+  date);

                                                    var dayPictureUrl = r.results[0].weather_data[i].dayPictureUrl;
                                                    console.log("dayPictureUrl: " + dayPictureUrl);

                                                    var nightPictureUrl = r.results[0].weather_data[i].nightPictureUrl;
                                                    console.log("nightPictureUrl: " + nightPictureUrl);

                                                    var weather = r.results[0].weather_data[i].weather;
                                                    console.log("weather: " + weather);

                                                    var wind = r.results[0].weather_data[i].wind;
                                                    console.log("wind: " + wind);

                                                    var temperature = r.results[0].weather_data[i].temperature;
                                                    console.log("temperature: " + temperature);

                                                    categorised_result.set("weather", weather);
                                                    categorised_result.set("wind", wind);
                                                    categorised_result.set("temperature", temperature);

                                                    categorised_result.set_uri(URI);
                                                    categorised_result.set_title("白天: " + date );
                                                    categorised_result.set_art(dayPictureUrl);
                                                    categorised_result.set("subtitle", weather);
                                                    search_reply.push(categorised_result);

                                                    categorised_result.set_title("夜晚: " + date );
                                                    categorised_result.set_art(nightPictureUrl);
                                                    search_reply.push(categorised_result);

                                                }

                                                // We are done, call finished() on our search_reply
//                                              search_reply.finished();
                                            }
                                            catch(e) {
                                                // Forecast not available
                                                console.log("Forecast for '" + qs + "' is unavailable: " + e)
                                            }
                                        });
                                    }

                                    console.log("request string: " + query_host + weather_path + qs);

                                    http.request({host: query_host, path: weather_path + encode_utf8(qs)}, weather_cb).end();
                                },

                                // cancelled
                                function() {
                                });
                },
                preview: function(result, action_metadata) {
                    return new scopes.lib.PreviewQuery(
                                result,
                                action_metadata,
                                // run
                                function(preview_reply) {
                                    var layout1col = new scopes.lib.ColumnLayout(1);
                                    var layout2col = new scopes.lib.ColumnLayout(2);
                                    var layout3col = new scopes.lib.ColumnLayout(3);
                                    layout1col.add_column(["imageId", "headerId", "temperatureId", "windId"]);

                                    layout2col.add_column(["imageId"]);
                                    layout2col.add_column(["headerId", "temperatureId", "windId"]);

                                    layout3col.add_column(["imageId"]);
                                    layout3col.add_column(["headerId", "temperatureId", "windId"]);
                                    layout3col.add_column([]);

                                    preview_reply.register_layout([layout1col, layout2col, layout3col]);

                                    var header = new scopes.lib.PreviewWidget("headerId", "header");
                                    header.add_attribute_mapping("title", "title");
                                    header.add_attribute_mapping("subtitle", "subtitle");

                                    var image = new scopes.lib.PreviewWidget("imageId", "image");
                                    image.add_attribute_mapping("source", "art");

                                    var temperature = new scopes.lib.PreviewWidget("temperatureId", "text");
                                    temperature.add_attribute_mapping("text", "temperature");

                                    var wind = new scopes.lib.PreviewWidget("windId", "text");
                                    wind.add_attribute_mapping("text", "wind");

                                    preview_reply.push([image, header, temperature, wind ]);
                                    preview_reply.finished();
                                },
                                // cancelled
                                function() {
                                });
                }
            }
            );

