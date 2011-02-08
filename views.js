var views = exports;

views.index = function(req,res){
	res.writeHead(200,{'Content-Type': 'text/html; charset=utf-8'});
	res.write('<html><head><link rel="stylesheet" type="text/css" href="style.css"></head><body><h1>OTR-Mirror</h1>\
	<h2>Download kaputt?!</h2><p>Nein. Wenn bei dir ein Download nicht startet, dann ist das normal so. Dieser Server arbeitet mit einer besonderen Warteschlangen-Art. Starte einfach den von dir gewünschten Download. Falls dein Download-Manager anzeigt, dass dieser nicht aktiv ist (0kB/s) bedeutet es, dass du in der Warteschlange bist. Sobald wieder Bandbreite zur verfügung steht, wird der Download automatisch gestartet. Das spart dir Klicks und sorgt dafür, dass jeder schnell zu seinem Download kommt.</p>\
	<h2>Wo sind die Banner?</h2><p>Dies ist eine freie Mirror Implementation. Was bedeutet "frei"? Frei bedeutet, dass du dir den Source-Code einfach von <a href="http://github.com/niklasfi/8080">github.com</a> herunterladen und auf deinem Server oder Rechner installieren kannst. So wird es jedem ermöglicht die Bandbreite der OTR-Mirror Wolke zu vergrößern. (Patches zum Code sind natürlich auch höchst erwünscht)</p>\
	<h2>Verfügbare Downloads</h2><ul class="indexlist">\n')
	for(var i in this.files){
		res.write('\t<li><a href="/createTicketFor/' + i + '">'+i+'</a></li>\n');
	}
	res.end('</ul></html>');
}
