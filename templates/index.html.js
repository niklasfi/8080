var thankyou = exports

thankyou.text = function(){
	var o= '<http><head><link rel="stylesheet" type="text/css" href="style.css"></head><body><h1>OTR-Mirror</h1><ul>\n'
	for(var i in this.files){
		res.write('\t<li><a href="/createTicketFor/' + i + '">'+i+'</a></li>\n');
	}
	res.end('</ul></html>');
}
