var views = exports;

views.index = function(req,res,matches){
	var file
	if(!matches || !matches[2] || (file = this.files[matches[2]])){

		res.writeHead(200,{'Content-Type': 'text/html; charset=utf-8'});
		res.write('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n \n \
<html xmlns="http://www.w3.org/1999/xhtml">\n \
<head>\n \
<title>8080 - Dateien</title>\n \
<meta name="keywords" content="" />\n \
<meta name="description" content="" />\n \
<html><head><link rel="stylesheet" type="text/css" href="/style.css"></head><body><h1>OTR-Mirror</h1>\
</head>\n \
<body>\n \
<div id="wrapper">\n \
<div id="header"> \n \
\n \
	<div id="logo">\n \
\n \
		<h1><a href="#">8080  </a></h1>\n \
		<h2> free and open otr-mirror system</h2>\n \
	</div>\n \
    <div id="logo2">\n \
</div>\n \
	<div id="menu">\n \
		<ul>\n \
			<li class="current_page_item"><a href="#">Dateien</a></li>\n \
\n \
			<li><a href="#">FAQ</a></li>\n \
			<li><a href="#">Impressum</a></li>			\n \
		</ul>\n \
	</div>\n \
</div>\n \
\n \
\n \
<!-- start page -->\n \
<div id="page">\n \
	<!-- start content -->\n \
	<div id="content">\n \
')
		if(file){
			res.end('\t<h2>Deine Anfrage</h2><ul class="indexlist"><li><a href="/createTicketFor/' + file.filename + '">'+ file.filename +'</a></li></ul></html>');
		}	
		else{

			for(var i in this.files)
				res.write('                <div class="post">\n \
                        <h1 class="title">[TODO:]Tatort vom 31.01.2011 um 22:45 (rbb) <sup>mpg</sup></h1>\n \
                        <p class="meta">'+i+'\n \
                        <div class="entry">\n \
                    <p class="dl">                    <a href="/createTicketFor/'+i+'">Datei herunterladen</a> ([TODO:]999 MB ~ 99 Minuten)</p>\n \
                        </div>\n \
                </div>\n \
');
		}
res.end('\n \
	<div style="clear: both;">&nbsp;</div>\n \
</div>\n \
<!-- end page -->\n \
</div>\n \
<!-- start footer -->\n \
<div id="footer">\n \
	<p id="legal"> 8080 is open software. You are free to use and edit it as you like. Source can be found at github.com</p>\n \
</div>\n \
<!-- end footer -->\n \
</body>\n \
</html>\n \
');
	}
	else{
		console.log('x: '+matches[2]);
		this.views.send404(req,res);
	}
}

views.linklist = function(req,res){
	res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});
	for(fname in this.files)
		res.write('http://' + this.options.servername + '/index/'+fname+"\n");
	res.end();
}

views.send404 = function(req,res){
	res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
	res.end('file not found. we cannot satisfy your request');
}
