/*!
 * RYCV Racing Calendar widget
 * Embed with:
 *   <div id="rycv-racing-calendar"></div>
 *   <script src="https://lbrh.space/rycv-calendar/widget.js" defer></script>
 *
 * Loads the club's public Google Calendars (OTB + Keelboat) through the
 * Cloudflare Worker in cloudflare/rycv-calendar-worker.js, then tags each event
 * with the divisions that usually race it. Events that appear in the 2026/27
 * race documents get "Confirmed" tags from the curated data below; anything
 * else is tagged from its name only. If the live feed can't be reached, the
 * curated snapshot of the 4 Sep 2026 calendar is shown instead.
 *
 * Options (attributes on the container div or the script tag):
 *   data-api="https://.../events.json"  Worker URL (see DEFAULT_API below)
 *   data-theme="light|dark|auto"        Default light (WordPress site is light)
 *
 * Styles live in a shadow root, so the WordPress theme can't restyle the widget
 * and the widget can't leak styles into the page.
 */
(function () {
  'use strict';

  // URL of the deployed rycv-calendar Worker (cloudflare/rycv-calendar-worker.js).
  // If empty or unreachable, the widget shows the curated snapshot instead.
  // Can also be set per embed with data-api.
  var DEFAULT_API = 'https://cally.lbrhounsell.workers.dev/events.json';

  // ---- Curated data from the 4 Sep 2026 calendar and the 2026/27 race documents ----
var CURATED_EVENTS=[{"n":2,"dow":"Sun","date":"13 Sep 26","series":"DF Come and Try","trophy":"","sig":"13:55","cat":"","host":"HBYC","cats":["novice","unk"],"who":"Come and try session. Calendar does not define \"DF\"; confirm with HBYC.","src":["CAL"],"conf":"i"},{"n":3,"dow":"Sat","date":"19 Sep 26","series":"ORCV Coastal Sprint","trophy":"","sig":"TBC","cat":"3","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":4,"dow":"Wed","date":"23 Sep 26","series":"RYCV RACE INFORMATION PRESENTATION","trophy":"","sig":"","cat":"","host":"RYCV","cats":["social"],"who":"Club function or briefing, not a race.","src":["CAL"],"conf":"c"},{"n":5,"dow":"Sat","date":"03 Oct 26","series":"SEASON OPENING DAY","trophy":"","sig":"","cat":"","host":"RYCV","cats":["social"],"who":"Club function or briefing, not a race.","src":["CAL"],"conf":"c"},{"n":6,"dow":"Sun","date":"04 Oct 26","series":"CLASSIC YACHT ASSOCIATION - Summer Series","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":7,"dow":"Sun","date":"04 Oct 26","series":"AVISO - CHRIS WEBB TWO-HANDED SERIES","trophy":"","sig":"10:40","cat":"5","host":"HBYC","cats":["short"],"who":"Two-handed crews.","src":["INF","PPNYC-SH"],"conf":"i"},{"n":8,"dow":"Wed","date":"07 Oct 26","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":9,"dow":"Wed","date":"07 Oct 26","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":10,"dow":"Thu","date":"08 Oct 26","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":11,"dow":"Fri","date":"09 Oct 26","series":"DF Inter-Club Regatta","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["unk"],"who":"Calendar does not define \"DF\". Confirm which fleet this is with the host club.","src":["CAL"],"conf":"i"},{"n":12,"dow":"Sat","date":"10 Oct 26","series":"ORCV Coastal Sprint","trophy":"","sig":"TBC","cat":"3","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":13,"dow":"Sat","date":"10 Oct 26","series":"RYCV Jeffrey Gray Series","trophy":"Lord Forster Trophy","sig":"13:55","cat":"6","host":"RMYS","cats":["spin"],"who":"Fixed mark fleet racing for the performance fleet. Series scored on PHS; some races also count AMS and PHS toward the Club Aggregate.","src":["A3-2"],"conf":"c"},{"n":14,"dow":"Sun","date":"11 Oct 26","series":"RYCV Solo Series","trophy":"Gordon and Jim Trophy","sig":"10:45","cat":"6","host":"RYCV","cats":["short"],"who":"Single-handed keelboats, PHS. Black Bottle race allows an optional observer.","src":["A3-9","SP25"],"conf":"c"},{"n":15,"dow":"Sun","date":"11 Oct 26","series":"RYCV Sunday Pursuit Series","trophy":"Tripe and Onions, Steak and Mushroom","sig":"10:55","cat":"6","host":"HBYC/RYCV","cats":["pursuit"],"who":"Non-spinnaker pursuit. Tripe and Onions for boats under 10 m, Steak and Mushroom for longer boats.","src":["A3-8","SIC"],"conf":"c"},{"n":16,"dow":"Wed","date":"14 Oct 26","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":17,"dow":"Wed","date":"14 Oct 26","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":18,"dow":"Thu","date":"15 Oct 26","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":19,"dow":"Sat","date":"17 Oct 26","series":"Livingston and Sun Series (Portarlington)","trophy":"Commodores Trophy","sig":"9:55","cat":"5","host":"HBYC","cats":["spin","offshore"],"who":"Passage race for the keelboat fleet. Livingston Cup scored on AMS, Sun Trophy on PHS.","src":["A3-3"],"conf":"c"},{"n":20,"dow":"Sun","date":"18 Oct 26","series":"CLASSIC YACHT ASSOCIATION - Summer Series","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":21,"dow":"Wed","date":"21 Oct 26","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":22,"dow":"Wed","date":"21 Oct 26","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":23,"dow":"Thu","date":"22 Oct 26","series":"PGN GeoScience Female Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["women","pursuit"],"who":"Women helms, HBYC Thursday twilight pursuit.","src":["SP25","INF"],"conf":"i"},{"n":24,"dow":"Fri","date":"23 Oct 26","series":"DF Inter-Club Regatta","trophy":"","sig":"17:55","cat":"6","host":"RYCV","cats":["unk"],"who":"Calendar does not define \"DF\". Confirm which fleet this is with the host club.","src":["CAL"],"conf":"i"},{"n":25,"dow":"Sat","date":"24 Oct 26","series":"Range Race","trophy":"","sig":"13:25","cat":"6","host":"SYC","cats":["spin"],"who":"Inter-club fleet racing, Divisions 1 to 4.","src":["A3-4"],"conf":"c"},{"n":26,"dow":"Sun","date":"25 Oct 26","series":"RYCV Solo Series","trophy":"Gordon and Jim Trophy","sig":"10:45","cat":"6","host":"RYCV","cats":["short"],"who":"Single-handed keelboats, PHS. Black Bottle race allows an optional observer.","src":["A3-9","SP25"],"conf":"c"},{"n":27,"dow":"Sun","date":"25 Oct 26","series":"RYCV Sunday Pursuit Series","trophy":"Tripe and Onions, Steak and Mushroom","sig":"10:55","cat":"6","host":"HBYC/RYCV","cats":["pursuit"],"who":"Non-spinnaker pursuit. Tripe and Onions for boats under 10 m, Steak and Mushroom for longer boats.","src":["A3-8","SIC"],"conf":"c"},{"n":28,"dow":"Wed","date":"28 Oct 26","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":29,"dow":"Wed","date":"28 Oct 26","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":30,"dow":"Thu","date":"29 Oct 26","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":31,"dow":"Fri","date":"30 Oct 26","series":"ORCV Melbourne to Devonport \"Rudder Cup\"","trophy":"","sig":"TBC","cat":"2","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":32,"dow":"Fri","date":"30 Oct 26","series":"CYAA Cup Regatta","trophy":"","sig":"14:55","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":33,"dow":"Sat","date":"31 Oct 26","series":"CYAA Cup Regatta","trophy":"","sig":"10:55","cat":"6","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":34,"dow":"Sun","date":"01 Nov 26","series":"CYAA Cup Regatta","trophy":"","sig":"10:55","cat":"6","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":35,"dow":"Mon","date":"02 Nov 26","series":"CYAA Cup Regatta","trophy":"","sig":"10:55","cat":"6","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":36,"dow":"Wed","date":"04 Nov 26","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":37,"dow":"Wed","date":"04 Nov 26","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":38,"dow":"Thu","date":"05 Nov 26","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":39,"dow":"Sat","date":"07 Nov 26","series":"150th 5 Club Pursuit Race - RMYS","trophy":"","sig":"9:55","cat":"5","host":"RMYS","cats":["pursuit"],"who":"Pursuit race open to the five clubs' keelboat fleets. Doubles as Sunday Pursuit Race 3.","src":["A3-8","INF"],"conf":"i"},{"n":40,"dow":"Sat","date":"07 Nov 26","series":"RYCV Sunday Pursuit Series","trophy":"Tripe and Onions, Steak and Mushroom","sig":"9:55","cat":"6","host":"RMYS","cats":["pursuit"],"who":"Non-spinnaker pursuit. Tripe and Onions for boats under 10 m, Steak and Mushroom for longer boats.","src":["A3-8","SIC"],"conf":"c"},{"n":41,"dow":"Sun","date":"08 Nov 26","series":"AVISO - CHRIS WEBB TWO-HANDED SERIES","trophy":"","sig":"10:40","cat":"5","host":"HBYC","cats":["short"],"who":"Two-handed crews.","src":["INF","PPNYC-SH"],"conf":"i"},{"n":42,"dow":"Wed","date":"11 Nov 26","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":43,"dow":"Wed","date":"11 Nov 26","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":44,"dow":"Thu","date":"12 Nov 26","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":45,"dow":"Fri","date":"13 Nov 26","series":"DF Inter-Club Regatta","trophy":"","sig":"17:55","cat":"6","host":"WSC","cats":["unk"],"who":"Calendar does not define \"DF\". Confirm which fleet this is with the host club.","src":["CAL"],"conf":"i"},{"n":46,"dow":"Sat","date":"14 Nov 26","series":"RYCV Jeffrey Gray Series","trophy":"","sig":"9:55","cat":"5","host":"HBYC","cats":["spin"],"who":"Fixed mark fleet racing for the performance fleet. Series scored on PHS; some races also count AMS and PHS toward the Club Aggregate.","src":["A3-2"],"conf":"c"},{"n":47,"dow":"Sun","date":"15 Nov 26","series":"RMYS 150th Sail Past Marina Party","trophy":"","sig":"TBC","cat":"6","host":"RMYS","cats":["social"],"who":"Club function or briefing, not a race.","src":["CAL"],"conf":"c"},{"n":48,"dow":"Sun","date":"15 Nov 26","series":"RYCV Sunday Pursuit Series","trophy":"Tripe and Onions, Steak and Mushroom","sig":"10:55","cat":"6","host":"HBYC/RYCV","cats":["pursuit"],"who":"Non-spinnaker pursuit. Tripe and Onions for boats under 10 m, Steak and Mushroom for longer boats.","src":["A3-8","SIC"],"conf":"c"},{"n":49,"dow":"Wed","date":"18 Nov 26","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":50,"dow":"Wed","date":"18 Nov 26","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":51,"dow":"Thu","date":"19 Nov 26","series":"PGN GeoScience Female Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["women","pursuit"],"who":"Women helms, HBYC Thursday twilight pursuit.","src":["SP25","INF"],"conf":"i"},{"n":52,"dow":"Fri","date":"20 Nov 26","series":"LIPTON REGATTA","trophy":"Twilight invitational","sig":"17:55","cat":"6","host":"RYCV","cats":["spin","classic","od","otb"],"who":"Last season: Alpha course windward/leeward, Bravo off the beach, Charlie classics and cruisers, Delta one-designs (S80, Adams 10, Sydney 36, Sydney 32). Sunday fixed marks for all keelboats. Friday twilight is invitational.","src":["SP25","A3-2","PPNYC-TW"],"conf":"c"},{"n":53,"dow":"Sat","date":"21 Nov 26","series":"CLASSIC YACHT ASSOCIATION - Summer","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":54,"dow":"Sat","date":"21 Nov 26","series":"LIPTON REGATTA","trophy":"(2 x W/L)","sig":"13:25","cat":"6","host":"RYCV","cats":["spin","classic","od","otb"],"who":"Last season: Alpha course windward/leeward, Bravo off the beach, Charlie classics and cruisers, Delta one-designs (S80, Adams 10, Sydney 36, Sydney 32). Sunday fixed marks for all keelboats. Friday twilight is invitational.","src":["SP25","A3-2","PPNYC-TW"],"conf":"c"},{"n":55,"dow":"Sat","date":"21 Nov 26","series":"LIPTON REGATTA","trophy":"FIxed Marks","sig":"13:25","cat":"6","host":"RYCV","cats":["spin","classic","od","otb"],"who":"Last season: Alpha course windward/leeward, Bravo off the beach, Charlie classics and cruisers, Delta one-designs (S80, Adams 10, Sydney 36, Sydney 32). Sunday fixed marks for all keelboats. Friday twilight is invitational.","src":["SP25","A3-2","PPNYC-TW"],"conf":"c"},{"n":56,"dow":"Sun","date":"22 Nov 26","series":"CLASSIC YACHT ASSOCIATION - Summer Series","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":57,"dow":"Sun","date":"22 Nov 26","series":"LIPTON REGATTA","trophy":"RYCV Jeffrey Gray Series","sig":"10:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Fixed mark fleet racing for the performance fleet. Series scored on PHS; some races also count AMS and PHS toward the Club Aggregate.","src":["A3-2"],"conf":"c"},{"n":58,"dow":"Wed","date":"25 Nov 26","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":59,"dow":"Wed","date":"25 Nov 26","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":60,"dow":"Thu","date":"26 Nov 26","series":"Sail Melbourne","trophy":"","sig":"TBC","cat":"","host":"RBYC","cats":["otb"],"who":"International and Olympic dinghy and small-boat classes at RBYC.","src":["INF"],"conf":"i"},{"n":61,"dow":"Thu","date":"26 Nov 26","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":62,"dow":"Fri","date":"27 Nov 26","series":"Sail Melbourne","trophy":"","sig":"TBC","cat":"","host":"RBYC","cats":["otb"],"who":"International and Olympic dinghy and small-boat classes at RBYC.","src":["INF"],"conf":"i"},{"n":63,"dow":"Sat","date":"28 Nov 26","series":"Resail Day","trophy":"","sig":"TBC","cat":"6","host":"HBYC/RYCV/RMYS","cats":["spin","pursuit"],"who":"Only the divisions whose races were abandoned earlier, at the organising authority's discretion.","src":["A3-res"],"conf":"c"},{"n":64,"dow":"Sat","date":"28 Nov 26","series":"Sail Melbourne","trophy":"","sig":"TBC","cat":"","host":"RBYC","cats":["otb"],"who":"International and Olympic dinghy and small-boat classes at RBYC.","src":["INF"],"conf":"i"},{"n":65,"dow":"Sun","date":"29 Nov 26","series":"Sail Melbourne","trophy":"","sig":"","cat":"","host":"RBYC","cats":["otb"],"who":"International and Olympic dinghy and small-boat classes at RBYC.","src":["INF"],"conf":"i"},{"n":66,"dow":"Sun","date":"29 Nov 26","series":"PPWCS-Shirley Freeman Trophy","trophy":"","sig":"10:55","cat":"6","host":"HBYC","cats":["women"],"who":"Women helms. Port Phillip Women's Championship Series, scored AMS, ORC and PHS.","src":["PPNYC-WH","A3-5"],"conf":"c"},{"n":67,"dow":"Sun","date":"29 Nov 26","series":"ALICE VARADY TROPHY RACE (Div 2 of Shirley Freeman)","trophy":"","sig":"11:05","cat":"6","host":"HBYC","cats":["women"],"who":"Women helms, second division of the Shirley Freeman race.","src":["CAL","PPNYC-WH"],"conf":"c"},{"n":68,"dow":"Wed","date":"02 Dec 26","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":69,"dow":"Wed","date":"02 Dec 26","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":70,"dow":"Thu","date":"03 Dec 26","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":71,"dow":"Sat","date":"05 Dec 26","series":"ORCV Coastal Sprint","trophy":"","sig":"TBC","cat":"3","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":72,"dow":"Sat","date":"05 Dec 26","series":"Livingston and Sun Series","trophy":"Palliser Trophy","sig":"9:55","cat":"5","host":"HBYC","cats":["spin","offshore"],"who":"Passage race for the keelboat fleet. Livingston Cup scored on AMS, Sun Trophy on PHS.","src":["A3-3"],"conf":"c"},{"n":73,"dow":"Sat","date":"05 Dec 26","series":"RMYS Overnight (Big Bay Challenge TBC)","trophy":"","sig":"0:00","cat":"5N","host":"RMYS","cats":["offshore"],"who":"Overnight race (Cat 5N) for suitably equipped keelboats.","src":["A3-4","SP25"],"conf":"c"},{"n":74,"dow":"Sun","date":"06 Dec 26","series":"CLASSIC YACHT ASSOCIATION - Summer Series","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":75,"dow":"Sun","date":"06 Dec 26","series":"RYCV Sunday Pursuit Series","trophy":"Tripe and Onions, Steak and Mushroom","sig":"10:55","cat":"6","host":"HBYC/RYCV","cats":["pursuit"],"who":"Non-spinnaker pursuit. Tripe and Onions for boats under 10 m, Steak and Mushroom for longer boats.","src":["A3-8","SIC"],"conf":"c"},{"n":76,"dow":"Wed","date":"09 Dec 26","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":77,"dow":"Wed","date":"09 Dec 26","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":78,"dow":"Thu","date":"10 Dec 26","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":79,"dow":"Fri","date":"11 Dec 26","series":"DF Inter-Club Regatta","trophy":"","sig":"17:55","cat":"6","host":"RMYS","cats":["unk"],"who":"Calendar does not define \"DF\". Confirm which fleet this is with the host club.","src":["CAL"],"conf":"i"},{"n":80,"dow":"Sat","date":"12 Dec 26","series":"Challenge 12 Series","trophy":"Comodore in Chief Trophy","sig":"12:55","cat":"6","host":"RMYS","cats":["spin"],"who":"Laid course (windward/leeward) racing for performance boats with ORC certificates. Series scored ORCwl; AMS and PHS count to the aggregate.","src":["A3-1"],"conf":"c"},{"n":81,"dow":"Sun","date":"13 Dec 26","series":"CLASSIC YACHT ASSOCIATION - Summer Series","trophy":"","sig":"9:55","cat":"7","host":"RYCV","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":82,"dow":"Sun","date":"13 Dec 26","series":"AVISO - CHRIS WEBB TWO-HANDED SERIES","trophy":"","sig":"10:40","cat":"5","host":"HBYC","cats":["short"],"who":"Two-handed crews.","src":["INF","PPNYC-SH"],"conf":"i"},{"n":83,"dow":"Wed","date":"16 Dec 26","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":84,"dow":"Wed","date":"16 Dec 26","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":85,"dow":"Thu","date":"17 Dec 26","series":"PGN GeoScience Female Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["women","pursuit"],"who":"Women helms, HBYC Thursday twilight pursuit.","src":["SP25","INF"],"conf":"i"},{"n":86,"dow":"Sat","date":"19 Dec 26","series":"RESAIL","trophy":"RESAIL","sig":"TBC","cat":"6","host":"HBYC/RYCV/RMYS","cats":["spin","pursuit"],"who":"Only the divisions whose races were abandoned earlier, at the organising authority's discretion.","src":["A3-res"],"conf":"c"},{"n":87,"dow":"Sun","date":"20 Dec 26","series":"RYCV Sunday Pursuit Series","trophy":"Tripe and Onions, Steak and Mushroom","sig":"10:55","cat":"6","host":"HBYC/RYCV","cats":["pursuit"],"who":"Non-spinnaker pursuit. Tripe and Onions for boats under 10 m, Steak and Mushroom for longer boats.","src":["A3-8","SIC"],"conf":"c"},{"n":88,"dow":"Sat","date":"26 Dec 26","series":"ORCV Cock of the Bay","trophy":"","sig":"TBC","cat":"5","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":89,"dow":"Sun","date":"27 Dec 26","series":"ORCV Melbourne to Hobart Westcoaster","trophy":"","sig":"TBC","cat":"2","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":90,"dow":"Sun","date":"27 Dec 26","series":"PETERSVILLE REGATTA","trophy":"","sig":"TBC","cat":"6","host":"BYS","cats":["open"],"who":"Multi-division regatta at BYS. Divisions set by the regatta notice of race.","src":["INF"],"conf":"i"},{"n":91,"dow":"Mon","date":"28 Dec 26","series":"PETERSVILLE REGATTA","trophy":"","sig":"TBC","cat":"6","host":"BYS","cats":["open"],"who":"Multi-division regatta at BYS. Divisions set by the regatta notice of race.","src":["INF"],"conf":"i"},{"n":92,"dow":"Tue","date":"29 Dec 26","series":"PETERSVILLE REGATTA","trophy":"","sig":"TBC","cat":"6","host":"BYS","cats":["open"],"who":"Multi-division regatta at BYS. Divisions set by the regatta notice of race.","src":["INF"],"conf":"i"},{"n":93,"dow":"Wed","date":"30 Dec 26","series":"PETERSVILLE REGATTA","trophy":"","sig":"TBC","cat":"6","host":"BYS","cats":["open"],"who":"Multi-division regatta at BYS. Divisions set by the regatta notice of race.","src":["INF"],"conf":"i"},{"n":94,"dow":"Sun","date":"10 Jan 27","series":"RYCV Sunday Pursuit Series","trophy":"Tripe and Onions, Steak and Mushroom","sig":"10:55","cat":"6","host":"HBYC/RYCV","cats":["pursuit"],"who":"Non-spinnaker pursuit. Tripe and Onions for boats under 10 m, Steak and Mushroom for longer boats.","src":["A3-8","SIC"],"conf":"c"},{"n":95,"dow":"Wed","date":"13 Jan 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":96,"dow":"Wed","date":"13 Jan 27","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":97,"dow":"Thu","date":"14 Jan 27","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":98,"dow":"Fri","date":"15 Jan 27","series":"Sydney Design Series RYCV","trophy":"","sig":"12:55","cat":"6","host":"RYCV","cats":["od"],"who":"Sydney-designed one-design classes. Classes not stated in the calendar.","src":["INF"],"conf":"i"},{"n":99,"dow":"Sat","date":"16 Jan 27","series":"Challenge 12 Series","trophy":"McCutcheon Cup","sig":"12:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Laid course (windward/leeward) racing for performance boats with ORC certificates. Series scored ORCwl; AMS and PHS count to the aggregate.","src":["A3-1"],"conf":"c"},{"n":100,"dow":"Sat","date":"16 Jan 27","series":"Sydney Design Series RYCV","trophy":"","sig":"12:55","cat":"6","host":"RYCV","cats":["od"],"who":"Sydney-designed one-design classes. Classes not stated in the calendar.","src":["INF"],"conf":"i"},{"n":101,"dow":"Sun","date":"17 Jan 27","series":"Sydney Design Series RYCV","trophy":"","sig":"12:55","cat":"6","host":"RYCV","cats":["od"],"who":"Sydney-designed one-design classes. Classes not stated in the calendar.","src":["INF"],"conf":"i"},{"n":102,"dow":"Wed","date":"20 Jan 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":103,"dow":"Wed","date":"20 Jan 27","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":104,"dow":"Thu","date":"21 Jan 27","series":"PGN GeoScience Female Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["women","pursuit"],"who":"Women helms, HBYC Thursday twilight pursuit.","src":["SP25","INF"],"conf":"i"},{"n":105,"dow":"Fri","date":"22 Jan 27","series":"Festival of Sail - Race Briefing RYCV","trophy":"","sig":"TBC","cat":"","host":"RYCV","cats":["social"],"who":"Club function or briefing, not a race.","src":["CAL"],"conf":"c"},{"n":106,"dow":"Sat","date":"23 Jan 27","series":"Festival of Sail","trophy":"","sig":"TBC","cat":"5","host":"RGYC","cats":["open"],"who":"Multi-division regatta at RGYC. Divisions set by the regatta notice of race.","src":["INF"],"conf":"i"},{"n":107,"dow":"Sat","date":"23 Jan 27","series":"S80 State Championships","trophy":"","sig":"TBC","cat":"6","host":"RGYC","cats":["od"],"who":"S80 one-design class.","src":["INF"],"conf":"i"},{"n":108,"dow":"Sun","date":"24 Jan 27","series":"Festival of Sail","trophy":"","sig":"TBC","cat":"6","host":"RGYC","cats":["open"],"who":"Multi-division regatta at RGYC. Divisions set by the regatta notice of race.","src":["INF"],"conf":"i"},{"n":109,"dow":"Sun","date":"24 Jan 27","series":"S80 State Championships","trophy":"","sig":"TBC","cat":"6","host":"RGYC","cats":["od"],"who":"S80 one-design class.","src":["INF"],"conf":"i"},{"n":110,"dow":"Mon","date":"25 Jan 27","series":"Festival of Sail","trophy":"","sig":"TBC","cat":"6","host":"RGYC","cats":["open"],"who":"Multi-division regatta at RGYC. Divisions set by the regatta notice of race.","src":["INF"],"conf":"i"},{"n":111,"dow":"Tue","date":"26 Jan 27","series":"Festival of Sail","trophy":"","sig":"TBC","cat":"7","host":"RGYC","cats":["open"],"who":"Multi-division regatta at RGYC. Divisions set by the regatta notice of race.","src":["INF"],"conf":"i"},{"n":112,"dow":"Wed","date":"27 Jan 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":113,"dow":"Wed","date":"27 Jan 27","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":114,"dow":"Thu","date":"28 Jan 27","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":115,"dow":"Fri","date":"29 Jan 27","series":"Combined Dinghy Races","trophy":"","sig":"16:55","cat":"7","host":"HBYC/RYCV/WSC","cats":["otb"],"who":"Off the beach dinghy classes, Friday evenings (HBYC, RYCV, WSC).","src":["INF"],"conf":"i"},{"n":116,"dow":"Sat","date":"30 Jan 27","series":"Challenge 12 Series","trophy":"Harold Ward Trophy","sig":"12:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Laid course (windward/leeward) racing for performance boats with ORC certificates. Series scored ORCwl; AMS and PHS count to the aggregate.","src":["A3-1"],"conf":"c"},{"n":117,"dow":"Sun","date":"31 Jan 27","series":"CLASSIC YACHT ASSOCIATION - Summer Series","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":118,"dow":"Sun","date":"31 Jan 27","series":"PPWCS - RYCV VAL HODGE TROPHY","trophy":"VAL HODGE TROPHY","sig":"10:55","cat":"6","host":"RYCV","cats":["women"],"who":"Women helms. Port Phillip Women's Championship Series, scored AMS, ORC and PHS.","src":["PPNYC-WH","A3-5"],"conf":"c"},{"n":119,"dow":"Sun","date":"31 Jan 27","series":"RYCV Sunday Pursuit Series","trophy":"Tripe and Onions, Steak and Mushroom","sig":"10:55","cat":"6","host":"HBYC/RYCV","cats":["pursuit"],"who":"Non-spinnaker pursuit. Tripe and Onions for boats under 10 m, Steak and Mushroom for longer boats.","src":["A3-8","SIC"],"conf":"c"},{"n":120,"dow":"Wed","date":"03 Feb 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":121,"dow":"Wed","date":"03 Feb 27","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":122,"dow":"Thu","date":"04 Feb 27","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":123,"dow":"Fri","date":"05 Feb 27","series":"Combined Dinghy Races","trophy":"","sig":"16:55","cat":"7","host":"HBYC/RYCV/WSC","cats":["otb"],"who":"Off the beach dinghy classes, Friday evenings (HBYC, RYCV, WSC).","src":["INF"],"conf":"i"},{"n":124,"dow":"Sat","date":"06 Feb 27","series":"Bluebird State Championships","trophy":"","sig":"10:50","cat":"6","host":"RYCV","cats":["od"],"who":"Bluebird one-design class.","src":["INF"],"conf":"i"},{"n":125,"dow":"Sat","date":"06 Feb 27","series":"Range Race","trophy":"","sig":"13:25","cat":"6","host":"SYC","cats":["spin"],"who":"Inter-club fleet racing, Divisions 1 to 4.","src":["A3-4"],"conf":"c"},{"n":126,"dow":"Sun","date":"07 Feb 27","series":"AVISO - CHRIS WEBB TWO-HANDED SERIES","trophy":"","sig":"10:40","cat":"5","host":"HBYC","cats":["short"],"who":"Two-handed crews.","src":["INF","PPNYC-SH"],"conf":"i"},{"n":127,"dow":"Wed","date":"10 Feb 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":128,"dow":"Wed","date":"10 Feb 27","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":129,"dow":"Thu","date":"11 Feb 27","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":130,"dow":"Fri","date":"12 Feb 27","series":"ORCV Melbourne to Port Fairy","trophy":"","sig":"TBC","cat":"2","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":131,"dow":"Fri","date":"12 Feb 27","series":"Combined Dinghy Races","trophy":"","sig":"16:55","cat":"7","host":"HBYC/RYCV/WSC","cats":["otb"],"who":"Off the beach dinghy classes, Friday evenings (HBYC, RYCV, WSC).","src":["INF"],"conf":"i"},{"n":132,"dow":"Sat","date":"13 Feb 27","series":"Bluebird State Championships","trophy":"","sig":"10:50","cat":"6","host":"RYCV","cats":["od"],"who":"Bluebird one-design class.","src":["INF"],"conf":"i"},{"n":133,"dow":"Sat","date":"13 Feb 27","series":"RYCV Jeffrey Gray Series","trophy":"Elwood Huon Trophy","sig":"13:55","cat":"6","host":"RMYS","cats":["spin"],"who":"Fixed mark fleet racing for the performance fleet. Series scored on PHS; some races also count AMS and PHS toward the Club Aggregate.","src":["A3-2"],"conf":"c"},{"n":134,"dow":"Sun","date":"14 Feb 27","series":"CLASSIC YACHT ASSOCIATION - Summer","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":135,"dow":"Sun","date":"14 Feb 27","series":"RYCV Solo Series","trophy":"Gordon and Jim Trophy","sig":"10:45","cat":"6","host":"RYCV","cats":["short"],"who":"Single-handed keelboats, PHS. Black Bottle race allows an optional observer.","src":["A3-9","SP25"],"conf":"c"},{"n":136,"dow":"Sun","date":"14 Feb 27","series":"RYCV Sunday Pursuit Series","trophy":"Tripe and Onions, Steak and Mushroom","sig":"10:55","cat":"6","host":"HBYC/RYCV","cats":["pursuit"],"who":"Non-spinnaker pursuit. Tripe and Onions for boats under 10 m, Steak and Mushroom for longer boats.","src":["A3-8","SIC"],"conf":"c"},{"n":137,"dow":"Wed","date":"17 Feb 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":138,"dow":"Wed","date":"17 Feb 27","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":139,"dow":"Thu","date":"18 Feb 27","series":"PGN GeoScience Female Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["women","pursuit"],"who":"Women helms, HBYC Thursday twilight pursuit.","src":["SP25","INF"],"conf":"i"},{"n":140,"dow":"Fri","date":"19 Feb 27","series":"Combined Dinghy Races","trophy":"","sig":"16:55","cat":"7","host":"HBYC/RYCV/WSC","cats":["otb"],"who":"Off the beach dinghy classes, Friday evenings (HBYC, RYCV, WSC).","src":["INF"],"conf":"i"},{"n":141,"dow":"Sat","date":"20 Feb 27","series":"RYCV Jeffrey Gray Series","trophy":"Lord Brassey","sig":"10:55","cat":"6","host":"RMYS","cats":["spin"],"who":"Fixed mark fleet racing for the performance fleet. Series scored on PHS; some races also count AMS and PHS toward the Club Aggregate.","src":["A3-2"],"conf":"c"},{"n":142,"dow":"Sat","date":"20 Feb 27","series":"Bluebird State Championships","trophy":"Long Distance","sig":"13:55","cat":"6","host":"RYCV","cats":["od"],"who":"Bluebird one-design class.","src":["INF"],"conf":"i"},{"n":143,"dow":"Sun","date":"21 Feb 27","series":"AVISO - CHRIS WEBB TWO-HANDED SERIES","trophy":"","sig":"10:40","cat":"5","host":"HBYC","cats":["short"],"who":"Two-handed crews.","src":["INF","PPNYC-SH"],"conf":"i"},{"n":144,"dow":"Sun","date":"21 Feb 27","series":"RYCV Sunday Pursuit Series","trophy":"Tripe and Onions, Steak and Mushroom","sig":"10:55","cat":"6","host":"HBYC/RYCV","cats":["pursuit"],"who":"Non-spinnaker pursuit. Tripe and Onions for boats under 10 m, Steak and Mushroom for longer boats.","src":["A3-8","SIC"],"conf":"c"},{"n":145,"dow":"Wed","date":"24 Feb 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":146,"dow":"Wed","date":"24 Feb 27","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":147,"dow":"Thu","date":"25 Feb 27","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":148,"dow":"Fri","date":"26 Feb 27","series":"Combined Dinghy Races","trophy":"","sig":"16:55","cat":"7","host":"HBYC/RYCV/WSC","cats":["otb"],"who":"Off the beach dinghy classes, Friday evenings (HBYC, RYCV, WSC).","src":["INF"],"conf":"i"},{"n":149,"dow":"Sat","date":"27 Feb 27","series":"Livingston and Sun Series","trophy":"Geoffrey Evans (Navy week)","sig":"9:55","cat":"5","host":"HBYC","cats":["spin","offshore"],"who":"Passage race for the keelboat fleet. Livingston Cup scored on AMS, Sun Trophy on PHS.","src":["A3-3"],"conf":"c"},{"n":150,"dow":"Sat","date":"27 Feb 27","series":"RYCV Overnight Race","trophy":"Navigators Challenge (St Leonards Continuance)","sig":"9:55","cat":"5N","host":"RYCV","cats":["offshore"],"who":"Overnight race (Cat 5N) for suitably equipped keelboats.","src":["A3-4","SP25"],"conf":"c"},{"n":151,"dow":"Sun","date":"28 Feb 27","series":"PPWCS - SYC Women In Sailing Challenge (WISC)","trophy":"","sig":"TBC","cat":"6","host":"SYC","cats":["women"],"who":"Women helms. Port Phillip Women's Championship Series, scored AMS, ORC and PHS.","src":["PPNYC-WH","A3-5"],"conf":"c"},{"n":152,"dow":"Sun","date":"28 Feb 27","series":"CLASSIC YACHT ASSOCIATION - Summer Series","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":153,"dow":"Sun","date":"28 Feb 27","series":"RYCV Sunday Pursuit Series","trophy":"Tripe and Onions, Steak and Mushroom","sig":"10:55","cat":"6","host":"HBYC/RYCV","cats":["pursuit"],"who":"Non-spinnaker pursuit. Tripe and Onions for boats under 10 m, Steak and Mushroom for longer boats.","src":["A3-8","SIC"],"conf":"c"},{"n":154,"dow":"Wed","date":"03 Mar 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":155,"dow":"Wed","date":"03 Mar 27","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":156,"dow":"Thu","date":"04 Mar 27","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":157,"dow":"Fri","date":"05 Mar 27","series":"ORCV Melbourne to King Island","trophy":"","sig":"TBC","cat":"2","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":158,"dow":"Sun","date":"07 Mar 27","series":"RYCV Sunday Pursuit Series","trophy":"Tripe and Onions, Steak and Mushroom","sig":"10:55","cat":"6","host":"HBYC/RYCV","cats":["pursuit"],"who":"Non-spinnaker pursuit. Tripe and Onions for boats under 10 m, Steak and Mushroom for longer boats.","src":["A3-8","SIC"],"conf":"c"},{"n":159,"dow":"Wed","date":"10 Mar 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":160,"dow":"Wed","date":"10 Mar 27","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":161,"dow":"Thu","date":"11 Mar 27","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":162,"dow":"Fri","date":"12 Mar 27","series":"Combined Dinghy Races","trophy":"","sig":"16:55","cat":"7","host":"HBYC/RYCV/WSC","cats":["otb"],"who":"Off the beach dinghy classes, Friday evenings (HBYC, RYCV, WSC).","src":["INF"],"conf":"i"},{"n":163,"dow":"Sat","date":"13 Mar 27","series":"Bluebird State Championships","trophy":"","sig":"11:55","cat":"6","host":"RYCV","cats":["od"],"who":"Bluebird one-design class.","src":["INF"],"conf":"i"},{"n":164,"dow":"Sat","date":"13 Mar 27","series":"Port Phillip Sea Pilots Overnight Race","trophy":"","sig":"15:55","cat":"5N","host":"HBYC","cats":["offshore"],"who":"Overnight race (Cat 5N) for suitably equipped keelboats.","src":["A3-4","SP25"],"conf":"c"},{"n":165,"dow":"Sun","date":"14 Mar 27","series":"Port Phillip Sea Pilots Overnight Race","trophy":"","sig":"","cat":"5N","host":"HBYC","cats":["offshore"],"who":"Overnight race (Cat 5N) for suitably equipped keelboats.","src":["A3-4","SP25"],"conf":"c"},{"n":166,"dow":"Sun","date":"14 Mar 27","series":"CLASSIC YACHT ASSOCIATION - Summer Series","trophy":"","sig":"9:55","cat":"7","host":"RYCV","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":167,"dow":"Wed","date":"17 Mar 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":168,"dow":"Wed","date":"17 Mar 27","series":"Wednesday Spinnaker Twilight Series","trophy":"Bill Hales Trophy, Andrew Bell Trophy, Essendon Cup and Series","sig":"17:55","cat":"6","host":"RYCV","cats":["spin"],"who":"Div 1 big boats, Div 2 mid-size incl. S80s, Div 3 small boats. Spinnaker fleet racing. Div 1 and 2 trophies on PHS and AMS.","src":["SIB","A3-7","PPNYC-TW"],"conf":"c"},{"n":169,"dow":"Thu","date":"18 Mar 27","series":"PGN GeoScience Female Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["women","pursuit"],"who":"Women helms, HBYC Thursday twilight pursuit.","src":["SP25","INF"],"conf":"i"},{"n":170,"dow":"Fri","date":"19 Mar 27","series":"Combined Dinghy Races","trophy":"","sig":"16:55","cat":"7","host":"HBYC/RYCV/WSC","cats":["otb"],"who":"Off the beach dinghy classes, Friday evenings (HBYC, RYCV, WSC).","src":["INF"],"conf":"i"},{"n":171,"dow":"Sat","date":"20 Mar 27","series":"Range Race","trophy":"","sig":"13:25","cat":"6","host":"RYCV","cats":["spin"],"who":"Inter-club fleet racing, Divisions 1 to 4.","src":["A3-4"],"conf":"c"},{"n":172,"dow":"Sun","date":"21 Mar 27","series":"ORCV Rip Tour Port Phillip Heads","trophy":"","sig":"TBC","cat":"","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":173,"dow":"Sun","date":"21 Mar 27","series":"RYCV Solo Series","trophy":"Gordon and Jim Trophy","sig":"10:45","cat":"6","host":"RYCV","cats":["short"],"who":"Single-handed keelboats, PHS. Black Bottle race allows an optional observer.","src":["A3-9","SP25"],"conf":"c"},{"n":174,"dow":"Sun","date":"21 Mar 27","series":"RYCV Sunday Pursuit Series","trophy":"Tripe and Onions, Steak and Mushroom","sig":"10:55","cat":"6","host":"HBYC/RYCV","cats":["pursuit"],"who":"Non-spinnaker pursuit. Tripe and Onions for boats under 10 m, Steak and Mushroom for longer boats.","src":["A3-8","SIC"],"conf":"c"},{"n":175,"dow":"Wed","date":"24 Mar 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":176,"dow":"Thu","date":"25 Mar 27","series":"Jellis Craig Thursday Pursuit","trophy":"","sig":"17:55","cat":"6","host":"HBYC","cats":["pursuit"],"who":"HBYC Thursday twilight pursuit for keelboats.","src":["INF"],"conf":"i"},{"n":177,"dow":"Wed","date":"31 Mar 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":178,"dow":"Sat","date":"03 Apr 27","series":"Livingston and Sun Series","trophy":"","sig":"9:55","cat":"5","host":"HBYC","cats":["spin","offshore"],"who":"Passage race for the keelboat fleet. Livingston Cup scored on AMS, Sun Trophy on PHS.","src":["A3-3"],"conf":"c"},{"n":179,"dow":"Wed","date":"07 Apr 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":180,"dow":"Sat","date":"10 Apr 27","series":"Tumlaren 90th State Championships","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["od","classic"],"who":"Tumlaren class.","src":["INF"],"conf":"i"},{"n":181,"dow":"Sat","date":"10 Apr 27","series":"RYCV Jeffrey Gray Series","trophy":"Awinya Cup","sig":"13:55","cat":"6","host":"RMYS","cats":["spin"],"who":"Fixed mark fleet racing for the performance fleet. Series scored on PHS; some races also count AMS and PHS toward the Club Aggregate.","src":["A3-2"],"conf":"c"},{"n":182,"dow":"Sun","date":"11 Apr 27","series":"ASSOCIATION CUP","trophy":"","sig":"TBC","cat":"6","host":"SYC","cats":["spin"],"who":"Invitation only. Last season RYCV sent its two best AMS and two best ORC boats.","src":["SP25"],"conf":"c"},{"n":183,"dow":"Sun","date":"11 Apr 27","series":"Tumlaren 90th State Championships","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["od","classic"],"who":"Tumlaren class.","src":["INF"],"conf":"i"},{"n":184,"dow":"Sun","date":"11 Apr 27","series":"AVISO - CHRIS WEBB TWO-HANDED SERIES","trophy":"","sig":"10:40","cat":"5","host":"HBYC","cats":["short"],"who":"Two-handed crews.","src":["INF","PPNYC-SH"],"conf":"i"},{"n":185,"dow":"Wed","date":"14 Apr 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":186,"dow":"Sat","date":"17 Apr 27","series":"ORCV Coastal Sprint","trophy":"","sig":"TBC","cat":"3","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":187,"dow":"Sat","date":"17 Apr 27","series":"RYCV Jeffrey Gray Series","trophy":"","sig":"13:55","cat":"6","host":"RMYS","cats":["spin"],"who":"Fixed mark fleet racing for the performance fleet. Series scored on PHS; some races also count AMS and PHS toward the Club Aggregate.","src":["A3-2"],"conf":"c"},{"n":188,"dow":"Sun","date":"18 Apr 27","series":"PPWCS - JENNIFER GOLDSMITH","trophy":"","sig":"10:55","cat":"6","host":"RMYS","cats":["women"],"who":"Women helms. Port Phillip Women's Championship Series, scored AMS, ORC and PHS.","src":["PPNYC-WH","A3-5"],"conf":"c"},{"n":189,"dow":"Sun","date":"18 Apr 27","series":"RYCV Solo Series","trophy":"Gordon and Jim Trophy, RYCV Black Bottle Trophy","sig":"11:55","cat":"6","host":"RYCV","cats":["short"],"who":"Single-handed keelboats, PHS. Black Bottle race allows an optional observer.","src":["A3-9","SP25"],"conf":"c"},{"n":190,"dow":"Wed","date":"21 Apr 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":191,"dow":"Sat","date":"24 Apr 27","series":"RESAIL","trophy":"RESAIL","sig":"TBC","cat":"6","host":"HBYC/RYCV/RMYS","cats":["spin","pursuit"],"who":"Only the divisions whose races were abandoned earlier, at the organising authority's discretion.","src":["A3-res"],"conf":"c"},{"n":192,"dow":"Wed","date":"28 Apr 27","series":"Wednesday Afternoon Summer Series","trophy":"Rivers Cup","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, pursuit start. Default is no spinnaker; boats can elect a spinnaker start 4 min later.","src":["SIA","A3-6"],"conf":"c"},{"n":193,"dow":"Sat","date":"01 May 27","series":"Livingston and Sun Series, Phoenix Destination Race","trophy":"Phoenix Trophy","sig":"8:55","cat":"6","host":"RYCV","cats":["spin","offshore"],"who":"Passage race for the keelboat fleet. Livingston Cup scored on AMS, Sun Trophy on PHS.","src":["A3-3"],"conf":"c"},{"n":194,"dow":"Sat","date":"01 May 27","series":"Blue Bird Class Monkeys","trophy":"Class Monkey Long Race","sig":"9:55","cat":"6","host":"RYCV","cats":["od"],"who":"Bluebird one-design class.","src":["INF"],"conf":"i"},{"n":195,"dow":"Sun","date":"02 May 27","series":"PPWCS - BLISS","trophy":"","sig":"TBC","cat":"6","host":"RBYC","cats":["women"],"who":"Women helms. Port Phillip Women's Championship Series, scored AMS, ORC and PHS.","src":["PPNYC-WH","A3-5"],"conf":"c"},{"n":196,"dow":"Sun","date":"02 May 27","series":"Novice Skippers Return From QCYC","trophy":"150th Jubilee Trophy","sig":"8:55","cat":"6","host":"RYCV","cats":["novice","offshore"],"who":"Novice skippers on a return passage race.","src":["A3-4","INF"],"conf":"i"},{"n":197,"dow":"Sun","date":"02 May 27","series":"RMYS - Winter Two handed Series","trophy":"","sig":"10:10","cat":"5","host":"RMYS","cats":["short"],"who":"Two-handed crews.","src":["INF","PPNYC-SH"],"conf":"i"},{"n":198,"dow":"Sun","date":"02 May 27","series":"CLASSIC YACHT ASSOCIATION - Winter Series","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":199,"dow":"Wed","date":"05 May 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":200,"dow":"Sat","date":"08 May 27","series":"Brass Monkey Winter Series","trophy":"","sig":"12:55","cat":"6","host":"HBYC","cats":["spin","pursuit"],"who":"Winter racing, Divisions 1, 2 and 3 combined. Mix of pursuit and fleet starts.","src":["PPNYC-BM","A3-11"],"conf":"c"},{"n":201,"dow":"Wed","date":"12 May 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":202,"dow":"Sat","date":"15 May 27","series":"Blue Bird Class Monkeys","trophy":"Class Monkey 2 x Short races","sig":"11:55","cat":"6","host":"RYCV","cats":["od"],"who":"Bluebird one-design class.","src":["INF"],"conf":"i"},{"n":203,"dow":"Sun","date":"16 May 27","series":"ORCV Double Handed (Bay Race)","trophy":"","sig":"9:55","cat":"5","host":"ORCV","cats":["short"],"who":"Two-handed crews.","src":["INF","PPNYC-SH"],"conf":"i"},{"n":204,"dow":"Sun","date":"16 May 27","series":"CLASSIC YACHT ASSOCIATION - Winter Series","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":205,"dow":"Wed","date":"19 May 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":206,"dow":"Sat","date":"22 May 27","series":"Brass Monkey Winter Series","trophy":"","sig":"12:55","cat":"6","host":"HBYC","cats":["spin","pursuit"],"who":"Winter racing, Divisions 1, 2 and 3 combined. Mix of pursuit and fleet starts.","src":["PPNYC-BM","A3-11"],"conf":"c"},{"n":207,"dow":"Sun","date":"23 May 27","series":"DF Inter-Club Regatta","trophy":"","sig":"13:55","cat":"6","host":"RMYS","cats":["unk"],"who":"Calendar does not define \"DF\". Confirm which fleet this is with the host club.","src":["CAL"],"conf":"i"},{"n":208,"dow":"Wed","date":"26 May 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":209,"dow":"Fri","date":"28 May 27","series":"PPNYC PRESENTATION NIGHT","trophy":"","sig":"18:55","cat":"","host":"HBYC","cats":["social"],"who":"Club function or briefing, not a race.","src":["CAL"],"conf":"c"},{"n":210,"dow":"Sat","date":"29 May 27","series":"ORCV Melbourne to Apollo Bay","trophy":"","sig":"TBC","cat":"3","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":211,"dow":"Sat","date":"29 May 27","series":"Blue Bird Class Monkeys","trophy":"Class Monkey 2 x Short races","sig":"11:55","cat":"6","host":"RYCV","cats":["od"],"who":"Bluebird one-design class.","src":["INF"],"conf":"i"},{"n":212,"dow":"Sun","date":"30 May 27","series":"ASSOCIATION CUP","trophy":"","sig":"TBC","cat":"6","host":"SYC","cats":["spin"],"who":"Invitation only. Last season RYCV sent its two best AMS and two best ORC boats.","src":["SP25"],"conf":"c"},{"n":213,"dow":"Sun","date":"30 May 27","series":"RMYS - Winter Two handed Series","trophy":"","sig":"10:10","cat":"5","host":"RMYS","cats":["short"],"who":"Two-handed crews.","src":["INF","PPNYC-SH"],"conf":"i"},{"n":214,"dow":"Sun","date":"30 May 27","series":"CLASSIC YACHT ASSOCIATION - Winter Series","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":215,"dow":"Wed","date":"02 Jun 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":216,"dow":"Sat","date":"05 Jun 27","series":"Brass Monkey Winter Series","trophy":"","sig":"12:55","cat":"6","host":"HBYC","cats":["spin","pursuit"],"who":"Winter racing, Divisions 1, 2 and 3 combined. Mix of pursuit and fleet starts.","src":["PPNYC-BM","A3-11"],"conf":"c"},{"n":217,"dow":"Wed","date":"09 Jun 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":218,"dow":"Wed","date":"16 Jun 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":219,"dow":"Sat","date":"19 Jun 27","series":"Brass Monkey Winter Series","trophy":"","sig":"12:55","cat":"6","host":"HBYC","cats":["spin","pursuit"],"who":"Winter racing, Divisions 1, 2 and 3 combined. Mix of pursuit and fleet starts.","src":["PPNYC-BM","A3-11"],"conf":"c"},{"n":220,"dow":"Sun","date":"20 Jun 27","series":"DF Inter-Club Regatta","trophy":"","sig":"13:55","cat":"6","host":"HBYC","cats":["unk"],"who":"Calendar does not define \"DF\". Confirm which fleet this is with the host club.","src":["CAL"],"conf":"i"},{"n":221,"dow":"Wed","date":"23 Jun 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":222,"dow":"Sat","date":"26 Jun 27","series":"RYCV PRESENTATION NIGHT","trophy":"","sig":"","cat":"","host":"RYCV","cats":["social"],"who":"Club function or briefing, not a race.","src":["CAL"],"conf":"c"},{"n":223,"dow":"Sat","date":"26 Jun 27","series":"ORCV Winter Series","trophy":"Winter Series Race 1 (Fixed Marks)","sig":"10:25","cat":"5","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":224,"dow":"Sat","date":"26 Jun 27","series":"Blue Bird Class Monkeys","trophy":"Class Monkey 2 x Short races","sig":"11:55","cat":"6","host":"RYCV","cats":["od"],"who":"Bluebird one-design class.","src":["INF"],"conf":"i"},{"n":225,"dow":"Sun","date":"27 Jun 27","series":"CLASSIC YACHT ASSOCIATION - Winter Series","trophy":"","sig":"9:55","cat":"7","host":"RYCV","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":226,"dow":"Wed","date":"30 Jun 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":227,"dow":"Sat","date":"03 Jul 27","series":"Brass Monkey Winter Series","trophy":"","sig":"12:55","cat":"6","host":"HBYC","cats":["spin","pursuit"],"who":"Winter racing, Divisions 1, 2 and 3 combined. Mix of pursuit and fleet starts.","src":["PPNYC-BM","A3-11"],"conf":"c"},{"n":228,"dow":"Wed","date":"07 Jul 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":229,"dow":"Sat","date":"10 Jul 27","series":"ORCV Winter Series","trophy":"Winter Series Race 2 (Blairgowrie)","sig":"9:25","cat":"5","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":230,"dow":"Sat","date":"10 Jul 27","series":"Blue Bird Class Monkeys","trophy":"Class Monkey Long Race","sig":"12:55","cat":"6","host":"RMYS","cats":["od"],"who":"Bluebird one-design class.","src":["INF"],"conf":"i"},{"n":231,"dow":"Sun","date":"11 Jul 27","series":"ORCV Novice Return Race 1","trophy":"","sig":"9:25","cat":"5","host":"ORCV","cats":["novice","offshore"],"who":"Novice skippers on a return passage race.","src":["A3-4","INF"],"conf":"i"},{"n":232,"dow":"Sun","date":"11 Jul 27","series":"RMYS - Winter Two handed Series","trophy":"","sig":"10:10","cat":"5","host":"RMYS","cats":["short"],"who":"Two-handed crews.","src":["INF","PPNYC-SH"],"conf":"i"},{"n":233,"dow":"Sun","date":"11 Jul 27","series":"CLASSIC YACHT ASSOCIATION - Winter Series","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":234,"dow":"Wed","date":"14 Jul 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":235,"dow":"Sat","date":"17 Jul 27","series":"Brass Monkey Winter Series","trophy":"","sig":"12:55","cat":"6","host":"HBYC","cats":["spin","pursuit"],"who":"Winter racing, Divisions 1, 2 and 3 combined. Mix of pursuit and fleet starts.","src":["PPNYC-BM","A3-11"],"conf":"c"},{"n":236,"dow":"Sun","date":"18 Jul 27","series":"DF Inter-Club Regatta","trophy":"","sig":"13:55","cat":"6","host":"RYCV","cats":["unk"],"who":"Calendar does not define \"DF\". Confirm which fleet this is with the host club.","src":["CAL"],"conf":"i"},{"n":237,"dow":"Wed","date":"21 Jul 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":238,"dow":"Sat","date":"24 Jul 27","series":"ORCV Winter Series","trophy":"Winter Series Race 3 (Fixed Marks)","sig":"10:25","cat":"5","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":239,"dow":"Sat","date":"24 Jul 27","series":"Blue Bird Class Monkeys","trophy":"Class Monkey 2 x Short races","sig":"11:55","cat":"6","host":"RYCV","cats":["od"],"who":"Bluebird one-design class.","src":["INF"],"conf":"i"},{"n":240,"dow":"Sun","date":"25 Jul 27","series":"RMYS - Winter Two handed Series","trophy":"","sig":"10:10","cat":"5","host":"RMYS","cats":["short"],"who":"Two-handed crews.","src":["INF","PPNYC-SH"],"conf":"i"},{"n":241,"dow":"Sun","date":"25 Jul 27","series":"CLASSIC YACHT ASSOCIATION - Winter Series","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":242,"dow":"Wed","date":"28 Jul 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":243,"dow":"Sat","date":"31 Jul 27","series":"Brass Monkey Winter Series","trophy":"","sig":"12:55","cat":"6","host":"HBYC","cats":["spin","pursuit"],"who":"Winter racing, Divisions 1, 2 and 3 combined. Mix of pursuit and fleet starts.","src":["PPNYC-BM","A3-11"],"conf":"c"},{"n":244,"dow":"Wed","date":"04 Aug 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":245,"dow":"Sat","date":"07 Aug 27","series":"ORCV Winter Series","trophy":"Winter Series Race 4 (Geelong)","sig":"9:25","cat":"5","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":246,"dow":"Sat","date":"07 Aug 27","series":"Blue Bird Class Monkeys","trophy":"Class Monkey Long Race","sig":"12:55","cat":"6","host":"RMYS","cats":["od"],"who":"Bluebird one-design class.","src":["INF"],"conf":"i"},{"n":247,"dow":"Sun","date":"08 Aug 27","series":"ORCV Novice Return Race 2","trophy":"","sig":"9:25","cat":"5","host":"ORCV","cats":["novice","offshore"],"who":"Novice skippers on a return passage race.","src":["A3-4","INF"],"conf":"i"},{"n":248,"dow":"Sun","date":"08 Aug 27","series":"RMYS - Winter Two handed Series","trophy":"","sig":"10:10","cat":"5","host":"RMYS","cats":["short"],"who":"Two-handed crews.","src":["INF","PPNYC-SH"],"conf":"i"},{"n":249,"dow":"Sun","date":"08 Aug 27","series":"CLASSIC YACHT ASSOCIATION - Winter Series","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":250,"dow":"Wed","date":"11 Aug 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":251,"dow":"Sat","date":"14 Aug 27","series":"Brass Monkey Winter Series","trophy":"","sig":"12:55","cat":"6","host":"HBYC","cats":["spin","pursuit"],"who":"Winter racing, Divisions 1, 2 and 3 combined. Mix of pursuit and fleet starts.","src":["PPNYC-BM","A3-11"],"conf":"c"},{"n":252,"dow":"Sun","date":"15 Aug 27","series":"DF Inter-Club Regatta","trophy":"","sig":"13:55","cat":"6","host":"WSC","cats":["unk"],"who":"Calendar does not define \"DF\". Confirm which fleet this is with the host club.","src":["CAL"],"conf":"i"},{"n":253,"dow":"Wed","date":"18 Aug 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":254,"dow":"Sun","date":"22 Aug 27","series":"RMYS - Winter Two handed Series","trophy":"","sig":"10:10","cat":"5","host":"RMYS","cats":["short"],"who":"Two-handed crews.","src":["INF","PPNYC-SH"],"conf":"i"},{"n":255,"dow":"Sun","date":"22 Aug 27","series":"CLASSIC YACHT ASSOCIATION - Winter Series","trophy":"","sig":"10:25","cat":"7","host":"RMYS","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":256,"dow":"Wed","date":"25 Aug 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":257,"dow":"Sat","date":"28 Aug 27","series":"Women's Helm, Navigator & Radio Operator Race (WHNR) & Return Sprint (WRS)","trophy":"","sig":"","cat":"","host":"ORCV","cats":["women","offshore"],"who":"Women in the helm, navigator and radio operator roles. ORCV Cat 5 bay race.","src":["INF"],"conf":"i"},{"n":258,"dow":"Sat","date":"28 Aug 27","series":"ORCV Women's Helm, Navigator & Radio Operator Race (WHNR)","trophy":"","sig":"9:25","cat":"5","host":"ORCV","cats":["women","offshore"],"who":"Women in the helm, navigator and radio operator roles. ORCV Cat 5 bay race.","src":["INF"],"conf":"i"},{"n":259,"dow":"Sat","date":"28 Aug 27","series":"Brass Monkey Winter Series","trophy":"","sig":"12:55","cat":"6","host":"HBYC","cats":["spin","pursuit"],"who":"Winter racing, Divisions 1, 2 and 3 combined. Mix of pursuit and fleet starts.","src":["PPNYC-BM","A3-11"],"conf":"c"},{"n":260,"dow":"Sun","date":"29 Aug 27","series":"Women's Helm, Navigator & Radio Operator Race (WHNR) & Return Sprint (WRS)","trophy":"","sig":"","cat":"","host":"ORCV","cats":["women","offshore"],"who":"Women in the helm, navigator and radio operator roles. ORCV Cat 5 bay race.","src":["INF"],"conf":"i"},{"n":261,"dow":"Sun","date":"29 Aug 27","series":"ORCV WHNR Return Sprint","trophy":"","sig":"9:25","cat":"5","host":"ORCV","cats":["women","offshore"],"who":"Women in the helm, navigator and radio operator roles. ORCV Cat 5 bay race.","src":["INF"],"conf":"i"},{"n":262,"dow":"Wed","date":"01 Sep 27","series":"Wednesday Afternoon Winter Series","trophy":"Laura Gloria Trophy","sig":"13:55","cat":"6","host":"RYCV","cats":["pursuit"],"who":"All keelboats, Wednesday pursuit on club courses. Series A (races 1 to 9) and B (10 to 18).","src":["A3-12"],"conf":"c"},{"n":263,"dow":"Sat","date":"04 Sep 27","series":"RMYS Spring Series","trophy":"Spinnaker Fixed Marks","sig":"12:55","cat":"6","host":"RMYS","cats":["spin"],"who":"Spinnaker fixed mark racing.","src":["CAL"],"conf":"c"},{"n":264,"dow":"Sun","date":"05 Sep 27","series":"CLASSIC YACHT ASSOCIATION - Winter Series","trophy":"","sig":"9:55","cat":"7","host":"RYCV","cats":["classic"],"who":"Classic yachts (Classic Yacht Association of Australia).","src":["INF"],"conf":"i"},{"n":265,"dow":"Sat","date":"11 Sep 27","series":"Coastal Sprint #1","trophy":"","sig":"","cat":"3","host":"ORCV","cats":["offshore"],"who":"Ocean Racing Club of Victoria event for keelboats meeting the stated safety category. Divisions set by the ORCV notice of race.","src":["INF"],"conf":"i"},{"n":266,"dow":"Sat","date":"11 Sep 27","series":"RMYS Spring Series","trophy":"Spinnaker Fixed Marks","sig":"12:55","cat":"6","host":"RMYS","cats":["spin"],"who":"Spinnaker fixed mark racing.","src":["CAL"],"conf":"c"},{"n":267,"dow":"Sat","date":"18 Sep 27","series":"RMYS Spring Series","trophy":"Spinnaker Fixed Marks","sig":"12:55","cat":"6","host":"RMYS","cats":["spin"],"who":"Spinnaker fixed mark racing.","src":["CAL"],"conf":"c"},{"n":268,"dow":"Sat","date":"25 Sep 27","series":"RMYS Spring Series","trophy":"Spinnaker Fixed Marks","sig":"9:55","cat":"6","host":"RMYS","cats":["spin"],"who":"Spinnaker fixed mark racing.","src":["CAL"],"conf":"c"}];
var CURATED_CATS={
 spin:{name:"Spinnaker fleet",desc:"Div 1 big boats, Div 2 incl. S80s, Div 3 small boats. PHS, AMS, ORC."},
 pursuit:{name:"Pursuit & non-spinnaker",desc:"Staggered starts, mostly white sails. Cruisers welcome."},
 short:{name:"Short-handed",desc:"Solo and two-handed series."},
 women:{name:"Women's helm",desc:"PPWCS, Thursday female pursuit, ORCV WHNR."},
 classic:{name:"Classic yachts",desc:"CYAA series and regattas, Lipton classics course."},
 od:{name:"One-design & class",desc:"Bluebird, S80, Tumlaren, Sydney designs."},
 offshore:{name:"Offshore, passage & overnight",desc:"ORCV, Livingston & Sun, overnight races."},
 otb:{name:"Dinghy (off the beach)",desc:"Friday combined dinghy races, Sail Melbourne."},
 novice:{name:"Novice & come and try",desc:"Novice skipper returns, come and try days."},
 open:{name:"Multi-division regatta",desc:"Festival of Sail, Petersville. Divisions per regatta NOR."},
 social:{name:"Social & briefings",desc:"Presentations, opening day, sail past."},
 unk:{name:"Fleet not stated",desc:"\"DF\" events. Ask the host club."}
};
var CURATED_SRC={
 "A3":{t:"RYCV Notice of Race Annexure 3, Season 2026/2027, v1.0 (4 Sep 2026)",u:"https://rycv.com.au/wp-content/uploads/2026/09/RYCV_NOR_Annexure_3_2026-2027_v1.0.pdf"},
 "PPNYC":{t:"PPNYC Notice of Race 2026/27, v1.0",u:"https://rycv.com.au/wp-content/uploads/2026/09/PPNYC-NOR-2026-27-v1.0.pdf"},
 "SIA":{t:"RYCV SI A, Wednesday Afternoon Pursuit Races 2026/2027 v1.0, cl. A5",u:"https://rycv.com.au/wp-content/uploads/2026/09/A-Wednesday-Afternoon-Pursuit-Races-2026-2027-v1.0.pdf"},
 "SIB":{t:"RYCV SI B, Wednesday Twilight Fleet Racing 2026/2027 v1.0, cl. B2 (class flags and divisions)",u:"https://rycv.com.au/wp-content/uploads/2026/09/B-Wednesday-Twilight-Fleet-Racing-2026-2027-v1.0.pdf"},
 "SIC":{t:"RYCV SI C, Sunday Pursuit Race 2026/2027 v1.0, cl. C5",u:"https://rycv.com.au/wp-content/uploads/2026/09/C-Sunday-Pursuit-Race-2026-2027-v1.0.pdf"},
 "SP25":{t:"RYCV Season Presentation 2025/26 v2.0 (last season, may have changed)",u:"https://rycv.com.au/wp-content/uploads/2025/10/RYCV-Season-25-26-V2.0.pdf"},
 "SH":{t:"PPNYC Short Handed Sailing Policy v1.0",u:"https://rycv.com.au/wp-content/uploads/2026/09/PPNYC-Short-Handed-Sailing-Policy-V1.0.pdf"},
 "CAL":{t:"RYCV Racing Calendar 2026/2027, issued 4 Sep 2026 (uploaded PDF)",u:""},
 "INF":{t:"Inferred from the event name. Not verified against the host club's notice of race.",u:""}
};
var CURATED_LOC={
 "A3-1":["A3","cl. A3.3, Challenge 12 Series"],"A3-2":["A3","cl. A3.3, Jeffrey Gray Series"],"A3-3":["A3","cl. A3.3, Livingston & Sun Trophy"],
 "A3-4":["A3","cl. A3.3, Stand Alone Races"],"A3-5":["A3","cl. A3.3, Women's Helm Series"],"A3-6":["A3","cl. A3.3, Rivers Cup Series"],
 "A3-7":["A3","cl. A3.3, Wednesday Twilight Series"],"A3-8":["A3","cl. A3.3, Sunday Pursuit Racing"],"A3-9":["A3","cl. A3.3, Gordon & Jim Single Handed Series"],
 "A3-11":["A3","cl. A3.3, Winter Class Racing Series"],"A3-12":["A3","cl. A3.3, Laura Gloria Wednesday Afternoon Pursuit"],"A3-res":["A3","cl. A3.5, Resail Days"],
 "PPNYC-TW":["PPNYC","pp. 3 to 4, Twilight Spinnaker Series"],"PPNYC-WH":["PPNYC","p. 3, Women's Helm Series"],"PPNYC-BM":["PPNYC","p. 4, Brass Monkeys Trophy"],
 "PPNYC-SH":["SH",""],"SIA":["SIA",""],"SIB":["SIB",""],"SIC":["SIC",""],"SP25":["SP25",""],"CAL":["CAL",""],"INF":["INF",""]
};

  var HOSTS = ['RYCV', 'RMYS', 'HBYC', 'ORCV', 'CYAA', 'PPNYC', 'SYC', 'RBYC', 'QCYC', 'WISC', 'BLISS'];
  var ACRONYMS = HOSTS.concat(['PPWCS', 'WHNR', 'AVISO', 'AWKR', 'DF']);
  var MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  var GENERIC = { race: 1, races: 1, series: 1, racing: 1, the: 1, and: 1, trophy: 1, regatta: 1, day: 1,
    sunday: 1, monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 1 };

  // Keyword rules for events that aren't in the curated race documents.
  var RULES = [
    ['women', /women|female|\bhelm\b|ppwcs|steam packet|whnr/i],
    ['pursuit', /pursuit/i],
    ['short', /solo|two[- ]?handed|short[- ]?hand|single[- ]?hand|gordon|aviso/i],
    ['classic', /classic|cyaa/i],
    ['od', /blue ?bird|\bs80|tumlaren|sydney 36|monkey|one[- ]design/i],
    ['offshore', /overnight|offshore|passage|livingston|coastal|sea pilots|orcv|awkr/i],
    ['novice', /novice|come and try/i],
    ['open', /regatta|festival|petersville/i],
    ['social', /briefing|presentation|opening|sail ?past|social|meeting|prize/i],
    ['spin', /twilight|spinnaker|challenge|aggregate|rivers|jeffrey gray|laura gloria|summer|winter/i]
  ];

  var STYLE =
    ':host{display:block;' +
    '--bg:#f3f5f8;--surface:#fff;--ink:#132033;--muted:#5b6779;--line:#d9dfe7;--accent:#0d3b66;--accent-soft:#e3ecf6;' +
    '--c-spin:#c62828;--c-pursuit:#1565c0;--c-short:#e6a100;--c-women:#8e3f9e;--c-classic:#7a5a2e;--c-od:#00838f;' +
    '--c-offshore:#263a55;--c-otb:#2e7d32;--c-novice:#d2601a;--c-open:#546e7a;--c-social:#8a94a3;--c-unk:#a0a8b4;' +
    '--ok:#2e7d32;--warn:#9a6700;color-scheme:light}' +
    ':host([data-theme="dark"]){--bg:#0c1420;--surface:#132033;--ink:#e6ecf3;--muted:#9aa7b8;--line:#26354a;--accent:#8cb8e8;--accent-soft:#1a2c44;' +
    '--c-spin:#ef6461;--c-pursuit:#5ea2ef;--c-short:#f2c14e;--c-women:#c58ad4;--c-classic:#c49a62;--c-od:#4fc3cf;' +
    '--c-offshore:#8fa6c4;--c-otb:#6cc070;--c-novice:#f08a4b;--c-open:#90a4ae;--c-social:#7d8796;--c-unk:#6b7585;--ok:#6cc070;--warn:#e0b34c;color-scheme:dark}' +
    '@media (prefers-color-scheme:dark){:host([data-theme="auto"]){--bg:#0c1420;--surface:#132033;--ink:#e6ecf3;--muted:#9aa7b8;--line:#26354a;--accent:#8cb8e8;--accent-soft:#1a2c44;' +
    '--c-spin:#ef6461;--c-pursuit:#5ea2ef;--c-short:#f2c14e;--c-women:#c58ad4;--c-classic:#c49a62;--c-od:#4fc3cf;' +
    '--c-offshore:#8fa6c4;--c-otb:#6cc070;--c-novice:#f08a4b;--c-open:#90a4ae;--c-social:#7d8796;--c-unk:#6b7585;--ok:#6cc070;--warn:#e0b34c;color-scheme:dark}}' +
    '*,*::before,*::after{box-sizing:border-box}' +
    '.root{--f-display:"Barlow Condensed","Arial Narrow",sans-serif;--f-body:"Public Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--f-mono:"JetBrains Mono",ui-monospace,Consolas,monospace;' +
    'background:var(--bg);color:var(--ink);font:15px/1.5 var(--f-body);padding:20px 16px 32px;border-radius:8px;max-width:1080px;margin:0 auto}' +
    'h2,h3{font-family:var(--f-display);margin:0;letter-spacing:.01em;text-wrap:balance}' +
    'button,input,select{font:inherit;color:inherit}' +
    '.status{font-family:var(--f-mono);font-size:.75rem;letter-spacing:.06em;color:var(--muted);margin:0 0 14px}' +
    '.status.warn{color:var(--warn)}' +
    '.intro{margin:0 0 16px;max-width:68ch;color:var(--muted);font-size:.9rem}' +
    '.legend{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;margin:0 0 20px}' +
    '.lg{display:flex;gap:10px;align-items:flex-start;background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:10px 12px;cursor:pointer;text-align:left}' +
    '.lg:hover{border-color:var(--accent)}' +
    '.lg[aria-pressed="true"]{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);background:var(--accent-soft)}' +
    '.lg:focus-visible,select:focus-visible,input:focus-visible,button:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}' +
    '.lg b{font-family:var(--f-display);font-size:1.05rem;font-weight:600;display:block;line-height:1.2}' +
    '.lg small{color:var(--muted);font-size:.8rem;line-height:1.35;display:block}' +
    '.lg .n{font-family:var(--f-mono);font-size:.72rem;color:var(--muted)}' +
    '.flag{flex:none;width:18px;height:18px;border-radius:2px;margin-top:2px;background:var(--c)}' +
    '.bar{background:var(--bg);padding-block:10px;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:8px}' +
    '.bar input[type=search],.bar select{font-size:.9rem;padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:var(--surface);min-width:0}' +
    '.bar input[type=search]{flex:1 1 200px}' +
    '.bar label{display:flex;gap:6px;align-items:center;font-size:.88rem;color:var(--muted)}' +
    '.bar button{font-size:.85rem;padding:7px 12px;border-radius:6px;border:1px solid var(--line);background:var(--surface);cursor:pointer}' +
    '.count{font-family:var(--f-mono);font-size:.78rem;color:var(--muted);margin-left:auto}' +
    '.month{margin-top:26px}' +
    '.month h2{font-size:1.6rem;font-weight:600;display:flex;gap:10px;align-items:baseline;border-bottom:2px solid var(--ink);padding-bottom:4px;margin-bottom:6px}' +
    '.month h2 span{font-family:var(--f-mono);font-size:.75rem;color:var(--muted);font-weight:400}' +
    '.ev{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:14px;padding:12px 0;border-bottom:1px solid var(--line)}' +
    '.ev.past{opacity:.5}' +
    '.ev.next{background:var(--accent-soft);margin-inline:-10px;padding-inline:10px;border-radius:6px}' +
    '.d{font-family:var(--f-display);text-align:center;line-height:1}' +
    '.d .dow{font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}' +
    '.d .day{font-size:1.9rem;font-weight:700}' +
    '.main{min-width:0;display:grid;gap:5px}' +
    '.t{font-weight:600;font-size:1rem}' +
    '.t em{font-style:normal;font-weight:400;color:var(--muted)}' +
    '.chips{display:flex;flex-wrap:wrap;gap:6px}' +
    '.chip{display:inline-flex;align-items:center;gap:6px;font-size:.76rem;font-weight:500;padding:2px 8px 2px 6px;border-radius:3px;border:1px solid var(--line);background:var(--surface)}' +
    '.chip i{width:10px;height:10px;border-radius:1px;background:var(--c)}' +
    '.who{font-size:.88rem;margin:0;max-width:72ch}' +
    '.basis{font-size:.75rem;color:var(--muted)}' +
    '.basis .c{color:var(--ok);font-weight:600}' +
    '.basis .i{color:var(--warn);font-weight:600}' +
    '.basis a{color:var(--accent)}' +
    '.meta{display:grid;gap:4px;justify-items:end;font-family:var(--f-mono);font-size:.78rem;color:var(--muted);white-space:nowrap}' +
    '.meta .sig{font-size:1rem;color:var(--ink)}' +
    '.cat{border:1px solid var(--line);border-radius:3px;padding:0 5px}' +
    '.empty{padding:40px 0;color:var(--muted);text-align:center}' +
    'details{margin-top:24px;border-top:1px solid var(--line);padding-top:12px}' +
    'summary{cursor:pointer;font-family:var(--f-display);font-size:1.25rem;font-weight:600}' +
    'details>div{margin-top:10px}' +
    'details p{margin:0 0 8px;max-width:75ch;font-size:.9rem;color:var(--muted)}' +
    'details ol,details ul{margin:0;padding-left:20px;display:grid;gap:6px;max-width:80ch;font-size:.9rem}' +
    'details a{color:var(--accent);word-break:break-word}' +
    '.gloss{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;font-size:.88rem}' +
    '.gloss div{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:10px 12px}' +
    '.gloss b{font-family:var(--f-mono);font-size:.82rem}' +
    '@media (max-width:600px){.ev{grid-template-columns:48px minmax(0,1fr)}' +
    '.meta{grid-column:2;justify-items:start;grid-auto-flow:column;justify-content:start;gap:10px}.d .day{font-size:1.5rem}}';

  var BODY =
    '<div class="root">' +
    '<p class="status" id="status" role="status">Loading the club calendar…</p>' +
    '<p class="intro">Every event from the club calendar, tagged with the divisions that usually race it. Tap a division below to filter. ' +
    'Green <b>Confirmed</b> tags come from the 2026/27 RYCV and PPNYC race documents. Amber <b>Inferred</b> tags come from the event name only, ' +
    'so check the host club\'s notice of race before you enter.</p>' +
    '<div class="legend" id="legend"></div>' +
    '<div class="bar">' +
    '<input type="search" id="q" placeholder="Search series, trophy or club" aria-label="Search events">' +
    '<select id="host" aria-label="Host club"><option value="">All host clubs</option></select>' +
    '<label><input type="checkbox" id="past"> Show past events</label>' +
    '<button id="clear" type="button">Clear filters</button>' +
    '<span class="count" id="count" aria-live="polite"></span>' +
    '</div>' +
    '<div id="list"></div>' +
    '<details><summary>Handicap and safety terms</summary><div class="gloss">' +
    '<div><b>PHS</b><br>Performance Handicap System, Yachting Victoria\'s performance-based handicap (PPNYC NOR cl. 1.4).</div>' +
    '<div><b>AMS</b><br>Australian Measurement System, a measured rating (PPNYC NOR cl. 1.6).</div>' +
    '<div><b>ORC / ORCwl</b><br>ORC Club rating; "wl" is the windward/leeward time-on-time used for Challenge 12 (PPNYC NOR cl. 1.5, 9.5).</div>' +
    '<div><b>Pursuit</b><br>Staggered starts on pursuit handicap so the first boat home wins. No spinnakers unless allowed (PPNYC NOR cl. 8).</div>' +
    '<div><b>Safety Cat.</b><br>Australian Sailing Special Regulations category: 2 and 3 offshore, 5 and 5N bay and overnight, 6 and 7 sheltered water.</div>' +
    '<div><b>Warning signal</b><br>Time of the first warning signal. TBC means set by the host club.</div>' +
    '</div></details>' +
    '<details><summary>Calendar and notice of race differ on a few dates</summary><div>' +
    '<p>As at the 4 Sep 2026 calendar, compared with RYCV NOR Annexure 3 (v1.0, 4 Sep 2026). Confirm with the race office.</p><ul>' +
    '<li>Port Phillip Sea Pilots Overnight Race: calendar shows Sat 13 Mar 2027; Annexure 3, cl. A3.3 (Stand Alone Races) shows 20/03/2027.</li>' +
    '<li>RYCV Overnight Race (Navigators Challenge), 27 Feb 2027: calendar warning 9:55; Annexure 3 shows 1055.</li>' +
    '<li>Range Race: Annexure 3 lists a race on 21/11/2026 at RYCV, which the calendar does not show (Lipton Regatta that day), and hosts 06/02/2027 at RBYC where the calendar says SYC.</li>' +
    '<li>Jeffrey Gray Race 3 is the Lipton Regatta Sunday fixed mark race on 22 Nov 2026 (Annexure 3, cl. A3.3, Jeffrey Gray Series).</li>' +
    '<li>The calendar abbreviation "DF" (DF Come and Try, DF Inter-Club Regatta) is not defined in any document reviewed.</li>' +
    '</ul></div></details>' +
    '<details><summary>Sources</summary><div><ol id="sources"></ol></div></details>' +
    '</div>';

  // ---------- helpers ----------

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function niceTitle(s) {
    return s.replace(/\b([A-Z]{4,})\b/g, function (w) {
      return ACRONYMS.indexOf(w) >= 0 ? w : w[0] + w.slice(1).toLowerCase();
    });
  }

  function norm(s) {
    return s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function words(s) {
    return norm(s).split(' ').filter(function (w) { return w.length >= 4 && !GENERIC[w]; });
  }

  function parseYmd(s) {
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function dateKey(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function fmtShort(d) {
    return d.getDate() + ' ' + MONF[d.getMonth()].slice(0, 3);
  }

  // ---------- data ----------

  function curatedEvents() {
    return CURATED_EVENTS.map(function (e) {
      var p = e.date.split(' ');
      var out = {};
      for (var k in e) out[k] = e[k];
      out.dt = new Date(2000 + +p[2], MON[p[1]], +p[0]);
      out.live = false;
      return out;
    });
  }

  function titlesMatch(a, b) {
    var na = norm(a), nb = norm(b);
    if (!na || !nb) return false;
    if (na === nb || na.indexOf(nb) >= 0 || nb.indexOf(na) >= 0) return true;
    // Different names for the same event usually share about half their
    // distinctive words; one shared word is not enough when both are longer.
    var wa = words(a), wb = words(b);
    var shared = wa.filter(function (w) { return wb.indexOf(w) >= 0; }).length;
    return shared >= Math.max(1, Math.ceil(Math.min(wa.length, wb.length) / 2));
  }

  function inferCats(title, cal) {
    var cats = [];
    if (cal === 'otb') cats.push('otb');
    RULES.forEach(function (r) {
      if (r[1].test(title) && cats.indexOf(r[0]) < 0) cats.push(r[0]);
    });
    return cats.length ? cats : ['unk'];
  }

  function inferHost(e) {
    var hay = (e.title + ' ' + (e.location || '')).toUpperCase();
    for (var i = 0; i < HOSTS.length; i++) {
      if (new RegExp('\\b' + HOSTS[i] + '\\b').test(hay)) return HOSTS[i];
    }
    return '';
  }

  function mergeLive(live) {
    var curated = curatedEvents();
    return live.map(function (l) {
      var dt = parseYmd(l.date);
      var match = null;
      for (var i = 0; i < curated.length; i++) {
        var c = curated[i];
        if (c.dt.getTime() === dt.getTime() && titlesMatch(l.title, c.series)) { match = c; break; }
      }
      var warn = /warning\s*signal\s*:?\s*([0-9]{1,2}[:.][0-9]{2}|TBC)/i.exec(l.desc || '');
      var sig = warn ? warn[1].replace('.', ':').toUpperCase() : '';
      var note = (l.desc || '').split('\n').filter(function (ln) {
        return ln.trim() && !/^\s*warning\s*signal/i.test(ln);
      }).join(' · ');
      var out = {
        live: true,
        dt: dt,
        dow: DOW[dt.getDay()],
        end: l.endDate ? parseYmd(l.endDate) : null,
        series: l.title,
        trophy: '',
        host: inferHost(l),
        cats: inferCats(l.title, l.cal),
        who: note,
        cat: '',
        src: ['CAL'],
        conf: 'l',
        sig: sig || (l.allDay ? 'All day' : l.time || '')
      };
      if (match) {
        out.trophy = match.trophy;
        out.host = match.host || out.host;
        out.cats = match.cats;
        out.who = match.who || note;
        out.cat = match.cat;
        out.src = match.src;
        out.conf = match.conf;
        if (!sig && match.sig) out.sig = match.sig;
      }
      return out;
    });
  }

  function fetchLive(api) {
    if (!api) return Promise.reject(new Error('no api'));
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 10000) : null;
    return fetch(api, ctl ? { signal: ctl.signal } : {})
      .then(function (r) {
        if (timer) clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (j) {
        if (!j || !Array.isArray(j.events)) throw new Error('bad payload');
        return j;
      });
  }

  // ---------- widget ----------

  function mount(container, api) {
    var root = container.shadowRoot || container.attachShadow({ mode: 'open' });
    var theme = container.getAttribute('data-theme') || 'light';
    container.setAttribute('data-theme', theme);
    root.innerHTML =
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Public+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">' +
      '<style>' + STYLE + '</style>' + BODY;
    // Fonts used inside a shadow root must also be declared on the document.
    if (!document.getElementById('rycv-cal-fonts')) {
      var l = document.createElement('link');
      l.id = 'rycv-cal-fonts';
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Public+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap';
      document.head.appendChild(l);
    }
    var $ = function (id) { return root.getElementById ? root.getElementById(id) : root.querySelector('#' + id); };

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var EVENTS = [];
    var state = { cats: {}, host: '', q: '', past: false };
    try {
      var saved = JSON.parse(localStorage.getItem('rycv-filter') || 'null');
      if (saved) {
        (saved.cats || []).forEach(function (k) { state.cats[k] = true; });
        state.past = !!saved.past;
        state.host = saved.host || '';
      }
    } catch (e) { /* storage unavailable */ }
    function save() {
      try {
        localStorage.setItem('rycv-filter', JSON.stringify({ cats: Object.keys(state.cats), past: state.past, host: state.host }));
      } catch (e) { /* storage unavailable */ }
    }

    // Sources list (static, from the curated data)
    var ol = $('sources');
    var srcOrder = Object.keys(CURATED_SRC);
    srcOrder.forEach(function (k) {
      var s = CURATED_SRC[k];
      var li = document.createElement('li');
      li.id = 'src-' + k;
      li.innerHTML = s.u ? '<a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.t) + '</a>' : esc(s.t);
      ol.appendChild(li);
    });

    $('q').oninput = function () { state.q = this.value.trim().toLowerCase(); render(); };
    $('past').checked = state.past;
    $('past').onchange = function () { state.past = this.checked; save(); render(); };
    $('host').onchange = function () { state.host = this.value; save(); render(); };
    $('clear').onclick = function () {
      state.cats = {};
      state.host = '';
      state.q = '';
      $('q').value = '';
      $('host').value = '';
      save();
      render();
    };

    function buildFilters() {
      var legend = $('legend');
      legend.innerHTML = '';
      Object.keys(CURATED_CATS).forEach(function (k) {
        var c = CURATED_CATS[k];
        var n = EVENTS.filter(function (e) { return e.cats.indexOf(k) >= 0; }).length;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'lg';
        b.setAttribute('data-k', k);
        b.innerHTML = '<span class="flag" style="--c:var(--c-' + k + ')"></span><span><b>' + esc(c.name) + '</b><small>' + esc(c.desc) +
          '</small><span class="n">' + n + ' event' + (n === 1 ? '' : 's') + '</span></span>';
        b.onclick = function () {
          if (state.cats[k]) delete state.cats[k]; else state.cats[k] = true;
          save();
          render();
        };
        legend.appendChild(b);
      });
      var sel = $('host');
      sel.innerHTML = '<option value="">All host clubs</option>';
      var hosts = {};
      EVENTS.forEach(function (e) {
        e.host.split('/').forEach(function (h) { if (h) hosts[h] = 1; });
      });
      Object.keys(hosts).sort().forEach(function (h) {
        var o = document.createElement('option');
        o.value = h;
        o.textContent = h;
        sel.appendChild(o);
      });
      sel.value = hosts[state.host] ? state.host : '';
    }

    function render() {
      var catKeys = Object.keys(state.cats);
      root.querySelectorAll('.lg').forEach(function (b) {
        b.setAttribute('aria-pressed', state.cats[b.getAttribute('data-k')] ? 'true' : 'false');
      });
      var list = $('list');
      list.innerHTML = '';
      var nextIdx = -1;
      for (var i = 0; i < EVENTS.length; i++) {
        if ((EVENTS[i].end || EVENTS[i].dt) >= today) { nextIdx = i; break; }
      }
      var nextTime = nextIdx >= 0 ? EVENTS[nextIdx].dt.getTime() : null;
      var shown = EVENTS.filter(function (e) {
        if (!state.past && (e.end || e.dt) < today) return false;
        if (catKeys.length && !e.cats.some(function (c) { return state.cats[c]; })) return false;
        if (state.host && e.host.split('/').indexOf(state.host) < 0) return false;
        if (state.q && (e.series + ' ' + e.trophy + ' ' + e.host + ' ' + e.who).toLowerCase().indexOf(state.q) < 0) return false;
        return true;
      });
      $('count').textContent = shown.length + ' of ' + EVENTS.length + ' events';
      if (!shown.length) {
        list.innerHTML = '<p class="empty">No events match these filters. Try "Show past events" or clear the filters.</p>';
        return;
      }
      var cur = '', sec = null;
      shown.forEach(function (e) {
        var key = e.dt.getFullYear() + '-' + e.dt.getMonth();
        if (key !== cur) {
          cur = key;
          var cnt = shown.filter(function (x) {
            return x.dt.getFullYear() === e.dt.getFullYear() && x.dt.getMonth() === e.dt.getMonth();
          }).length;
          sec = document.createElement('div');
          sec.className = 'month';
          sec.innerHTML = '<h2>' + MONF[e.dt.getMonth()] + ' ' + e.dt.getFullYear() + ' <span>' + cnt + ' event' + (cnt > 1 ? 's' : '') + '</span></h2>';
          list.appendChild(sec);
        }
        var r = document.createElement('div');
        r.className = 'ev' + ((e.end || e.dt) < today ? ' past' : '') + (e.dt.getTime() === nextTime ? ' next' : '');
        var chips = e.cats.map(function (c) {
          return '<span class="chip"><i style="--c:var(--c-' + c + ')"></i>' + esc(CURATED_CATS[c].name) + '</span>';
        }).join('');
        var basis;
        if (e.conf === 'c') basis = '<span class="c">Confirmed</span>';
        else if (e.conf === 'i') basis = '<span class="i">Inferred</span>';
        else basis = '<span class="i">Inferred from name</span>';
        var refs = '';
        if (e.conf !== 'l') {
          var seen = {};
          refs = e.src.filter(function (s) { return !seen[s] && (seen[s] = 1); }).map(function (s) {
            var lc = CURATED_LOC[s];
            var k = lc[0], loc = lc[1];
            return '<a href="#src-' + k + '" title="' + esc(CURATED_SRC[k].t + (loc ? ', ' + loc : '')) + '">[' +
              (srcOrder.indexOf(k) + 1) + (loc ? ', ' + esc(loc.replace('cl. ', '')) : '') + ']</a>';
          }).join(' ');
        }
        var span = e.end ? '<span>to ' + fmtShort(e.end) + '</span>' : '';
        r.innerHTML =
          '<div class="d"><div class="dow">' + e.dow + '</div><div class="day">' + e.dt.getDate() + '</div></div>' +
          '<div class="main"><div class="t">' + esc(niceTitle(e.series)) + (e.trophy ? ' <em>· ' + esc(e.trophy) + '</em>' : '') + '</div>' +
          '<div class="chips">' + chips + '</div>' + (e.who ? '<p class="who">' + esc(e.who) + '</p>' : '') +
          '<div class="basis">' + basis + ' ' + refs + '</div></div>' +
          '<div class="meta">' + (e.sig ? '<span class="sig">' + esc(e.sig) + '</span>' : '<span>No signal</span>') + span +
          (e.cat ? '<span class="cat">Cat ' + esc(e.cat) + '</span>' : '') + (e.host ? '<span>' + esc(e.host) + '</span>' : '') + '</div>';
        sec.appendChild(r);
      });
    }

    function show(events, statusText, isWarn) {
      EVENTS = events.sort(function (a, b) { return a.dt - b.dt; });
      var st = $('status');
      st.textContent = statusText;
      st.className = 'status' + (isWarn ? ' warn' : '');
      buildFilters();
      render();
    }

    fetchLive(api).then(function (j) {
      var when = j.updated ? new Date(j.updated) : new Date();
      show(mergeLive(j.events), 'Royal Yacht Club of Victoria · Live from the club calendar · Checked ' +
        when.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }), false);
    }).catch(function () {
      show(curatedEvents(), 'Royal Yacht Club of Victoria · Showing the calendar issued 4 Sep 2026. The live calendar is unavailable right now.', true);
    });
  }

  function init(script) {
    var container = document.getElementById('rycv-racing-calendar');
    if (!container) {
      container = document.createElement('div');
      container.id = 'rycv-racing-calendar';
      if (script && script.parentNode) script.parentNode.insertBefore(container, script);
      else document.body.appendChild(container);
    }
    var api = container.getAttribute('data-api') || (script && script.getAttribute('data-api')) || DEFAULT_API;
    if (!container.getAttribute('data-theme') && script && script.getAttribute('data-theme')) {
      container.setAttribute('data-theme', script.getAttribute('data-theme'));
    }
    mount(container, api);
  }

  var currentScript = document.currentScript;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(currentScript); });
  } else {
    init(currentScript);
  }
})();
