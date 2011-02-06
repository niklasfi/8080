var views = exports;

views.index = function(req,res){
	res.writeHead(200,{'Content-Type': 'text/html; charset=utf-8'});
	res.write('<html><head><link rel="stylesheet" type="text/css" href="style.css"></head><body><h1>OTR-Mirror</h1><ul class="indexlist">\n')
	for(var i in this.files){
		res.write('\t<li><a href="/createTicketFor/' + i + '">'+i+'</a></li>\n');
	}
	res.end('</ul></html>');
}
