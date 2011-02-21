var views = exports;

views.index = function(req,res,matches){
	var available;
	if(matches && matches[2]){
		var file = this.files[matches[2]];
		if (!file) return this.views.send404(req,res);
		available = [file]
	}
	else{
		available = this.files
	}
	
	res.writeHead(200,{'Content-Type': 'text/html; charset=utf-8'});
	res.write('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n \n \
<html xmlns="http://www.w3.org/1999/xhtml">\n \
<head>\n \
<title>8080 - Dateien</title>\n \
<meta name="keywords" content="" />\n \
<meta name="description" content="" />\n \
<html><head><link rel="stylesheet" type="text/css" href="/style.css"></head><body>\
</head>\n \
<body>\n \
<div id="wrapper">\n \
<div id="header"> \n \
\n \
	<div id="logo">\n \
\n \
		<h1><a href="/">8080  </a></h1>\n \
		<h2> free and open otr-mirror system</h2>\n \
	</div>\n \
    <div id="logo2">\n \
</div>\n \
	<div id="menu">\n \
		<ul>\n \
			<li class="current_page_item"><a href="/">Dateien</a></li>\n \
\n \
			<li><a href="/faq">FAQ</a></li>\n \
			<li><a href="/imprint" class="last">Impressum</a></li>			\n \
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
			for(var i in available){
				var f = available[i];
				res.write('                <div class="post">\n'
                        +'<a href="/index/' +f.filename+ '"><h1 class="title">' + f.title + ' vom '
                        	+ f.starttime.getDate() + '.'
                        	+ f.starttime.getMonth() + '.'
                        	+ f.starttime.getFullYear() + ' um '
                        	+ f.starttime.getHours() + ':' 
                        	+ (f.starttime.getMinutes()<10?'0':'')+f.starttime.getMinutes()
                        	+ ' (' + f.station + ') '
                        	+ '<sup>'
                        		+ (f.flags.avi ? 'DivX ' : '')
                        		+ (!f.flags.otrkey ? 'unverschlüsselt ': '')
                        		+ (f.flags.cut ? 'CUT ' : '')
                        		+ (f.flags.mp4 ? 'MP4 ' : '')
                        		+ (f.flags.HD ? 'HD ' : '')
                        		+ (f.flags.HQ ? 'HQ ' : '')
                        		+ (f.flags.ac3 ? 'AC3 ' : '')
                        	+ '</sup></h1></a>\n \
                        <p class="meta">'+f.filename+'  <a class="md5" title="Der MD5-Hash der Datei"><img src="/images/img09.png" alt="md5-hash"> '+ f.md5  +' </a></p>\n \
                        <div class="entry"><p class="dl"><a href="/createTicketFor/'+f.filename+'">Datei herunterladen</a> (' + (f.size/(1024*1024)).toFixed() + 'MB ~ ' + f.duration + ' Minuten)</p></div>\n \
                </div>\n \
');			}
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

views.linklist = function(req,res){
	res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});
	for(fname in this.files)
		res.write('http://' + this.options.fqdn + '/index/'+fname+"\n");
	res.end();
}

views.send404 = function(req,res){
	res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
	res.end('file not found. we cannot satisfy your request');
}
